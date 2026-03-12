const DB_NAME = 'SnapKeepDB';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error('打开数据库失败'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('notes')) {
        const store = db.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('请求失败'));
  });
}

function txToPromise(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('事务失败'));
    tx.onabort = () => reject(tx.error || new Error('事务已中止'));
  });
}

function contentByteSize(content) {
  try {
    return new Blob([content]).size;
  } catch {
    return new TextEncoder().encode(String(content || '')).byteLength;
  }
}

function normalizeTitle(content) {
  const text = String(content || '').trim();
  return text ? text.slice(0, 20) : '无标题';
}

function createId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const noteDb = {
  async addNote(note) {
    const db = await openDb();
    const now = Date.now();
    const content = String(note?.content || '');
    if (contentByteSize(content) > 100 * 1024) throw new Error('单条记录内容超过 100KB 上限');
    const record = {
      id: createId(),
      title: normalizeTitle(content),
      content,
      tags: Array.isArray(note?.tags) ? note.tags : [],
      createdAt: now,
      updatedAt: now
    };
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').put(record);
    await txToPromise(tx);
    db.close();
    return record;
  },

  async getNoteById(id) {
    const db = await openDb();
    const tx = db.transaction('notes', 'readonly');
    const store = tx.objectStore('notes');
    const value = await reqToPromise(store.get(id));
    await txToPromise(tx);
    db.close();
    return value || null;
  },

  async updateNote(id, patch) {
    const db = await openDb();
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    const old = await reqToPromise(store.get(id));
    if (!old) {
      tx.abort();
      db.close();
      throw new Error('记录不存在');
    }
    const next = { ...old, ...patch, updatedAt: Date.now() };
    if (typeof patch?.content === 'string') next.title = normalizeTitle(next.content);
    if (contentByteSize(next.content) > 100 * 1024) {
      tx.abort();
      db.close();
      throw new Error('单条记录内容超过 100KB 上限');
    }
    store.put(next);
    await txToPromise(tx);
    db.close();
    return next;
  },

  async deleteNote(id) {
    const db = await openDb();
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').delete(id);
    await txToPromise(tx);
    db.close();
  },

  async clearAll() {
    const db = await openDb();
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').clear();
    await txToPromise(tx);
    db.close();
  },

  async getNoteCount() {
    const db = await openDb();
    const tx = db.transaction('notes', 'readonly');
    const count = await reqToPromise(tx.objectStore('notes').count());
    await txToPromise(tx);
    db.close();
    return count || 0;
  },

  async getNotesPage(page = 1, pageSize = 50) {
    const total = await this.getNoteCount();
    const db = await openDb();
    const tx = db.transaction('notes', 'readonly');
    const store = tx.objectStore('notes');
    const idx = store.index('createdAt');
    const offset = Math.max(0, (page - 1) * pageSize);
    const notes = [];
    let skipped = 0;
    await new Promise((resolve, reject) => {
      const cursorReq = idx.openCursor(null, 'prev');
      cursorReq.onerror = () => reject(cursorReq.error || new Error('读取记录失败'));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve();
          return;
        }
        if (skipped < offset) {
          skipped += 1;
          cursor.continue();
          return;
        }
        notes.push(cursor.value);
        if (notes.length >= pageSize) {
          resolve();
          return;
        }
        cursor.continue();
      };
    });
    await txToPromise(tx);
    db.close();
    const hasMore = offset + notes.length < total;
    return { notes, total, hasMore };
  },

  async getAllNotes() {
    const db = await openDb();
    const tx = db.transaction('notes', 'readonly');
    const store = tx.objectStore('notes');
    const idx = store.index('createdAt');
    const out = [];
    await new Promise((resolve, reject) => {
      const cursorReq = idx.openCursor(null, 'prev');
      cursorReq.onerror = () => reject(cursorReq.error || new Error('读取记录失败'));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve();
          return;
        }
        out.push(cursor.value);
        cursor.continue();
      };
    });
    await txToPromise(tx);
    db.close();
    return out;
  },

  async bulkReplaceAll(notes) {
    const db = await openDb();
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    store.clear();
    for (const note of notes) {
      const record = {
        id: note.id || createId(),
        title: note.title || normalizeTitle(note.content),
        content: String(note.content || ''),
        tags: Array.isArray(note.tags) ? note.tags : [],
        createdAt: Number(note.createdAt || Date.now()),
        updatedAt: Number(note.updatedAt || Date.now())
      };
      if (contentByteSize(record.content) > 100 * 1024) {
        tx.abort();
        db.close();
        throw new Error('存在超过 100KB 的记录，导入已中止');
      }
      store.put(record);
    }
    await txToPromise(tx);
    db.close();
  }
};

export const settingsOps = {
  async get(key) {
    const db = await openDb();
    const tx = db.transaction('settings', 'readonly');
    const value = await reqToPromise(tx.objectStore('settings').get(key));
    await txToPromise(tx);
    db.close();
    return value || null;
  },

  async set(key, value) {
    const db = await openDb();
    const record = { key, value, updatedAt: Date.now() };
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put(record);
    await txToPromise(tx);
    db.close();
  }
};

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`/api/backup${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || '操作失败');
    }
    return data;
  } catch (error) {
    throw new Error(error.message || '网络请求失败');
  }
}

export async function testConnection({ server, username, password }) {
  if (!server) throw new Error('请填写 WebDAV 服务器地址');
  if (!username) throw new Error('请填写 WebDAV 用户名');
  if (!password) throw new Error('请填写 WebDAV 密码');
  
  const res = await fetch('/api/backup/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ server, username, password })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || '连接失败');
  }
  return true;
}

export async function listBackups({ server, username, password }) {
  if (!server) throw new Error('请填写 WebDAV 服务器地址');
  if (!username) throw new Error('请填写 WebDAV 用户名');
  if (!password) throw new Error('请填写 WebDAV 密码');
  
  const res = await fetch('/api/backup/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ server, username, password })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || '获取列表失败');
  }
  return data.data || [];
}

export async function putTextFile({ server, username, password, fileName, contentType, text }) {
  if (!server) throw new Error('请填写 WebDAV 服务器地址');
  if (!username) throw new Error('请填写 WebDAV 用户名');
  if (!password) throw new Error('请填写 WebDAV 密码');
  if (!fileName) throw new Error('文件名无效');
  
  const res = await fetch('/api/backup/put', {
    method: 'POST',
    headers: {
      'Content-Type': contentType || 'text/plain; charset=utf-8',
      'x-backup-file-name': fileName,
      'x-backup-server': server,
      'x-backup-username': username,
      'x-backup-password': password
    },
    body: text
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || '上传失败');
  }
}

export async function getTextFile({ server, username, password, fileName }) {
  if (!server) throw new Error('请填写 WebDAV 服务器地址');
  if (!username) throw new Error('请填写 WebDAV 用户名');
  if (!password) throw new Error('请填写 WebDAV 密码');
  if (!fileName) throw new Error('文件名无效');
  
  const res = await fetch('/api/backup/get', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ server, username, password, fileName })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || `下载失败（HTTP ${res.status}）`);
  }
  return await res.text();
}

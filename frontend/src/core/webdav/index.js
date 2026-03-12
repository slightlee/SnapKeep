const BACKUP_API_KEY = String(import.meta.env.VITE_BACKUP_API_KEY || '').trim();
const DEFAULT_BACKUP_PROXY_BASE_URL = normalizeBaseUrl(
  String(import.meta.env.VITE_BACKUP_PROXY_BASE_URL || '/api/backup').trim()
);
let runtimeBackupProxyBaseUrl = '';

function normalizeBaseUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

function resolveBackupProxyBaseUrl() {
  return normalizeBaseUrl(runtimeBackupProxyBaseUrl) || DEFAULT_BACKUP_PROXY_BASE_URL || '/api/backup';
}

function buildApiUrl(endpoint) {
  const base = resolveBackupProxyBaseUrl();
  const suffix = String(endpoint || '').startsWith('/') ? String(endpoint) : `/${String(endpoint || '')}`;
  return `${base}${suffix}`;
}

export function setBackupProxyBaseUrl(value) {
  runtimeBackupProxyBaseUrl = normalizeBaseUrl(value);
}

export function getBackupProxyBaseUrl() {
  return resolveBackupProxyBaseUrl();
}

function withApiKey(headers = {}) {
  if (!BACKUP_API_KEY) return headers;
  return {
    ...headers,
    'X-API-Key': BACKUP_API_KEY
  };
}

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(buildApiUrl(endpoint), {
      ...options,
      headers: withApiKey({
        'Content-Type': 'application/json',
        ...options.headers
      })
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

  const res = await fetch(buildApiUrl('/test'), {
    method: 'POST',
    headers: withApiKey({ 'Content-Type': 'application/json' }),
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

  const res = await fetch(buildApiUrl('/list'), {
    method: 'POST',
    headers: withApiKey({ 'Content-Type': 'application/json' }),
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

  const res = await fetch(buildApiUrl('/put'), {
    method: 'POST',
    headers: withApiKey({
      'Content-Type': contentType || 'text/plain; charset=utf-8',
      'x-backup-file-name': fileName,
      'x-backup-server': server,
      'x-backup-username': username,
      'x-backup-password': password
    }),
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

  const res = await fetch(buildApiUrl('/get'), {
    method: 'POST',
    headers: withApiKey({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({ server, username, password, fileName })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || `下载失败（HTTP ${res.status}）`);
  }
  return await res.text();
}

export async function deleteTextFile({ server, username, password, fileName }) {
  if (!server) throw new Error('请填写 WebDAV 服务器地址');
  if (!username) throw new Error('请填写 WebDAV 用户名');
  if (!password) throw new Error('请填写 WebDAV 密码');
  if (!fileName) throw new Error('文件名无效');

  const data = await apiFetch('/delete', {
    method: 'POST',
    body: JSON.stringify({ server, username, password, fileName })
  });
  return data;
}

import http from 'node:http';
import { pipeline } from 'node:stream/promises';
import { readJsonBody, sendError, sendJson } from './http.js';
import { normalizeServerUrl, validateServerUrl } from './ssrf.js';
import { buildAuthHeaders, createWebdavRequest, listBackups, testConnection, createDirectory, getTargetUrl } from './webdav.js';

const PORT = Number.parseInt(process.env.PORT || process.env.BACKUP_PROXY_PORT || '3001', 10);

function pickHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function readFileNameFromRequest(req, url) {
  return (
    url.searchParams.get('fileName') ||
    pickHeader(req, 'x-backup-file-name') ||
    pickHeader(req, 'x-backup-filename') ||
    ''
  );
}

function readContentTypeFromRequest(req, url) {
  return (
    url.searchParams.get('contentType') ||
    pickHeader(req, 'x-backup-content-type') ||
    pickHeader(req, 'content-type') ||
    'application/octet-stream'
  );
}

function ensureFileNameSafe(fileName) {
  const value = String(fileName || '').trim();
  if (!value) throw new Error('文件名无效');
  if (value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw new Error('文件名不合法');
  }
  return value;
}

async function resolveAuth(payload) {
  const server = String(payload?.server || '').trim();
  const username = String(payload?.username || '').trim();
  const password = String(payload?.password || '');
  if (!server) throw new Error('请填写 WebDAV 服务器地址');
  if (!username) throw new Error('请填写 WebDAV 用户名');
  if (!password) throw new Error('请填写 WebDAV 密码');
  return {
    server: normalizeServerUrl(server),
    username,
    password
  };
}

async function handleTest(req, res) {
  const payload = await readJsonBody(req);
  const auth = await resolveAuth(payload);
  auth.server = await validateServerUrl(auth.server);
  await testConnection(auth);
  sendJson(res, 200, { success: true, message: '连接成功' });
}

async function handleList(req, res) {
  const payload = await readJsonBody(req);
  const auth = await resolveAuth(payload);
  auth.server = await validateServerUrl(auth.server);
  const items = await listBackups(auth);
  sendJson(res, 200, { success: true, data: items });
}

async function handleGet(req, res) {
  const payload = await readJsonBody(req);
  const fileName = ensureFileNameSafe(payload?.fileName);
  const auth = await resolveAuth(payload);
  auth.server = await validateServerUrl(auth.server);
  const targetUrl = getTargetUrl(auth.server, fileName);
  const upstreamReq = createWebdavRequest({
    url: targetUrl,
    method: 'GET',
    headers: buildAuthHeaders(auth)
  });
  upstreamReq.on('response', (upstreamRes) => {
    const status = upstreamRes.statusCode || 0;
    if (status < 200 || status >= 300) {
      const chunks = [];
      upstreamRes.on('data', (chunk) => chunks.push(chunk));
      upstreamRes.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        sendError(res, 502, text ? `下载失败：${text}` : `下载失败（HTTP ${status}）`);
      });
      return;
    }
    res.statusCode = 200;
    res.setHeader(
      'Content-Type',
      upstreamRes.headers['content-type'] || 'text/plain; charset=utf-8'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    pipeline(upstreamRes, res).catch(() => {
      if (!res.headersSent) {
        sendError(res, 502, '下载失败');
      }
    });
  });
  upstreamReq.on('error', (err) => {
    sendError(res, 502, err.message || '下载失败');
  });
  upstreamReq.end();
}

async function handlePut(req, res, url) {
  const fileName = ensureFileNameSafe(readFileNameFromRequest(req, url));
  const contentType = readContentTypeFromRequest(req, url);
  const contentLength = pickHeader(req, 'content-length');
  
  const webdavServer = pickHeader(req, 'x-backup-server');
  const webdavUsername = pickHeader(req, 'x-backup-username');
  const webdavPassword = pickHeader(req, 'x-backup-password');
  
  if (!webdavServer || !webdavUsername || !webdavPassword) {
    throw new Error('WebDAV 认证信息不完整');
  }
  
  const auth = {
    server: await validateServerUrl(webdavServer),
    username: webdavUsername,
    password: webdavPassword
  };
  
  const targetUrl = getTargetUrl(auth.server, fileName);
  
  const serverUrl = auth.server.endsWith('/') ? auth.server : auth.server + '/';
  const snapkeepDir = `${serverUrl}snapkeep/`;
  await createDirectory({
    server: auth.server,
    username: auth.username,
    password: auth.password,
    directoryPath: snapkeepDir
  });
  
  const headers = {
    ...buildAuthHeaders(auth),
    'Content-Type': contentType
  };
  if (contentLength) {
    headers['Content-Length'] = contentLength;
  }
  const upstreamReq = createWebdavRequest({
    url: targetUrl,
    method: 'PUT',
    headers
  });
  let responded = false;
  let errorSize = 0;
  upstreamReq.on('response', (upstreamRes) => {
    const status = upstreamRes.statusCode || 0;
    const chunks = [];
    upstreamRes.on('data', (chunk) => {
      if (errorSize < 64 * 1024) {
        chunks.push(chunk);
        errorSize += chunk.length;
      }
    });
    upstreamRes.on('end', () => {
      if (responded) return;
      responded = true;
      if (status >= 200 && status < 300) {
        sendJson(res, 200, { success: true, message: '上传成功' });
      } else {
        const text = Buffer.concat(chunks).toString('utf8');
        sendError(res, 502, text ? `上传失败：${text}` : `上传失败（HTTP ${status}）`);
      }
    });
  });
  upstreamReq.on('error', (err) => {
    if (responded) return;
    responded = true;
    sendError(res, 502, err.message || '上传失败');
  });
  req.on('aborted', () => {
    upstreamReq.destroy(new Error('客户端中断请求'));
  });
  
  req.pipe(upstreamReq);
}

async function handleDelete(req, res) {
  const payload = await readJsonBody(req);
  const fileName = ensureFileNameSafe(payload?.fileName);
  const auth = await resolveAuth(payload);
  auth.server = await validateServerUrl(auth.server);
  const targetUrl = getTargetUrl(auth.server, fileName);
  const upstreamReq = createWebdavRequest({
    url: targetUrl,
    method: 'DELETE',
    headers: buildAuthHeaders(auth)
  });
  let responded = false;
  let errorSize = 0;
  upstreamReq.on('response', (upstreamRes) => {
    const status = upstreamRes.statusCode || 0;
    const chunks = [];
    upstreamRes.on('data', (chunk) => {
      if (errorSize < 64 * 1024) {
        chunks.push(chunk);
        errorSize += chunk.length;
      }
    });
    upstreamRes.on('end', () => {
      if (responded) return;
      responded = true;
      if (status >= 200 && status < 300) {
        sendJson(res, 200, { success: true, message: '删除成功' });
      } else {
        const text = Buffer.concat(chunks).toString('utf8');
        sendError(res, 502, text ? `删除失败：${text}` : `删除失败（HTTP ${status}）`);
      }
    });
  });
  upstreamReq.on('error', (err) => {
    if (responded) return;
    responded = true;
    sendError(res, 502, err.message || '删除失败');
  });
  upstreamReq.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  try {
    if (req.method === 'GET' && pathname === '/api/backup/health') {
      sendJson(res, 200, { success: true, message: 'ok' });
      return;
    }
    if (req.method === 'POST' && pathname === '/api/backup/test') {
      await handleTest(req, res);
      return;
    }
    if (req.method === 'POST' && pathname === '/api/backup/list') {
      await handleList(req, res);
      return;
    }
    if (req.method === 'POST' && pathname === '/api/backup/get') {
      await handleGet(req, res);
      return;
    }
    if (req.method === 'POST' && pathname === '/api/backup/put') {
      await handlePut(req, res, url);
      return;
    }
    if (req.method === 'POST' && pathname === '/api/backup/delete') {
      await handleDelete(req, res);
      return;
    }
    sendError(res, 404, '接口不存在');
  } catch (err) {
    sendError(res, 400, err?.message || '请求失败');
  }
});

server.listen(PORT, () => {
  console.log(`Backup proxy listening on http://localhost:${PORT}`);
});

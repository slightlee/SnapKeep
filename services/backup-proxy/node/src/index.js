import './loadEnv.js';
import http from 'node:http';
import { pipeline } from 'node:stream/promises';
import { readJsonBody, sendError, sendJson } from './http.js';
import { normalizeServerUrl, validateServerUrl } from './ssrf.js';
import {
  buildAuthHeaders,
  createDirectory,
  createWebdavRequest,
  getTargetUrl,
  listBackups,
  testConnection
} from './webdav.js';

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value || ''), 10);
  if (Number.isNaN(n) || n <= 0) return fallback;
  return n;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

const PORT = Number.parseInt(process.env.PORT || process.env.BACKUP_PROXY_PORT || '3001', 10);
const JSON_BODY_MAX_BYTES = parsePositiveInt(process.env.JSON_BODY_MAX_BYTES, 1024 * 1024);
const UPLOAD_BODY_MAX_BYTES = parsePositiveInt(process.env.UPLOAD_BODY_MAX_BYTES, 8 * 1024 * 1024);
const RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = parsePositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, 120);
const BACKUP_API_KEY = String(process.env.BACKUP_API_KEY || '').trim();
const REQUIRE_WORKER_TOKEN = parseBoolean(process.env.REQUIRE_WORKER_TOKEN, false);
const WORKER_TOKEN = String(process.env.WORKER_TOKEN || '').trim();
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const ALLOWED_ORIGIN_SET = new Set(ALLOWED_ORIGINS);
const CORS_ALLOW_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-API-Key',
  'X-Backup-File-Name',
  'X-Backup-Filename',
  'X-Backup-Content-Type',
  'X-Backup-Server',
  'X-Backup-Username',
  'X-Backup-Password'
].join(', ');

const rateLimitStore = new Map();

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

function setCorsHeaders(req, res) {
  if (!ALLOWED_ORIGIN_SET.size) return true;
  const origin = pickHeader(req, 'origin');
  if (!origin) return true;
  if (!ALLOWED_ORIGIN_SET.has(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS);
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}

function readBearerToken(req) {
  const authorization = String(pickHeader(req, 'authorization') || '').trim();
  if (!authorization.toLowerCase().startsWith('bearer ')) return '';
  return authorization.slice(7).trim();
}

function isAuthorized(req) {
  if (!BACKUP_API_KEY) return true;
  const headerKey = String(pickHeader(req, 'x-api-key') || '').trim();
  const bearerToken = readBearerToken(req);
  return headerKey === BACKUP_API_KEY || bearerToken === BACKUP_API_KEY;
}

function isLoopbackAddress(address) {
  if (!address) return false;
  if (address === '127.0.0.1' || address === '::1') return true;
  if (address.startsWith('::ffff:')) {
    const ipv4 = address.slice(7);
    return ipv4 === '127.0.0.1';
  }
  return false;
}

function isWorkerAuthorized(req) {
  if (!REQUIRE_WORKER_TOKEN) return true;
  if (!WORKER_TOKEN) return false;
  if (isLoopbackAddress(req.socket?.remoteAddress || '')) return true;
  const token = String(pickHeader(req, 'x-worker-token') || '').trim();
  return token === WORKER_TOKEN;
}

function readClientIp(req) {
  const forwarded = String(pickHeader(req, 'x-forwarded-for') || '').trim();
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || 'unknown';
}

function consumeRateLimit(ip) {
  const now = Date.now();
  if (rateLimitStore.size > 10000) {
    for (const [key, item] of rateLimitStore.entries()) {
      if (item.resetAt <= now) rateLimitStore.delete(key);
    }
  }

  const current = rateLimitStore.get(ip);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return true;
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  return true;
}

function resolveErrorStatus(err) {
  const message = String(err?.message || '');
  if (message.includes('请求体过大') || message.includes('上传内容过大')) return 413;
  if (message.includes('未授权')) return 401;
  return 400;
}

async function parseJson(req) {
  return readJsonBody(req, { maxBytes: JSON_BODY_MAX_BYTES });
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
  const payload = await parseJson(req);
  const auth = await resolveAuth(payload);
  auth.server = await validateServerUrl(auth.server);
  await testConnection(auth);
  sendJson(res, 200, { success: true, message: '连接成功' });
}

async function handleList(req, res) {
  const payload = await parseJson(req);
  const auth = await resolveAuth(payload);
  auth.server = await validateServerUrl(auth.server);
  const items = await listBackups(auth);
  sendJson(res, 200, { success: true, data: items });
}

async function handleGet(req, res) {
  const payload = await parseJson(req);
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
    res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'text/plain; charset=utf-8');
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

  if (contentLength) {
    const bytes = Number.parseInt(contentLength, 10);
    if (Number.isNaN(bytes) || bytes < 0) {
      throw new Error('Content-Length 无效');
    }
    if (bytes > UPLOAD_BODY_MAX_BYTES) {
      throw new Error(`上传内容过大，最大 ${UPLOAD_BODY_MAX_BYTES} bytes`);
    }
  }

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

  const serverUrl = auth.server.endsWith('/') ? auth.server : `${auth.server}/`;
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
  let uploadBytes = 0;
  let errorSize = 0;

  const handlePayloadTooLarge = () => {
    if (responded) return;
    responded = true;
    req.unpipe(upstreamReq);
    sendError(res, 413, `上传内容过大，最大 ${UPLOAD_BODY_MAX_BYTES} bytes`);
    upstreamReq.destroy(new Error('上传内容过大'));
    req.destroy();
  };

  req.on('data', (chunk) => {
    if (responded) return;
    uploadBytes += chunk.length;
    if (uploadBytes > UPLOAD_BODY_MAX_BYTES) {
      handlePayloadTooLarge();
    }
  });

  req.on('aborted', () => {
    upstreamReq.destroy(new Error('客户端中断请求'));
  });

  req.on('error', (err) => {
    if (responded) return;
    responded = true;
    upstreamReq.destroy(err);
    sendError(res, 400, err.message || '上传失败');
  });

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
    if (String(err?.message || '').includes('上传内容过大')) {
      sendError(res, 413, `上传内容过大，最大 ${UPLOAD_BODY_MAX_BYTES} bytes`);
      return;
    }
    sendError(res, 502, err.message || '上传失败');
  });

  req.pipe(upstreamReq);
}

async function handleDelete(req, res) {
  const payload = await parseJson(req);
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

  if (pathname.startsWith('/api/backup/')) {
    const corsOk = setCorsHeaders(req, res);
    if (!corsOk) {
      sendError(res, 403, '请求来源未被允许');
      return;
    }
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!pathname.startsWith('/api/backup/')) {
    sendError(res, 404, '接口不存在');
    return;
  }

  if (REQUIRE_WORKER_TOKEN && !WORKER_TOKEN) {
    sendError(res, 500, '服务端配置错误：缺少 WORKER_TOKEN');
    return;
  }
  if (!isWorkerAuthorized(req)) {
    sendError(res, 401, '未授权：请通过 Worker 访问');
    return;
  }

  if (pathname !== '/api/backup/health') {
    if (!isAuthorized(req)) {
      sendError(res, 401, '未授权：请提供有效的 API Key');
      return;
    }
    const clientIp = readClientIp(req);
    const allowed = consumeRateLimit(clientIp);
    if (!allowed) {
      res.setHeader('Retry-After', String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)));
      sendError(res, 429, '请求过于频繁，请稍后再试');
      return;
    }
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
    sendError(res, resolveErrorStatus(err), err?.message || '请求失败');
  }
});

server.listen(PORT, () => {
  console.log(`Backup proxy listening on http://localhost:${PORT}`);
});

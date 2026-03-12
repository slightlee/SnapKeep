import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

export function buildAuthHeaders({ username, password }) {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    Authorization: `Basic ${token}`
  };
}

export function createWebdavRequest({ url, method, headers }) {
  const parsed = new URL(url);
  const client = parsed.protocol === 'https:' ? https : http;
  const options = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method,
    headers: {
      ...headers,
      'User-Agent': 'SnapKeep-BackupProxy/0.1.0'
    }
  };
  return client.request(options);
}

export function getTargetUrl(server, fileName) {
  // 确保服务器地址以 / 结尾
  const serverUrl = server.endsWith('/') ? server : server + '/';
  const snapkeepDir = `${serverUrl}snapkeep/`;
  return `${snapkeepDir}${fileName}`;
}

function parsePropfindXml(xmlText) {
  // 简单的 XML 解析，提取 response 元素
  const responses = [];
  const responseRegex = /<[^:>]*:response[^>]*>([\s\S]*?)<\/[^:>]*:response>/g;
  let match;
  while ((match = responseRegex.exec(xmlText)) !== null) {
    const responseContent = match[1];
    const hrefMatch = responseContent.match(/<[^:>]*:href[^>]*>([^<]*)<\/[^:>]*:href>/);
    const lastModMatch = responseContent.match(/<[^:>]*:getlastmodified[^>]*>([^<]*)<\/[^:>]*:getlastmodified>/);
    const lenMatch = responseContent.match(/<[^:>]*:getcontentlength[^>]*>([^<]*)<\/[^:>]*:getcontentlength>/);
    responses.push({
      href: hrefMatch ? hrefMatch[1] : '',
      lastModified: lastModMatch ? lastModMatch[1] : null,
      size: lenMatch ? Number.parseInt(lenMatch[1], 10) : null
    });
  }
  return responses;
}

function extractBasenameFromHref(href) {
  try {
    const decoded = decodeURIComponent(href);
    const parts = decoded.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    const parts = String(href || '').split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }
}

async function webdavRequest(url, options) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        ...options.headers,
        'User-Agent': 'SnapKeep-BackupProxy/0.1.0'
      }
    };
    const req = client.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text,
          headers: res.headers
        });
      });
    });
    req.on('error', (err) => {
      reject(new Error(`网络请求失败: ${err.message}`));
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

export async function testConnection({ server, username, password }) {
  const headers = buildAuthHeaders({ username, password });
  const result = await webdavRequest(server, {
    method: 'PROPFIND',
    headers: {
      ...headers,
      Depth: '1'
    }
  });
  if (!result.ok) {
    throw new Error(`连接失败（HTTP ${result.status}）`);
  }
  if (result.text && /<parsererror/i.test(result.text)) {
    throw new Error('连接失败：返回内容无法解析（可能不是 WebDAV 目录）');
  }
  return true;
}

export async function createDirectory({ server, username, password, directoryPath }) {
  const headers = buildAuthHeaders({ username, password });
  const result = await webdavRequest(directoryPath, {
    method: 'MKCOL',
    headers
  });
  if (!result.ok && result.status !== 405) {
    throw new Error(`创建目录失败（HTTP ${result.status}）`);
  }
  return true;
}

export async function listBackups({ server, username, password }) {
  const headers = buildAuthHeaders({ username, password });
  // 确保服务器地址以 / 结尾
  const serverUrl = server.endsWith('/') ? server : server + '/';
  const snapkeepDir = `${serverUrl}snapkeep/`;
  const result = await webdavRequest(snapkeepDir, {
    method: 'PROPFIND',
    headers: {
      ...headers,
      Depth: '1'
    }
  });
  if (!result.ok) {
    throw new Error(`获取列表失败（HTTP ${result.status}）`);
  }
  const items = parsePropfindXml(result.text)
    .map((it) => {
      const name = extractBasenameFromHref(it.href);
      return { name, lastModified: it.lastModified, size: it.size };
    })
    .filter(
      (it) => it.name && it.name.startsWith('snapkeep-backup-') && it.name.endsWith('.encrypted')
    );
  items.sort((a, b) => {
    const ta = a.lastModified ? new Date(a.lastModified).getTime() : 0;
    const tb = b.lastModified ? new Date(b.lastModified).getTime() : 0;
    return tb - ta;
  });
  return items;
}

import ipaddr from 'ipaddr.js';
import { URL } from 'node:url';

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '[::]', '0.0.0.0']);
const ALLOWED_WEBDAV_HOSTS = String(process.env.ALLOWED_WEBDAV_HOSTS || '')
  .split(',')
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

function isHostAllowed(hostname) {
  if (!ALLOWED_WEBDAV_HOSTS.length) return true;
  const normalizedHost = String(hostname || '').toLowerCase();
  return ALLOWED_WEBDAV_HOSTS.some((rule) => {
    if (rule.startsWith('*.')) {
      const suffix = rule.slice(1); // .example.com
      return normalizedHost.endsWith(suffix) && normalizedHost.length > suffix.length;
    }
    return normalizedHost === rule;
  });
}

function isPrivateIP(ip) {
  try {
    const addr = ipaddr.parse(ip);
    // 检查是否为私有地址
    if (addr.kind() === 'ipv4') {
      // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
      const octets = addr.octets;
      return (
        octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168) ||
        octets[0] === 127 ||
        (octets[0] === 169 && octets[1] === 254)
      );
    } else {
      // IPv6 私有地址检查
      // ::1/128 (loopback), fc00::/7 (unique local), fe80::/10 (link-local)
      const parts = addr.parts;
      return (
        parts.every((p) => p === 0) || // ::
        (parts[0] >= 0xfc00 && parts[0] <= 0xfdff) || // fc00::/7
        (parts[0] & 0xffc0) === 0xfe80 // fe80::/10
      );
    }
  } catch {
    return false;
  }
}

export function normalizeServerUrl(url) {
  const u = String(url || '').trim();
  if (!u) throw new Error('请填写 WebDAV 服务器地址');
  return u.endsWith('/') ? u : `${u}/`;
}

export async function validateServerUrl(url) {
  const normalized = normalizeServerUrl(url);
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('服务器地址格式无效');
  }

  // 只允许 http 和 https 协议
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅支持 HTTP 或 HTTPS 协议');
  }

  const hostname = parsed.hostname;

  if (!isHostAllowed(hostname)) {
    throw new Error('服务器地址不在允许列表');
  }

  // 检查是否为本地主机名
  if (BLOCKED_HOSTS.has(hostname.toLowerCase())) {
    throw new Error('服务器地址不能指向本地地址');
  }

  // 检查是否为 IP 地址
  let isIP = false;
  try {
    ipaddr.parse(hostname);
    isIP = true;
  } catch {
    isIP = false;
  }

  if (isIP && isPrivateIP(hostname)) {
    throw new Error('服务器地址不能指向内网地址');
  }

  // 检查端口（只允许标准端口或常见 WebDAV 端口）
  const port = parsed.port;
  if (port) {
    const portNum = Number.parseInt(port, 10);
    if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error('端口号无效');
    }
  }

  return normalized;
}

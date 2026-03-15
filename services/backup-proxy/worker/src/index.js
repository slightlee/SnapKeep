const API_PREFIX = '/api/backup';

function jsonError(status, message) {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function normalizeUpstreamBase(env) {
  const raw = String(env.UPSTREAM_BASE_URL || '').trim();
  if (!raw) {
    throw new Error('缺少 UPSTREAM_BASE_URL');
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('UPSTREAM_BASE_URL 格式无效');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('UPSTREAM_BASE_URL 仅支持 HTTP 或 HTTPS 协议');
  }
  return parsed;
}

function joinPath(basePath, suffix) {
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  if (!suffix) return normalizedBase || '/';
  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
  if (normalizedBase === '/') return normalizedSuffix;
  return normalizedBase + normalizedSuffix;
}

function buildUpstreamUrl(baseUrl, incomingUrl) {
  const { pathname } = incomingUrl;
  if (pathname !== API_PREFIX && !pathname.startsWith(`${API_PREFIX}/`)) {
    return null;
  }
  const suffix = pathname.slice(API_PREFIX.length);
  const upstream = new URL(baseUrl.toString());
  upstream.pathname = joinPath(upstream.pathname, suffix);
  upstream.search = incomingUrl.search;
  return upstream;
}

function buildForwardHeaders(request, incomingUrl, workerToken) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('x-worker-token');
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    headers.set('x-forwarded-for', cfIp);
  }
  headers.set('x-forwarded-proto', incomingUrl.protocol.replace(':', ''));
  headers.set('x-forwarded-host', incomingUrl.host);
  if (workerToken) {
    headers.set('x-worker-token', workerToken);
  }
  return headers;
}

export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    let upstreamBase;
    try {
      upstreamBase = normalizeUpstreamBase(env);
    } catch (err) {
      return jsonError(500, err?.message || 'UPSTREAM_BASE_URL 无效');
    }

    const upstreamUrl = buildUpstreamUrl(upstreamBase, incomingUrl);
    if (!upstreamUrl) {
      return jsonError(404, '接口不存在');
    }

    const workerToken = String(env.WORKER_TOKEN || '').trim();
    const headers = buildForwardHeaders(request, incomingUrl, workerToken);
    try {
      const response = await fetch(upstreamUrl.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: 'manual'
      });
      return new Response(response.body, {
        status: response.status,
        headers: response.headers
      });
    } catch (err) {
      return jsonError(502, err?.message || '上游请求失败');
    }
  }
};

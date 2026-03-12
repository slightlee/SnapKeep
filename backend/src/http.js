export function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { success: false, message });
}

function normalizeMaxBytes(maxBytes) {
  const value = Number(maxBytes);
  if (!Number.isFinite(value) || value <= 0) return 1024 * 1024;
  return Math.floor(value);
}

export async function readJsonBody(req, options = {}) {
  const maxBytes = normalizeMaxBytes(options.maxBytes);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;

    const finishReject = (err) => {
      if (done) return;
      done = true;
      reject(err);
    };

    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > maxBytes) {
        finishReject(new Error(`请求体过大，最大 ${maxBytes} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        if (!text) {
          done = true;
          resolve({});
          return;
        }
        done = true;
        resolve(JSON.parse(text));
      } catch (err) {
        finishReject(new Error('请求体 JSON 解析失败'));
      }
    });
    req.on('error', (err) => finishReject(err));
  });
}

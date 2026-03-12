export function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { success: false, message });
}

export async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        if (!text) {
          resolve({});
          return;
        }
        resolve(JSON.parse(text));
      } catch (err) {
        reject(new Error('请求体 JSON 解析失败'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

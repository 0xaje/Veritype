import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { executeQloo, OPERATIONS } from './qloo.js';
const port = Number(process.env.PORT || 3000);
function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { status: 'ok', qloo: 'not_checked' });
  if (req.method !== 'POST' || req.url !== '/api/qloo/execute') return send(res, 404, { error: 'Not found' });
  if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return send(res, 403, { error: 'Local access only' });
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
      if (body.length > 65536) return send(res, 413, { error: 'Request too large' });
    }
    const { operation, input } = JSON.parse(body);
    if (!OPERATIONS.has(operation)) return send(res, 400, { error: 'Unsupported operation' });
    const result = await executeQloo(operation, input);
    send(res, 200, { audit_id: randomUUID(), captured_at: new Date().toISOString(), result });
  } catch (error) {
    console.error('Execution failed:', error.message);
    send(res, 502, { error: 'Execution failed; check local logs' });
  }
});
server.listen(port, '127.0.0.1', () => console.log('Veritype local foundation on http://127.0.0.1:' + port));

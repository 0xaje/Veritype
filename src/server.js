import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { executeQloo, OPERATIONS } from './qloo.js';
import { runBrandAudit } from './audit.js';
const port = Number(process.env.PORT || 3100);
function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { status: 'ok', qloo: 'not_checked' });
  if (req.method !== 'POST' || !['/api/qloo/execute', '/api/audits/brand'].includes(req.url)) return send(res, 404, { error: 'Not found' });
  // This is a development-only endpoint. Do not expose it publicly.
  if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return send(res, 403, { error: 'Local access only' });
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
      if (body.length > 65536) return send(res, 413, { error: 'Request too large' });
    }
    let payload;
    try { payload = JSON.parse(body); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
    if (req.url === '/api/audits/brand') {
      let audit;
      try { audit = await runBrandAudit(payload); }
      catch (error) {
        if (error instanceof TypeError) return send(res, 400, { error: error.message });
        throw error;
      }
      return send(res, 200, audit);
    }
    const { operation, input } = payload ?? {};
    if (!OPERATIONS.has(operation)) return send(res, 400, { error: 'Unsupported operation' });
    if (!input || typeof input !== 'object' || Array.isArray(input)) return send(res, 400, { error: 'Input must be an object' });
    const result = await executeQloo(operation, input);
    send(res, 200, { execution_id: randomUUID(), captured_at: new Date().toISOString(), result });
  } catch (error) {
    // The Qloo subprocess may include sensitive data in diagnostic output.
    console.error('Qloo execution failed:', error.message);
    send(res, 502, { error: 'Qloo execution failed', code: 'UPSTREAM_ERROR' });
  }
});
server.listen(port, '127.0.0.1', () => console.log('Veritype local foundation on http://127.0.0.1:' + port));

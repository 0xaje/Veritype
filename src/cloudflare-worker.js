import { createQlooHttp } from './qloo-http.js';
import { createQlooHttpExecutor } from './qloo-http-executor.js';
import { summarizeRecommendations } from './evidence.js';

const TTL = 15 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff' }
});
async function body(request) {
  if (Number(request.headers.get('content-length') ?? 0) > 8192) throw new TypeError('Request too large');
  const text = await request.text();
  if (text.length > 8192) throw new TypeError('Request too large');
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('Expected JSON object');
  return parsed;
}
async function readSession(db, id, kind) {
  if (typeof id !== 'string' || !UUID.test(id)) throw new TypeError('Invalid session ID');
  const row = await db.prepare('SELECT payload FROM verification_sessions WHERE id = ? AND kind = ? AND expires_at > ?')
    .bind(id, kind, Date.now()).first();
  if (!row) throw new TypeError('Session expired or not found; search again');
  return JSON.parse(row.payload);
}
async function writeSession(db, id, kind, payload) {
  await db.prepare('INSERT INTO verification_sessions (id, kind, payload, expires_at) VALUES (?, ?, ?, ?)')
    .bind(id, kind, JSON.stringify(payload), Date.now() + TTL).run();
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      if (!env.ASSETS) return json({ error: 'Static assets binding missing' }, 503);
      // Public Worker UI is separate from the Node-only local app.
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return env.ASSETS.fetch(new Request(new URL('/worker.html', request.url), request));
      }
      if (['/app.js', '/history.js', '/revision-guard.js'].includes(url.pathname)) return json({ error: 'Local-only application unavailable' }, 404);
      return env.ASSETS.fetch(request);
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'JSON content type required' }, 415);
    if (request.headers.get('origin') !== url.origin) return json({ error: 'Same-origin browser request required' }, 403);
    if (!env.QLOO_API_KEY || !env.DB) return json({ error: 'Server configuration incomplete' }, 503);
    // A persistent per-IP quota is required before any public API request reaches Qloo.
    if (!env.RATE_LIMIT) return json({ error: 'Rate limiting not configured' }, 503);
    const clientIP = request.headers.get('cf-connecting-ip');
    if (!clientIP) return json({ error: 'Cloudflare client identity required' }, 403);
    const bucket = Math.floor(Date.now() / 60000);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIP));
    const ipHash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    const quotaKey = 'v1:' + bucket + ':' + ipHash;
    // KV is eventually consistent: this is a best-effort abuse guard, not a strict atomic quota.
    const used = Number(await env.RATE_LIMIT.get(quotaKey) ?? 0);
    if (used >= 10) return json({ error: 'Request limit reached; try again shortly' }, 429);
    await env.RATE_LIMIT.put(quotaKey, String(used + 1), { expirationTtl: 120 });
    if (!['/api/search', '/api/select', '/api/discover'].includes(url.pathname)) return json({ error: 'Route unavailable' }, 404);
    try {
      const input = await body(request);
      if (url.pathname === '/api/search') {
        const result = await createQlooHttp({ apiKey: env.QLOO_API_KEY }).search(input);
        const search_id = crypto.randomUUID();
        const matches = result.matches.map(item => ({ id: item.entity_id ?? item.id, name: item.name, type: item.type ?? null }))
          .filter(item => typeof item.id === 'string' && UUID.test(item.id) && typeof item.name === 'string');
        await writeSession(env.DB, search_id, 'search', { matches });
        return json({ ...result, matches, search_id, expires_in_seconds: TTL / 1000 });
      }
      if (url.pathname === '/api/select') {
        const session = await readSession(env.DB, input.search_id, 'search');
        const match = session.matches.find(item => item.id.toLowerCase() === String(input.entity_id ?? '').toLowerCase());
        if (!match) throw new TypeError('Entity not present in selected Qloo search');
        const verification_token = crypto.randomUUID();
        await writeSession(env.DB, verification_token, 'selection', { entity: match });
        return json({ status: 'selected_from_qloo_results', verification_token, entity: match });
      }
      const session = await readSession(env.DB, input.verification_token, 'selection');
      const execute = createQlooHttpExecutor({ apiKey: env.QLOO_API_KEY });
      const evidence = await execute('recommend', { target_type: 'brand', signals: [session.entity.id], limit: 10, explain: true });
      const assessment = summarizeRecommendations(evidence, { candidateName: typeof input.candidate_name === 'string' ? input.candidate_name : undefined });
      return json({ status: 'QLOO_RECOMMENDATIONS', source_entity_id: session.entity.id,
        assessment, provenance: evidence.provenance,
        note: 'Qloo affinity is not a commercial outcome prediction; top-N absence is not negative evidence.' });
    } catch (error) {
      if (error instanceof TypeError || error instanceof SyntaxError) return json({ error: error.message }, 400);
      return json({ error: 'Upstream or persistence failure; no evidence verdict available' }, 502);
    }
  }
};

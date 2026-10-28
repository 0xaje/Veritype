import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/cloudflare-worker.js';

function setup() {
  const rows = new Map();
  const kv = new Map();
  const env = {
    QLOO_API_KEY: 'unit-test-only',
    RATE_LIMIT: {
      async get(k) { return kv.get(k) ?? null; },
      async put(k, v) { kv.set(k, v); }
    },
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async run() {
                if (!sql.startsWith('INSERT')) throw Error('Unexpected SQL');
                rows.set(args[0], { kind: args[1], payload: args[2], expires_at: args[3] });
              },
              async first() {
                if (!sql.startsWith('SELECT')) throw Error('Unexpected SQL');
                const r = rows.get(args[0]);
                return r?.kind === args[1] && r.expires_at > args[2] ? { payload: r.payload } : null;
              }
            };
          }
        };
      }
    }
  };
  const call = (path, payload = {}, headers = {}) => worker.fetch(new Request('https://veritype.example' + path, {
    method: 'POST', headers: { origin: 'https://veritype.example', 'content-type': 'application/json',
      'cf-connecting-ip': '203.0.113.10', ...headers }, body: JSON.stringify(payload)
  }), env);
  return { env, call, rows };
}
test('Worker fails closed without rate limiter', async () => {
  const { env, call } = setup();
  delete env.RATE_LIMIT;
  assert.equal((await call('/api/search', { query: 'Stranger Things' })).status, 503);
});
test('Worker rejects cross-site requests and non-JSON input', async () => {
  const { call } = setup();
  assert.equal((await call('/api/search', {}, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('/api/search', {}, { 'content-type': 'text/plain' })).status, 415);
});
test('Worker rejects unknown routes without Qloo requests', async () => {
  const { call } = setup();
  assert.equal((await call('/api/qloo/execute')).status, 404);
});
test('Worker rejects missing or fabricated selection sessions', async () => {
  const { call } = setup();
  const response = await call('/api/select', { search_id: crypto.randomUUID(), entity_id: crypto.randomUUID() });
  assert.equal(response.status, 400);
});
test('Worker applies request quota before calling upstream', async () => {
  const { call } = setup();
  for (let i = 0; i < 10; i++) await call('/api/qloo/execute');
  assert.equal((await call('/api/qloo/execute')).status, 429);
});
test('Worker refuses discover without a verified selection', async () => {
  const { call } = setup();
  assert.equal((await call('/api/discover', { verification_token: crypto.randomUUID() })).status, 400);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../src/cloudflare-worker.js';

test('Worker root serves public-only interface, not Node local application', async () => {
  const paths = [];
  const env = { ASSETS: { fetch: async request => {
    paths.push(new URL(request.url).pathname);
    return new Response('asset');
  } } };
  const result = await worker.fetch(new Request('https://veritype.example/'), env);
  assert.equal(result.status, 200);
  assert.deepEqual(paths, ['/worker.html']);
  const denied = await worker.fetch(new Request('https://veritype.example/app.js'), env);
  assert.equal(denied.status, 404);
});
test('Public UI references only supported Worker routes', async () => {
  const html = await readFile(new URL('../public/worker.html', import.meta.url), 'utf8');
  const js = await readFile(new URL('../public/worker-app.js', import.meta.url), 'utf8');
  assert.match(html, /worker-app\.js/);
  for (const path of ['/api/search', '/api/select', '/api/discover']) assert.ok(js.includes(path));
  assert.doesNotMatch(js, /\/api\/audits|\/api\/plans\/extract|\/api\/qloo\/execute/);
});

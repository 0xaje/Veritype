import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPlan, validateExtraction } from '../src/plan-extraction.js';
const plan = 'Launch a Stranger Things campaign with Nike and Converse.';
test('accepts exact grounded excerpts and returns a reviewable draft', async () => {
  let calls = 0;
  const result = await extractPlan({ plan }, { apiKey: 'test-only', model: 'test-model',
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.openai.com/v1/chat/completions');
      assert.equal(JSON.parse(options.body).messages[1].content, plan);
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({
        source_name: 'Stranger Things', source_excerpt: 'Stranger Things campaign',
        claims: [{ dimension: 'brand', candidate: 'Nike', excerpt: 'Nike and Converse' }]
      }) } }] }) };
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 'draft_requires_review');
  assert.equal(result.review.qloo_calls_made, 0);
  assert.equal(result.claims[0].candidate, 'Nike');
});
test('rejects invented claims and fabricated excerpts', () => {
  assert.throws(() => validateExtraction(plan, { source_name: null, source_excerpt: null,
    claims: [{ dimension: 'brand', candidate: 'Adidas', excerpt: 'Nike and Converse' }] }), /grounded/);
});
test('refuses to pretend extraction worked without a configured model', async () => {
  await assert.rejects(extractPlan({ plan }, { apiKey: '', model: '' }), { code: 'MODEL_NOT_CONFIGURED' });
});

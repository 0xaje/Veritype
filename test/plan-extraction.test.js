import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPlan, validateExtraction } from '../src/plan-extraction.js';

const plan = 'Launch a Stranger Things campaign with Nike and Converse.';

test('accepts exact grounded excerpts and returns a reviewable draft using Ollama mock', async () => {
  let calls = 0;
  const result = await extractPlan({ plan }, {
    model: 'test-model',
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'http://127.0.0.1:11434/api/chat');
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'test-model');
      assert.equal(body.stream, false);
      assert.equal(body.messages[1].content, `<PLAN>\n${plan}\n</PLAN>`);
      assert.ok(body.format && typeof body.format === 'object');
      return {
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              source_name: 'Stranger Things',
              source_excerpt: 'Stranger Things campaign',
              claims: [{ dimension: 'brand', candidate: 'Nike', excerpt: 'Nike and Converse' }]
            })
          }
        })
      };
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 'draft_requires_review');
  assert.equal(result.extraction.method, 'ollama_model');
  assert.equal(result.extraction.model, 'test-model');
  assert.equal(result.review.qloo_calls_made, 0);
  assert.equal(result.claims[0].candidate, 'Nike');
});

test('retains option to support OpenAI provider with apiKey', async () => {
  let calls = 0;
  const result = await extractPlan({ plan }, {
    provider: 'openai',
    apiKey: 'test-key',
    model: 'gpt-4o-mini',
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.openai.com/v1/chat/completions');
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                source_name: 'Stranger Things',
                source_excerpt: 'Stranger Things campaign',
                claims: [{ dimension: 'brand', candidate: 'Nike', excerpt: 'Nike and Converse' }]
              })
            }
          }]
        })
      };
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.extraction.method, 'openai_model');
  assert.equal(result.claims[0].candidate, 'Nike');
});

test('rejects invented claims and fabricated excerpts', () => {
  assert.throws(() => validateExtraction(plan, {
    source_name: null,
    source_excerpt: null,
    claims: [{ dimension: 'brand', candidate: 'Adidas', excerpt: 'Nike and Converse' }]
  }), /grounded/);
});

test('refuses to pretend extraction worked without a configured model', async () => {
  await assert.rejects(extractPlan({ plan }, { model: '' }), { code: 'MODEL_NOT_CONFIGURED' });
});

test('returns clear error when Ollama is unavailable', async () => {
  await assert.rejects(
    extractPlan({ plan }, {
      model: 'test-model',
      fetchImpl: async () => { throw new Error('ECONNREFUSED'); }
    }),
    /Ollama extraction unavailable/
  );
});

test('runs live extraction against local Ollama model if available', async (t) => {
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
  try {
    const ping = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    if (!ping.ok) return t.skip('Ollama daemon not responding');
  } catch {
    return t.skip('Ollama daemon not reachable');
  }

  const result = await extractPlan(
    { plan: 'Launch a Stranger Things campaign with Nike.' },
    { model }
  );

  assert.equal(result.status, 'draft_requires_review');
  assert.equal(result.extraction.method, 'ollama_model');
  assert.equal(result.extraction.grounded, true);
  assert.ok(Array.isArray(result.claims));
  assert.ok(result.claims.length > 0);
  assert.equal(result.claims[0].dimension, 'brand');
  assert.equal(result.review.qloo_calls_made, 0);
});

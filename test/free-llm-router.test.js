import test from 'node:test';
import assert from 'node:assert/strict';
import { extractWithFreeProviders } from '../src/free-llm-router.js';

const plan = 'Launch a Stranger Things campaign with Nike.';
const valid = JSON.stringify({source_name:'Stranger Things',source_excerpt:'Stranger Things',claims:[{dimension:'brand',candidate:'Nike',excerpt:'Nike'}]});
const env = {GROQ_API_KEY:'test-key',GROQ_FREE_MODEL:'configured-free-groq',GEMINI_API_KEY:'test-key',GEMINI_FREE_MODEL:'configured-free-gemini',OPENROUTER_API_KEY:'test-key',OPENROUTER_FREE_MODEL:'configured:free'};
test('falls back from rate-limited provider and validates grounded output', async () => {
  const called = [];
  const fetchImpl = async url => {
    called.push(url);
    if (called.length === 1) return {ok:false,status:429};
    return {ok:true,json:async()=>({choices:[{message:{content:valid}}]})};
  };
  const result = await extractWithFreeProviders(plan,{env,fetchImpl});
  assert.equal(result.extraction.provider,'gemini');
  assert.equal(called.length,2);
  assert.equal(result.claims[0].candidate,'Nike');
});
test('rejects fabricated extraction and never claims success', async () => {
  const fetchImpl = async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({source_name:'Stranger Things',source_excerpt:'Stranger Things',claims:[{dimension:'brand',candidate:'Adidas',excerpt:'Adidas'}]})}}]})});
  await assert.rejects(extractWithFreeProviders(plan,{env,fetchImpl}),/All configured free extraction providers unavailable/);
});
test('rejects unconfigured providers',async()=>{
  await assert.rejects(extractWithFreeProviders(plan,{env:{}}),/No free extraction providers configured/);
});
test('skips OpenRouter model not explicitly marked free',async()=>{
  await assert.rejects(extractWithFreeProviders(plan,{env:{OPENROUTER_API_KEY:'key',OPENROUTER_FREE_MODEL:'paid-model'},fetchImpl:async()=>{throw Error('must not call')}}),/model not explicitly free/);
});

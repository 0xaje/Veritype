import test from 'node:test';
import assert from 'node:assert/strict';
import { createQlooHttpExecutor } from '../src/qloo-http-executor.js';
import { summarizeRecommendations } from '../src/evidence.js';
const source='07F1170E-BB69-4982-82C6-255F477EBBAD';
const vans='AC8F9047-F23D-4A54-BBAA-A3CBD2991C02';
const input={target_type:'brand',signals:[source],limit:10,explain:true};
test('HTTP recommendations preserve Qloo affinity in evidence contract',async()=>{
  const execute=createQlooHttpExecutor({apiKey:'test-key',fetchImpl:async()=>({
    ok:true,json:async()=>({success:true,results:{entities:[{id:vans,name:'Vans',query:{affinity:0.9348}}]},query:{}})
  })});
  const raw=await execute('recommend',input);
  const assessment=summarizeRecommendations(raw,{candidateName:'Vans'});
  assert.equal(assessment.candidate.affinity,0.9348);
  assert.equal(assessment.verdict,'OBSERVED_IN_RESULTS');
  assert.equal(raw.upstream.success,true);
});
test('HTTP rank remains unavailable until live comparison verified',async()=>{
  const execute=createQlooHttpExecutor({apiKey:'test-key',fetchImpl:async()=>{throw Error('unexpected network call')}});
  await assert.rejects(execute('rank',{options:['Nike','Vans'],signals:[source]}),/not yet verified/);
});
test('HTTP adapter rejects upstream failure without inventing evidence',async()=>{
  const execute=createQlooHttpExecutor({apiKey:'test-key',fetchImpl:async()=>({
    ok:true,json:async()=>({success:false,results:{entities:[]}})
  })});
  await assert.rejects(execute('recommend',input),/unsuccessful/);
});

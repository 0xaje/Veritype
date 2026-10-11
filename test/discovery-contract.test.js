import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerificationFlow } from '../src/verification-flow.js';

// Controlled contract fixtures only; these are NOT Qloo observations or demo evidence.
const sourceId='07f1170e-bb69-4982-82c6-255f477ebbad';
const brandId='11111111-1111-4111-8111-111111111111';
function fixture(){
  let clock=1000;
  const calls=[];
  const flow=createVerificationFlow({
    now:()=>clock,
    search:async()=>({matches:[{name:'Fixture Show',entity_id:sourceId,type:'urn:entity:tv_show'}]}),
    recommend:async(operation,request)=>{
      calls.push({operation,request});
      return {operation:'recommend',status:'ok',results:[{name:'Fixture Brand',entity_id:brandId,affinity:0.7}],provenance:{requests:[]}};
    }
  });
  return {flow,calls,advance:ms=>{clock+=ms;}};
}
async function verified(f){
  const search=await f.flow.search({query:'Fixture Show'});
  const selected=f.flow.select({search_id:search.search_id,entity_id:sourceId});
  return selected.verification_token;
}
test('discovery requires a verified selection token',async()=>{
  const f=fixture();
  await assert.rejects(f.flow.discover({verification_token:'not-a-token'}),/not found or expired/);
  assert.equal(f.calls.length,0);
});
test('discovery uses the selected Qloo entity and preserves returned evidence',async()=>{
  const f=fixture();
  const token=await verified(f);
  const response=await f.flow.discover({verification_token:token});
  assert.equal(response.status,'QLOO_RECOMMENDATIONS');
  assert.equal(response.source_entity_id,sourceId);
  assert.deepEqual(f.calls,[{operation:'recommend',request:{target_type:'brand',signals:[sourceId],limit:10,explain:true}}]);
  assert.equal(response.results[0].name,'Fixture Brand');
  assert.equal(response.results[0].entity_id,brandId);
  assert.equal(response.results[0].affinity,0.7);
  assert.equal(response.results[0].rank,1);
});
test('discovery rejects expired selection before contacting Qloo',async()=>{
  const f=fixture();
  const token=await verified(f);
  f.advance(15*60*1000+1);
  await assert.rejects(f.flow.discover({verification_token:token}),/not found or expired/);
  assert.equal(f.calls.length,0);
});
test('selection cannot use an entity not returned by search',async()=>{
  const f=fixture();
  const search=await f.flow.search({query:'Fixture Show'});
  assert.throws(()=>f.flow.select({search_id:search.search_id,entity_id:brandId}),/not returned/);
});

test('verification tokens cannot be reused in a different flow instance',async()=>{
  const first=fixture(),second=fixture();
  const token=await verified(first);
  await assert.rejects(second.flow.discover({verification_token:token}),/not found or expired/);
  assert.equal(second.calls.length,0);
});
test('expired search sessions cannot be selected',async()=>{
  const f=fixture();
  const search=await f.flow.search({query:'Fixture Show'});
  f.advance(15*60*1000+1);
  assert.throws(()=>f.flow.select({search_id:search.search_id,entity_id:sourceId}),/not found or expired/);
});
test('invalid Qloo recommendation response is rejected rather than represented as evidence',async()=>{
  const f=createVerificationFlow({
    search:async()=>({matches:[{entity_id:sourceId,name:'Fixture Show'}]}),
    recommend:async()=>({operation:'recommend',status:'failed',results:[]})
  });
  const search=await f.search({query:'Fixture Show'});
  const selection=f.select({search_id:search.search_id,entity_id:sourceId});
  await assert.rejects(f.discover({verification_token:selection.verification_token}),/successful Qloo recommend response is required/);
});

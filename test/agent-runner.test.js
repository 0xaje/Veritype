import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgentReview } from '../src/agent-runner.js';

const entity='07f1170e-bb69-4982-82c6-255f477ebbad';
const calls=[];
function response(body){return {ok:true,json:async()=>body};}
const fetchImpl=async(url,options)=>{
  const path=new URL(url).pathname;
  calls.push(path);
  if(path==='/api/plans/extract')return response({
    source_name:'Fixture Show',
    claims:[{dimension:'brand',candidate:'Fixture Nike',excerpt:'Fixture Nike'}],
    status:'draft_requires_review'
  });
  if(path==='/api/qloo/entities/search')return response({
    search_id:'s1',matches:[{name:'Fixture Show',entity_id:entity}]
  });
  if(path==='/api/qloo/entities/select')return response({
    verification_token:'v1',entity:{name:'Fixture Show',entity_id:entity}
  });
  if(path==='/api/qloo/brands/discover')return response({
    results:[{name:'Fixture Vans'},{name:'Fixture Nike'}]
  });
  if(path==='/api/audits/plan/verified')return response({
    audit_id:'a1',findings:[],challenges:[]
  });
  throw Error('Unexpected route '+path);
};
test('agent runner extracts via model endpoint and reviews via Qloo without repair',async()=>{
  calls.length=0;
  const result=await runAgentReview({
    plan:'Fixture Show with Fixture Nike',fetchImpl,
    chooseEntity:async matches=>matches[0].entity_id,
    chooseAlternatives:async suggestions=>suggestions.filter(x=>x.name!=='Fixture Nike').map(x=>x.name)
  });
  assert.equal(result.status,'REVIEW_REQUIRED');
  assert.equal(result.review.human_approval_required,true);
  assert.deepEqual(calls,[
    '/api/plans/extract','/api/qloo/entities/search','/api/qloo/entities/select',
    '/api/qloo/brands/discover','/api/audits/plan/verified'
  ]);
});
test('agent runner stops if operator does not verify entity',async()=>{
  calls.length=0;
  const result=await runAgentReview({
    plan:'Fixture Show with Fixture Nike',fetchImpl,chooseEntity:async()=>null
  });
  assert.equal(result.status,'ENTITY_NOT_VERIFIED');
  assert.deepEqual(calls,['/api/plans/extract','/api/qloo/entities/search']);
});
test('agent runner rejects remote base URLs before calling model',async()=>{
  calls.length=0;
  await assert.rejects(runAgentReview({
    plan:'Fixture Show with Fixture Nike',baseUrl:'https://remote.example',fetchImpl
  }),/local/);
  assert.deepEqual(calls,[]);
});

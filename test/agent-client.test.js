import test from 'node:test';
import assert from 'node:assert/strict';
import { createVeritypeAgentClient } from '../src/agent-client.js';

const entity='07f1170e-bb69-4982-82c6-255f477ebbad';
const calls=[];
const replies={
  '/api/qloo/entities/search':{search_id:'search-1',matches:[{entity_id:entity,name:'Fixture Show'}]},
  '/api/qloo/entities/select':{verification_token:'verified-1',entity:{entity_id:entity,name:'Fixture Show'}},
  '/api/qloo/brands/discover':{results:[{name:'Fixture Vans'},{name:'Fixture Nike'},{name:'Fixture Converse'}]},
  '/api/audits/plan/verified':{audit_id:'audit-1',challenges:[{status:'EVIDENCE_BACKED_CHALLENGE'}],findings:[]}
};
const fakeFetch=async(url,options)=>{
  const path=new URL(url).pathname;calls.push({path,payload:JSON.parse(options.body)});
  return {ok:true,json:async()=>replies[path]};
};
test('agent adapter obtains explicit entity selection and returns review, never repair',async()=>{
  calls.length=0;
  const client=createVeritypeAgentClient({fetchImpl:fakeFetch});
  const result=await client.inspect({
    plan:'Fixture campaign with Fixture Nike',sourceQuery:'Fixture Show',proposedBrand:'Fixture Nike',
    chooseEntity:async matches=>matches[0].entity_id,
    chooseAlternatives:async suggestions=>suggestions.filter(x=>x.name!=='Fixture Nike').map(x=>x.name)
  });
  assert.equal(result.status,'REVIEW_REQUIRED');
  assert.equal(result.review.human_approval_required,true);
  assert.deepEqual(calls.map(x=>x.path),[
    '/api/qloo/entities/search','/api/qloo/entities/select',
    '/api/qloo/brands/discover','/api/audits/plan/verified'
  ]);
  assert.deepEqual(calls[3].payload.claims[0].alternatives,['Fixture Vans','Fixture Converse']);
});
test('agent adapter stops rather than guessing an unverified entity',async()=>{
  calls.length=0;
  const result=await createVeritypeAgentClient({fetchImpl:fakeFetch}).inspect({
    plan:'Fixture campaign',sourceQuery:'Fixture Show',proposedBrand:'Fixture Nike',
    chooseEntity:async()=> 'not-returned'
  });
  assert.equal(result.status,'ENTITY_NOT_VERIFIED');
  assert.deepEqual(calls.map(x=>x.path),['/api/qloo/entities/search']);
});
test('agent adapter rejects missing entity review and remote origins',async()=>{
  assert.throws(()=>createVeritypeAgentClient({baseUrl:'https://example.com'}),/local/);
  await assert.rejects(createVeritypeAgentClient({fetchImpl:fakeFetch}).inspect({
    plan:'Fixture campaign',sourceQuery:'Fixture Show',proposedBrand:'Fixture Nike'
  }),/selection callback/);
});

test('agent sends repair only after explicit human selection and retains retest status',async()=>{
  const requests=[];
  const fetchImpl=async(url,options)=>{
    const path=new URL(url).pathname;
    requests.push({path,payload:JSON.parse(options.body)});
    if(path==='/api/audits/plan/verified')return {ok:true,json:async()=>({
      audit_id:'audit-2',challenges:[{claim_index:0,alternatives:[{entity_id:'replacement-id',name:'Fixture Vans',affinity:0.9}]}]
    })};
    if(path==='/api/audits/plan/repair')return {ok:true,json:async()=>({
      status:'RETESTED',approval:{replacement:'Fixture Vans'},after:{candidate:{name:'Fixture Vans'}}
    })};
    return {ok:true,json:async()=>replies[path]};
  };
  const client=createVeritypeAgentClient({fetchImpl});
  const args={plan:'Fixture campaign',sourceQuery:'Fixture Show',proposedBrand:'Fixture Nike',
    chooseEntity:async matches=>matches[0].entity_id,alternatives:['Fixture Vans']};
  const declined=await client.inspect({...args,approveRepair:async()=>null});
  assert.equal(declined.status,'REVIEW_REQUIRED');
  assert.equal(requests.filter(x=>x.path==='/api/audits/plan/repair').length,0);
  const approved=await client.inspect({...args,approveRepair:async()=>({claim_index:0,replacement_entity_id:'replacement-id'})});
  assert.equal(approved.status,'RETESTED');
  const repairs=requests.filter(x=>x.path==='/api/audits/plan/repair');
  assert.equal(repairs.length,1);
  assert.equal(repairs[0].payload.approved,true);
  assert.equal(repairs[0].payload.audit_id,'audit-2');
});

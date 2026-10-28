import test from 'node:test';
import assert from 'node:assert/strict';
import { createQlooHttp } from '../src/qloo-http.js';

const id = '07F1170E-BB69-4982-82C6-255F477EBBAD';
test('Qloo HTTP search requires explicit selection and sends secret in header only', async () => {
  const transport = createQlooHttp({apiKey:'test-secret',fetchImpl:async(url,options)=>{
    const u = new URL(url);
    assert.equal(u.hostname,'hackathon.api.qloo.com');
    assert.equal(u.pathname,'/search');
    assert.equal(u.searchParams.get('types'),'urn:entity:tv_show');
    assert.ok(!url.includes('test-secret'));
    assert.equal(options.headers['X-Api-Key'],'test-secret');
    return {ok:true,json:async()=>({results:[{id,name:'Stranger Things'}]})};
  }});
  const response = await transport.search({query:'Stranger Things',type:'tv_show'});
  assert.equal(response.status,'requires_selection');
  assert.equal(response.selection.automated,false);
});
test('Qloo HTTP insights retains raw upstream response, not invented workflow status',async()=>{
  const transport=createQlooHttp({apiKey:'test-secret',fetchImpl:async(url)=>{
    const u=new URL(url);
    assert.equal(u.searchParams.get('signal.interests.entities'),id);
    assert.equal(u.searchParams.get('filter.type'),'urn:entity:brand');
    return {ok:true,json:async()=>({results:{entities:[]},query:{source:'upstream'}})};
  }});
  assert.deepEqual(await transport.insights({sourceEntityId:id}),{results:{entities:[]},query:{source:'upstream'}});
});
test('Qloo HTTP refuses unexpected search schema and failed requests',async()=>{
  const t=createQlooHttp({apiKey:'test-secret',fetchImpl:async()=>({ok:true,json:async()=>({unexpected:[]})})});
  await assert.rejects(t.search({query:'Nike'}),/needs live verification/);
  const bad=createQlooHttp({apiKey:'test-secret',fetchImpl:async()=>({ok:false,status:429})});
  await assert.rejects(bad.insights({sourceEntityId:id}),/HTTP 429/);
});
test('Qloo HTTP refuses untrusted hosts and malformed inputs',()=>{
  assert.throws(()=>createQlooHttp({apiKey:'test-secret',baseUrl:'https://evil.example'}),/Untrusted/);
  assert.throws(()=>createQlooHttp({}),/required/);
});

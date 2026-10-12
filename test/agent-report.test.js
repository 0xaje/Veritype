import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAgentReport } from '../src/agent-report.js';

test('agent report is concise and does not leak full evidence payload',()=>{
  const result={
    status:'REVIEW_REQUIRED',
    extraction:{source_name:'Fixture Show',claims:[{dimension:'brand',candidate:'Fixture Nike'}]},
    audit:{findings:[{status:'EVALUATED',integrity:{status:'PASSED'},raw:{secret:'raw-data-not-for-console'}}]},
    review:{challenges:[{current:{name:'Fixture Nike',rank:2,affinity:0.7},alternatives:[{name:'Fixture Vans',rank:1,affinity:0.8}]}]}
  };
  const report=formatAgentReport(result);
  assert.match(report,/Fixture Vans/);
  assert.match(report,/Human review required/);
  assert.doesNotMatch(report,/raw-data-not-for-console/);
});
test('report does not invent successful verification for incomplete investigation',()=>{
  const report=formatAgentReport({status:'ENTITY_NOT_VERIFIED'});
  assert.match(report,/ENTITY_NOT_VERIFIED/);
  assert.doesNotMatch(report,/integrity: PASSED/);
});

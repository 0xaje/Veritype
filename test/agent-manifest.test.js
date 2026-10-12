import test from 'node:test';
import assert from 'node:assert/strict';
import { agentManifest } from '../src/agent-manifest.js';
import { readFile } from 'node:fs/promises';

test('agent contract only advertises existing POST routes',async()=>{
  const server=await readFile(new URL('../src/server.js',import.meta.url),'utf8');
  assert.equal(agentManifest.schema_version,'veritype.agent.v1');
  assert.deepEqual(agentManifest.scope,['brand']);
  for(const step of agentManifest.workflow){
    assert.equal(step.method,'POST');
    assert.ok(server.includes("'"+step.path+"'"),'Missing route: '+step.path);
    assert.ok(step.requires.length);
  }
});
test('agent contract requires human approval for repair and does not promise unsupported capabilities',()=>{
  const repair=agentManifest.workflow.find(step=>step.step==='repair');
  assert.equal(repair.human_approval_required,true);
  assert.ok(repair.requires.includes('approved'));
  assert.match(agentManifest.decision_policy.approval,/explicit approval/);
  assert.match(agentManifest.limitations.join(' '),/Local development API/);
  assert.ok(!agentManifest.scope.includes('music'));
});

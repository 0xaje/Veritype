import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerificationFlow } from '../src/verification-flow.js';
const tv = '07F1170E-BB69-4982-82C6-255F477EBBAD';
const nike = 'C70CE2B8-0AD1-4150-BF18-5A6347F2E860';
const matches = [{ name: 'Stranger Things', entity_id: tv, types: ['urn:entity:tv_show'] }];
function flow(now = () => 1000) {
  return createVerificationFlow({
    now,
    search: async () => ({ status: 'requires_selection', matches }),
    audit: async payload => ({ status: 'completed', source_entity_id: payload.source_entity_id })
  });
}
test('requires a Qloo-returned ID before issuing verification token', async () => {
  const v = flow();
  const result = await v.search({ query: 'Stranger Things' });
  assert.ok(result.search_id);
  assert.throws(() => v.select({ search_id: result.search_id, entity_id: nike }), /not returned/);
  const selection = v.select({ search_id: result.search_id, entity_id: tv });
  assert.equal(selection.status, 'selected_from_qloo_results');
  assert.equal(selection.entity.name, 'Stranger Things');
  const audited = await v.audit({ verification_token: selection.verification_token, plan: 'sample', claims: [] });
  assert.equal(audited.source_entity_id, tv);
  assert.equal(audited.source_verification.method, 'user_selected_qloo_search_result');
});
test('rejects token substitution and expired selections', async () => {
  let time = 1000;
  const v = flow(() => time);
  const search = await v.search({ query: 'Stranger Things' });
  const selected = v.select({ search_id: search.search_id, entity_id: tv });
  await assert.rejects(() => v.audit({ verification_token: selected.verification_token, source_entity_id: nike }), /does not match/);
  time += 16 * 60 * 1000;
  await assert.rejects(() => v.audit({ verification_token: selected.verification_token }), /expired/);
});

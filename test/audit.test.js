import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAuditRequest, runBrandAudit } from '../src/audit.js';
const source = '07F1170E-BB69-4982-82C6-255F477EBBAD';
test('requires a real-shaped source identifier and candidate', () => {
  assert.throws(() => validateAuditRequest({ source_entity_id: 'Stranger Things', candidate_name: 'Nike' }), /UUID/);
  assert.throws(() => validateAuditRequest({ source_entity_id: source }), /candidate/);
});
test('passes the documented Qloo schema and preserves its response unchanged', async () => {
  const upstream = { operation: 'recommend', status: 'ok', result_count: 0, results: [], provenance: { source: 'Qloo API' } };
  let operation, input;
  const audit = await runBrandAudit({ source_entity_id: source, candidate_name: 'Nike' }, {
    execute: async (op, args) => { operation = op; input = args; return upstream; },
    now: () => '2026-10-11T00:00:00.000Z', uuid: () => 'test-audit-id'
  });
  assert.equal(operation, 'recommend');
  assert.deepEqual(input, { target_type: 'brand', signals: [source], limit: 10, explain: true });
  assert.strictEqual(audit.raw_evidence, upstream);
  assert.equal(audit.assessment.verdict, 'INSUFFICIENT_EVIDENCE');
  assert.equal(audit.audit_id, 'test-audit-id');
});

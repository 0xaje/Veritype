import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRankAuditRequest, runRankAudit } from '../src/rank-audit.js';
const source = '07F1170E-BB69-4982-82C6-255F477EBBAD';
test('requires distinct candidate names and a valid source entity ID', () => {
  assert.throws(() => validateRankAuditRequest({ source_entity_id: source, candidate_name: 'Nike', alternatives: ['nike'] }), /distinct/);
  assert.throws(() => validateRankAuditRequest({ source_entity_id: 'wrong', candidate_name: 'Nike', alternatives: ['Vans'] }), /UUID/);
});
test('uses documented Qloo rank schema and preserves upstream evidence', async () => {
  const upstream = { operation: 'rank', status: 'ok', result_count: 3, results: [
    { entity_id: 'vans', name: 'Vans', affinity: 0.93 },
    { entity_id: 'converse', name: 'Converse', affinity: 0.91 },
    { entity_id: 'nike', name: 'Nike', affinity: 0.87 }
  ], provenance: { source: 'Qloo API' } };
  let operation, input;
  const audit = await runRankAudit({ source_entity_id: source, candidate_name: 'Nike', alternatives: ['Vans', 'Converse'] }, {
    execute: async (op, args) => { operation = op; input = args; return upstream; },
    now: () => '2026-10-11T00:00:00Z', uuid: () => 'test-id'
  });
  assert.equal(operation, 'rank');
  assert.deepEqual(input, { options: ['Nike', 'Vans', 'Converse'], option_type: 'brand', signals: [source] });
  assert.strictEqual(audit.raw_evidence, upstream);
  assert.equal(audit.assessment.candidate.rank, 3);
  assert.equal(audit.assessment.verdict, 'OBSERVED_IN_RANKING');
});
test('does not treat a missing ranked candidate as negative evidence', async () => {
  const upstream = { operation: 'rank', status: 'ok', results: [{ entity_id: 'vans', name: 'Vans', affinity: 0.93 }] };
  const audit = await runRankAudit({ source_entity_id: source, candidate_name: 'Nike', alternatives: ['Vans'] }, {
    execute: async () => upstream
  });
  assert.equal(audit.assessment.verdict, 'INSUFFICIENT_EVIDENCE');
});

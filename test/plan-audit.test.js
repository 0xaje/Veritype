import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlanAudit, runPlanAudit } from '../src/plan-audit.js';
const source = '07F1170E-BB69-4982-82C6-255F477EBBAD';
const plan = { plan: 'Stranger Things activation with Nike and themed dining.', source_entity_id: source,
  claims: [{ dimension: 'brand', candidate: 'Nike', alternatives: ['Vans', 'Converse'] }, { dimension: 'dining', candidate: 'Themed dining' }] };
test('rejects unsupported or incomplete explicit claim inputs', () => {
  assert.throws(() => validatePlanAudit({ ...plan, claims: [{ dimension: 'finance', candidate: 'Nike' }] }), /dimension/);
  assert.throws(() => validatePlanAudit({ ...plan, claims: [] }), /claims/);
});
test('audits only validated dimensions and preserves raw Qloo evidence', async () => {
  const upstream = { operation: 'rank', status: 'ok', results: [{ entity_id: 'nike', name: 'Nike', affinity: 0.869 }] };
  let callCount = 0;
  const result = await runPlanAudit(plan, { execute: async (op, args) => {
    callCount++;
    assert.equal(op, 'rank');
    assert.deepEqual(args.options, ['Nike', 'Vans', 'Converse']);
    return upstream;
  } });
  assert.equal(callCount, 1);
  assert.equal(result.status, 'partial');
  assert.equal(result.extraction.automated, false);
  assert.equal(result.findings[0].verdict, 'OBSERVED_IN_RANKING');
  assert.strictEqual(result.findings[0].evidence, upstream);
  assert.equal(result.findings[1].status, 'NOT_EVALUATED');
});
test('upstream failure is never represented as a cultural verdict', async () => {
  const result = await runPlanAudit({ ...plan, claims: plan.claims.slice(0, 1) }, { execute: async () => { throw Error('upstream'); } });
  assert.equal(result.findings[0].status, 'UPSTREAM_ERROR');
  assert.equal(result.findings[0].verdict, 'INSUFFICIENT_EVIDENCE');
});

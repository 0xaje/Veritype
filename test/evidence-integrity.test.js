import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRanking } from '../src/rank-evidence.js';
import { verifyRankingIntegrity } from '../src/evidence-integrity.js';
import { runRankAudit } from '../src/rank-audit.js';

const source = '07F1170E-BB69-4982-82C6-255F477EBBAD';
const raw = { operation: 'rank', status: 'ok', results: [
  { name: 'Vans', entity_id: 'vans', affinity: 0.9348198605092313 },
  { name: 'Converse', entity_id: 'converse', affinity: 0.9140490949344237 },
  { name: 'Nike', entity_id: 'nike', affinity: 0.8690863963306026 }
], provenance: { requests: [{ query: { 'signal.interests.entities': [source] } }] } };
const options = ['Nike', 'Vans', 'Converse'];
test('verified Qloo evidence keeps Nike third, never first', () => {
  const assessment = summarizeRanking(raw, { candidateName: 'Nike' });
  const integrity = verifyRankingIntegrity(raw, assessment, { candidateName: 'Nike', expectedOptions: options, sourceEntityId: source });
  assert.equal(integrity.status, 'PASSED');
  assert.equal(assessment.candidate.rank, 3);
  assert.equal(assessment.candidate.affinity, 0.8690863963306026);
});
test('detects fabricated Nike first assessment', () => {
  const assessment = summarizeRanking(raw, { candidateName: 'Nike' });
  assessment.candidate = { ...assessment.candidate, rank: 1 };
  assert.ok(verifyRankingIntegrity(raw, assessment, { candidateName: 'Nike' }).issues.includes('CANDIDATE_ASSESSMENT_MISMATCH'));
});
test('detects reversed Qloo order and withholds rank audit verdict', async () => {
  const reversed = { ...raw, results: [...raw.results].reverse() };
  const audit = await runRankAudit({ source_entity_id: source, candidate_name: 'Nike', alternatives: ['Vans','Converse'] },
    { execute: async () => reversed });
  assert.equal(audit.status, 'integrity_failed');
  assert.equal(audit.assessment.verdict, 'INSUFFICIENT_EVIDENCE');
  assert.ok(audit.integrity.issues.includes('RESULT_ORDER_CONFLICTS_WITH_AFFINITY'));
});
test('detects source provenance mismatch when provenance exists', () => {
  const wrong = { ...raw, provenance: { requests: [{ query: { 'signal.interests.entities': ['different'] } }] } };
  const assessment = summarizeRanking(wrong, { candidateName: 'Nike' });
  assert.ok(verifyRankingIntegrity(wrong, assessment, { candidateName: 'Nike', sourceEntityId: source }).issues.includes('SOURCE_SIGNAL_PROVENANCE_MISMATCH'));
});

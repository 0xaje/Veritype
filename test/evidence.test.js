import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRecommendations } from '../src/evidence.js';

const response = {
  operation: 'recommend', status: 'ok', result_count: 2,
  results: [
    { entity_id: 'vans-id', name: 'Vans', subtype: 'urn:entity:brand', affinity: 0.91 },
    { entity_id: 'converse-id', name: 'Converse', subtype: 'urn:entity:brand', affinity: 0.89 }
  ],
  provenance: { source: 'Qloo API', requests: [{ path: '/v2/insights' }] }
};
test('identifies a returned candidate without inventing commercial success', () => {
  const result = summarizeRecommendations(response, { candidateName: 'Vans' });
  assert.equal(result.verdict, 'OBSERVED_IN_RESULTS');
  assert.equal(result.candidate.affinity, 0.91);
  assert.match(result.finding, /does not establish commercial viability/);
});
test('does not equate top-N absence with incompatibility', () => {
  const result = summarizeRecommendations(response, { candidateName: 'Nike' });
  assert.equal(result.verdict, 'INSUFFICIENT_EVIDENCE');
  assert.equal(result.candidate, null);
  assert.match(result.finding, /does not establish incompatibility/);
});
test('rejects failed or malformed upstream responses', () => {
  assert.throws(() => summarizeRecommendations({ status: 'failed', results: [] }), /successful Qloo/);
});
test('preserves source provenance', () => {
  const result = summarizeRecommendations(response, { candidateId: 'converse-id' });
  assert.equal(result.provenance.source, 'Qloo API');
  assert.equal(result.candidate.rank, 2);
});

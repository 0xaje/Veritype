import { randomUUID } from 'node:crypto';
import { executeQloo } from './qloo.js';
import { summarizeRecommendations } from './evidence.js';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateAuditRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Audit request must be an object');
  const { source_entity_id, candidate_entity_id, candidate_name } = input;
  if (typeof source_entity_id !== 'string' || !ID.test(source_entity_id)) throw new TypeError('source_entity_id must be a Qloo UUID');
  if (candidate_entity_id !== undefined && (typeof candidate_entity_id !== 'string' || !ID.test(candidate_entity_id))) throw new TypeError('candidate_entity_id must be a Qloo UUID');
  if (candidate_name !== undefined && (typeof candidate_name !== 'string' || !candidate_name.trim() || candidate_name.length > 120)) throw new TypeError('candidate_name must be a non-empty string of at most 120 characters');
  if (!candidate_entity_id && !candidate_name) throw new TypeError('Provide candidate_entity_id or candidate_name');
  return { source_entity_id, candidate_entity_id, candidate_name };
}
export async function runBrandAudit(input, { execute = executeQloo, now = () => new Date().toISOString(), uuid = randomUUID } = {}) {
  const request = validateAuditRequest(input);
  const qlooInput = { target_type: 'brand', signals: [request.source_entity_id], limit: 10, explain: true };
  const result = await execute('recommend', qlooInput);
  const assessment = summarizeRecommendations(result, {
    candidateId: request.candidate_entity_id,
    candidateName: request.candidate_name
  });
  return {
    audit_id: uuid(), captured_at: now(), scope: 'brand_affinity_recommendations',
    input: request, qloo_input: qlooInput, assessment,
    raw_evidence: result,
    status: 'completed'
  };
}

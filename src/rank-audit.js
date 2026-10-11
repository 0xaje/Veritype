import { randomUUID } from 'node:crypto';
import { executeQloo } from './qloo.js';
import { summarizeRanking } from './rank-evidence.js';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateRankAuditRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Audit request must be an object');
  const { source_entity_id, candidate_name, alternatives } = value;
  if (typeof source_entity_id !== 'string' || !ID.test(source_entity_id)) throw new TypeError('source_entity_id must be a Qloo UUID');
  if (typeof candidate_name !== 'string' || !candidate_name.trim() || candidate_name.length > 120) throw new TypeError('candidate_name must be 1-120 characters');
  if (!Array.isArray(alternatives) || alternatives.length < 1 || alternatives.length > 8 || alternatives.some(name => typeof name !== 'string' || !name.trim() || name.length > 120)) {
    throw new TypeError('alternatives must contain 1-8 non-empty brand names');
  }
  const options = [candidate_name.trim(), ...alternatives.map(name => name.trim())];
  if (new Set(options.map(name => name.toLocaleLowerCase('en'))).size !== options.length) throw new TypeError('Candidate and alternatives must be distinct');
  return { source_entity_id, candidate_name: candidate_name.trim(), alternatives: options.slice(1) };
}
export async function runRankAudit(value, { execute = executeQloo, now = () => new Date().toISOString(), uuid = randomUUID } = {}) {
  const request = validateRankAuditRequest(value);
  const qlooInput = {
    options: [request.candidate_name, ...request.alternatives],
    option_type: 'brand',
    signals: [request.source_entity_id]
  };
  const result = await execute('rank', qlooInput);
  return {
    audit_id: uuid(), captured_at: now(), status: 'completed',
    scope: 'brand_candidate_comparison',
    input: request, qloo_input: qlooInput,
    assessment: summarizeRanking(result, { candidateName: request.candidate_name }),
    raw_evidence: result
  };
}

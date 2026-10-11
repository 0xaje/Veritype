import { randomUUID } from 'node:crypto';
import { executeQloo } from './qloo.js';
import { summarizeRanking } from './rank-evidence.js';
import { summarizeRecommendations } from './evidence.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIMENSIONS = new Set(['brand', 'music', 'venue', 'dining']);
const clean = value => typeof value === 'string' ? value.trim() : '';
export function validatePlanAudit(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Plan audit must be an object');
  if (!clean(value.plan) || value.plan.length > 10000) throw new TypeError('plan must contain 1-10000 characters');
  if (!UUID.test(value.source_entity_id ?? '')) throw new TypeError('source_entity_id must be a verified Qloo UUID');
  if (!Array.isArray(value.claims) || value.claims.length < 1 || value.claims.length > 12) throw new TypeError('claims must contain 1-12 explicitly identified decisions');
  const claims = value.claims.map((claim, index) => {
    if (!claim || typeof claim !== 'object' || Array.isArray(claim) || !DIMENSIONS.has(claim.dimension)) throw new TypeError('Invalid claim dimension at index ' + index);
    if (!clean(claim.candidate) || claim.candidate.length > 120) throw new TypeError('Each claim needs a candidate name (max 120 characters)');
    const alternatives = claim.alternatives ?? [];
    if (!Array.isArray(alternatives) || alternatives.length > 8 || alternatives.some(name => !clean(name) || name.length > 120)) throw new TypeError('Invalid claim alternatives');
    const options = [clean(claim.candidate), ...alternatives.map(clean)];
    if (new Set(options.map(s => s.toLocaleLowerCase('en'))).size !== options.length) throw new TypeError('Duplicate claim candidates');
    return { dimension: claim.dimension, candidate: options[0], alternatives: options.slice(1), excerpt: clean(claim.excerpt).slice(0, 500) || null };
  });
  return { plan: value.plan.trim(), source_entity_id: value.source_entity_id, claims };
}
/**
 * Explicit claim extraction is required at this stage. We do not pretend to
 * understand free-form plan text without an actual parser or LLM integration.
 */
export async function runPlanAudit(value, { execute = executeQloo, uuid = randomUUID, now = () => new Date().toISOString() } = {}) {
  const input = validatePlanAudit(value);
  const findings = [];
  for (const [index, claim] of input.claims.entries()) {
    if (claim.dimension !== 'brand') {
      findings.push({ claim_index: index, claim, status: 'NOT_EVALUATED', verdict: 'INSUFFICIENT_EVIDENCE',
        reason: 'This dimension has not been wired to a validated Qloo workflow yet.', evidence: null });
      continue;
    }
    const operation = claim.alternatives.length ? 'rank' : 'recommend';
    const request = operation === 'rank'
      ? { options: [claim.candidate, ...claim.alternatives], option_type: 'brand', signals: [input.source_entity_id] }
      : { target_type: 'brand', signals: [input.source_entity_id], limit: 10, explain: true };
    try {
      const raw = await execute(operation, request);
      const assessment = operation === 'rank'
        ? summarizeRanking(raw, { candidateName: claim.candidate })
        : summarizeRecommendations(raw, { candidateName: claim.candidate });
      findings.push({ claim_index: index, claim, status: 'EVALUATED', operation, request,
        verdict: assessment.verdict, assessment, evidence: raw });
    } catch (error) {
      findings.push({ claim_index: index, claim, status: 'UPSTREAM_ERROR', verdict: 'INSUFFICIENT_EVIDENCE',
        reason: 'Qloo execution failed; no compatibility conclusion is possible.', evidence: null });
    }
  }
  return {
    audit_id: uuid(), captured_at: now(), status: findings.every(f => f.status === 'EVALUATED') ? 'completed' : 'partial',
    scope: 'explicit_claim_plan_audit', source_entity_id: input.source_entity_id,
    plan: input.plan, extraction: { method: 'user_supplied_structured_claims', automated: false },
    findings,
    limitations: ['Unlisted claims in the free-form plan were not extracted or assessed.', 'Qloo affinity does not establish commercial success or licensing feasibility.']
  };
}

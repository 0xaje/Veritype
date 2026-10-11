import { runPlanAudit } from './plan-audit.js';

/** VT-009: generate a challenge only from an integrity-passed Qloo comparison. */
export function buildChallenges(audit) {
  return (audit?.findings ?? []).flatMap(finding => {
    if (finding.operation !== 'rank' || finding.status !== 'EVALUATED' || finding.integrity?.status !== 'PASSED') return [];
    const candidate = finding.assessment?.candidate;
    const results = finding.assessment?.results;
    if (!candidate || !Array.isArray(results) || candidate.rank < 2) return [];
    const better = results.filter(r => r.rank < candidate.rank && typeof r.affinity === 'number');
    if (!better.length) return [];
    return [{
      claim_index: finding.claim_index, status: 'EVIDENCE_BACKED_CHALLENGE',
      current: { name: candidate.name, entity_id: candidate.entity_id, rank: candidate.rank, affinity: candidate.affinity },
      alternatives: better.map(r => ({ name: r.name, entity_id: r.entity_id, rank: r.rank, affinity: r.affinity })),
      explanation: candidate.name + ' ranks #' + candidate.rank + ' of ' + results.length +
        ' among the evaluated brands. ' + better[0].name + ' ranks higher in this Qloo comparison.',
      limitation: 'Relative cultural affinity is not a prediction of campaign success, sales, or licensing feasibility.',
      action: 'User may approve a named alternative for a fresh Qloo re-test.'
    }];
  });
}
export function prepareRepair(audit, { claim_index, replacement_entity_id }) {
  if (!Number.isInteger(claim_index) || typeof replacement_entity_id !== 'string') throw new TypeError('Valid claim_index and replacement_entity_id required');
  const challenge = buildChallenges(audit).find(c => c.claim_index === claim_index);
  if (!challenge) throw new TypeError('No evidence-backed challenge for this claim');
  const chosen = challenge.alternatives.find(a => a.entity_id.toLowerCase() === replacement_entity_id.toLowerCase());
  if (!chosen) throw new TypeError('Replacement must be a higher-ranked Qloo entity from the original evidence');
  const original = audit.findings.find(f => f.claim_index === claim_index);
  const originalNames = [original.claim.candidate, ...original.claim.alternatives];
  const claims = audit.findings.map(f => {
    const claim = { ...f.claim };
    if (f.claim_index === claim_index) {
      claim.candidate = chosen.name;
      claim.alternatives = originalNames.filter(name => name.toLowerCase() !== chosen.name.toLowerCase());
    }
    return claim;
  });
  return { chosen, original, payload: { plan: audit.plan, source_entity_id: audit.source_entity_id, claims } };
}
export async function retestRepair(audit, choice, { run = runPlanAudit } = {}) {
  const { chosen, original, payload } = prepareRepair(audit, choice);
  const retest = await run(payload);
  const finding = retest.findings.find(f => f.claim_index === choice.claim_index);
  const passed = finding?.status === 'EVALUATED' && finding?.integrity?.status === 'PASSED' &&
    finding.assessment?.candidate?.entity_id?.toLowerCase() === chosen.entity_id.toLowerCase();
  return {
    status: passed ? 'RETESTED' : 'RETEST_NOT_VERIFIED',
    approval: { replacement: chosen.name, entity_id: chosen.entity_id, claim_index: choice.claim_index },
    before: { audit_id: audit.audit_id, candidate: original.assessment.candidate },
    after: { audit_id: retest.audit_id, candidate: passed ? finding.assessment.candidate : null },
    challenge: buildChallenges(audit).find(c => c.claim_index === choice.claim_index),
    retest,
    limitation: 'This is a proposed claim replacement and fresh comparison, not an automatic rewrite of the original plan.'
  };
}

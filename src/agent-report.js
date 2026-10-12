/** Compact, truthful terminal summary. Full Qloo evidence remains in the API result. */
export function formatAgentReport(result) {
  const lines = ['VERITYPE — Cultural QA', 'Status: ' + (result?.status || 'UNKNOWN')];
  if (result?.extraction?.source_name) lines.push('Source: ' + result.extraction.source_name);
  const claim = result?.extraction?.claims?.find(x=>x.dimension==='brand');
  if (claim) lines.push('Proposed brand: ' + claim.candidate);
  if (result?.comparison_context) {
    lines.push('Comparison category (operator-declared, not Qloo-verified): ' + result.comparison_context);
  }
  const findings = result?.audit?.findings || [];
  for (const finding of findings) {
    lines.push('Finding: ' + (finding.status || 'UNKNOWN') + ' / integrity: ' + (finding.integrity?.status || 'NOT_VERIFIED'));
  }
  const challenges = result?.review?.challenges || [];
  for (const challenge of challenges) {
    lines.push('Challenge: ' + challenge.current.name + ' (#' + challenge.current.rank + ', affinity ' + challenge.current.affinity + ')');
    for (const alternative of challenge.alternatives) lines.push('  Higher affinity: ' + alternative.name + ' (#' + alternative.rank + ', ' + alternative.affinity + ')');
  }
  if (result?.repair) {
    lines.push('Approved replacement: ' + result.repair.approval?.replacement);
    lines.push('Fresh Qloo retest: ' + result.repair.status);
    if (result.repair.after?.candidate) lines.push('Retested candidate: ' + result.repair.after.candidate.name);
  }
  if (result?.selected) lines.push('Selected Qloo source: ' + result.selected.name + ' [' + (result.selected.type || result.selected.types?.join(', ') || 'unknown type') + '] ' + (result.selected.entity_id || result.selected.id));
  if (result?.note) lines.push('Note: ' + result.note);
  lines.push('Decision: Human review required. Affinity does not establish category suitability, rights, or commercial feasibility.');
  return lines.join('\n');
}

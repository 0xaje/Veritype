/**
 * VT-008: fail closed if a rank assessment disagrees with raw Qloo evidence.
 * This checks internal consistency, not the authenticity of the remote provider.
 */
export function verifyRankingIntegrity(raw, assessment, { candidateName, expectedOptions, sourceEntityId } = {}) {
  const issues = [];
  if (raw?.operation !== 'rank' || raw?.status !== 'ok' || !Array.isArray(raw?.results)) issues.push('INVALID_QLOO_RANK_RESPONSE');
  const results = Array.isArray(raw?.results) ? raw.results : [];
  const seen = new Set();
  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    if (typeof item?.entity_id !== 'string' || !item.entity_id || typeof item.name !== 'string' || !item.name) {
      issues.push('INVALID_RESULT_ENTITY'); continue;
    }
    if (seen.has(item.entity_id.toLowerCase())) issues.push('DUPLICATE_RESULT_ENTITY');
    seen.add(item.entity_id.toLowerCase());
    if (typeof item.affinity !== 'number' || !Number.isFinite(item.affinity)) issues.push('MISSING_OR_INVALID_AFFINITY');
    if (i && typeof results[i-1]?.affinity === 'number' && typeof item.affinity === 'number' &&
        results[i-1].affinity < item.affinity) issues.push('RESULT_ORDER_CONFLICTS_WITH_AFFINITY');
  }
  if (!Array.isArray(assessment?.results) || assessment.results.length !== results.length) issues.push('ASSESSMENT_RESULT_COUNT_MISMATCH');
  else for (let i = 0; i < results.length; i++) {
    const source = results[i], derived = assessment.results[i];
    if (derived?.rank !== i+1 || derived?.entity_id !== source?.entity_id || derived?.name !== source?.name ||
        derived?.affinity !== source?.affinity) issues.push('ASSESSMENT_MISMATCH');
  }
  const matches = results.map((item, index) => ({ item, index })).filter(({item}) =>
    item?.name?.trim().toLowerCase() === candidateName?.trim().toLowerCase());
  if (matches.length === 1) {
    const { item, index } = matches[0];
    if (assessment?.candidate?.entity_id !== item.entity_id || assessment?.candidate?.rank !== index+1 ||
        assessment?.candidate?.affinity !== item.affinity || assessment?.verdict !== 'OBSERVED_IN_RANKING') issues.push('CANDIDATE_ASSESSMENT_MISMATCH');
  } else if (assessment?.candidate != null || assessment?.verdict !== 'INSUFFICIENT_EVIDENCE') issues.push('AMBIGUOUS_CANDIDATE_ASSESSMENT');
  if (expectedOptions && results.length > expectedOptions.length) issues.push('UNEXPECTED_RESULT_COUNT');
  if (sourceEntityId && raw?.provenance?.requests) {
    const requests = raw.provenance.requests;
    const hasSource = requests.some(r => r?.query?.['signal.interests.entities']?.includes(sourceEntityId));
    if (!hasSource) issues.push('SOURCE_SIGNAL_PROVENANCE_MISMATCH');
  }
  return { status: issues.length ? 'FAILED' : 'PASSED', issues: [...new Set(issues)], checked_results: results.length,
    note: 'Internal consistency check only. Passing does not establish commercial success or independently authenticate Qloo.' };
}

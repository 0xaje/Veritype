/**
 * Deterministic interpretation of a genuine Qloo recommend response.
 * No invented compatibility scores or negative inference from top-N absence.
 */
export function summarizeRecommendations(response, { candidateName, candidateId } = {}) {
  if (!response || response.operation !== 'recommend' || response.status !== 'ok' || !Array.isArray(response.results)) {
    throw new Error('A successful Qloo recommend response is required');
  }
  const items = response.results.map((item, index) => {
    if (typeof item.entity_id !== 'string' || typeof item.name !== 'string') throw new Error('Malformed Qloo recommendation');
    return {
      rank: index + 1,
      entity_id: item.entity_id,
      name: item.name,
      type: item.subtype ?? item.type ?? null,
      affinity: typeof item.affinity === 'number' && Number.isFinite(item.affinity) ? item.affinity : null,
      explainability: item.explainability ?? null
    };
  });
  const hasCandidate = Boolean(candidateId || candidateName);
  const normalizedName = candidateName?.trim().toLocaleLowerCase('en');
  const matches = hasCandidate ? items.filter(item =>
    (candidateId && item.entity_id.toLowerCase() === candidateId.toLowerCase()) ||
    (normalizedName && item.name.trim().toLocaleLowerCase('en') === normalizedName)
  ) : [];
  const candidate = matches.length === 1 ? matches[0] : null;
  const verdict = !hasCandidate ? 'INSUFFICIENT_EVIDENCE'
    : matches.length === 1 && candidate.affinity !== null ? 'OBSERVED_IN_RESULTS'
    : 'INSUFFICIENT_EVIDENCE';
  const finding = !hasCandidate
    ? 'No candidate was specified for assessment.'
    : matches.length > 1
      ? 'Multiple candidate matches require disambiguation by entity ID.'
      : matches.length === 1
        ? 'The candidate appears in this Qloo recommendation result. Affinity alone does not establish commercial viability.'
        : 'The candidate does not appear in these returned recommendations. Top-N absence does not establish incompatibility.';
  return {
    verdict, finding,
    candidate: candidate ? { ...candidate } : null,
    results: items,
    result_count: response.result_count ?? items.length,
    request: response.provenance?.requests ?? [],
    provenance: response.provenance ?? null,
    source_resolution: response.resolution ?? null,
    execution: response.execution ?? null,
    limitations: [
      'Qloo affinity is not a prediction of commercial success or sponsorship likelihood.',
      'A missing candidate in a limited recommendation list is not negative evidence.',
      'Entity identity and relevant market context must be verified before making partnership claims.'
    ]
  };
}

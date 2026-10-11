/**
 * Interprets a live Qloo rank response without inferring business outcomes.
 * Rankings are only relative to the submitted candidate set and signal.
 */
export function summarizeRanking(response, { candidateName, candidateId } = {}) {
  if (!response || response.operation !== 'rank' || response.status !== 'ok' || !Array.isArray(response.results)) {
    throw new Error('A successful Qloo rank response is required');
  }
  const results = response.results.map((item, index) => {
    if (typeof item.entity_id !== 'string' || typeof item.name !== 'string') throw new Error('Malformed Qloo rank result');
    return {
      rank: index + 1,
      entity_id: item.entity_id,
      name: item.name,
      type: item.subtype ?? item.type ?? null,
      affinity: typeof item.affinity === 'number' && Number.isFinite(item.affinity) ? item.affinity : null
    };
  });
  const selected = results.filter(item =>
    (candidateId && item.entity_id.toLowerCase() === candidateId.toLowerCase()) ||
    (candidateName && item.name.toLocaleLowerCase('en') === candidateName.trim().toLocaleLowerCase('en'))
  );
  const candidate = selected.length === 1 ? selected[0] : null;
  const resolution = response.resolution?.outcomes ?? [];
  const unresolved = resolution.filter(item => item.status !== 'resolved');
  return {
    verdict: candidate?.affinity !== null && candidate ? 'OBSERVED_IN_RANKING' : 'INSUFFICIENT_EVIDENCE',
    finding: selected.length > 1
      ? 'Multiple candidate matches; select a Qloo entity ID.'
      : candidate
        ? 'The candidate has a measured Qloo affinity within this specific comparison set. This does not establish commercial viability.'
        : 'The candidate was not present in the returned ranking. No negative compatibility conclusion can be drawn.',
    candidate,
    results,
    result_count: response.result_count ?? results.length,
    unresolved,
    resolution: response.resolution ?? null,
    provenance: response.provenance ?? null,
    execution: response.execution ?? null,
    limitations: [
      'Affinity is not a prediction of sponsorship success, sales, or causal effect.',
      'Rank order is relative to the candidate set provided, not all possible brands.',
      'Entity resolution and the source signal must be checked before interpretation.'
    ]
  };
}

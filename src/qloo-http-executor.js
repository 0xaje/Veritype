import { createQlooHttp } from './qloo-http.js';

/**
 * Evidence adapter for the verified Qloo Insights HTTP endpoint.
 * Supports recommendation ONLY. Ranking is intentionally disabled until a
 * live, identity-verified comparison contract is established.
 */
export function createQlooHttpExecutor({ apiKey, fetchImpl, baseUrl } = {}) {
  const http = createQlooHttp({ apiKey, fetchImpl, baseUrl });
  return async function execute(operation, input) {
    if (operation !== 'recommend') {
      const error = new Error('Qloo HTTP ' + operation + ' is not yet verified; ranking and repair disabled');
      error.code = 'QLOO_HTTP_OPERATION_UNVERIFIED';
      throw error;
    }
    if (!input || input.target_type !== 'brand' || !Array.isArray(input.signals) || input.signals.length !== 1 ||
        !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 20) {
      throw new TypeError('Unsupported Qloo HTTP recommendation input');
    }
    const raw = await http.insights({
      sourceEntityId: input.signals[0], targetType: 'brand', take: input.limit,
      explain: input.explain === true
    });
    if (raw.success !== true || !Array.isArray(raw.results?.entities)) {
      throw new Error('Qloo HTTP insights returned an unsuccessful or unexpected response');
    }
    const results = raw.results.entities.map(entity => {
      const id = entity?.entity_id ?? entity?.id;
      const affinity = entity?.query?.affinity ?? entity?.affinity;
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) ||
          typeof entity?.name !== 'string' || !entity.name.trim() ||
          typeof affinity !== 'number' || !Number.isFinite(affinity)) {
        throw new Error('Qloo HTTP entity missing verified identity or affinity');
      }
      return {
        entity_id: id, name: entity.name, type: entity.type ?? null,
        subtype: entity.subtype ?? null, affinity,
        explainability: entity.query?.explainability ?? entity.explainability ?? null
      };
    });
    return {
      status: 'ok', operation: 'recommend', results, result_count: results.length,
      provenance: {
        provider: 'qloo_http_insights',
        endpoint: '/v2/insights',
        requests: [{ operation: 'recommend', source_entity_id: input.signals[0], target_type: 'brand', limit: input.limit }],
        upstream_query: raw.query ?? null
      },
      // Raw response is retained separately for inspection, not fabricated.
      upstream: raw
    };
  };
}

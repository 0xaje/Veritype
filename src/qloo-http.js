import { validateEntitySearch } from './entity-search-validation.js';

/**
 * Direct HTTPS Qloo transport for Worker-compatible runtimes.
 * Returns RAW Qloo API payloads, NOT normalized qloo exec workflow results.
 * Never substitute this output for the CLI harness contract without verified mapping.
 */
export function createQlooHttp({ apiKey, baseUrl = 'https://hackathon.api.qloo.com', fetchImpl = fetch, timeoutMs = 20000 } = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('QLOO_API_KEY is required');
  const origin = new URL(baseUrl);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('Qloo base URL must be an HTTPS origin');
  // Limit egress to the documented Qloo origin or explicitly used event origin.
  if (!['api.qloo.com', 'hackathon.api.qloo.com'].includes(origin.hostname)) throw new Error('Untrusted Qloo host');
  async function get(path, params) {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url.toString(), { method: 'GET', headers: { 'X-Api-Key': apiKey, accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error('Qloo HTTP request failed (HTTP ' + response.status + ')');
    const body = await response.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid Qloo HTTP response');
    return body;
  }
  return {
    async search(value) {
      const { query, type, take } = validateEntitySearch(value);
      const params = { query, take };
      if (type) params.types = 'urn:entity:' + (type === 'restaurant' ? 'place' : type === 'music_artist' ? 'artist' : type);
      const raw = await get('/search', params);
      // Fail closed if the actual response contract differs from the documented shape.
      if (!Array.isArray(raw.results)) throw new Error('Qloo search response contract needs live verification');
      return { status: 'requires_selection', provider: 'qloo_http_search', query, requested_type: type,
        matches: raw.results, selection: { automated: false, verified_entity_id: null },
        note: 'Raw Qloo search candidates require explicit human selection; not affinity evidence.' };
    },
    async insights({ sourceEntityId, targetType = 'brand', take = 10, explain = true, resultEntityIds } = {}) {
      if (typeof sourceEntityId !== 'string' || !/^[a-f0-9-]{36}$/i.test(sourceEntityId)) throw new TypeError('Invalid source entity ID');
      if (!['brand','artist','movie','tv_show','place','book','destination','podcast','videogame','person'].includes(targetType)) throw new TypeError('Unsupported target type');
      if (!Number.isInteger(take) || take < 1 || take > 20) throw new TypeError('Invalid take');
      if (resultEntityIds !== undefined && (!Array.isArray(resultEntityIds) || !resultEntityIds.length || resultEntityIds.length > 20 || resultEntityIds.some(id => typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)))) throw new TypeError('Invalid comparison entity IDs');
      return get('/v2/insights', {
        'filter.type': 'urn:entity:' + targetType,
        'signal.interests.entities': sourceEntityId,
        'filter.results.entities': resultEntityIds?.join(','),
        'feature.explainability': explain ? 'true' : 'false',
        take
      });
    }
  };
}

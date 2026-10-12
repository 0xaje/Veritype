/**
 * Local agent adapter: the agent proposes, Veritype verifies, the human decides.
 * This adapter never selects ambiguous Qloo entities or approves a repair itself.
 */
export function createVeritypeAgentClient({ baseUrl = 'http://127.0.0.1:3100', fetchImpl = fetch } = {}) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
      parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new TypeError('Agent client only supports a local Veritype HTTP origin');
  }
  async function request(path, payload) {
    const response = await fetchImpl(new URL(path, parsed), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Veritype API returned HTTP ' + response.status);
    return body;
  }
  return {
    async inspect({ plan, sourceQuery, proposedBrand, alternatives = [], chooseEntity }) {
      if (typeof plan !== 'string' || !plan.trim() || typeof sourceQuery !== 'string' || !sourceQuery.trim() ||
          typeof proposedBrand !== 'string' || !proposedBrand.trim()) throw new TypeError('Plan, sourceQuery and proposedBrand are required');
      if (typeof chooseEntity !== 'function') throw new TypeError('An explicit Qloo entity-selection callback is required');
      if (!Array.isArray(alternatives) || alternatives.some(x => typeof x !== 'string' || !x.trim())) throw new TypeError('Invalid alternatives');
      const search = await request('/api/qloo/entities/search', { query: sourceQuery });
      const entityId = await chooseEntity(search.matches);
      const matches = Array.isArray(search.matches) ? search.matches : [];
      const selected = matches.find(x => (x.entity_id || x.id)?.toLowerCase() === entityId?.toLowerCase());
      if (!selected) return { status: 'ENTITY_NOT_VERIFIED', matches, note: 'No Qloo-returned entity was selected; no audit performed.' };
      const selection = await request('/api/qloo/entities/select', { search_id: search.search_id, entity_id: entityId });
      const discovery = await request('/api/qloo/brands/discover', { verification_token: selection.verification_token });
      const choices = alternatives.length ? alternatives : (discovery.results || [])
        .filter(x => x.name && x.name.toLowerCase() !== proposedBrand.toLowerCase())
        .slice(0, 5).map(x => x.name);
      if (!choices.length) return { status: 'NO_COMPARISON', selected: selection.entity, discovery, note: 'No brands available for ranked comparison.' };
      const audit = await request('/api/audits/plan/verified', {
        verification_token: selection.verification_token, plan,
        claims: [{ dimension: 'brand', candidate: proposedBrand, alternatives: choices }]
      });
      return {
        status: 'REVIEW_REQUIRED', selected: selection.entity, discovery, audit,
        review: { challenges: audit.challenges || [], human_approval_required: true,
          note: 'An agent must not claim an alternative was approved or adopted.' }
      };
    }
  };
}

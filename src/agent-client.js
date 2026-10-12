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
    async inspect({ plan, sourceQuery, proposedBrand, alternatives = [], chooseEntity, chooseAlternatives }) {
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
      // Discovery is a broad cultural candidate pool, not category-validated partners.
      // Never silently promote its top entries into an auditable partnership shortlist.
      const suggested = (discovery.results || []).filter(x => x.name && x.name.toLowerCase() !== proposedBrand.toLowerCase());
      const choices = alternatives.length ? alternatives : typeof chooseAlternatives === 'function'
        ? await chooseAlternatives(suggested, proposedBrand) : [];
      if (!Array.isArray(choices) || choices.some(x => typeof x !== 'string' || !x.trim())) {
        throw new TypeError('Comparison choices must be a list of brand names');
      }
      if (!choices.length) return { status: 'NEEDS_COMPARISON_REVIEW', selected: selection.entity, discovery,
        note: 'Qloo discovery is not a category-specific partner shortlist. Select relevant comparable brands before ranking.' };
      if (choices.length > 8 || new Set([proposedBrand, ...choices].map(x=>x.trim().toLowerCase())).size !== choices.length + 1) {
        throw new TypeError('Choose at most eight distinct alternatives excluding the proposed brand');
      }
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

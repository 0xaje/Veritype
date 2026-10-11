import { randomUUID } from 'node:crypto';
import { searchQlooEntities } from './entity-search.js';
import { runPlanAudit } from './plan-audit.js';
import { buildChallenges, retestRepair } from './challenge-repair.js';

const sessions = new Map();
const TTL_MS = 15 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function prune(now) { for (const [id, entry] of sessions) if (entry.expires_at_ms <= now) sessions.delete(id); }
function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim() || value.length > 120) throw new TypeError(field + ' must be 1-120 characters');
  return value.trim();
}
export function createVerificationFlow({ search = searchQlooEntities, audit = runPlanAudit, now = Date.now } = {}) {
  return {
    async search(value) {
      const result = await search(value);
      if (!Array.isArray(result.matches)) throw new Error('Qloo search returned invalid matches');
      const search_id = randomUUID();
      const current = now();
      prune(current);
      sessions.set(search_id, { matches: result.matches, expires_at_ms: current + TTL_MS, selected: null });
      return { ...result, search_id, expires_in_seconds: TTL_MS / 1000 };
    },
    select(value) {
      const search_id = requireText(value?.search_id, 'search_id');
      const entity_id = requireText(value?.entity_id, 'entity_id');
      if (!UUID.test(entity_id)) throw new TypeError('entity_id must be a Qloo UUID');
      const current = now();
      prune(current);
      const entry = sessions.get(search_id);
      if (!entry) throw new TypeError('Search session not found or expired; search Qloo again');
      const match = entry.matches.find(item => {
        const id = item?.entity_id ?? item?.id;
        return typeof id === 'string' && id.toLowerCase() === entity_id.toLowerCase();
      });
      if (!match) throw new TypeError('Entity ID was not returned by this Qloo search');
      entry.selected = { entity_id, match };
      const verification_token = randomUUID();
      sessions.set(verification_token, { selected: entry.selected, expires_at_ms: current + TTL_MS, kind: 'verified_selection' });
      return { status: 'selected_from_qloo_results', verification_token, entity: match,
        note: 'User selected an entity returned by Qloo. This is identity confirmation, not an affinity assessment.' };
    },
    async audit(value) {
      const token = requireText(value?.verification_token, 'verification_token');
      const current = now();
      prune(current);
      const entry = sessions.get(token);
      if (!entry || entry.kind !== 'verified_selection') throw new TypeError('Verification token not found or expired');
      if (value.source_entity_id && value.source_entity_id.toLowerCase() !== entry.selected.entity_id.toLowerCase()) {
        throw new TypeError('source_entity_id does not match selected Qloo entity');
      }
      const result = await audit({ ...value, source_entity_id: entry.selected.entity_id });
      const challenges = buildChallenges(result);
      sessions.set(result.audit_id, { kind: 'audited_plan', audit: result, verification_token: token, expires_at_ms: current + TTL_MS });
      return { ...result, challenges, source_verification: {
        method: 'user_selected_qloo_search_result',
        entity: entry.selected.match,
        selected_entity_id: entry.selected.entity_id
      } };
    },
    async repair(value) {
      const audit_id = requireText(value?.audit_id, 'audit_id');
      const verification_token = requireText(value?.verification_token, 'verification_token');
      const current = now();
      prune(current);
      const stored = sessions.get(audit_id);
      const verified = sessions.get(verification_token);
      if (!stored || stored.kind !== 'audited_plan' || stored.verification_token !== verification_token ||
          !verified || verified.kind !== 'verified_selection') throw new TypeError('Audit or verification expired; run verified audit again');
      if (value?.approved !== true) throw new TypeError('Explicit user approval is required');
      const result = await retestRepair(stored.audit, value, { run: audit });
      return { ...result, source_verification: {
        method: 'user_selected_qloo_search_result',
        selected_entity_id: verified.selected.entity_id
      } };
    }
  };
}

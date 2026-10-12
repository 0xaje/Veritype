/**
 * Machine-readable capability discovery for agents.
 * This contract advertises only existing, local endpoints. No automatic
 * commercial decisions or external actions are implied.
 */
export const agentManifest = Object.freeze({
  schema_version: 'veritype.agent.v1',
  name: 'Veritype',
  description: 'Evidence-backed cultural-affinity review of proposed brand partnerships using Qloo.',
  scope: ['brand'],
  limitations: [
    'Local development API only; no public agent authentication or hosted service.',
    'Qloo affinity does not establish sponsorship rights, feasibility, sales or campaign success.',
    'An agent must not present Qloo recommendations as a verified comparative audit.',
    'Repairs require explicit human approval and fresh Qloo evidence.'
  ],
  workflow: [
    { step: 'search', method: 'POST', path: '/api/qloo/entities/search', requires: ['query'], produces: ['search_id', 'matches'] },
    { step: 'select', method: 'POST', path: '/api/qloo/entities/select', requires: ['search_id', 'entity_id'], produces: ['verification_token'] },
    { step: 'discover', method: 'POST', path: '/api/qloo/brands/discover', requires: ['verification_token'], produces: ['results'] },
    { step: 'audit', method: 'POST', path: '/api/audits/plan/verified', requires: ['verification_token', 'plan', 'claims'], produces: ['audit_id', 'findings', 'challenges'] },
    { step: 'repair', method: 'POST', path: '/api/audits/plan/repair', requires: ['audit_id', 'verification_token', 'claim_index', 'replacement_entity_id', 'approved'], produces: ['status', 'retest'], human_approval_required: true }
  ],
  decision_policy: {
    challenge_requires: ['ranked Qloo comparison', 'PASSED integrity', 'higher-ranked evidenced alternative'],
    missing_evidence: 'INSUFFICIENT_EVIDENCE',
    approval: 'An AI agent cannot self-assert human approval; obtain explicit approval before calling repair.'
  }
});

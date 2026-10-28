const $ = id => document.getElementById(id);
const state = { token: null, revision: 0 };
const make = (tag, text, cls) => { const el = document.createElement(tag); if (text != null) el.textContent = String(text); if (cls) el.className = cls; return el; };
const clear = el => el.replaceChildren();
function notice(message, isError = false) { clear($('notice')); $('notice').append(make('p', message, isError ? 'error' : 'hint')); }
function invalidate() { state.revision++; state.token = null; $('discover').disabled = true; $('selected').textContent = 'No source verified yet.'; clear($('matches')); clear($('results')); }
async function post(path, data) {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  let result; try { result = await response.json(); } catch { throw new Error('Invalid server response'); }
  if (!response.ok) throw new Error(result.error || 'Request failed (' + response.status + ')');
  return result;
}
async function busy(button, work) {
  button.disabled = true;
  const old = button.textContent; button.textContent = 'Working…';
  try { await work(); } catch (error) { notice(error.message, true); }
  finally { button.textContent = old; if (button !== $('discover') || state.token) button.disabled = false; }
}
$('source').addEventListener('input', invalidate);
$('candidate').addEventListener('input', () => { state.revision++; clear($('results')); });
$('search').addEventListener('click', () => busy($('search'), async () => {
  const query = $('source').value.trim(); if (!query) throw new Error('Enter a source name.');
  invalidate(); const revision = state.revision;
  const result = await post('/api/search', { query, take: 10 });
  if (revision !== state.revision) return;
  if (!Array.isArray(result.matches) || !result.matches.length) { notice('Qloo returned no matching entities.'); return; }
  const duplicateNames = new Map();
  for (const item of result.matches) duplicateNames.set(item.name, (duplicateNames.get(item.name) || 0) + 1);
  for (const item of result.matches) {
    const row = make('div', null, 'match'); const info = make('div');
    info.append(make('strong', item.name));
    info.append(make('p', (item.type || 'Qloo entity') + ' · ID ' + item.id.slice(0, 8) + '…', 'entity-meta'));
    if (duplicateNames.get(item.name) > 1) info.append(make('small', 'Same name, distinct Qloo entity ID — verify before selecting.', 'entity-caution'));
    const button = make('button', 'Select source', 'secondary'); button.type = 'button';
    button.addEventListener('click', () => busy(button, async () => {
      const current = state.revision;
      const selected = await post('/api/select', { search_id: result.search_id, entity_id: item.id });
      if (current !== state.revision) return;
      state.token = selected.verification_token;
      $('selected').textContent = 'Verified Qloo entity: ' + selected.entity.name + ' · ' + selected.entity.id;
      $('discover').disabled = false;
      clear($('results'));
      notice('Source verified. Retrieve live Qloo recommendations.');
    }));
    row.append(info, button); $('matches').append(row);
  }
  notice('Select the correct entity from ' + result.matches.length + ' real Qloo search matches.');
}));
$('discover').addEventListener('click', () => busy($('discover'), async () => {
  if (!state.token) throw new Error('Select a source first.');
  const revision = state.revision;
  const candidate = $('candidate').value.trim();
  const response = await post('/api/discover', { verification_token: state.token, candidate_name: candidate || undefined });
  if (revision !== state.revision) return;
  const root = $('results'); clear(root);
  const assessment = response.assessment;
  if (!assessment || !Array.isArray(assessment.results)) throw new Error('Unexpected evidence response.');
  const observed = assessment.candidate;
  const summary = make('section', null, 'verdict-card');
  summary.append(make('p', 'LIVE QLOO EVIDENCE / VERIFIED SOURCE', 'verdict-kicker'));
  if (candidate) {
    const found = assessment.verdict === 'OBSERVED_IN_RESULTS' && observed;
    summary.append(make('h3', found ? candidate + ' · Observed in results' : candidate + ' · ' + (assessment.verdict || 'Assessment available')));
    if (found) {
      const metrics = make('div', null, 'verdict-metrics');
      const rank = make('div'); rank.append(make('strong', '#' + observed.rank), make('span', 'Rank in returned top ' + assessment.results.length));
      const affinity = make('div'); affinity.append(make('strong', Number.isFinite(observed.affinity) ? observed.affinity.toFixed(4) : 'Unavailable'), make('span', 'Qloo affinity'));
      metrics.append(rank, affinity); summary.append(metrics);
    }
    summary.append(make('p', assessment.finding || 'This evidence does not establish commercial viability.', 'verdict-explainer'));
  } else {
    summary.append(make('h3', assessment.results.length + ' cultural recommendations'));
    summary.append(make('p', 'Live Qloo recommendations for your human-verified source.', 'verdict-explainer'));
  }
  summary.append(make('p', 'Affinity is not a probability of sponsorship, sales, or commercial success.', 'verdict-disclaimer'));
  root.append(summary);
  const heading = make('div', null, 'ranking-title');
  heading.append(make('h4', 'Ranked cultural signals'), make('span', assessment.results.length + ' Qloo results'));
  root.append(heading);
  for (const item of assessment.results) {
    const isCandidate = !!candidate && item.entity_id === observed?.entity_id && assessment.verdict === 'OBSERVED_IN_RESULTS';
    const row = make('div', null, 'affinity-row' + (isCandidate ? ' is-proposed' : ''));
    const label = make('div', null, 'affinity-label');
    label.append(make('span', '#' + item.rank + '  ' + item.name));
    if (isCandidate) label.append(make('small', 'CHECKED BRAND', 'proposed-tag'));
    const heading = make('div', null, 'affinity-heading');
    heading.append(label, make('strong', Number.isFinite(item.affinity) ? item.affinity.toFixed(4) : 'Unavailable'));
    row.append(heading);
    if (Number.isFinite(item.affinity) && item.affinity >= 0 && item.affinity <= 1) {
      const track = make('div', null, 'affinity-track');
      const fill = make('div', null, 'affinity-fill');
      fill.style.width = (item.affinity * 100).toFixed(2) + '%';
      track.append(fill); row.append(track);
    }
    const details = make('details', null, 'evidence');
    details.append(make('summary', 'View Qloo evidence'));
    details.append(make('pre', JSON.stringify({ entity_id: item.entity_id, type: item.type, explainability: item.explainability, provenance: response.provenance }, null, 2)));
    row.append(details); root.append(row);
  }
  notice('Live Qloo evidence received. Verify commercial feasibility independently.');
}));

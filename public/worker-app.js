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
  for (const item of result.matches) {
    const row = make('div', null, 'match'); const info = make('div');
    info.append(make('strong', item.name), make('p', (item.type || 'Type unavailable') + ' · ' + item.id));
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
  root.append(make('p', assessment.results.length + ' real Qloo recommendations returned. Cultural affinity is not a commercial prediction.', 'hint'));
  if (candidate) root.append(make('p', 'Candidate: ' + candidate + ' · ' + assessment.verdict + '. ' + assessment.finding, 'hint'));
  for (const item of assessment.results) {
    const row = make('div', null, 'affinity-row');
    const heading = make('div', null, 'affinity-heading');
    heading.append(make('span', '#' + item.rank + ' ' + item.name), make('strong', Number.isFinite(item.affinity) ? item.affinity.toFixed(4) : 'Unavailable'));
    row.append(heading);
    const details = make('details', null, 'evidence');
    details.append(make('summary', 'Inspect entity and explainability'));
    details.append(make('pre', JSON.stringify({ entity_id: item.entity_id, type: item.type, explainability: item.explainability, provenance: response.provenance }, null, 2)));
    row.append(details); root.append(row);
  }
  notice('Live Qloo evidence received. Verify commercial feasibility independently.');
}));

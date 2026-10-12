import { readHistory as loadHistory, saveHistory, deleteHistory } from './history.js';
import { createRevisionGuard } from './revision-guard.js';
const $ = id => document.getElementById(id);
const fitIds=['fit-category','fit-rights','fit-budget'];
function updateFit(){const n=fitIds.filter(id=>$(id).checked).length;$('fit-summary').textContent=n+' of 3 suitability checks marked. These are your assessments, not Qloo findings.';}
for(const id of fitIds)$(id).addEventListener('change',updateFit);
const state = { token:null, selected:null, audit:null, retest:null, discovery:[] };
const revisions=createRevisionGuard();
const make = (tag,text,cls) => { const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(cls)e.className=cls;return e; };
const clear = el => el.replaceChildren();
function invalidateAudit(){revisions.invalidate();$('history-save').hidden=true;state.audit=null;state.retest=null;clear($('audit-results'));clear($('challenges'));clear($('retest'));$('investigation-empty').hidden=false;}
function invalidateSelection(){state.token=null;state.selected=null;state.discovery=[];invalidateAudit();$('audit').disabled=true;$('selected').textContent='No verified source selected.';$('discovery').hidden=true;clear($('discovery-results'));clear($('matches'));$('discovery-count').textContent='';$('brand-filter').value='';for(const id of fitIds)$(id).checked=false;updateFit();}
$('plan').addEventListener('input',()=>{invalidateSelection();$('comparison-status').textContent='Plan changed. Extract claims again and verify the source.';});
$('source').addEventListener('input',()=>{invalidateSelection();$('comparison-status').textContent='Source changed. Search Qloo and select the correct entity again.';});
for(const id of ['candidate','alternatives'])$(id).addEventListener('input',()=>{invalidateAudit();$('comparison-status').textContent='Comparison changed. Run a new verified audit for these candidates.';});
function notice(message,error=false){const el=$('notice');clear(el);el.append(make('div',message,error?'error':'info'));}
async function post(path,data){const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});let body;try{body=await response.json()}catch{throw Error('Server returned an invalid response');}if(!response.ok)throw Error(body.error||'Request failed ('+response.status+')');return body;}
async function busy(button,work){button.disabled=true;const label=button.textContent;button.textContent='Working…';try{await work()}catch(e){notice(e.message,true)}finally{button.textContent=label;button.disabled=false;}}
$('extract').addEventListener('click',()=>busy($('extract'),async()=>{const plan=$('plan').value.trim();if(!plan)throw Error('Paste a plan first.');const revision=revisions.current();const result=await post('/api/plans/extract',{plan});if(!revisions.isCurrent(revision)){notice('Plan changed during extraction. Extract the latest plan again.');return;}invalidateSelection();$('source').value=result.source_name||'';const brands=(result.claims||[]).filter(c=>c.dimension==='brand');$('candidate').value=brands[0]?.candidate||'';$('alternatives').value=(brands[0]?.alternatives||[]).filter(x=>typeof x==='string'&&x.trim()).slice(0,8).join(', ');$('comparison-status').textContent=$('alternatives').value?'Comparison brands explicitly mentioned in the plan. Review before auditing.':'No comparison brands in the plan. Verify the source to discover real Qloo alternatives automatically.';notice('Claim extracted. Verify the source, then Veritype will retrieve real Qloo alternatives you can add with one click.');}));
$('search').addEventListener('click',()=>busy($('search'),async()=>{const query=$('source').value.trim();if(!query)throw Error('Enter a source name first.');invalidateSelection();const revision=revisions.current();const result=await post('/api/qloo/entities/search',{query,take:10});if(!revisions.isCurrent(revision))return;const target=$('matches');clear(target);if(!result.matches.length){target.append(make('p','No Qloo matches. Try a more specific source name.'));return;}for(const item of result.matches){const id=item.entity_id||item.id;const row=make('div',null,'match');const info=make('div');info.append(make('strong',item.name||'Unnamed entity'));info.append(make('p',(item.types||[item.type||'Type unavailable']).join(', ')+' · '+id));const button=make('button','Select entity');button.type='button';button.addEventListener('click',()=>busy(button,async()=>{const revision=revisions.current();const selected=await post('/api/qloo/entities/select',{search_id:result.search_id,entity_id:id});if(!revisions.isCurrent(revision))return;state.token=selected.verification_token;state.selected=selected.entity;$('selected').textContent='Verified selection: '+selected.entity.name+' ['+(selected.entity.type||selected.entity.types?.join(', ')||'type unknown')+'] · '+id;$('audit').disabled=false;$('discovery').hidden=false;clear($('discovery-results'));notice('Qloo source verified. Discovering real comparison candidates…');$('discover').click();}));row.append(info,button);target.append(row);}notice('Qloo returned '+result.matches.length+' possible entities. Select the correct source.');}));
function evidenceDetails(parent, finding){const d=make('details',null,'evidence');d.append(make('summary','Inspect Qloo request, response and provenance'));d.append(make('pre',JSON.stringify({request:finding.request,integrity:finding.integrity,evidence:finding.evidence},null,2)));parent.append(d);}
function renderAudit(audit){$('investigation-empty').hidden=true;const root=$('audit-results');clear(root);for(const f of audit.findings||[]){const card=make('div',null,'result');card.append(make('h4',f.claim?.candidate+' · '+f.status));card.append(make('p',(f.verdict==='OBSERVED_IN_RANKING'?'Cultural affinity observed in this comparison':f.verdict)+(f.integrity?' · Evidence integrity: '+f.integrity.status:'')));if(f.assessment?.results){const results=f.assessment.results;const caption=make('p','Relative affinity among the evaluated candidates — not predicted sales or campaign success.','chart-caption');card.append(caption);const max=Math.max(...results.map(x=>Number.isFinite(x.affinity)?x.affinity:0),0);for(const item of results){const line=make('div',null,'affinity-row'+(item.name?.toLowerCase()===f.claim?.candidate?.toLowerCase()?' is-proposed':''));const heading=make('div',null,'affinity-heading');heading.append(make('span','#'+item.rank+'  '+item.name),make('strong',item.affinity==null?'Unavailable':item.affinity.toFixed(4)));const track=make('div',null,'affinity-track');const bar=make('div',null,'affinity-fill');bar.style.width=(max>0&&Number.isFinite(item.affinity)?Math.max(0,Math.min(100,100*item.affinity/max)):0)+'%';track.append(bar);line.append(heading,track);if(item.name?.toLowerCase()===f.claim?.candidate?.toLowerCase())line.append(make('small','ORIGINAL PROPOSAL','proposed-tag'));card.append(line);}}if(f.evidence)evidenceDetails(card,f);root.append(card);} }
function renderChallenges(audit){const root=$('challenges');clear(root);if(!audit.challenges?.length){root.append(make('p','No higher-ranked alternatives were supported by this audit.'));return;}for(const c of audit.challenges){const card=make('div',null,'result');card.append(make('h4','Challenge · '+c.current.name));card.append(make('p',c.explanation));card.append(make('p',c.limitation));for(const alt of c.alternatives){const button=make('button','Approve '+alt.name+' and re-test');button.type='button';button.className='secondary';button.style.margin='5px 9px 5px 0';button.addEventListener('click',()=>{if(!window.confirm('Approve '+alt.name+' as a proposed replacement and run a fresh Qloo comparison?'))return;busy(button,async()=>{const revision=revisions.current();const result=await post('/api/audits/plan/repair',{audit_id:audit.audit_id,verification_token:state.token,claim_index:c.claim_index,replacement_entity_id:alt.entity_id,approved:true});if(!revisions.isCurrent(revision)){notice('Inputs changed during the re-test. Run a fresh audit.');return;}state.retest=result;const output=$('retest');clear(output);const summary=make('div',null,'result');summary.append(make('h4','Decision re-tested · '+result.status));const comparison=make('div',null,'decision-comparison');for(const [label,candidate] of [['ORIGINAL',result.before?.candidate],['APPROVED ALTERNATIVE',result.after?.candidate]]){const pane=make('div',null,'decision-pane');pane.append(make('small',label),make('strong',candidate?.name||'Unavailable'),make('span','Rank #'+(candidate?.rank??'—')+' · Qloo affinity: '+(Number.isFinite(candidate?.affinity)?candidate.affinity.toFixed(4):'Unavailable')));comparison.append(pane);}summary.append(comparison);summary.append(make('p',result.limitation||'The comparison does not predict commercial performance.'));summary.append(make('p','Human-approved Qloo re-test, not a commercial endorsement or an automatic edit of the original campaign.','chart-caption'));summary.append(make('p','A fresh request was made to re-evaluate the approved candidate. Inspect the evidence below.','chart-caption'));output.append(summary);if(result.retest?.findings){for(const finding of result.retest.findings){if(finding.evidence)evidenceDetails(summary,finding);}}notice('Re-test returned: '+result.status);});});card.append(button);}root.append(card);}}
$('audit').addEventListener('click',()=>busy($('audit'),async()=>{if(!state.token)throw Error('Select a verified source first.');const plan=$('plan').value.trim(),candidate=$('candidate').value.trim();if(!plan||!candidate)throw Error('A plan and proposed brand are required.');const alternatives=$('alternatives').value.split(',').map(s=>s.trim()).filter(Boolean);if(!alternatives.length)throw Error('Add at least one comparison brand to enable ranked challenges.');const fitCount=fitIds.filter(id=>$(id).checked).length;if(fitCount<3&&!window.confirm('You have not marked all partnership feasibility checks. Qloo affinity alone does not establish suitability. Continue with a cultural-affinity-only audit?'))return;const revision=revisions.current();const result=await post('/api/audits/plan/verified',{verification_token:state.token,plan,claims:[{dimension:'brand',candidate,alternatives,excerpt:plan.includes(candidate)?candidate:''}]});if(!revisions.isCurrent(revision)){notice('Inputs changed during the audit. Run a fresh audit.');return;}state.audit=result;state.retest=null;$('history-save').hidden=false;renderAudit(result);renderChallenges(result);clear($('retest'));notice('Live Qloo audit returned: '+result.status+'. Review the evidence below.');}));

$('discover').addEventListener('click',()=>busy($('discover'),async()=>{
  if(!state.token)throw Error('Select a verified Qloo source first.');
  const revision=revisions.current();const result=await post('/api/qloo/brands/discover',{verification_token:state.token});if(!revisions.isCurrent(revision))return;state.discovery=result.results||[];
  const root=$('discovery-results');clear(root);
  if(!result.results?.length){$('comparison-status').textContent='Qloo returned no alternatives. You can enter brands manually.';root.append(make('p','Qloo returned no brand recommendations for this source.','hint'));return;}
  root.append(make('p','Qloo returned '+result.results.length+' brands. Choose relevant alternatives; the proposed brand is never replaced automatically.','hint'));$('comparison-status').textContent='Qloo discovered '+result.results.length+' brands. Choose suitable ones below; they will appear in the comparison field automatically.';
  const existing=()=>new Set([$('candidate').value,...$('alternatives').value.split(',')].map(x=>x.trim().toLocaleLowerCase('en')).filter(Boolean));
  for(const item of result.results){
    const row=make('div',null,'discovery-item');row.dataset.brandName=item.name.toLocaleLowerCase('en');const info=make('div');info.append(make('strong',item.name));
    info.append(make('small','Qloo recommendation #'+item.rank+(item.affinity==null?'':' · Affinity '+item.affinity.toFixed(4))));
    const button=make('button','Add to comparison','secondary');button.type='button';
    if(existing().has(item.name.toLocaleLowerCase('en'))){button.disabled=true;button.textContent='Already included';}
    button.addEventListener('click',()=>{
      const names=$('alternatives').value.split(',').map(x=>x.trim()).filter(Boolean);
      if(existing().has(item.name.toLocaleLowerCase('en'))){button.disabled=true;button.textContent='Already included';return;}
      if(names.length>=8){notice('A maximum of eight comparison brands is supported.',true);return;}
      names.push(item.name);invalidateAudit();$('alternatives').value=names.join(', ');$('comparison-status').textContent='Comparison ready: '+names.join(', ')+'. These are user-selected Qloo recommendations.';
      button.disabled=true;button.textContent='Added';
      notice('Added '+item.name+' from Qloo recommendations. Run the verified audit to compare candidates.');
    });row.append(info,button);root.append(row);
  }
  filterDiscovery();
}));
function filterDiscovery(){
  const q=$('brand-filter').value.trim().toLocaleLowerCase('en');
  const rows=[...$('discovery-results').querySelectorAll('.discovery-item')];
  let visible=0;
  for(const row of rows){row.hidden=!!q&&!row.dataset.brandName.includes(q);if(!row.hidden)visible++;}
  $('discovery-count').textContent=rows.length?(visible+' of '+rows.length+' Qloo recommendations shown'):'No Qloo recommendations loaded.';
}
$('brand-filter').addEventListener('input',filterDiscovery);

const readHistory=()=>loadHistory(localStorage);
function renderHistory(){
  const root=$('history-list');clear(root);
  const history=readHistory();
  if(!history.length){root.append(make('p','No investigations saved on this browser. Run an audit, then choose Save audit to this browser.','hint'));return;}
  for(const entry of history){
    const card=make('div',null,'result');
    card.append(make('h4',(entry.candidate||'Brand audit')+' · '+(entry.source||'Unspecified source')));
    card.append(make('p','Saved '+new Date(entry.saved_at).toLocaleString()+' · Historical snapshot; not current Qloo evidence.','hint'));
    const open=make('button','Inspect saved evidence','secondary');open.type='button';
    open.addEventListener('click',()=>{
      const d=card.querySelector('.history-detail');
      if(d){d.remove();return;}
      const details=make('details',null,'history-detail evidence');details.open=true;
      details.append(make('summary','Saved audit JSON (captured evidence)'));
      details.append(make('pre',JSON.stringify({audit:entry.audit,approved_retest:entry.retest||null},null,2)));
      card.append(details);
    });
    const remove=make('button','Delete snapshot','secondary');remove.type='button';
    remove.addEventListener('click',()=>{
      if(!window.confirm('Delete this locally saved investigation?'))return;
      try{deleteHistory(localStorage,entry.id);renderHistory();}
      catch{notice('Browser storage is unavailable. Could not delete snapshot.',true);}
    });
    card.append(open,remove);root.append(card);
  }
}
$('save-investigation').addEventListener('click',()=>{
  if(!state.audit){notice('Run a verified audit before saving.',true);return;}
  const entry={id:crypto.randomUUID(),saved_at:new Date().toISOString(),source:state.selected?.name||$('source').value,candidate:$('candidate').value,audit:state.audit,retest:state.retest};
  try{
    saveHistory(localStorage,entry);
    renderHistory();notice('Audit snapshot saved locally. It will not refresh automatically.');
  }catch{notice('Unable to save audit. Browser storage may be disabled or full.',true);}
});
renderHistory();

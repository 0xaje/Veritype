import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChallenges, prepareRepair, retestRepair } from '../src/challenge-repair.js';
import { summarizeRanking } from '../src/rank-evidence.js';
import { verifyRankingIntegrity } from '../src/evidence-integrity.js';
const source = '07F1170E-BB69-4982-82C6-255F477EBBAD';
const raw = { operation:'rank',status:'ok',results:[
  { name:'Vans',entity_id:'vans',affinity:0.9348 },
  { name:'Converse',entity_id:'converse',affinity:0.9140 },
  { name:'Nike',entity_id:'nike',affinity:0.8691 }
]};
const assessment = summarizeRanking(raw,{candidateName:'Nike'});
const integrity = verifyRankingIntegrity(raw,assessment,{candidateName:'Nike'});
const original = { audit_id:'original', plan:'Stranger Things with Nike',source_entity_id:source,
  findings:[{ claim_index:0,status:'EVALUATED',operation:'rank',integrity,assessment,
    claim:{dimension:'brand',candidate:'Nike',alternatives:['Vans','Converse']} }] };
test('challenge suggests only Qloo-evidenced higher-ranked brands', () => {
  const [challenge] = buildChallenges(original);
  assert.equal(challenge.current.name,'Nike');
  assert.deepEqual(challenge.alternatives.map(x=>x.name),['Vans','Converse']);
  assert.throws(()=>prepareRepair(original,{claim_index:0,replacement_entity_id:'invented'}),/higher-ranked/);
});
test('repair retests the user-selected alternative and checks returned identity', async () => {
  const result = await retestRepair(original,{claim_index:0,replacement_entity_id:'vans'},{
    run: async payload => {
      assert.equal(payload.claims[0].candidate,'Vans');
      const next = summarizeRanking(raw,{candidateName:'Vans'});
      return {audit_id:'fresh',findings:[{claim_index:0,status:'EVALUATED',integrity,assessment:next}]};
    }
  });
  assert.equal(result.status,'RETESTED');
  assert.equal(result.after.candidate.rank,1);
});
test('missing integrity or non-evaluated evidence cannot produce a challenge',()=>{
  assert.deepEqual(buildChallenges({...original,findings:[{...original.findings[0],integrity:{status:'FAILED'}}]}),[]);
});

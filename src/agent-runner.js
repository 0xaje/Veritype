import { createInterface } from 'node:readline/promises';
import { stdin, stdout, stderr } from 'node:process';
import { createVeritypeAgentClient } from './agent-client.js';

/**
 * Interactive local agent run. Ollama extracts the literal proposal; Qloo
 * supplies evidence. The operator selects entity identity and approves nothing.
 */
export async function runAgentReview({ plan, baseUrl = 'http://127.0.0.1:3100', fetchImpl = fetch, chooseEntity }) {
  if (typeof plan !== 'string' || !plan.trim()) throw new TypeError('A non-empty campaign plan is required');
  const base = new URL(baseUrl);
  if (base.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(base.hostname) ||
      base.pathname !== '/' || base.username || base.password || base.search || base.hash) {
    throw new TypeError('Only a local Veritype server is supported');
  }
  const response = await fetchImpl(new URL('/api/plans/extract',base),{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({plan}),signal:AbortSignal.timeout(70000)
  });
  const extracted = await response.json();
  if(!response.ok) throw new Error(extracted.error || 'Plan extraction failed');
  const brands = (extracted.claims || []).filter(x=>x.dimension==='brand');
  if(!extracted.source_name || brands.length!==1) return {
    status:'NEEDS_CLAIM_REVIEW',extraction:extracted,
    note:'One grounded source and exactly one brand claim are required for this local agent workflow.'
  };
  const client = createVeritypeAgentClient({baseUrl,fetchImpl});
  const review = await client.inspect({
    plan,sourceQuery:extracted.source_name,proposedBrand:brands[0].candidate,
    chooseEntity
  });
  return { ...review, extraction:extracted };
}

export async function main(argv = process.argv.slice(2)){
  const plan=argv.join(' ').trim();
  if(!plan){
    stderr.write('Usage: npm run agent -- "Launch a Stranger Things campaign with Nike."\n');
    process.exitCode=2;return;
  }
  const rl=createInterface({input:stdin,output:stdout});
  try{
    const result=await runAgentReview({
      plan,
      chooseEntity:async matches=>{
        stdout.write('\nQloo returned these source candidates:\n');
        for(const [i,item] of (matches||[]).entries()){
          stdout.write((i+1)+'. '+item.name+' ['+(item.type||item.types?.join(', ')||'type unknown')+'] '+(item.entity_id||item.id)+'\n');
        }
        const answer=(await rl.question('Select the correct source number (Enter to stop): ')).trim();
        if(!/^[1-9][0-9]*$/.test(answer))return null;
        const match=matches[Number(answer)-1];
        return match?.entity_id||match?.id||null;
      }
    });
    stdout.write('\n'+JSON.stringify(result,null,2)+'\n');
    if(result.status!=='REVIEW_REQUIRED')process.exitCode=1;
  }catch(error){
    stderr.write('Agent review failed: '+error.message+'\n');
    process.exitCode=1;
  }finally{rl.close();}
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href)await main();

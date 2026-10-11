import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

async function availablePort(){
  const server=createServer();
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}
async function withServer(run){
  const port=await availablePort();
  const child=spawn(process.execPath,['src/server.js'],{
    cwd:new URL('..',import.meta.url).pathname,
    env:{...process.env,PORT:String(port)},
    stdio:['ignore','pipe','pipe']
  });
  let stderr='';
  child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
  try{
    let ready=false;
    for(let attempt=0;attempt<60;attempt++){
      if(child.exitCode!==null)throw Error('Server exited early: '+stderr);
      try{
        const response=await fetch('http://127.0.0.1:'+port+'/health');
        if(response.ok){ready=true;break;}
      }catch{}
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    if(!ready)throw Error('Local server did not become ready: '+stderr);
    await run('http://127.0.0.1:'+port);
  }finally{
    child.kill('SIGTERM');
    await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)return resolve();child.once('exit',resolve);});
  }
}
test('local server serves frontend ES modules and does not claim live Qloo health',async()=>{
  await withServer(async base=>{
    for(const path of ['/','/app.js','/history.js','/revision-guard.js']){
      const response=await fetch(base+path);
      assert.equal(response.status,200,path);
      assert.match(response.headers.get('content-type'),path==='/'?/text\/html/:/text\/javascript/);
      assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
    }
    const health=await (await fetch(base+'/health')).json();
    assert.equal(health.qloo,'not_checked');
  });
});
test('local server rejects cross-site API requests before invoking Qloo',async()=>{
  await withServer(async base=>{
    const cross=await fetch(base+'/api/qloo/entities/search',{
      method:'POST',headers:{'content-type':'application/json',origin:'https://untrusted.example'},
      body:JSON.stringify({query:'Fixture'})
    });
    assert.equal(cross.status,403);
    const same=await fetch(base+'/api/qloo/entities/select',{
      method:'POST',headers:{'content-type':'application/json',origin:base},
      body:JSON.stringify({search_id:'missing',entity_id:'11111111-1111-4111-8111-111111111111'})
    });
    assert.equal(same.status,400);
    assert.match((await same.json()).error,/not found or expired/);
  });
});

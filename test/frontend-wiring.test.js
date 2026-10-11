import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const server=await readFile(new URL('../src/server.js',import.meta.url),'utf8');

test('all DOM IDs referenced by frontend controller exist in the HTML',()=>{
  const ids=[...app.matchAll(/\$\('([^']+)'\)/g)].map(match=>match[1]);
  for(const id of new Set(ids)){
    assert.match(html,new RegExp('\\bid=["\\\']'+id+'["\\\']'), 'Missing HTML ID: '+id);
  }
});
test('all frontend module imports are explicitly served by the local server',()=>{
  const modules=[...app.matchAll(/from ['"]\.\/([^'"]+)['"]/g)].map(match=>match[1]);
  for(const module of modules)assert.ok(server.includes("'/"+module+"'"),'Unserved module: '+module);
});
test('UI entrypoint is loaded as an ES module',()=>{
  assert.match(html,/<script[^>]*type="module"[^>]*src="\/app\.js"/);
});

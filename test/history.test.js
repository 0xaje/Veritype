import test from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_KEY, readHistory, saveHistory, deleteHistory } from '../public/history.js';

// Storage doubles test browser persistence behavior; never used as cultural evidence.
function storage(){
  const values=new Map();
  return {
    getItem:key=>values.get(key)??null,
    setItem:(key,value)=>values.set(key,value),
    raw:values
  };
}
const entry=(id)=>({id,saved_at:'2026-10-12T10:00:00.000Z',source:'Fixture source',candidate:'Fixture brand',audit:{audit_id:id,findings:[]}});
test('history begins empty and retains only explicitly saved audits',()=>{
  const s=storage();
  assert.deepEqual(readHistory(s),[]);
  saveHistory(s,entry('one'));
  assert.equal(readHistory(s).length,1);
  assert.equal(readHistory(s)[0].audit.audit_id,'one');
});
test('history keeps at most ten most recent snapshots',()=>{
  const s=storage();
  for(let i=0;i<13;i++)saveHistory(s,entry(String(i)));
  assert.equal(readHistory(s).length,10);
  assert.equal(readHistory(s)[0].id,'12');
  assert.equal(readHistory(s).at(-1).id,'3');
});
test('saving the same ID replaces rather than duplicates it',()=>{
  const s=storage();
  saveHistory(s,entry('one'));
  saveHistory(s,{...entry('one'),candidate:'Updated'});
  assert.equal(readHistory(s).length,1);
  assert.equal(readHistory(s)[0].candidate,'Updated');
});
test('deleting a snapshot preserves other investigations',()=>{
  const s=storage();
  saveHistory(s,entry('one'));
  saveHistory(s,entry('two'));
  deleteHistory(s,'one');
  assert.deepEqual(readHistory(s).map(x=>x.id),['two']);
});
test('malformed or tampered browser history is ignored safely',()=>{
  const s=storage();
  s.setItem(HISTORY_KEY,'{invalid');
  assert.deepEqual(readHistory(s),[]);
  s.setItem(HISTORY_KEY,JSON.stringify([{id:'bad',saved_at:'nonsense',audit:{}},entry('good'),{id:'missing-audit',saved_at:'2026-10-12T10:00:00.000Z'}]));
  assert.deepEqual(readHistory(s).map(x=>x.id),['good']);
});
test('storage write failures are propagated for the UI to report',()=>{
  const s={getItem:()=>null,setItem:()=>{throw new Error('quota exceeded');}};
  assert.throws(()=>saveHistory(s,entry('one')),/quota exceeded/);
});
test('invalid audit snapshots cannot be saved',()=>{
  const s=storage();
  assert.throws(()=>saveHistory(s,{id:'bad',saved_at:'not-a-date',audit:{}}),TypeError);
  assert.deepEqual(readHistory(s),[]);
});

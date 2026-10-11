import test from 'node:test';
import assert from 'node:assert/strict';
import { createRevisionGuard } from '../public/revision-guard.js';

test('new requests are current until the user edits the investigation',()=>{
  const guard=createRevisionGuard();
  const started=guard.current();
  assert.equal(guard.isCurrent(started),true);
  guard.invalidate();
  assert.equal(guard.isCurrent(started),false);
});
test('a newer request is accepted while an earlier response is discarded',async()=>{
  const guard=createRevisionGuard();
  const older=guard.current();
  guard.invalidate();
  const newer=guard.current();
  assert.equal(guard.isCurrent(older),false);
  assert.equal(guard.isCurrent(newer),true);
});
test('multiple edits invalidate all earlier asynchronous work',()=>{
  const guard=createRevisionGuard();
  const first=guard.current();
  guard.invalidate();
  const second=guard.current();
  guard.invalidate();
  const third=guard.current();
  assert.equal(guard.isCurrent(first),false);
  assert.equal(guard.isCurrent(second),false);
  assert.equal(guard.isCurrent(third),true);
});
test('guards for different browser investigations are independent',()=>{
  const a=createRevisionGuard(),b=createRevisionGuard();
  const bRevision=b.current();
  a.invalidate();
  assert.equal(b.isCurrent(bRevision),true);
  assert.equal(a.isCurrent(0),false);
});

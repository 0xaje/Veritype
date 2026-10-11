import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedLocalOrigin } from '../src/local-origin.js';

test('same-origin localhost requests are permitted',()=>{
  assert.equal(isAllowedLocalOrigin('http://127.0.0.1:3100',3100),true);
  assert.equal(isAllowedLocalOrigin('http://localhost:3100',3100),true);
});
test('local command line requests without an Origin header remain permitted',()=>{
  assert.equal(isAllowedLocalOrigin(undefined,3100),true);
});
test('different origins and ports are blocked',()=>{
  for(const origin of ['https://evil.example','http://localhost:3101','http://127.0.0.1:3101','http://127.0.0.1.evil.example:3100','null','not a URL','file://']) {
    assert.equal(isAllowedLocalOrigin(origin,3100),false,origin);
  }
});
test('localhost credentials and alternate schemes are blocked',()=>{
  assert.equal(isAllowedLocalOrigin('http://user:pass@localhost:3100',3100),false);
  assert.equal(isAllowedLocalOrigin('https://localhost:3100',3100),false);
});

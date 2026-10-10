import test from 'node:test';
import assert from 'node:assert/strict';
import { executeQloo } from '../src/qloo.js';
test('rejects unknown operation', () => assert.throws(() => executeQloo('fake', {}), /Unsupported Qloo operation/));
test('rejects malformed input', () => assert.throws(() => executeQloo('find_tags', []), /Qloo input must be an object/));

import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { validateEntitySearch, searchQlooEntities } from '../src/entity-search.js';
test('rejects invalid searches and unrecognized type filters', () => {
  assert.throws(() => validateEntitySearch({ query: '' }), /query/);
  assert.throws(() => validateEntitySearch({ query: 'Nike', type: 'made_up' }), /type/);
  assert.throws(() => validateEntitySearch({ query: 'Nike', take: 100 }), /take/);
});
test('uses native Qloo search and requires explicit selection', async () => {
  let captured;
  const spawnImpl = (binary, args, options) => {
    captured = { binary, args, options };
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    queueMicrotask(() => {
      child.stdout.emit('data', Buffer.from(JSON.stringify([
        { name: 'Nike', entity_id: 'C70CE2B8-0AD1-4150-BF18-5A6347F2E860', types: ['urn:entity:brand'] }
      ])));
      child.emit('close', 0);
    });
    return child;
  };
  const result = await searchQlooEntities({ query: 'Nike', type: 'brand', take: 5 }, { spawnImpl });
  assert.equal(captured.binary, 'qloo');
  assert.deepEqual(captured.args, ['api', 'search', '--query', 'Nike', '--take', '5', '--json', '--type', 'brand']);
  assert.equal(result.status, 'requires_selection');
  assert.equal(result.selection.verified_entity_id, null);
  assert.equal(result.matches[0].name, 'Nike');
});

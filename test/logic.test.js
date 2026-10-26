import test from 'node:test';
import assert from 'node:assert/strict';
import { score5, level, isCorrect, scoreAttempt, buildSet, newExamCode, newRef } from '../server/logic.js';

test('score5 / level', () => {
  assert.equal(score5(9, 10), 4.5);
  assert.equal(score5(0, 0), 0);
  assert.equal(level(0), 1);
  assert.equal(level(4.5), 5);
  assert.equal(level(2.4), 2);
});

test('multi-answer questions need the exact set', () => {
  const q = { options: [{ correct: true }, { correct: false }, { correct: true }] };
  assert.ok(isCorrect(q, [2, 0]));
  assert.ok(!isCorrect(q, [0]));
  assert.ok(!isCorrect(q, [0, 1, 2]));
});

test('scoreAttempt groups by subject', () => {
  const qs = {
    a: { group_key: 'sw', options: [{ correct: true }, { correct: false }] },
    b: { group_key: 'sw', options: [{ correct: false }, { correct: true }] },
    c: { group_key: 'soft', options: [{ correct: true }, { correct: false }] }
  };
  const r = scoreAttempt({ question_ids: ['a', 'b', 'c'], answers: { a: [0], b: [0], c: [0] } }, qs, [{ key: 'sw' }, { key: 'soft' }, { key: 'cyber' }]);
  assert.equal(r.correct, 2); assert.equal(r.total, 3); assert.equal(r.pct, 66.7);
  assert.deepEqual(r.groups.map(g => [g.key, g.correct, g.total, g.score]), [['sw', 1, 2, 2.5], ['soft', 1, 1, 5]]);
});

test('buildSet picks per group and shuffles option order', () => {
  const bank = { sw: [1, 2, 3, 4].map(i => ({ id: 'S' + i, options: [{}, {}, {}] })), soft: [{ id: 'T1', options: [{}, {}] }] };
  const s = buildSet(bank, [{ key: 'sw' }, { key: 'soft' }], { sw: 2, soft: 1 });
  assert.equal(s.ids.length, 3);
  assert.equal(s.ids[2], 'T1');
  for (const id of s.ids) assert.deepEqual([...s.orders[id]].sort(), bank[id[0] === 'S' ? 'sw' : 'soft'].find(q => q.id === id).options.map((_, i) => i));
});

test('codes and refs have the expected shape', () => {
  assert.match(newExamCode(), /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.match(newRef('R1-2569'), /^PSRU-R125-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});

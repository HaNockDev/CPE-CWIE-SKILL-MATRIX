import test from 'node:test';
import assert from 'node:assert/strict';
import { score5, level, isCorrect, scoreAttempt, buildSet, newExamCode, newRef, courseBreakdown, roundInsights } from '../server/logic.js';

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

test('courseBreakdown counts each tag of a question, per answered item', () => {
  const ok = [{ correct: true }, { correct: false }];
  const qs = { a: { options: ok, tags: ['db', 'algo'] }, b: { options: ok, tags: ['db'] }, c: { options: ok, tags: [] } };
  const atts = [
    { sid: '1', question_ids: ['a', 'b', 'c'], answers: { a: [0], b: [1], c: [0] } },
    { sid: '2', question_ids: ['a', 'b'], answers: { a: [1], b: [0] } }
  ];
  const r = courseBreakdown(atts, qs, [{ tag: 'algo', code: 'X1', name: 'A' }, { tag: 'db', code: 'X2', name: 'D' }, { tag: 'net', code: 'X3', name: 'N' }]);
  assert.equal(r.untagged, 1);
  assert.deepEqual(r.rows.map(x => [x.tag, x.questions, x.items, x.correct, x.students, x.pct]), [['algo', 1, 2, 1, 2, 50], ['db', 2, 4, 2, 2, 50]]);
});

test('roundInsights: scores, levels, item analysis and integrity', () => {
  const ok = [{ correct: true }, { correct: false }];
  const q = (g, extra = {}) => ({ group_key: g, text: 'q', options: ok, tags: [], ...extra });
  const questionsById = { easy: q('sw'), hard: q('sw'), m1: q('sw'), m2: q('sw'), m3: q('sw'), flip: q('soft') };
  const attempts = [];
  // 20 students; total score rises with i. "flip" is answered right only by the 5 weakest -> negative discrimination
  const right = c => [c ? 0 : 1];
  for (let i = 0; i < 20; i++) {
    attempts.push({ sid: 's' + i, status: 'submitted', question_ids: ['easy', 'hard', 'm1', 'm2', 'm3', 'flip'], started_at: 0, submitted_at: (10 + i) * 60e3,
      answers: { easy: right(true), hard: right(i === 19), m1: right(i >= 5), m2: right(i >= 5), m3: right(i >= 15), flip: right(i < 5) }, auto_reason: i === 0 ? 'time' : '' });
  }
  attempts.push({ sid: 'x', status: 'in_progress', question_ids: [], answers: {}, deadline_at: Date.now() + 1e6 });
  const r = roundInsights({ round: { durationMin: 60, maxLeaves: 3 }, roster: 25, attempts, events: [{ sid: 's1', kind: 'tab', duration_ms: 5000 }, { sid: 's1', kind: 'fullscreen', duration_ms: null }], questionsById, groups: [{ key: 'sw', name: 'SW', short: 'S' }, { key: 'soft', name: 'Soft', short: 'F' }] });
  assert.deepEqual([r.status.submitted, r.status.in_progress, r.status.not_started, r.status.autoTime], [20, 1, 4, 1]);
  assert.equal(r.score.n, 20);
  const by = Object.fromEntries(r.items.map(x => [x.id, x]));
  assert.deepEqual(by.easy.flags, ['easy']);
  assert.ok(by.hard.flags.includes('hard'));
  assert.ok(by.flip.flags.includes('negative'));
  assert.equal(r.groups.find(g => g.key === 'sw').levels.reduce((a, b) => a + b, 0), 20);
  assert.deepEqual([r.integrity.withLeave, r.integrity.leaveHist[2], r.integrity.tab, r.integrity.fullscreen, r.integrity.awayMs], [1, 1, 1, 1, 5000]);
});

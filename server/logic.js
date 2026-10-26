import crypto from 'node:crypto';

export const LEVEL_NAMES = ['', 'ต่ำ', 'ค่อนข้างต่ำ', 'ปานกลาง', 'ค่อนข้างสูง', 'สูง'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid misreading on a projector

export function randomBlock(n = 4) {
  const bytes = crypto.randomBytes(n);
  return Array.from(bytes, b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}
export const newExamCode = () => randomBlock() + '-' + randomBlock();

// เลขอ้างอิง: PSRU-<yy+round tag>-XXXX-XXXX
export function newRef(roundId) {
  const tag = (roundId.replace(/[^A-Z0-9]/gi, '').toUpperCase() + 'XXXX').slice(0, 4);
  return 'PSRU-' + tag + '-' + randomBlock() + '-' + randomBlock();
}

// หมายเหตุ: เกณฑ์ระดับจริงให้ยึด SPEC.md — ใช้คะแนนเต็ม 5 ปัดเศษเป็นระดับ 1–5
export const score5 = (correct, total) => (total ? Math.round((correct / total) * 50) / 10 : 0);
export const level = score => Math.min(5, Math.max(1, Math.round(score)));

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Build one student's personal set: random questions per group (group order kept), shuffled option order.
export function buildSet(bankByGroup, groups, picks) {
  const ids = [], orders = {};
  for (const g of groups) {
    const n = picks[g.key] || 0;
    const pool = bankByGroup[g.key] || [];
    for (const q of shuffle(pool).slice(0, n)) {
      ids.push(q.id);
      orders[q.id] = shuffle(q.options.map((_, i) => i));
    }
  }
  return { ids, orders };
}

export function isCorrect(q, selected) {
  const want = q.options.map((o, i) => (o.correct ? i : -1)).filter(i => i >= 0).sort();
  const got = [...new Set(selected || [])].sort();
  return want.length === got.length && want.every((v, i) => v === got[i]);
}

// Score an attempt → per-group rows in group order
export function scoreAttempt(attempt, questionsById, groups) {
  const answers = attempt.answers || {};
  const rows = [];
  for (const g of groups) {
    const qids = attempt.question_ids.filter(id => questionsById[id] && questionsById[id].group_key === g.key);
    if (!qids.length) continue;
    const correct = qids.filter(id => isCorrect(questionsById[id], answers[id])).length;
    const s = score5(correct, qids.length);
    rows.push({ key: g.key, correct, total: qids.length, score: s, level: level(s) });
  }
  const correct = rows.reduce((a, r) => a + r.correct, 0), total = rows.reduce((a, r) => a + r.total, 0);
  return { groups: rows, correct, total, pct: total ? Math.round((correct / total) * 1000) / 10 : 0 };
}

const TZ = process.env.TZ_DISPLAY || 'Asia/Bangkok';
export function thDateTime(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  const date = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return date + ' เวลา ' + time + ' น.';
}

// Per-course (tag) analysis over submitted attempts. A question with several tags counts for each of them.
// Returns one row per course that appeared in at least one attempt, plus how many answered items had no tag.
export function courseBreakdown(attempts, questionsById, courses) {
  const acc = Object.fromEntries(courses.map(c => [c.tag, { tag: c.tag, code: c.code, name: c.name, questions: new Set(), items: 0, correct: 0, students: new Set() }]));
  let untagged = 0;
  for (const a of attempts) {
    for (const id of a.question_ids) {
      const q = questionsById[id];
      if (!q) continue;
      const ok = isCorrect(q, (a.answers || {})[id]);
      const tags = (q.tags || []).filter(t => acc[t]);
      if (!tags.length) { untagged++; continue; }
      for (const t of tags) { const r = acc[t]; r.questions.add(id); r.items++; r.correct += ok ? 1 : 0; r.students.add(a.sid); }
    }
  }
  const rows = Object.values(acc).filter(r => r.items).map(r => ({
    tag: r.tag, code: r.code, name: r.name, questions: r.questions.size, items: r.items, correct: r.correct,
    students: r.students.size, pct: Math.round((r.correct / r.items) * 1000) / 10
  }));
  return { rows, untagged };
}

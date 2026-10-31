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

// ---------- round dashboard ----------
const quantile = (sorted, q) => { if (!sorted.length) return null; const i = (sorted.length - 1) * q, lo = Math.floor(i); return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (i - lo); };
const r1 = x => x == null ? null : Math.round(x * 10) / 10;

// Item analysis thresholds (classical test theory)
export const ITEM = { HARD: 0.2, EASY: 0.9, LOW_D: 0.2, NEG_D: -0.1, MIN_N: 5, MIN_FOR_D: 10 }; // NEG_D: small negatives are sampling noise

// attempts: every attempt of the round (any status); roster: number of students on the roster;
// events: [{sid, kind, duration_ms}]; questionsById: questions with options/tags/group_key/text
export function roundInsights({ round, roster, attempts, events, questionsById, groups }) {
  const now = Date.now(), dur = round.durationMin * 60e3;
  const st = { submitted: 0, in_progress: 0, not_started: 0 };
  for (const a of attempts) st[a.status === 'submitted' ? 'submitted' : a.status === 'in_progress' ? 'in_progress' : 'not_started']++;
  st.not_started += Math.max(0, roster - attempts.length);
  const subs = attempts.filter(a => a.status === 'submitted');

  // per-student scores
  const people = subs.map(a => {
    const sc = scoreAttempt(a, questionsById, groups);
    const used = a.started_at && a.submitted_at ? Math.max(0, a.submitted_at - a.started_at) : null;
    return { sid: a.sid, pct: sc.pct, groups: sc.groups, used, auto: a.auto_reason || '', a };
  });
  const pcts = people.map(p => p.pct).sort((x, y) => x - y);
  const mean = pcts.length ? pcts.reduce((s, x) => s + x, 0) / pcts.length : null;
  const sd = pcts.length > 1 ? Math.sqrt(pcts.reduce((s, x) => s + (x - mean) ** 2, 0) / (pcts.length - 1)) : null;
  const hist = Array(10).fill(0);
  for (const x of pcts) hist[Math.min(9, Math.floor(x / 10))]++;

  // time used (minutes), bucketed by sixths of the allowed duration
  const usedMin = people.map(p => p.used).filter(x => x != null).map(x => x / 60e3).sort((x, y) => x - y);
  const step = round.durationMin / 6, timeHist = Array(6).fill(0);
  for (const m of usedMin) timeHist[Math.min(5, Math.floor(m / step))]++;

  // groups: mean score /5 and how many students sit on each level
  const gRows = groups.map(g => {
    const rows = people.map(p => p.groups.find(x => x.key === g.key)).filter(Boolean);
    if (!rows.length) return null;
    const levels = [0, 0, 0, 0, 0]; rows.forEach(r => levels[r.level - 1]++);
    return { key: g.key, name: g.name, short: g.short, n: rows.length, mean: r1(rows.reduce((s, r) => s + r.score, 0) / rows.length), levels };
  }).filter(Boolean);

  // item analysis: difficulty p and discrimination D (upper vs lower 27 % of students by total score)
  const ranked = people.slice().sort((x, y) => y.pct - x.pct), k = Math.round(ranked.length * 0.27);
  const upper = new Set(ranked.slice(0, k).map(p => p.sid)), lower = new Set(ranked.slice(-k).map(p => p.sid));
  const it = {};
  for (const p of people) for (const id of p.a.question_ids) {
    const q = questionsById[id]; if (!q) continue;
    const x = it[id] ||= { n: 0, c: 0, un: 0, uc: 0, ln: 0, lc: 0 };
    const ok = isCorrect(q, (p.a.answers || {})[id]) ? 1 : 0;
    x.n++; x.c += ok;
    if (upper.has(p.sid)) { x.un++; x.uc += ok; }
    if (lower.has(p.sid)) { x.ln++; x.lc += ok; }
  }
  const items = Object.entries(it).map(([id, x]) => {
    const q = questionsById[id], pv = x.c / x.n;
    const d = ranked.length >= ITEM.MIN_FOR_D && x.un >= 3 && x.ln >= 3 ? x.uc / x.un - x.lc / x.ln : null;
    const flags = [];
    if (x.n >= ITEM.MIN_N) {
      if (pv < ITEM.HARD) flags.push('hard');
      if (pv > ITEM.EASY) flags.push('easy');
      if (d != null && d <= ITEM.NEG_D) flags.push('negative');
      // very easy/hard items cannot discriminate by nature; their own flag already says why
      else if (d != null && d < ITEM.LOW_D && !flags.length) flags.push('lowd');
    }
    return { id, group: q.group_key, text: q.text.replace(/\s+/g, ' ').slice(0, 140), tags: q.tags || [], n: x.n, p: Math.round(pv * 1000) / 1000, d: d == null ? null : Math.round(d * 1000) / 1000, flags };
  }).sort((a, b) => b.flags.length - a.flags.length || a.p - b.p);

  // integrity
  const leaves = {}, kinds = { fullscreen: 0, tab: 0 };
  let awayMs = 0;
  for (const e of events) { leaves[e.sid] = (leaves[e.sid] || 0) + 1; kinds[e.kind === 'fullscreen' ? 'fullscreen' : 'tab']++; awayMs += Number(e.duration_ms || 0); }
  const started = attempts.filter(a => a.status !== 'not_started');
  const leaveHist = [0, 0, 0, 0];
  for (const a of started) leaveHist[Math.min(3, leaves[a.sid] || 0)]++;

  return {
    status: { roster, ...st, autoTime: subs.filter(a => a.auto_reason === 'time').length, autoLeaves: subs.filter(a => a.auto_reason === 'leaves').length, pending: attempts.filter(a => a.status === 'in_progress' && now > a.deadline_at).length },
    score: { n: pcts.length, mean: r1(mean), median: r1(quantile(pcts, 0.5)), sd: r1(sd), min: pcts.length ? pcts[0] : null, max: pcts.length ? pcts[pcts.length - 1] : null, q1: r1(quantile(pcts, 0.25)), q3: r1(quantile(pcts, 0.75)), hist },
    time: { n: usedMin.length, median: r1(quantile(usedMin, 0.5)), mean: r1(usedMin.length ? usedMin.reduce((s, x) => s + x, 0) / usedMin.length : null), step: r1(step), hist: timeHist, durationMin: round.durationMin },
    groups: gRows,
    items,
    integrity: { started: started.length, withLeave: started.filter(a => leaves[a.sid]).length, leaveHist, fullscreen: kinds.fullscreen, tab: kinds.tab, awayMs, maxLeaves: round.maxLeaves }
  };
}

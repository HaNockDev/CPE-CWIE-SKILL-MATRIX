import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { db, init, all, one, run, J, dbUrl, isEphemeral } from './db.js';
import { sign, verify, requireRole, adminPassword, DEFAULT_ADMIN_PASSWORD } from './auth.js';
import { sendMail } from './mailer.js';
import { LEVEL_NAMES, newExamCode, newRef, buildSet, scoreAttempt, thDateTime, courseBreakdown } from './logic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRACE_MS = 15_000; // late answers tolerated for network latency
const EMAIL_DOMAIN = (process.env.EMAIL_DOMAIN || 'psru.ac.th').toLowerCase();

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '25mb' }));
app.use(async (req, res, next) => { try { await init(); next(); } catch (e) { next(e); } });

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, error, extra = {}, status = 400) => res.status(status).json({ error, ...extra });
const baseUrl = req => process.env.PUBLIC_URL || ((req.headers['x-forwarded-proto'] || req.protocol) + '://' + (req.headers['x-forwarded-host'] || req.get('host')));

// ---------- data helpers ----------
async function groups() { return all('SELECT key, name, short FROM groups ORDER BY sort, key'); }
async function courses() { return all('SELECT tag, code, name FROM courses ORDER BY sort, code'); }
async function submittedAttempts(rid, sid) {
  return (await all("SELECT * FROM attempts WHERE round_id = ? AND status = 'submitted'" + (sid ? ' AND sid = ?' : ''), sid ? [rid, sid] : [rid])).map(parseAttempt);
}
async function courseReport(rid, sid) {
  const atts = await submittedAttempts(rid, sid);
  const ids = [...new Set(atts.flatMap(a => a.question_ids))], qs = {};
  for (let i = 0; i < ids.length; i += 400) Object.assign(qs, await questionsByIds(ids.slice(i, i + 400)));
  return { ...courseBreakdown(atts, qs, await courses()), submitted: atts.length };
}

function parseQ(r) {
  return { id: r.id, group_key: r.group_key, type: r.type, text: r.text, image: r.image || null, options: J(r.options, []), explain: r.explain || '', difficulty: Number(r.difficulty), points: Number(r.points), tags: J(r.tags, []) };
}
async function questionsByIds(ids) {
  if (!ids.length) return {};
  const rows = await all(`SELECT * FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  return Object.fromEntries(rows.map(r => [r.id, parseQ(r)]));
}
function parseRound(r) {
  if (!r) return null;
  const now = Date.now(), opens = Number(r.opens_at), closes = Number(r.closes_at);
  return {
    id: r.id, name: r.name, opensAt: opens, closesAt: closes, durationMin: Number(r.duration_min), maxLeaves: Number(r.max_leaves),
    picks: J(r.picks, {}), code: r.code, published: !!Number(r.published), publishedAt: r.published_at ? Number(r.published_at) : null,
    setReady: !!Number(r.set_ready), status: now < opens ? 'upcoming' : now > closes ? 'closed' : 'open'
  };
}
const getRound = async id => parseRound(await one('SELECT * FROM rounds WHERE id = ?', [id]));
function parseAttempt(a) {
  if (!a) return null;
  return {
    round_id: a.round_id, sid: a.sid, question_ids: J(a.question_ids, []), option_orders: J(a.option_orders, {}), answers: J(a.answers, {}),
    status: a.status, started_at: a.started_at && Number(a.started_at), deadline_at: a.deadline_at && Number(a.deadline_at),
    submitted_at: a.submitted_at && Number(a.submitted_at), leaves: Number(a.leaves), auto_reason: a.auto_reason || ''
  };
}
const getAttempt = async (rid, sid) => parseAttempt(await one('SELECT * FROM attempts WHERE round_id = ? AND sid = ?', [rid, sid]));

async function bankByGroup() {
  const rows = await all('SELECT id, group_key, options FROM questions');
  const out = {};
  for (const r of rows) (out[r.group_key] ||= []).push({ id: r.id, options: J(r.options, []) });
  return out;
}

// Insert personal sets for roster members without one
async function prepareRound(round, onlySid) {
  const gs = await groups(), bank = await bankByGroup();
  const short = gs.filter(g => (round.picks[g.key] || 0) > (bank[g.key] || []).length);
  if (short.length) return { error: 'bank_short', groups: short.map(g => g.name) };
  const missing = await all(
    `SELECT r.sid FROM roster r LEFT JOIN attempts a ON a.round_id = r.round_id AND a.sid = r.sid
     WHERE r.round_id = ? AND a.sid IS NULL ${onlySid ? 'AND r.sid = ?' : ''}`, onlySid ? [round.id, onlySid] : [round.id]);
  const stmts = missing.map(m => {
    const set = buildSet(bank, gs, round.picks);
    return { sql: 'INSERT OR IGNORE INTO attempts (round_id, sid, question_ids, option_orders) VALUES (?,?,?,?)', args: [round.id, m.sid, JSON.stringify(set.ids), JSON.stringify(set.orders)] };
  });
  for (let i = 0; i < stmts.length; i += 200) await db.batch(stmts.slice(i, i + 200), 'write');
  if (!onlySid) await run('UPDATE rounds SET set_ready = 1 WHERE id = ?', [round.id]);
  return { created: stmts.length };
}

async function scoreAndStore(round, attempt) {
  const gs = await groups(), qs = await questionsByIds(attempt.question_ids);
  const sc = scoreAttempt(attempt, qs, gs);
  const prev = await one('SELECT ref FROM results WHERE round_id = ? AND sid = ?', [round.id, attempt.sid]);
  const ref = prev ? prev.ref : newRef(round.id);
  await run(`INSERT INTO results (round_id, sid, ref, groups, correct, total, pct, scored_at) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(round_id, sid) DO UPDATE SET groups = excluded.groups, correct = excluded.correct, total = excluded.total, pct = excluded.pct, scored_at = excluded.scored_at`,
  [round.id, attempt.sid, ref, JSON.stringify(sc.groups), sc.correct, sc.total, sc.pct, Date.now()]);
  return { ...sc, ref };
}

async function finalize(round, attempt, reason) {
  if (attempt.status === 'submitted') return attempt;
  const at = reason === 'time' && attempt.deadline_at ? Math.min(Date.now(), attempt.deadline_at) : Date.now();
  await run("UPDATE attempts SET status = 'submitted', submitted_at = ?, auto_reason = ? WHERE round_id = ? AND sid = ? AND status != 'submitted'", [at, reason || null, round.id, attempt.sid]);
  const a = await getAttempt(round.id, attempt.sid);
  await scoreAndStore(round, a);
  return a;
}

async function enforceDeadline(round, attempt) {
  if (attempt && attempt.status === 'in_progress' && Date.now() > attempt.deadline_at + GRACE_MS) return finalize(round, attempt, 'time');
  return attempt;
}

async function roundAverages(roundId) {
  const rows = await all('SELECT groups FROM results WHERE round_id = ?', [roundId]);
  const sum = {}, cnt = {};
  for (const r of rows) for (const g of J(r.groups, [])) { sum[g.key] = (sum[g.key] || 0) + g.score; cnt[g.key] = (cnt[g.key] || 0) + 1; }
  const avg = {};
  for (const k of Object.keys(sum)) avg[k] = Math.round((sum[k] / cnt[k]) * 10) / 10;
  return { avg, participants: rows.length };
}

async function resultView(round, sid) {
  const r = await one('SELECT * FROM results WHERE round_id = ? AND sid = ?', [round.id, sid]);
  if (!r) return null;
  const gs = await groups(), { avg, participants } = await roundAverages(round.id);
  const stu = await one('SELECT * FROM roster WHERE round_id = ? AND sid = ?', [round.id, sid]);
  const att = await getAttempt(round.id, sid);
  const byKey = Object.fromEntries(gs.map(g => [g.key, g]));
  return {
    ref: r.ref, correct: Number(r.correct), total: Number(r.total), pct: Number(r.pct), participants,
    submittedAt: att && att.submitted_at, issuedAt: Date.now(),
    student: stu ? { sid: stu.sid, name: stu.name, email: stu.email } : { sid },
    rows: J(r.groups, []).map(g => ({ ...g, name: byKey[g.key]?.name || g.key, short: byKey[g.key]?.short || g.key, levelName: LEVEL_NAMES[g.level], avg: avg[g.key] ?? 0 }))
  };
}

// ---------- public ----------
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/qr', wrap(async (req, res) => {
  const text = String(req.query.text || '').slice(0, 300);
  if (!text) return bad(res, 'missing_text');
  const png = await QRCode.toBuffer(text, { margin: 1, width: 264, errorCorrectionLevel: 'M' });
  res.type('png').set('Cache-Control', 'public, max-age=86400').send(png);
}));

app.get('/api/verify/:ref', wrap(async (req, res) => {
  const ref = String(req.params.ref || '').trim().toUpperCase();
  const r = await one('SELECT * FROM results WHERE ref = ?', [ref]);
  const round = r && await getRound(r.round_id);
  if (!r || !round || !round.published) return res.json({ found: false });
  const stu = await one('SELECT name FROM roster WHERE round_id = ? AND sid = ?', [r.round_id, r.sid]);
  const att = await getAttempt(r.round_id, r.sid);
  res.json({ found: true, ref, name: stu ? stu.name : '', sid: r.sid, roundName: round.name, submittedAt: att && att.submitted_at, correct: Number(r.correct), total: Number(r.total), pct: Number(r.pct) });
}));

// ---------- student ----------
app.post('/api/student/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const sid = String(req.body.sid || '').trim();
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!email.endsWith('@' + EMAIL_DOMAIN)) return bad(res, 'err_domain', { domain: EMAIL_DOMAIN });
  const round = parseRound(await one('SELECT * FROM rounds WHERE code = ?', [code]));
  if (!round) return bad(res, 'err_code');
  if (round.status === 'upcoming') return bad(res, 'err_notyet', { opensAt: round.opensAt });
  const stu = await one('SELECT * FROM roster WHERE round_id = ? AND sid = ?', [round.id, sid]);
  if (!stu) return bad(res, 'err_notfound');
  if (stu.email.toLowerCase() !== email) return bad(res, 'err_email');
  let att = await enforceDeadline(round, await getAttempt(round.id, sid));
  if (round.status === 'closed' && (!att || att.status !== 'submitted')) return bad(res, 'err_closed', { closesAt: round.closesAt });
  await run('UPDATE roster SET email_verified = 1 WHERE round_id = ? AND sid = ?', [round.id, sid]);
  res.json({ token: await sign({ role: 'student', rid: round.id, sid }, 6 * 3600) });
}));

const student = express.Router();
student.use(requireRole('student'));
student.use(wrap(async (req, res, next) => {
  req.round = await getRound(req.auth.rid);
  req.stu = req.round && await one('SELECT * FROM roster WHERE round_id = ? AND sid = ?', [req.round.id, req.auth.sid]);
  if (!req.stu) return bad(res, 'unauthorized', {}, 401);
  req.att = await enforceDeadline(req.round, await getAttempt(req.round.id, req.auth.sid));
  next();
}));

function examPayload(round, att, qs, gs) {
  const gmap = Object.fromEntries(gs.map(g => [g.key, g]));
  return att.question_ids.filter(id => qs[id]).map(id => {
    const q = qs[id], order = att.option_orders[id] || q.options.map((_, i) => i);
    return {
      id, group: q.group_key, groupName: gmap[q.group_key]?.name || q.group_key, groupShort: gmap[q.group_key]?.short || q.group_key,
      type: q.type, text: q.text, image: q.image,
      options: order.filter(k => q.options[k]).map(k => ({ k, text: q.options[k].text, image: q.options[k].image || null }))
    };
  });
}

student.get('/state', wrap(async (req, res) => {
  const { round, stu, att } = req, gs = await groups();
  const total = gs.reduce((a, g) => a + (round.picks[g.key] || 0), 0);
  const out = {
    round: { id: round.id, name: round.name, opensAt: round.opensAt, closesAt: round.closesAt, durationMin: round.durationMin, maxLeaves: round.maxLeaves, total, groupCount: gs.filter(g => round.picks[g.key]).length, published: round.published },
    student: { sid: stu.sid, name: stu.name, email: stu.email },
    attempt: att ? { status: att.status, answered: Object.keys(att.answers).length, total: att.question_ids.length, leaves: att.leaves, submittedAt: att.submitted_at, autoReason: att.auto_reason, timeLeft: att.deadline_at ? Math.max(0, Math.round((att.deadline_at - Date.now()) / 1000)) : null } : null,
    now: Date.now()
  };
  res.json(out);
}));

student.post('/start', wrap(async (req, res) => {
  const { round } = req;
  let att = req.att;
  if (att && att.status === 'submitted') return bad(res, 'already_submitted');
  if (round.status !== 'open') return bad(res, round.status === 'closed' ? 'err_closed' : 'err_notyet');
  if (!att) {
    const p = await prepareRound(round, req.stu.sid);
    if (p.error) return bad(res, 'set_not_ready');
    att = await getAttempt(round.id, req.stu.sid);
  }
  if (!att.question_ids.length) return bad(res, 'set_not_ready');
  if (att.status === 'not_started') {
    const now = Date.now(), deadline = Math.min(now + round.durationMin * 60e3, round.closesAt);
    await run("UPDATE attempts SET status = 'in_progress', started_at = ?, deadline_at = ? WHERE round_id = ? AND sid = ? AND status = 'not_started'", [now, deadline, round.id, att.sid]);
    att = await getAttempt(round.id, att.sid);
  }
  const gs = await groups(), qs = await questionsByIds(att.question_ids);
  res.json({ questions: examPayload(round, att, qs, gs), answers: att.answers, leaves: att.leaves, maxLeaves: round.maxLeaves, timeLeft: Math.max(0, Math.round((att.deadline_at - Date.now()) / 1000)) });
}));

student.post('/answer', wrap(async (req, res) => {
  const { att } = req;
  if (!att || att.status !== 'in_progress') return bad(res, 'not_in_progress', { status: att && att.status }, 409);
  const qid = String(req.body.qid || '');
  if (!att.question_ids.includes(qid)) return bad(res, 'bad_question');
  const sel = Array.isArray(req.body.selected) ? [...new Set(req.body.selected.map(Number).filter(Number.isInteger))].sort((a, b) => a - b) : [];
  // json_set keeps concurrent answers to different questions from overwriting each other
  if (sel.length) await run("UPDATE attempts SET answers = json_set(answers, '$.\"' || ? || '\"', json(?)) WHERE round_id = ? AND sid = ? AND status = 'in_progress'", [qid, JSON.stringify(sel), att.round_id, att.sid]);
  else await run("UPDATE attempts SET answers = json_remove(answers, '$.\"' || ? || '\"') WHERE round_id = ? AND sid = ? AND status = 'in_progress'", [qid, att.round_id, att.sid]);
  res.json({ ok: true, savedAt: Date.now() });
}));

student.post('/event', wrap(async (req, res) => {
  const { round, att } = req;
  if (!att || att.status !== 'in_progress') return res.json({ status: att ? att.status : 'none', leaves: att ? att.leaves : 0 });
  const kind = req.body.kind === 'fullscreen' ? 'fullscreen' : 'tab';
  // a tab switch is reported when the student comes back, with how long they were away: store the moment they left
  const dur = req.body.durationMs != null && Number.isFinite(+req.body.durationMs) ? Math.max(0, Math.round(+req.body.durationMs)) : null;
  const ins = await run('INSERT INTO events (round_id, sid, at, kind, duration_ms) VALUES (?,?,?,?,?)', [round.id, att.sid, Date.now() - (dur || 0), kind, dur]);
  const eventId = Number(ins.lastInsertRowid);
  await run('UPDATE attempts SET leaves = leaves + 1 WHERE round_id = ? AND sid = ?', [round.id, att.sid]);
  const a = await getAttempt(round.id, att.sid);
  if (a.leaves > round.maxLeaves) { await finalize(round, a, 'leaves'); return res.json({ status: 'submitted', leaves: a.leaves, autoReason: 'leaves', eventId }); }
  res.json({ status: a.status, leaves: a.leaves, maxLeaves: round.maxLeaves, eventId });
}));

student.post('/event-duration', wrap(async (req, res) => {
  // sets how long a leave lasted once the student is back (e.g. re-entered fullscreen)
  // kind 'tab' reclassifies a fullscreen exit that was really caused by switching tab/app
  const dur = Math.max(0, Math.round(Number(req.body.durationMs) || 0)), id = Number(req.body.eventId);
  if (Number.isInteger(id) && id > 0 && req.body.kind === 'tab') await run("UPDATE events SET duration_ms = ?, kind = 'tab' WHERE id = ? AND round_id = ? AND sid = ? AND duration_ms IS NULL", [dur, id, req.round.id, req.stu.sid]);
  else if (Number.isInteger(id) && id > 0) await run('UPDATE events SET duration_ms = ? WHERE id = ? AND round_id = ? AND sid = ? AND duration_ms IS NULL', [dur, id, req.round.id, req.stu.sid]);
  else await run('UPDATE events SET duration_ms = ? WHERE id = (SELECT MAX(id) FROM events WHERE round_id = ? AND sid = ?) AND duration_ms IS NULL', [dur, req.round.id, req.stu.sid]);
  res.json({ ok: true });
}));

student.post('/submit', wrap(async (req, res) => {
  const { round, att } = req;
  if (!att || att.status === 'not_started') return bad(res, 'not_in_progress', {}, 409);
  const reason = req.body.reason === 'time' ? 'time' : null;
  const a = await finalize(round, att, reason);
  res.json({ status: 'submitted', submittedAt: a.submitted_at, autoReason: a.auto_reason });
}));

student.get('/result', wrap(async (req, res) => {
  if (!req.round.published) return bad(res, 'not_published', {}, 403);
  const v = await resultView(req.round, req.stu.sid);
  if (!v) return bad(res, 'no_result', {}, 404);
  res.json({ ...v, roundName: req.round.name, verifyUrl: baseUrl(req) + '/verify?ref=' + encodeURIComponent(v.ref) });
}));

student.post('/email-result', wrap(async (req, res) => {
  if (!req.round.published) return bad(res, 'not_published', {}, 403);
  const v = await resultView(req.round, req.stu.sid);
  if (!v) return bad(res, 'no_result', {}, 404);
  const subject = 'สรุปผลการสอบ ' + req.round.name + ' · เลขอ้างอิง ' + v.ref;
  const body = [
    'เรียน ' + v.student.name, '',
    'ระบบสอบออนไลน์ขอแจ้งสรุปผลการสอบ ' + req.round.name,
    'รหัสนักศึกษา ' + v.student.sid,
    'ส่งข้อสอบเมื่อ ' + thDateTime(v.submittedAt), '',
    'คะแนนรวม ' + v.correct + ' / ' + v.total + ' (' + v.pct.toFixed(1) + '%)', '',
    'ผลรายกลุ่มวิชา (ระดับ 1 ต่ำ – 5 สูง)',
    ...v.rows.map(r => '• ' + r.name + ': ระดับ ' + r.level + ' (' + r.levelName + ') · คะแนน ' + r.score.toFixed(1) + '/5 · ตอบถูก ' + r.correct + '/' + r.total + ' · ค่าเฉลี่ยรอบ ' + r.avg.toFixed(1)), '',
    'เลขอ้างอิง ' + v.ref,
    'ตรวจสอบความถูกต้องกับฐานข้อมูลของมหาวิทยาลัยได้ที่ ' + baseUrl(req) + '/verify?ref=' + encodeURIComponent(v.ref), '',
    'อีเมลนี้ส่งจากระบบโดยอัตโนมัติ กรุณาอย่าตอบกลับ หากข้อมูลไม่ถูกต้อง ติดต่ออาจารย์ผู้คุมสอบ'
  ].join('\n');
  const r = await sendMail(v.student.email, subject, body);
  res.json({ ...r, to: v.student.email });
}));
app.use('/api/student', student);

// ---------- admin ----------
app.post('/api/admin/login', wrap(async (req, res) => {
  if (String(req.body.password || '') !== adminPassword()) return bad(res, 'bad_password', {}, 401);
  res.json({ token: await sign({ role: 'admin', name: req.body.name || 'ผู้ดูแลระบบ' }, 12 * 3600) });
}));

const admin = express.Router();
admin.use(requireRole('admin'));

async function courseUsage() {
  const cs = await courses(), used = {};
  for (const r of await all("SELECT tags FROM questions WHERE tags != '[]'")) for (const t of J(r.tags, [])) used[t] = (used[t] || 0) + 1;
  return cs.map(c => ({ ...c, used: used[c.tag] || 0 }));
}

admin.get('/meta', wrap(async (req, res) => {
  const gs = await all('SELECT g.key, g.name, g.short, (SELECT COUNT(*) FROM questions q WHERE q.group_key = g.key) AS bank FROM groups g ORDER BY g.sort');
  res.json({
    groups: gs.map(g => ({ ...g, bank: Number(g.bank) })), courses: await courseUsage(),
    defaultPassword: adminPassword() === DEFAULT_ADMIN_PASSWORD, ephemeral: isEphemeral,
    db: dbUrl.startsWith('file:') ? 'sqlite-file' : 'libsql-remote', smtp: !!process.env.SMTP_HOST, emailDomain: EMAIL_DOMAIN
  });
}));

// rounds
admin.get('/rounds', wrap(async (req, res) => {
  const rows = await all(`SELECT r.*, (SELECT COUNT(*) FROM roster x WHERE x.round_id = r.id) AS roster,
    (SELECT COUNT(*) FROM attempts a WHERE a.round_id = r.id) AS sets FROM rounds r ORDER BY r.opens_at DESC`);
  res.json(rows.map(r => ({ ...parseRound(r), roster: Number(r.roster), sets: Number(r.sets) })));
}));

function roundInput(b, gs) {
  const name = String(b.name || '').trim();
  const opensAt = Number(b.opensAt), closesAt = Number(b.closesAt);
  const durationMin = Math.round(Number(b.durationMin)), maxLeaves = Math.round(Number(b.maxLeaves));
  const picks = {};
  for (const g of gs) picks[g.key] = Math.max(0, Math.round(Number((b.picks || {})[g.key]) || 0));
  if (!name) return { error: 'ใส่ชื่อรอบสอบ' };
  if (!opensAt || !closesAt || closesAt <= opensAt) return { error: 'เวลาปิดสอบต้องหลังเวลาเปิดสอบ' };
  if (!(durationMin >= 1)) return { error: 'เวลาทำข้อสอบต้องอย่างน้อย 1 นาที' };
  if (!(maxLeaves >= 0)) return { error: 'จำนวนครั้งออกนอกหน้าจอไม่ถูกต้อง' };
  if (!Object.values(picks).some(Boolean)) return { error: 'เลือกจำนวนข้ออย่างน้อย 1 ข้อ' };
  return { name, opensAt, closesAt, durationMin, maxLeaves, picks };
}

admin.post('/rounds', wrap(async (req, res) => {
  const v = roundInput(req.body, await groups());
  if (v.error) return bad(res, 'invalid', { message: v.error });
  const id = 'R' + Date.now().toString(36).toUpperCase();
  let code;
  do { code = newExamCode(); } while (await one('SELECT 1 FROM rounds WHERE code = ?', [code]));
  await run('INSERT INTO rounds (id,name,opens_at,closes_at,duration_min,max_leaves,picks,code,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, v.name, v.opensAt, v.closesAt, v.durationMin, v.maxLeaves, JSON.stringify(v.picks), code, Date.now()]);
  res.json(await getRound(id));
}));

admin.put('/rounds/:id', wrap(async (req, res) => {
  const old = await getRound(req.params.id);
  if (!old) return bad(res, 'not_found', {}, 404);
  const v = roundInput(req.body, await groups());
  if (v.error) return bad(res, 'invalid', { message: v.error });
  const picksChanged = JSON.stringify(old.picks) !== JSON.stringify(v.picks);
  await run('UPDATE rounds SET name=?, opens_at=?, closes_at=?, duration_min=?, max_leaves=?, picks=? WHERE id=?',
    [v.name, v.opensAt, v.closesAt, v.durationMin, v.maxLeaves, JSON.stringify(v.picks), old.id]);
  if (picksChanged) { // sets that nobody started yet must follow the new picks
    await run("DELETE FROM attempts WHERE round_id = ? AND status = 'not_started'", [old.id]);
    await run('UPDATE rounds SET set_ready = 0 WHERE id = ?', [old.id]);
  }
  res.json(await getRound(old.id));
}));

admin.delete('/rounds/:id', wrap(async (req, res) => {
  const id = req.params.id;
  await db.batch(['roster', 'attempts', 'events', 'results'].map(t => ({ sql: `DELETE FROM ${t} WHERE round_id = ?`, args: [id] }))
    .concat([{ sql: 'DELETE FROM rounds WHERE id = ?', args: [id] }]), 'write');
  res.json({ ok: true });
}));

admin.post('/rounds/:id/code', wrap(async (req, res) => {
  let code;
  do { code = newExamCode(); } while (await one('SELECT 1 FROM rounds WHERE code = ?', [code]));
  await run('UPDATE rounds SET code = ? WHERE id = ?', [code, req.params.id]);
  res.json({ code });
}));

admin.post('/rounds/:id/prepare', wrap(async (req, res) => {
  const round = await getRound(req.params.id);
  if (!round) return bad(res, 'not_found', {}, 404);
  const r = await prepareRound(round);
  if (r.error) return bad(res, r.error, { message: 'ข้อสอบในคลังไม่พอสำหรับ: ' + r.groups.join(', ') });
  res.json(r);
}));

admin.post('/rounds/:id/roster', wrap(async (req, res) => {
  const round = await getRound(req.params.id);
  if (!round) return bad(res, 'not_found', {}, 404);
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  const mode = req.body.mode === 'replace' ? 'replace' : 'add';
  const existing = new Set((await all('SELECT sid FROM roster WHERE round_id = ?', [round.id])).map(r => r.sid));
  const seen = new Map(), checked = [];
  rows.forEach((r, i) => {
    const n = r.n || i + 1, sid = String(r.sid || '').trim(), name = String(r.name || '').trim(), email = String(r.email || '').trim().toLowerCase();
    let err = '';
    if (!/^\d{10}$/.test(sid)) err = 'รหัสนักศึกษาไม่ครบ 10 หลัก' + (sid ? ' (' + sid + ')' : '');
    else if (!name) err = 'ไม่มีชื่อ-สกุล';
    else if (!/^[^@\s]+@[^@\s]+$/.test(email)) err = 'อีเมลไม่ถูกต้อง' + (email ? ' (' + email + ')' : '');
    else if (!email.endsWith('@' + EMAIL_DOMAIN)) err = 'อีเมลไม่ใช่ @' + EMAIL_DOMAIN + ' (' + email + ')';
    else if (seen.has(sid)) err = 'รหัสนักศึกษา ' + sid + ' ซ้ำกับแถว ' + seen.get(sid);
    else if (mode === 'add' && existing.has(sid)) err = 'มีรหัส ' + sid + ' ในรายชื่อเดิมแล้ว';
    if (!err) seen.set(sid, n);
    checked.push({ n, sid, name, email, error: err });
  });
  const ok = checked.filter(r => !r.error);
  if (req.body.dryRun) return res.json({ rows: checked, ok: ok.length, skipped: checked.length - ok.length });
  const stmts = [];
  if (mode === 'replace') {
    // keep students who already started (their answers stay); drop everyone else
    stmts.push({ sql: "DELETE FROM attempts WHERE round_id = ? AND status = 'not_started'", args: [round.id] });
    stmts.push({ sql: 'DELETE FROM roster WHERE round_id = ? AND sid NOT IN (SELECT sid FROM attempts WHERE round_id = ?)', args: [round.id, round.id] });
  }
  for (const r of ok) stmts.push({ sql: 'INSERT INTO roster (round_id, sid, name, email) VALUES (?,?,?,?) ON CONFLICT(round_id, sid) DO UPDATE SET name = excluded.name, email = excluded.email', args: [round.id, r.sid, r.name, r.email] });
  for (let i = 0; i < stmts.length; i += 300) await db.batch(stmts.slice(i, i + 300), 'write');
  if (round.setReady) await prepareRound(round); // keep the set ready for newcomers
  res.json({ imported: ok.length, skipped: checked.filter(r => r.error).map(r => ({ n: r.n, reason: r.error })) });
}));

// question bank
function questionInput(b, gs, cs = []) {
  const group = String(b.group_key || b.group || '');
  if (!gs.some(g => g.key === group)) return { error: 'กลุ่มวิชาไม่ถูกต้อง' };
  const text = String(b.text || '').trim();
  if (!text) return { error: 'ไม่มีโจทย์' };
  const options = (Array.isArray(b.options) ? b.options : []).map(o => ({ text: String(o.text || '').trim(), image: o.image || null, correct: !!o.correct }));
  if (options.length < 2 || options.length > 10) return { error: 'ต้องมีตัวเลือก 2–10 ข้อ' };
  if (options.some(o => !o.text && !o.image)) return { error: 'มีตัวเลือกที่ว่าง' };
  const nCorrect = options.filter(o => o.correct).length;
  if (!nCorrect) return { error: 'ไม่มีตัวเลือกที่ถูก' };
  const type = b.type === 'multi' || nCorrect > 1 ? 'multi' : 'single';
  return { group_key: group, type, text, image: b.image || null, options, explain: String(b.explain || ''), difficulty: [0, 1, 2].includes(+b.difficulty) ? +b.difficulty : 1, points: Math.max(1, Math.round(+b.points || 1)),
    tags: cleanTags(b.tags, cs) };
}
// course tags: keep only known tags, in the catalogue's order
function cleanTags(tags, cs) {
  const want = new Set((Array.isArray(tags) ? tags : []).map(String));
  return cs.filter(c => want.has(c.tag)).map(c => c.tag);
}
async function nextQuestionId(group) {
  const prefix = 'Q-' + group.slice(0, 2).toUpperCase() + '-';
  const rows = await all('SELECT id FROM questions WHERE id LIKE ?', [prefix + '%']);
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.id.slice(prefix.length), 10) || 0), 0);
  return prefix + String(max + 1).padStart(3, '0');
}
async function upsertQuestion(id, v, now = Date.now()) {
  await run(`INSERT INTO questions (id,group_key,type,text,image,options,explain,difficulty,points,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET group_key=excluded.group_key, type=excluded.type, text=excluded.text, image=excluded.image, options=excluded.options, explain=excluded.explain, difficulty=excluded.difficulty, points=excluded.points, tags=excluded.tags, updated_at=excluded.updated_at`,
  [id, v.group_key, v.type, v.text, v.image, JSON.stringify(v.options), v.explain, v.difficulty, v.points, JSON.stringify(v.tags || []), now, now]);
}

admin.get('/questions', wrap(async (req, res) => {
  const rows = await all('SELECT id, group_key, type, text, image IS NOT NULL AS has_image, options, difficulty, points, tags FROM questions ORDER BY group_key, id');
  res.json(rows.map(r => {
    const opts = J(r.options, []);
    return { id: r.id, group_key: r.group_key, type: r.type, text: r.text, hasImage: !!Number(r.has_image) || opts.some(o => o.image), difficulty: Number(r.difficulty), points: Number(r.points), optionCount: opts.length, tags: J(r.tags, []) };
  }));
}));
admin.get('/questions/:id', wrap(async (req, res) => {
  const r = await one('SELECT * FROM questions WHERE id = ?', [req.params.id]);
  if (!r) return bad(res, 'not_found', {}, 404);
  res.json(parseQ(r));
}));
admin.post('/questions', wrap(async (req, res) => {
  const v = questionInput(req.body, await groups(), await courses());
  if (v.error) return bad(res, 'invalid', { message: v.error });
  const id = await nextQuestionId(v.group_key);
  await upsertQuestion(id, v);
  res.json({ id });
}));
admin.put('/questions/:id', wrap(async (req, res) => {
  if (!await one('SELECT 1 FROM questions WHERE id = ?', [req.params.id])) return bad(res, 'not_found', {}, 404);
  const v = questionInput(req.body, await groups(), await courses());
  if (v.error) return bad(res, 'invalid', { message: v.error });
  await upsertQuestion(req.params.id, v);
  res.json({ id: req.params.id });
}));
admin.post('/questions/:id/copy', wrap(async (req, res) => {
  const r = await one('SELECT * FROM questions WHERE id = ?', [req.params.id]);
  if (!r) return bad(res, 'not_found', {}, 404);
  const q = parseQ(r), id = await nextQuestionId(q.group_key);
  await upsertQuestion(id, q);
  res.json({ id });
}));
// ---- courses (tag catalogue) ----
const TAG_RE = /^[a-z0-9][a-z0-9_-]{1,23}$/;
function courseInput(b) {
  const code = String(b.code || '').trim().toUpperCase(), name = String(b.name || '').trim();
  if (!code || code.length > 20) return { error: 'ใส่รหัสวิชา (ไม่เกิน 20 ตัวอักษร)' };
  if (!name) return { error: 'ใส่ชื่อวิชา' };
  return { code, name };
}
admin.post('/courses', wrap(async (req, res) => {
  const tag = String(req.body.tag || '').trim().toLowerCase(), v = courseInput(req.body);
  if (!TAG_RE.test(tag)) return bad(res, 'invalid', { message: 'ตัวย่อใช้ a–z, 0–9, - หรือ _ ยาว 2–24 ตัว และขึ้นต้นด้วยตัวอักษรหรือตัวเลข' });
  if (v.error) return bad(res, 'invalid', { message: v.error });
  if (await one('SELECT 1 FROM courses WHERE tag = ?', [tag])) return bad(res, 'invalid', { message: 'มีตัวย่อ ' + tag + ' อยู่แล้ว' });
  const max = await one('SELECT COALESCE(MAX(sort), 0) AS m FROM courses');
  await run('INSERT INTO courses (tag, code, name, sort) VALUES (?,?,?,?)', [tag, v.code, v.name, Number(max.m) + 1]);
  res.json({ tag });
}));
admin.put('/courses/order', wrap(async (req, res) => {
  const tags = Array.isArray(req.body.tags) ? req.body.tags.map(String) : [];
  await db.batch(tags.map((t, i) => ({ sql: 'UPDATE courses SET sort = ? WHERE tag = ?', args: [i + 1, t] })), 'write');
  res.json({ ok: true });
}));
admin.put('/courses/:tag', wrap(async (req, res) => {
  const v = courseInput(req.body);
  if (v.error) return bad(res, 'invalid', { message: v.error });
  const r = await run('UPDATE courses SET code = ?, name = ? WHERE tag = ?', [v.code, v.name, req.params.tag]);
  if (!r.rowsAffected) return bad(res, 'not_found', {}, 404);
  res.json({ ok: true });
}));
admin.delete('/courses/:tag', wrap(async (req, res) => {
  const tag = req.params.tag, stmts = [];
  for (const q of await all("SELECT id, tags FROM questions WHERE tags LIKE ?", ['%"' + tag + '"%'])) {
    stmts.push({ sql: 'UPDATE questions SET tags = ? WHERE id = ?', args: [JSON.stringify(J(q.tags, []).filter(t => t !== tag)), q.id] });
  }
  stmts.push({ sql: 'DELETE FROM courses WHERE tag = ?', args: [tag] });
  await db.batch(stmts, 'write');
  res.json({ untagged: stmts.length - 1 });
}));
admin.post('/questions/bulk-tags', wrap(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
  const cs = await courses(), known = new Set(cs.map(c => c.tag));
  const add = (req.body.add || []).filter(t => known.has(t)), remove = new Set(req.body.remove || []);
  if (!ids.length || (!add.length && !remove.size)) return bad(res, 'invalid', { message: 'เลือกข้อสอบและรายวิชาก่อน' });
  const stmts = [];
  for (let i = 0; i < ids.length; i += 400) {
    const chunk = ids.slice(i, i + 400);
    for (const q of await all(`SELECT id, tags FROM questions WHERE id IN (${chunk.map(() => '?').join(',')})`, chunk)) {
      const set = new Set(J(q.tags, []).filter(t => !remove.has(t)).concat(add));
      stmts.push({ sql: 'UPDATE questions SET tags = ?, updated_at = ? WHERE id = ?', args: [JSON.stringify(cs.filter(c => set.has(c.tag)).map(c => c.tag)), Date.now(), q.id] });
    }
  }
  for (let i = 0; i < stmts.length; i += 300) await db.batch(stmts.slice(i, i + 300), 'write');
  res.json({ updated: stmts.length });
}));

admin.delete('/questions/:id', wrap(async (req, res) => {
  await run('DELETE FROM questions WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));
admin.post('/questions/export', wrap(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
  const rows = [];
  for (let i = 0; i < ids.length; i += 400) rows.push(...Object.values(await questionsByIds(ids.slice(i, i + 400))));
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => order.get(a.id) - order.get(b.id));
  const withImages = req.body.images !== false;
  res.json({ format: 'psru-exam-bank', version: 1, exportedAt: new Date().toISOString(), questions: rows.map(q => withImages ? q : { ...q, image: q.image ? '[image]' : null, options: q.options.map(o => ({ ...o, image: o.image ? '[image]' : null })) }) });
}));
// ---- import from other formats (e.g. the old exam-bank artifact) ----
const GROUP_ALIASES = { sw: ['software', 'softwaredevelopment', 'programming', 'ซอฟต์แวร์'], robot: ['robot', 'robotics', 'automation', 'robotautomation', 'robotandautomation', 'robotauto', 'หุ่นยนต์'], cyber: ['cyber', 'cybersecurity', 'security', 'ความปลอดภัย'], soft: ['softskill', 'softskills', 'ทักษะ'] };
const squash = s => String(s ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9฀-๿]/g, '');
function rawGroupValue(raw) {
  const v = raw.group_key ?? raw.groupKey ?? raw.group ?? raw.groupName ?? raw.group_name ?? raw.category ?? raw.subject ?? raw.subjectGroup ?? raw.section ?? raw.topic ?? '';
  return typeof v === 'object' && v ? String(v.key ?? v.name ?? v.id ?? '') : String(v);
}
function resolveGroup(value, gs, map) {
  if (map && Object.prototype.hasOwnProperty.call(map, value)) return map[value] || null; // admin's manual mapping ('' = skip)
  const s = squash(value);
  if (!s) return null;
  for (const g of gs) if ([g.key, g.name, g.short].some(x => squash(x) === s)) return g.key;
  for (const g of gs) for (const a of GROUP_ALIASES[g.key] || []) if (s === a || s.startsWith(a)) return g.key;
  return null;
}
function letterIndex(v) {
  if (typeof v === 'number') return v;
  const t = String(v).trim();
  if (/^\d+$/.test(t)) return +t;
  if (/^[A-Ja-j]$/.test(t)) return t.toUpperCase().charCodeAt(0) - 65;
  return NaN;
}
function resolveTags(raw, cs, unknownTags) {
  const v = raw.tags ?? raw.courses ?? raw.course ?? raw.subjects ?? raw.courseTags ?? [];
  const list = Array.isArray(v) ? v : String(v).split(/[,;|]/);
  const out = [];
  for (const t of list) {
    const s = squash(typeof t === 'object' && t ? t.tag ?? t.code ?? t.name : t);
    if (!s) continue;
    const c = cs.find(c => squash(c.tag) === s || squash(c.code) === s || squash(c.name) === s);
    if (c) out.push(c.tag); else unknownTags.add(String(typeof t === 'object' ? t.tag ?? t.code ?? t.name : t).trim());
  }
  return out;
}
function normalizeImported(raw, gs, map) {
  const gv = rawGroupValue(raw), group_key = resolveGroup(gv, gs, map);
  const list = raw.options ?? raw.choices ?? raw.answers ?? raw.choice ?? [];
  let options = (Array.isArray(list) ? list : []).map(o => {
    if (o == null || typeof o !== 'object') return { text: String(o ?? ''), image: null, correct: false };
    const img = o.image ?? o.img ?? o.imageUrl ?? null;
    return { text: String(o.text ?? o.label ?? o.value ?? o.choice ?? o.title ?? ''), image: img === '[image]' ? null : img, correct: !!(o.correct ?? o.isCorrect ?? o.is_correct ?? o.answer) };
  });
  // correct answers given separately: answer: 1 | 'B' | [0,2] | correct: ['A','C']
  const ans = raw.answer ?? raw.correctAnswer ?? raw.correctAnswers ?? raw.correct_index ?? raw.correctIndex ?? (Array.isArray(raw.correct) || typeof raw.correct !== 'object' ? raw.correct : undefined);
  if (ans != null && !options.some(o => o.correct)) {
    const idx = (Array.isArray(ans) ? ans : String(ans).split(/[,\s]+/)).map(letterIndex).filter(Number.isInteger);
    const oneBased = idx.length && !idx.includes(0) && Math.max(...idx) === options.length; // e.g. answer: 4 of 4 options
    options = options.map((o, i) => ({ ...o, correct: idx.includes(oneBased ? i + 1 : i) }));
  }
  const d = raw.difficulty ?? raw.level ?? 1;
  const difficulty = { 'ง่าย': 0, easy: 0, 'ปานกลาง': 1, medium: 1, normal: 1, 'ยาก': 2, hard: 2 }[String(d).toLowerCase()] ?? (+d >= 0 && +d <= 2 ? +d : +d === 3 ? 2 : 1);
  const img = raw.image ?? raw.img ?? raw.imageUrl ?? null;
  return {
    groupValue: gv,
    input: { group_key, type: raw.type === 'multi' || raw.type === 'multiple' ? 'multi' : undefined, text: raw.text ?? raw.question ?? raw.stem ?? raw.title ?? '', image: img === '[image]' ? null : img, options, explain: raw.explain ?? raw.explanation ?? raw.solution ?? '', difficulty, points: raw.points ?? raw.score ?? 1 }
  };
}

admin.post('/questions/import', wrap(async (req, res) => {
  const list = Array.isArray(req.body.questions) ? req.body.questions : [];
  const dup = req.body.dup === 'overwrite' ? 'overwrite' : 'skip';
  const map = req.body.groupMap && typeof req.body.groupMap === 'object' ? req.body.groupMap : null;
  const gs = await groups(), cs = await courses(), existing = new Set((await all('SELECT id FROM questions')).map(r => r.id));
  const out = { total: list.length, added: 0, duplicate: 0, overwritten: 0, skipped: [], unknownGroups: [], unknownTags: [] };
  const unknown = new Map(), unknownTags = new Set(), todo = [];
  list.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return out.skipped.push({ id: 'ข้อที่ ' + (i + 1), reason: 'รูปแบบข้อมูลไม่ถูกต้อง' });
    const { groupValue, input } = normalizeImported(raw, gs, map);
    const id = raw.id != null && raw.id !== '' ? String(raw.id) : null;
    if (!input.group_key) {
      if (!(map && groupValue in map)) unknown.set(groupValue, (unknown.get(groupValue) || 0) + 1);
      const chosenSkip = map && groupValue in map;
      return out.skipped.push({ id: id || 'ข้อที่ ' + (i + 1), reason: chosenSkip ? 'กลุ่ม “' + groupValue + '” เลือกไม่นำเข้า' : groupValue ? 'กลุ่มวิชา “' + groupValue + '” ไม่ตรงกับกลุ่มในระบบ' : 'ไม่มีกลุ่มวิชา' });
    }
    const v = questionInput({ ...input, tags: resolveTags(raw, cs, unknownTags) }, gs, cs);
    if (v.error) return out.skipped.push({ id: id || 'ข้อที่ ' + (i + 1), reason: v.error });
    if (id && existing.has(id)) { out.duplicate++; if (dup === 'overwrite') { out.overwritten++; todo.push([id, v]); } return; }
    out.added++; todo.push([id, v]);
  });
  out.unknownGroups = [...unknown].map(([value, count]) => ({ value, count }));
  out.unknownTags = [...unknownTags];
  if (!req.body.dryRun) for (const [id, v] of todo) { const nid = id || await nextQuestionId(v.group_key); existing.add(nid); await upsertQuestion(nid, v); }
  res.json(out);
}));

// results
admin.get('/results/:rid', wrap(async (req, res) => {
  const round = await getRound(req.params.rid);
  if (!round) return bad(res, 'not_found', {}, 404);
  const rows = await all(`SELECT r.sid, r.name, r.email, r.email_verified, a.status, a.answers, a.question_ids, a.leaves, a.started_at, a.deadline_at, a.submitted_at, a.auto_reason,
      x.ref, x.groups, x.pct FROM roster r
    LEFT JOIN attempts a ON a.round_id = r.round_id AND a.sid = r.sid
    LEFT JOIN results x ON x.round_id = r.round_id AND x.sid = r.sid
    WHERE r.round_id = ? ORDER BY r.sid`, [round.id]);
  const now = Date.now();
  const { avg, participants } = await roundAverages(round.id);
  const ev = {};
  for (const e of await all('SELECT sid, at, kind, duration_ms FROM events WHERE round_id = ? ORDER BY at', [round.id])) {
    const x = ev[e.sid] ||= { fsCount: 0, tabCount: 0, awayMs: 0, unknownDur: 0, log: [] };
    x[e.kind === 'fullscreen' ? 'fsCount' : 'tabCount']++;
    if (e.duration_ms != null) x.awayMs += Number(e.duration_ms); else x.unknownDur++;
    x.log.push({ at: Number(e.at), kind: e.kind, durationMs: e.duration_ms != null ? Number(e.duration_ms) : null });
  }
  res.json({
    round, avg, participants,
    rows: rows.map(r => {
      let status = r.status || 'not_started';
      if (status === 'in_progress' && now > Number(r.deadline_at) + GRACE_MS) status = 'submitted_pending'; // finalized on publish
      return {
        sid: r.sid, name: r.name, email: r.email, emailVerified: !!Number(r.email_verified), status,
        answered: Object.keys(J(r.answers, {})).length, total: J(r.question_ids, []).length, leaves: Number(r.leaves || 0),
        startedAt: r.started_at && Number(r.started_at), submittedAt: r.submitted_at && Number(r.submitted_at), autoReason: r.auto_reason || '',
        away: ev[r.sid] || { fsCount: 0, tabCount: 0, awayMs: 0, unknownDur: 0, log: [] },
        ref: r.ref || null, scores: r.groups ? Object.fromEntries(J(r.groups, []).map(g => [g.key, g.score])) : null, pct: r.pct != null ? Number(r.pct) : null
      };
    })
  });
}));
admin.get('/results/:rid/courses', wrap(async (req, res) => {
  if (!await getRound(req.params.rid)) return bad(res, 'not_found', {}, 404);
  res.json(await courseReport(req.params.rid));
}));
admin.get('/results/:rid/:sid', wrap(async (req, res) => {
  const round = await getRound(req.params.rid);
  if (!round) return bad(res, 'not_found', {}, 404);
  const events = await all('SELECT at, kind, duration_ms FROM events WHERE round_id = ? AND sid = ? ORDER BY at', [round.id, req.params.sid]);
  res.json({ result: await resultView(round, req.params.sid), courses: (await courseReport(round.id, req.params.sid)).rows, events: events.map(e => ({ at: Number(e.at), kind: e.kind, durationMs: e.duration_ms != null ? Number(e.duration_ms) : null })) });
}));
admin.post('/rounds/:id/publish', wrap(async (req, res) => {
  const round = await getRound(req.params.id);
  if (!round) return bad(res, 'not_found', {}, 404);
  const atts = (await all("SELECT * FROM attempts WHERE round_id = ? AND status != 'not_started'", [round.id])).map(parseAttempt);
  let scored = 0;
  for (const a of atts) {
    const cur = await enforceDeadline(round, a);
    if (cur.status === 'submitted') { await scoreAndStore(round, cur); scored++; }
  }
  await run('UPDATE rounds SET published = 1, published_at = ? WHERE id = ?', [Date.now(), round.id]);
  res.json({ scored });
}));
admin.get('/ref/:ref', wrap(async (req, res) => {
  const r = await one('SELECT * FROM results WHERE ref = ?', [String(req.params.ref).trim().toUpperCase()]);
  if (!r) return res.json({ found: false });
  const round = await getRound(r.round_id), stu = await one('SELECT name FROM roster WHERE round_id = ? AND sid = ?', [r.round_id, r.sid]);
  const att = await getAttempt(r.round_id, r.sid);
  res.json({ found: true, ref: r.ref, name: stu ? stu.name : '', sid: r.sid, roundName: round ? round.name : r.round_id, submittedAt: att && att.submitted_at, pct: Number(r.pct), correct: Number(r.correct), total: Number(r.total), published: !!(round && round.published) });
}));
app.use('/api/admin', admin);

app.use('/api', (req, res) => bad(res, 'not_found', {}, 404));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.type === 'entity.too.large' ? 413 : 500).json({ error: 'server_error', message: err.type === 'entity.too.large' ? 'ไฟล์ใหญ่เกินไป' : 'เกิดข้อผิดพลาดในระบบ' });
});

// static frontend (Vercel serves /public itself; this is for Node / Docker)
const pub = path.join(__dirname, '..', 'public');
app.use(express.static(pub, { extensions: ['html'] }));
app.get('/admin', (req, res) => res.sendFile(path.join(pub, 'admin.html')));
app.get('/verify', (req, res) => res.sendFile(path.join(pub, 'verify.html')));

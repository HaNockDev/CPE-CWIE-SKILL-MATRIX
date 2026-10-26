import { html, render, useState, useEffect, useRef, useMemo } from '../vendor/preact-htm.js';
import { api, store, thDate, thTime, thDateTime, toLocalInput, Icon, LogoBox, Toast, SpiderChart, trapFocus, ThemeButton, downloadBlob, UNI, LETTERS, MONO } from './common.js';

const TOKEN_KEY = 'psru-admin-token';
const DIFF = ['ง่าย', 'ปานกลาง', 'ยาก'];
const inp = 'height:44px;padding:0 12px;border-radius:12px;border:1.5px solid transparent;background:var(--fill);color:var(--ink);font-size:15px';
const bPrimary = 'height:44px;padding:0 18px;border:none;border-radius:12px;background:var(--primary);color:var(--primary-ink);font-size:15px;font-weight:600;cursor:pointer';
const bFill = 'height:44px;padding:0 18px;border:none;border-radius:12px;background:var(--fill);color:var(--ink);font-size:15px;font-weight:600;cursor:pointer';
const bGhost = (c = 'var(--ink)') => `height:44px;padding:0 12px;border:none;border-radius:8px;background:transparent;color:${c};font-size:14px;font-weight:600;cursor:pointer`;
const cardS = 'background:var(--surface);border:none;border-radius:20px;box-shadow:var(--shadow)';
const sel = on => ({ border: on ? 'var(--primary)' : 'var(--line)', bg: on ? 'var(--primary-soft)' : 'var(--surface)' });
const courseTip = c => c.code + ' ' + c.name;
// small read-only course tag; hover/focus shows code + full name
const TagChip = ({ c }) => html`<span class="tip" tabindex="0" data-tip=${courseTip(c)} aria-label=${c.tag + ' ' + courseTip(c)} style="display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:var(--primary-soft);color:var(--primary);font-size:12px;font-weight:600;white-space:nowrap">${c.tag}</span>`;

let TOKEN = store.get(TOKEN_KEY), onUnauthorized = () => {};
const call = (path, opts = {}) => api('/admin' + path, { ...opts, token: TOKEN }).catch(e => { if (e.status === 401) onUnauthorized(); throw e; });

function Modal({ children, onClose, style, role = 'dialog', labelledby, label, z = 40, pad = 24 }) {
  const ref = useRef();
  useEffect(() => trapFocus(ref.current, onClose), []);
  return html`<div style=${`position:fixed;inset:0;z-index:${z};display:flex;align-items:center;justify-content:center;padding:${pad}px`}>
    <div onClick=${onClose} style="position:absolute;inset:0;background:rgba(0,0,0,.32)"></div>
    <div ref=${ref} role=${role} aria-modal="true" aria-labelledby=${labelledby} aria-label=${label} style=${style}>${children}</div></div>`;
}
const ModalHead = ({ id, title, onClose }) => html`<div style="padding:18px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center"><h2 id=${id} style="margin:0;flex:1;font-size:20px;font-weight:700">${title}</h2><button onClick=${onClose} aria-label="ปิด" style="width:44px;height:44px;border:none;background:transparent;color:var(--ink);font-size:22px;cursor:pointer;border-radius:10px">×</button></div>`;

function ConfirmDialog({ cf, onCancel }) {
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await cf.action(); } finally { setBusy(false); onCancel(); } };
  return html`<${Modal} onClose=${onCancel} role="alertdialog" labelledby="cf-t" z=${50} style="position:relative;width:100%;max-width:460px;background:var(--surface);color:var(--ink);border-radius:16px;box-shadow:var(--shadow-lg);padding:22px 24px;display:flex;flex-direction:column;gap:12px">
    <h2 id="cf-t" style="margin:0;font-size:20px;font-weight:700;line-height:1.45">${cf.title}</h2>
    <p style="margin:0;color:var(--ink-2)">${cf.body}</p>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px">
      <button onClick=${onCancel} style=${bFill}>ยกเลิก</button>
      <button onClick=${go} disabled=${busy} style=${`height:44px;padding:0 18px;border:none;border-radius:10px;background:${cf.danger ? 'var(--danger)' : 'var(--primary)'};color:${cf.danger ? 'var(--surface)' : 'var(--primary-ink)'};font-size:15px;font-weight:600;cursor:pointer;opacity:${busy ? 0.6 : 1}`}>${cf.btn}</button>
    </div><//>`;
}

// ---------------- helpers ----------------
async function fileToDataUrl(file, max = 1280) {
  if (file.size > 2 * 1024 * 1024 && !file.type.startsWith('image/')) throw new Error('ไฟล์ใหญ่เกิน 2 MB');
  const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('อ่านรูปไม่ได้')); i.src = url; });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 400 * 1024) return { data: url, label: file.name + ' · ' + img.width + ' × ' + img.height + ' px' };
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
  const data = c.toDataURL('image/jpeg', 0.85);
  if (data.length > 2.8 * 1024 * 1024) throw new Error('รูปใหญ่เกิน 2 MB หลังย่อขนาด');
  return { data, label: file.name + ' · ' + c.width + ' × ' + c.height + ' px' };
}
function pickFile(accept) {
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
}
function parseDelimited(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const sep = l.includes('\t') ? '\t' : ',';
    const out = []; let cur = '', q = false;
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; }
    out.push(cur.trim()); return out;
  });
}
async function parseRosterFile(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกิน 5 MB');
  if (/\.xlsx?$/i.test(file.name)) {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
    const wb = XLSX.read(await file.arrayBuffer());
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false }).map(r => r.map(c => String(c ?? '').trim())).filter(r => r.some(Boolean));
  }
  return parseDelimited(await file.text());
}
function rowsToRoster(rows) {
  const start = rows.length && !/^\d/.test(rows[0][0] || '') ? 1 : 0; // header row
  return rows.slice(start).map((r, i) => ({ n: i + start + 1, sid: r[0] || '', name: r[1] || '', email: r[2] || '' }));
}
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csvBlob = rows => new Blob(['﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });

// ================= Login =================
function AdminLogin({ onDone }) {
  const [pw, setPw] = useState(''), [name, setName] = useState(store.get('psru-admin-name') || ''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api('/admin/login', { method: 'POST', body: { password: pw, name: name.trim() || 'ผู้ดูแลระบบ' } }); store.set('psru-admin-name', name.trim()); onDone(r.token, name.trim() || 'ผู้ดูแลระบบ'); }
    catch (x) { setErr(x.status === 401 ? 'รหัสผ่านไม่ถูกต้อง' : 'เชื่อมต่อระบบไม่ได้ ลองอีกครั้ง'); }
    setBusy(false);
  };
  return html`<div style="position:absolute;inset:0;overflow-y:auto;display:flex">
    <form onSubmit=${submit} style="margin:auto;width:100%;max-width:420px;padding:32px 20px;display:flex;flex-direction:column;gap:18px">
      <div style="display:flex;align-items:center;gap:12px"><${LogoBox} size=${44} font=${12} />
        <div style="flex:1;display:flex;flex-direction:column;line-height:1.4"><span style="font-size:15px;font-weight:700">ระบบสอบออนไลน์</span><span style="font-size:13px;color:var(--ink-3)">สำหรับผู้ดูแล</span></div><${ThemeButton} /></div>
      <h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.45">เข้าสู่ระบบผู้ดูแล</h1>
      ${err && html`<div role="alert" style="display:flex;gap:10px;padding:12px 14px;border-radius:12px;background:var(--danger-soft);border:1px solid var(--danger);color:var(--danger);font-weight:600">${Icon.warn(20)}${err}</div>`}
      <label style="display:flex;flex-direction:column;gap:6px"><span style="font-weight:600">ชื่อที่แสดง</span><input value=${name} onInput=${e => setName(e.target.value)} placeholder="เช่น อ.สมชาย วงศ์ไทย" autocomplete="name" style=${inp + ';height:48px;font-size:16px'} /></label>
      <label style="display:flex;flex-direction:column;gap:6px"><span style="font-weight:600">รหัสผ่านผู้ดูแล</span><input type="password" value=${pw} onInput=${e => setPw(e.target.value)} autocomplete="current-password" required style=${inp + ';height:48px;font-size:16px'} /></label>
      <button type="submit" disabled=${busy} class="h-primary" style=${bPrimary + ';height:52px;font-size:16px'}>${busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบ'}</button>
      <a href="/" style="font-size:14px;text-align:center">ไปหน้าเข้าสอบของนักศึกษา</a>
    </form></div>`;
}

// ================= A1 Rounds =================
const ST = { open: ['เปิดสอบอยู่', 'var(--ok-soft)', 'var(--ok)'], upcoming: ['ยังไม่ถึงเวลา', 'var(--primary-soft)', 'var(--primary)'], closed: ['ปิดแล้ว', 'var(--surface-2)', 'var(--ink-2)'] };
const whenLine = r => thDate(r.opensAt) === thDate(r.closesAt) ? thDate(r.opensAt) + ' · ' + thTime(r.opensAt) + '–' + thTime(r.closesAt) + ' น.' : thDateTime(r.opensAt) + ' – ' + thDateTime(r.closesAt);

function RoundsTab({ ctx }) {
  const { rounds, meta, prep } = ctx;
  return html`
    <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:240px"><h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.45">รอบสอบ</h1><span style="color:var(--ink-2)">${rounds ? rounds.length + ' รอบ · เรียงตามวันสอบ' : 'กำลังโหลด…'}</span></div>
      <button onClick=${() => ctx.open({ kind: 'roundForm', round: null })} class="h-primary" style=${bPrimary}>+ สร้างรอบสอบ</button>
    </div>
    ${!rounds && html`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,400px),1fr));gap:16px">${[1, 2, 3].map(() => html`<div style="height:280px;border-radius:14px;background:var(--surface);border:1px solid var(--line);padding:20px;display:flex;flex-direction:column;gap:12px"><div style="width:30%;height:22px;border-radius:6px;background:var(--surface-2)"></div><div style="width:80%;height:26px;border-radius:6px;background:var(--surface-2)"></div><div style="width:60%;height:18px;border-radius:6px;background:var(--surface-2)"></div><div style="flex:1;border-radius:8px;background:var(--surface-2)"></div></div>`)}</div>`}
    ${rounds && !rounds.length && html`<div style="border:1.5px dashed var(--line-strong);border-radius:16px;padding:56px 24px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center">
      <div style="font-size:18px;font-weight:700">ยังไม่มีรอบสอบ</div>
      <div style="color:var(--ink-2);max-width:420px">สร้างรอบสอบเพื่อกำหนดช่วงเวลา จำนวนข้อจากแต่ละกลุ่มวิชา แล้วนำเข้ารายชื่อนักศึกษา</div>
      <button onClick=${() => ctx.open({ kind: 'roundForm', round: null })} style=${bPrimary + ';margin-top:6px'}>+ สร้างรอบสอบแรก</button></div>`}
    ${rounds && rounds.length > 0 && html`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,400px),1fr));gap:16px">
      ${rounds.map(r => {
        const st = ST[r.status], p = prep[r.id], total = Object.values(r.picks).reduce((a, b) => a + b, 0);
        const ready = r.setReady && r.sets >= r.roster && r.roster > 0;
        return html`<article key=${r.id} style=${cardS + ';display:flex;flex-direction:column'}>
          <div style="padding:18px 20px 14px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span style=${`display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;background:${st[1]};color:${st[2]};font-size:13px;font-weight:600`}><span style="width:8px;height:8px;border-radius:50%;background:currentColor"></span>${st[0]}</span>
              <span style="display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;border:1px solid var(--line-strong);color:var(--ink-2);font-size:13px;font-weight:500;white-space:nowrap">${r.published ? '✓ เผยแพร่ผลแล้ว' : 'ยังไม่เผยแพร่ผล'}</span>
            </div>
            <h2 style="margin:0;font-size:18px;font-weight:700;line-height:1.5">${r.name}</h2>
            <div style="color:var(--ink-2);font-size:14px">${whenLine(r)} · ทำข้อสอบ ${r.durationMin} นาที · ออกนอกจอได้ ${r.maxLeaves} ครั้ง</div>
            <div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 16px;font-size:14px;padding-top:4px">
              <span style="color:var(--ink-3)">รายชื่อ</span><span style=${`font-weight:600;color:${r.roster ? 'var(--ink)' : 'var(--warn)'}`}>${r.roster ? r.roster + ' คน' : '⚠ ยังไม่มีรายชื่อ'}</span>
              <span style="color:var(--ink-3)">ชุดข้อสอบ</span>
              <span style="display:flex;flex-direction:column;gap:4px">
                <span style=${`font-weight:600;color:${p != null ? 'var(--primary)' : ready ? 'var(--ok)' : 'var(--warn)'}`}>${p != null ? 'กำลังเตรียมชุดข้อสอบ ' + p + '%' : ready ? '✓ พร้อม (สุ่มรายบุคคลแล้ว)' : r.roster ? '⚠ ยังไม่เตรียม (จะสุ่มให้ตอนเริ่มสอบ)' : '⚠ ยังไม่เตรียม'}</span>
                ${p != null && html`<span role="progressbar" aria-valuenow=${p} aria-valuemin="0" aria-valuemax="100" style="height:6px;border-radius:3px;background:var(--surface-2);overflow:hidden"><span style=${`display:block;height:100%;width:${p}%;background:var(--primary);transition:width .3s`}></span></span>`}
              </span>
              <span style="color:var(--ink-3)">จำนวนข้อ</span>
              <span style="display:flex;gap:6px;flex-wrap:wrap">
                ${meta.groups.map(g => html`<span style="font-size:13px;padding:1px 8px;border-radius:6px;background:var(--surface-2);color:var(--ink-2)">${g.short} ${r.picks[g.key] || 0}</span>`)}
                <span style="font-size:13px;padding:1px 8px;font-weight:700">= ${total} ข้อ</span>
              </span>
            </div>
          </div>
          <div style="margin-top:auto;border-top:1px solid var(--line);padding:10px 12px;display:flex;flex-wrap:wrap;gap:4px">
            <button onClick=${() => ctx.open({ kind: 'import', round: r })} class="h-surface2" style=${bGhost()}>นำเข้ารายชื่อ</button>
            <button onClick=${() => ctx.prepare(r)} disabled=${p != null} class="h-surface2" style=${bGhost()}>เตรียมชุดข้อสอบ</button>
            <button onClick=${() => ctx.open({ kind: 'code', id: r.id })} style=${bGhost('var(--primary)') + ';background:var(--primary-soft);font-weight:700'}>รหัสสอบ</button>
            <button onClick=${() => ctx.goResults(r.id)} class="h-surface2" style=${bGhost()}>ดูผล</button>
            <button onClick=${() => ctx.open({ kind: 'roundForm', round: r })} class="h-surface2" style=${bGhost()}>แก้ไข</button>
            <button onClick=${() => ctx.confirm({ title: 'ลบรอบสอบนี้?', body: '“' + r.name + '” พร้อมรายชื่อ ' + r.roster + ' คน และผลสอบทั้งหมดของรอบนี้จะถูกลบ กู้คืนไม่ได้', btn: 'ลบรอบสอบ', danger: true, action: async () => { await call('/rounds/' + r.id, { method: 'DELETE' }); ctx.toast('ลบรอบสอบแล้ว'); ctx.reload(); } })} class="h-danger" style=${bGhost('var(--danger)') + ';margin-left:auto'}>ลบ</button>
          </div>
        </article>`;
      })}
    </div>`}`;
}

function RoundForm({ ctx, round, onClose }) {
  const { meta } = ctx;
  const now = Date.now(), dflt = new Date(); dflt.setDate(dflt.getDate() + 7); dflt.setHours(9, 0, 0, 0);
  const [f, setF] = useState(round ? { name: round.name, open: toLocalInput(round.opensAt), close: toLocalInput(round.closesAt), dur: round.durationMin, leaves: round.maxLeaves, picks: { ...round.picks } }
    : { name: '', open: toLocalInput(+dflt), close: toLocalInput(+dflt + 2 * 3600e3), dur: 60, leaves: 3, picks: Object.fromEntries(meta.groups.map(g => [g.key, Math.min(10, g.bank)])) });
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const upd = o => setF({ ...f, ...o });
  const over = meta.groups.map(g => (f.picks[g.key] || 0) > g.bank);
  const total = meta.groups.reduce((a, g) => a + (+f.picks[g.key] || 0), 0);
  const badTime = !f.open || !f.close || new Date(f.close) <= new Date(f.open);
  const invalid = !f.name.trim() || over.some(Boolean) || total === 0 || badTime || !(+f.dur >= 1);
  const save = async () => {
    if (invalid) return; setBusy(true); setErr('');
    const body = { name: f.name, opensAt: +new Date(f.open), closesAt: +new Date(f.close), durationMin: +f.dur, maxLeaves: +f.leaves, picks: f.picks };
    try { await call(round ? '/rounds/' + round.id : '/rounds', { method: round ? 'PUT' : 'POST', body }); ctx.toast('บันทึกรอบสอบแล้ว'); ctx.reload(); onClose(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const lbl = (t, el, hint) => html`<label style="display:flex;flex-direction:column;gap:6px"><span style="font-weight:600">${t}</span>${el}${hint && html`<span style="font-size:13px;color:var(--ink-3)">${hint}</span>`}</label>`;
  return html`<${Modal} onClose=${onClose} labelledby="rf-t" style="position:relative;width:100%;max-width:680px;max-height:100%;overflow:auto;background:var(--surface);border-radius:22px;box-shadow:var(--shadow-lg);display:flex;flex-direction:column">
    <${ModalHead} id="rf-t" title=${round ? 'แก้ไขรอบสอบ' : 'สร้างรอบสอบ'} onClose=${onClose} />
    <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px">
      ${lbl('ชื่อรอบสอบ', html`<input value=${f.name} onInput=${e => upd({ name: e.target.value })} placeholder="เช่น วัดความพร้อมก่อนสหกิจศึกษา รอบที่ 1/2569" style=${inp} />`)}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        ${lbl('เปิดสอบ', html`<input type="datetime-local" value=${f.open} onInput=${e => upd({ open: e.target.value })} style=${inp} />`)}
        ${lbl('ปิดสอบ', html`<input type="datetime-local" value=${f.close} onInput=${e => upd({ close: e.target.value })} aria-invalid=${badTime} style=${inp + (badTime ? ';border-color:var(--danger)' : '')} />`, badTime ? html`<span style="color:var(--danger)">เวลาปิดต้องหลังเวลาเปิด</span>` : null)}
        ${lbl('เวลาทำข้อสอบ (นาที)', html`<input type="number" min="1" value=${f.dur} onInput=${e => upd({ dur: e.target.value })} style=${inp} />`)}
        ${lbl('ออกนอกหน้าจอได้ (ครั้ง)', html`<input type="number" min="0" value=${f.leaves} onInput=${e => upd({ leaves: e.target.value })} style=${inp} />`, 'เกินจำนวนนี้ ระบบส่งข้อสอบอัตโนมัติ')}
      </div>
      <fieldset style="margin:0;border:1px solid var(--line);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px">
        <legend style="padding:0 6px;font-weight:600">จำนวนข้อที่สุ่มจากแต่ละกลุ่มวิชา</legend>
        ${meta.groups.map((g, i) => html`<div style="display:grid;grid-template-columns:minmax(0,1fr) 110px;gap:12px;align-items:center">
          <div style="display:flex;flex-direction:column;line-height:1.4"><span style="font-weight:600">${g.name}</span><span style=${`font-size:13px;color:${over[i] ? 'var(--danger)' : 'var(--ink-3)'}`}>${over[i] ? '⚠ เกินจำนวนในคลัง (มี ' + g.bank + ' ข้อ)' : 'มีในคลัง ' + g.bank + ' ข้อ'}</span></div>
          <input type="number" min="0" aria-label=${g.name} value=${f.picks[g.key] || 0} onInput=${e => upd({ picks: { ...f.picks, [g.key]: Math.max(0, parseInt(e.target.value || '0', 10) || 0) } })} style=${`height:44px;padding:0 12px;border-radius:10px;border:1.5px solid ${over[i] ? 'var(--danger)' : 'var(--line-strong)'};background:var(--surface);color:var(--ink);font-size:16px;text-align:right;${MONO}`} />
        </div>`)}
        <div style="display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:10px;font-weight:700"><span>รวม</span><span>${total} ข้อ</span></div>
      </fieldset>
      ${round && round.sets > 0 && html`<div style="font-size:13px;color:var(--ink-3)">หากเปลี่ยนจำนวนข้อ ชุดข้อสอบของผู้ที่ยังไม่เริ่มสอบจะถูกสุ่มใหม่ ผู้ที่เริ่มสอบแล้วใช้ชุดเดิม</div>`}
      ${err && html`<div role="alert" style="color:var(--danger);font-weight:600">${err}</div>`}
    </div>
    <div style="padding:14px 24px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:10px">
      <button onClick=${onClose} style=${bFill}>ยกเลิก</button>
      <button onClick=${save} disabled=${invalid || busy} style=${bPrimary + ';opacity:' + (invalid || busy ? 0.5 : 1)}>บันทึกรอบสอบ</button>
    </div><//>`;
}

function CodeOverlay({ ctx, id, onClose }) {
  const r = (ctx.rounds || []).find(x => x.id === id);
  const ref = useRef();
  useEffect(() => trapFocus(ref.current, onClose), []);
  if (!r) return null;
  const copy = () => navigator.clipboard?.writeText(r.code).then(() => ctx.toast('คัดลอกรหัส ' + r.code + ' แล้ว'));
  const regen = () => ctx.confirm({ title: 'สร้างรหัสสอบใหม่?', body: 'รหัสเดิม ' + r.code + ' จะใช้เข้าสู่ระบบไม่ได้ทันที นักศึกษาที่ยังไม่เข้าสู่ระบบต้องใช้รหัสใหม่', btn: 'สร้างรหัสใหม่', action: async () => { await call('/rounds/' + r.id + '/code', { method: 'POST' }); ctx.toast('สร้างรหัสสอบใหม่แล้ว รหัสเดิมใช้ไม่ได้'); await ctx.reload(); } });
  return html`<div ref=${ref} role="dialog" aria-modal="true" aria-label="รหัสสอบ" style="position:fixed;inset:0;z-index:45;background:#0a0a0c;color:#ffffff;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;gap:12px">
      <span style="font-size:18px;color:#c9d2e3">${r.name}</span>
      <button onClick=${onClose} style="height:44px;padding:0 18px;border:1px solid rgba(255,255,255,.3);border-radius:10px;background:transparent;color:#ffffff;font-size:15px;font-weight:600;cursor:pointer">ปิด</button>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px;text-align:center">
      <span style="font-size:28px;color:#c9d2e3;font-weight:500">รหัสการสอบ</span>
      <span style=${MONO + ';font-weight:600;font-size:clamp(56px,11vw,180px);letter-spacing:.06em;line-height:1.1'}>${r.code}</span>
      <span style="font-size:clamp(17px,2.4vw,24px);color:#c9d2e3">กรอกรหัสนี้ในหน้าเข้าสู่ระบบ พร้อมอีเมลและรหัสนักศึกษา</span>
      <span style="font-size:16px;color:#8a93a6">${location.host}</span>
    </div>
    <div style="display:flex;justify-content:center;gap:12px;padding:24px;flex-wrap:wrap">
      <button onClick=${copy} style="height:52px;padding:0 24px;border:none;border-radius:12px;background:#ffffff;color:#0c1220;font-size:16px;font-weight:700;cursor:pointer">คัดลอกรหัส</button>
      <button onClick=${regen} style="height:52px;padding:0 24px;border:1px solid rgba(255,255,255,.3);border-radius:12px;background:transparent;color:#ffffff;font-size:16px;font-weight:600;cursor:pointer">สร้างรหัสใหม่</button>
    </div></div>`;
}

function ImportRoster({ ctx, round, onClose }) {
  const [step, setStep] = useState(1), [src, setSrc] = useState('paste'), [mode, setMode] = useState('add');
  const [text, setText] = useState(''), [fileRows, setFileRows] = useState(null), [fileName, setFileName] = useState('');
  const [check, setCheck] = useState(null), [done, setDone] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const rows = () => rowsToRoster(src === 'paste' ? parseDelimited(text) : fileRows || []);
  const read = async () => {
    const r = rows(); if (!r.length) return setErr('ยังไม่มีข้อมูล วางรายชื่อหรือเลือกไฟล์ก่อน');
    setBusy(true); setErr('');
    try { setCheck(await call('/rounds/' + round.id + '/roster', { method: 'POST', body: { rows: r, mode, dryRun: true } })); setStep(2); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const commit = async () => {
    setBusy(true); setErr('');
    try { setDone(await call('/rounds/' + round.id + '/roster', { method: 'POST', body: { rows: rows(), mode } })); setStep(3); ctx.reload(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const choose = async f => {
    if (!f) return;
    try { setFileRows(await parseRosterFile(f)); setFileName(f.name); setErr(''); } catch (e) { setErr('อ่านไฟล์ไม่ได้: ' + e.message); }
  };
  const preview = check ? check.rows.filter((r, i) => i < 6 || r.error).slice(0, 60) : [];
  const steps = ['นำเข้าข้อมูล', 'ตรวจสอบตัวอย่าง', 'สรุปผล'];
  return html`<${Modal} onClose=${onClose} labelledby="im-t" style="position:relative;width:100%;max-width:820px;max-height:100%;overflow:auto;background:var(--surface);border-radius:22px;box-shadow:var(--shadow-lg);display:flex;flex-direction:column">
    <div style="padding:18px 24px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center"><div style="flex:1;display:flex;flex-direction:column"><h2 id="im-t" style="margin:0;font-size:20px;font-weight:700">นำเข้ารายชื่อผู้สอบ</h2><span style="font-size:14px;color:var(--ink-2)">${round.name} · ปัจจุบัน ${round.roster} คน</span></div><button onClick=${onClose} aria-label="ปิด" style="width:44px;height:44px;border:none;background:transparent;color:var(--ink);font-size:22px;cursor:pointer;border-radius:10px">×</button></div>
      <ol style="margin:0;padding:0;list-style:none;display:flex;gap:8px">
        ${steps.map((l, i) => { const n = i + 1, d = n < step, c = n === step; return html`<li aria-current=${c ? 'step' : undefined} style=${`flex:1;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:${c || d ? 'var(--ink)' : 'var(--ink-3)'}`}><span style=${`width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:13px;background:${c ? 'var(--primary)' : d ? 'var(--ok)' : 'var(--surface-2)'};color:${c || d ? 'var(--surface)' : 'var(--ink-2)'}`}>${d ? '✓' : n}</span>${l}<span style="flex:1;height:2px;background:var(--line)"></span></li>`; })}
      </ol>
    </div>
    <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px">
      ${step === 1 && html`
        <div role="tablist" style="display:flex;gap:6px;flex-wrap:wrap">
          ${[['paste', 'วางข้อความ'], ['file', 'เลือกไฟล์ CSV / XLSX']].map(([k, l]) => html`<button role="tab" aria-selected=${src === k} onClick=${() => setSrc(k)} style=${`height:40px;padding:0 14px;border-radius:999px;border:1.5px solid ${src === k ? 'var(--primary)' : 'var(--line-strong)'};background:${src === k ? 'var(--primary-soft)' : 'var(--surface)'};color:${src === k ? 'var(--primary)' : 'var(--ink)'};font-size:14px;font-weight:600;cursor:pointer`}>${l}</button>`)}
        </div>
        ${src === 'paste' && html`<textarea aria-label="วางรายชื่อ" rows="7" value=${text} onInput=${e => setText(e.target.value)} placeholder=${'6512345678, นางสาวกานต์ธิดา ใจดี, 6512345678@psru.ac.th\n6512345679, นายธนกฤต ศรีสุข, 6512345679@psru.ac.th\n…'} style=${'width:100%;padding:12px;border-radius:12px;border:1.5px solid transparent;background:var(--fill);color:var(--ink);font-size:13px;line-height:1.7;resize:vertical;' + MONO}></textarea>`}
        ${src === 'file' && html`<div onDragOver=${e => e.preventDefault()} onDrop=${e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }} style="border:1.5px dashed var(--line-strong);border-radius:12px;padding:32px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <span style="font-weight:600">${fileName ? fileName + ' · ' + (fileRows || []).length + ' แถว' : 'ลากไฟล์มาวางที่นี่ หรือ'}</span>
          <button onClick=${async () => choose(await pickFile('.csv,.tsv,.txt,.xlsx,.xls'))} style=${bFill}>เลือกไฟล์ CSV / XLSX</button>
          <span style="font-size:13px;color:var(--ink-3)">แถวแรกเป็นหัวคอลัมน์ได้ ขนาดไม่เกิน 5 MB</span></div>`}
        <div style="background:var(--surface-2);border-radius:10px;padding:12px 14px;font-size:14px;display:flex;flex-direction:column;gap:4px"><strong>รูปแบบที่รองรับ</strong><span style="color:var(--ink-2)">3 คอลัมน์ เรียงตามนี้: รหัสนักศึกษา (10 หลัก), ชื่อ-สกุล, อีเมล @${ctx.meta.emailDomain} · คั่นด้วยจุลภาคหรือแท็บ</span><code style=${MONO + ';font-size:13px'}>6512345678, นางสาวกานต์ธิดา ใจดี, 6512345678@${ctx.meta.emailDomain}</code></div>
        <div role="radiogroup" aria-label="วิธีนำเข้า" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
          ${[['add', 'เพิ่มต่อจากรายชื่อเดิม', 'รหัสที่มีอยู่แล้วจะถูกข้าม'], ['replace', 'แทนที่รายชื่อทั้งหมด', 'รายชื่อเดิมที่ยังไม่เริ่มสอบจะถูกลบ']].map(([k, l, d]) => html`<button role="radio" aria-checked=${mode === k} onClick=${() => setMode(k)} style=${`text-align:left;padding:12px 14px;border-radius:12px;border:2px solid ${sel(mode === k).border};background:${sel(mode === k).bg};color:var(--ink);cursor:pointer;display:flex;flex-direction:column;gap:2px`}><span style="font-weight:700;font-size:15px">${l}</span><span style="font-size:13px;color:var(--ink-2)">${d}</span></button>`)}
        </div>`}
      ${step === 2 && check && html`
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:14px"><span style="padding:4px 12px;border-radius:999px;background:var(--ok-soft);color:var(--ok);font-weight:600">✓ อ่านได้ ${check.ok} แถว</span>${check.skipped > 0 && html`<span style="padding:4px 12px;border-radius:999px;background:var(--warn-soft);color:var(--warn);font-weight:600">⚠ มีปัญหา ${check.skipped} แถว (จะถูกข้าม)</span>`}</div>
        <div style="border:1px solid var(--line);border-radius:10px;overflow:auto;max-height:360px">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead><tr style="background:var(--surface-2);color:var(--ink-2);text-align:left"><th style="padding:8px 12px;width:60px">แถว</th><th style="padding:8px 12px">รหัสนักศึกษา</th><th style="padding:8px 12px">ชื่อ-สกุล</th><th style="padding:8px 12px">อีเมล</th><th style="padding:8px 12px">ตรวจสอบ</th></tr></thead>
            <tbody>${preview.map(r => html`<tr style=${`border-top:1px solid var(--line);background:${r.error ? 'var(--warn-soft)' : 'transparent'}`}><td style="padding:8px 12px;color:var(--ink-3)">${r.n}</td><td style=${'padding:8px 12px;' + MONO}>${r.sid}</td><td style="padding:8px 12px">${r.name}</td><td style="padding:8px 12px;word-break:break-all">${r.email}</td><td style=${`padding:8px 12px;font-weight:600;color:${r.error ? 'var(--warn)' : 'var(--ok)'}`}>${r.error ? '⚠ ' + r.error : '✓ ถูกต้อง'}</td></tr>`)}</tbody>
          </table></div>
        ${check.rows.length > preview.length && html`<span style="font-size:13px;color:var(--ink-3)">แสดง ${preview.length} จาก ${check.rows.length} แถว (แถวที่มีปัญหาแสดงทั้งหมด)</span>`}`}
      ${step === 3 && done && html`
        <div style="display:flex;gap:12px;align-items:center;padding:16px;border-radius:12px;background:var(--ok-soft)"><span style="width:40px;height:40px;border-radius:50%;background:var(--ok);color:var(--surface);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;flex:none">✓</span><div style="display:flex;flex-direction:column"><strong style="font-size:17px">นำเข้าสำเร็จ ${done.imported} คน</strong><span style="color:var(--ink-2)">${mode === 'replace' ? 'แทนที่รายชื่อเดิมทั้งหมดแล้ว' : 'เพิ่มต่อจากรายชื่อเดิม'}</span></div></div>
        ${done.skipped.length > 0 && html`<div style="display:flex;flex-direction:column;gap:6px"><strong>ข้าม ${done.skipped.length} แถว</strong>
          ${done.skipped.map(k => html`<div style="display:flex;gap:12px;padding:8px 12px;border-radius:8px;background:var(--warn-soft);font-size:14px"><span style="font-weight:700;flex:none">แถว ${k.n}</span><span>${k.reason}</span></div>`)}</div>`}`}
      ${err && html`<div role="alert" style="color:var(--danger);font-weight:600">${err}</div>`}
    </div>
    <div style="padding:14px 24px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:10px">
      <button onClick=${() => step === 1 ? onClose() : (setStep(1), setCheck(null), setDone(null))} style=${bFill}>${step === 1 ? 'ยกเลิก' : step === 2 ? '← ย้อนกลับ' : 'นำเข้าไฟล์อื่น'}</button>
      <button onClick=${() => step === 1 ? read() : step === 2 ? commit() : onClose()} disabled=${busy || (step === 2 && check && !check.ok)} style=${bPrimary + ';opacity:' + (busy || (step === 2 && check && !check.ok) ? 0.6 : 1)}>${busy ? 'กำลังดำเนินการ…' : step === 1 ? 'อ่านข้อมูล →' : step === 2 ? 'ยืนยันนำเข้า ' + check.ok + ' คน' : 'เสร็จสิ้น'}</button>
    </div><//>`;
}

// ================= A2 Bank =================
function BankTab({ ctx }) {
  const { meta, bank } = ctx;
  const [g, setG] = useState('all'), [t, setT] = useState('all'), [q, setQ] = useState(''), [tag, setTag] = useState('all');
  const courseBy = Object.fromEntries((meta.courses || []).map(c => [c.tag, c]));
  const gName = k => (meta.groups.find(x => x.key === k) || {}).name || k;
  const qq = q.trim().toLowerCase();
  const tagHit = b => (b.tags || []).some(x => x.includes(qq) || (courseBy[x] && courseBy[x].code.toLowerCase().includes(qq)));
  const rows = (bank || []).filter(b => (g === 'all' || b.group_key === g) && (t === 'all' || b.type === t) && (tag === 'all' || (tag === 'none' ? !(b.tags || []).length : (b.tags || []).includes(tag))) && (!qq || b.text.toLowerCase().includes(qq) || b.id.toLowerCase().includes(qq) || tagHit(b)));
  ctx.bankFiltered = rows;
  const total = meta.groups.reduce((a, x) => a + x.bank, 0);
  const chip = on => ({ border: on ? 'var(--primary)' : 'transparent', bg: on ? 'var(--primary)' : 'var(--fill)', ink: on ? 'var(--primary-ink)' : 'var(--ink)', countBg: on ? 'rgba(255,255,255,.22)' : 'var(--surface-2)' });
  const copy = async b => { try { const r = await call('/questions/' + b.id + '/copy', { method: 'POST' }); ctx.toast('คัดลอก ' + b.id + ' เป็น ' + r.id + ' แล้ว'); ctx.reloadBank(); } catch (e) { ctx.toast(e.message, 'error'); } };
  return html`
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:240px"><h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.45">คลังข้อสอบ</h1><span style="color:var(--ink-2)">ทั้งหมด ${total} ข้อ</span></div>
      <button onClick=${() => ctx.open({ kind: 'qimport' })} class="h-surface2" style=${bFill + ';padding:0 16px'}>นำเข้า JSON</button>
      <button onClick=${() => ctx.open({ kind: 'qexport' })} class="h-surface2" style=${bFill + ';padding:0 16px'}>ส่งออก</button>
      <button onClick=${() => ctx.open({ kind: 'editor', id: null })} class="h-primary" style=${bPrimary}>+ เพิ่มข้อสอบ</button>
    </div>
    <div role="tablist" aria-label="กลุ่มวิชา" style="display:flex;gap:8px;flex-wrap:wrap">
      ${[{ key: 'all', name: 'ทั้งหมด', bank: total }].concat(meta.groups).map(x => { const c = chip(g === x.key); return html`<button role="tab" aria-selected=${g === x.key} onClick=${() => setG(x.key)} style=${`height:44px;padding:0 16px;border-radius:999px;border:1.5px solid ${c.border};background:${c.bg};color:${c.ink};font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px`}>${x.name}<span style=${`${MONO};font-size:13px;padding:0 7px;border-radius:999px;background:${c.countBg}`}>${x.bank}</span></button>`; })}
    </div>
    <div style=${cardS + ';overflow:hidden'}>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--line)">
        <label style="flex:1;min-width:240px;max-width:420px;position:relative;display:flex;align-items:center">${Icon.search()}
          <input aria-label="ค้นหาโจทย์หรือรหัสข้อ" placeholder="ค้นหาโจทย์ รหัสข้อ หรือรายวิชา" value=${q} onInput=${e => setQ(e.target.value)} style=${inp + ';width:100%;padding-left:38px'} /></label>
        <div role="radiogroup" aria-label="ประเภท" style="display:flex;gap:2px;padding:2px;border-radius:10px;background:var(--fill)">
          ${[['all', 'ทุกประเภท'], ['single', 'ข้อเดียว'], ['multi', 'หลายข้อ']].map(([k, l]) => html`<button role="radio" aria-checked=${t === k} onClick=${() => setT(k)} style=${`height:38px;padding:0 14px;border:none;border-radius:8px;background:${t === k ? 'var(--surface)' : 'transparent'};color:var(--ink);font-size:14px;font-weight:600;cursor:pointer;box-shadow:${t === k ? '0 1px 3px rgba(0,0,0,.14)' : 'none'}`}>${l}</button>`)}
        </div>
        <select aria-label="กรองตามรายวิชา" value=${tag} onChange=${e => setTag(e.target.value)} style=${inp + ';height:42px;max-width:280px'}>
          <option value="all">ทุกรายวิชา</option><option value="none">ยังไม่ติด tag</option>
          ${(meta.courses || []).map(c => html`<option value=${c.tag}>${c.tag} · ${c.code}</option>`)}
        </select>
        <span style="margin-left:auto;color:var(--ink-3);font-size:14px">พบ ${rows.length} ข้อ</span>
      </div>
      ${!bank && html`<div style="padding:40px;text-align:center;color:var(--ink-2)">กำลังโหลดข้อมูล…</div>`}
      ${bank && rows.length > 0 && html`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:1040px">
        <thead><tr style="background:var(--surface-2);color:var(--ink-2);text-align:left">
          <th style="padding:10px 16px;font-weight:600;width:110px">รหัส</th><th style="padding:10px 8px;font-weight:600;width:170px">กลุ่มวิชา</th><th style="padding:10px 8px;font-weight:600;width:110px">ประเภท</th><th style="padding:10px 8px;font-weight:600">โจทย์</th><th style="padding:10px 8px;font-weight:600;width:190px">รายวิชา</th><th style="padding:10px 8px;font-weight:600;width:56px;text-align:center">รูป</th><th style="padding:10px 8px;font-weight:600;width:90px">ความยาก</th><th style="padding:10px 16px;font-weight:600;width:230px;text-align:right">จัดการ</th>
        </tr></thead>
        <tbody>${rows.map(b => html`<tr key=${b.id} style="border-top:1px solid var(--line)">
          <td style=${'padding:10px 16px;font-size:13px;color:var(--ink-2);' + MONO}>${b.id}</td>
          <td style="padding:10px 8px">${gName(b.group_key)}</td>
          <td style="padding:10px 8px"><span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--ink-2)"><span style=${`width:12px;height:12px;border:2px solid currentColor;border-radius:${b.type === 'multi' ? '3px' : '50%'}`}></span>${b.type === 'multi' ? 'หลายข้อ' : 'ข้อเดียว'}</span></td>
          <td style="padding:10px 8px;max-width:0"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.7" title=${b.text}>${b.text.replace(/\n+/g, ' ')}</div></td>
          <td style="padding:8px"><div style="display:flex;gap:4px;flex-wrap:wrap">${(b.tags || []).map(x => courseBy[x] && html`<${TagChip} c=${courseBy[x]} />`)}${!(b.tags || []).length && html`<span style="color:var(--ink-3)">—</span>`}</div></td>
          <td style="padding:10px 8px;text-align:center">${b.hasImage && Icon.image()}</td>
          <td style="padding:10px 8px">${DIFF[b.difficulty]}</td>
          <td style="padding:6px 12px;text-align:right;white-space:nowrap">
            <button onClick=${() => ctx.open({ kind: 'editor', id: b.id, view: true })} class="h-surface2" style=${bGhost() + ';height:36px;padding:0 10px;font-size:13px'}>ดู</button>
            <button onClick=${() => ctx.open({ kind: 'editor', id: b.id })} class="h-psoft" style=${bGhost('var(--primary)') + ';height:36px;padding:0 10px;font-size:13px'}>แก้ไข</button>
            <button onClick=${() => copy(b)} class="h-surface2" style=${bGhost() + ';height:36px;padding:0 10px;font-size:13px'}>คัดลอก</button>
            <button onClick=${() => ctx.confirm({ title: 'ลบข้อสอบ ' + b.id + '?', body: 'ข้อสอบนี้จะถูกนำออกจากคลัง ผู้ที่ได้รับข้อนี้ในชุดข้อสอบแล้วจะไม่เห็นข้อนี้และไม่นำมาคิดคะแนน', btn: 'ลบข้อสอบ', danger: true, action: async () => { await call('/questions/' + b.id, { method: 'DELETE' }); ctx.toast('ลบ ' + b.id + ' แล้ว'); ctx.reloadBank(); } })} class="h-danger" style=${bGhost('var(--danger)') + ';height:36px;padding:0 10px;font-size:13px'}>ลบ</button>
          </td></tr>`)}</tbody></table></div>`}
      ${bank && rows.length === 0 && html`<div style="padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
        <div style="font-size:17px;font-weight:700">${qq ? 'ไม่พบข้อสอบที่ตรงกับ “' + q + '”' : bank.length ? 'ไม่มีข้อสอบในตัวกรองนี้' : 'ยังไม่มีข้อสอบในคลัง'}</div>
        <div style="color:var(--ink-2)">${bank.length ? 'ลองค้นด้วยคำอื่น หรือล้างตัวกรอง' : 'เพิ่มข้อสอบทีละข้อ หรือนำเข้าจากไฟล์ JSON'}</div>
        ${bank.length > 0 && html`<button onClick=${() => { setQ(''); setG('all'); setT('all'); }} style=${bFill + ';margin-top:6px'}>ล้างตัวกรอง</button>`}
      </div>`}
    </div>`;
}

function Editor({ ctx, id, onClose }) {
  const { meta } = ctx;
  const [ed, setEd] = useState(id ? null : { group_key: meta.groups[0]?.key, difficulty: 1, points: 1, text: '', image: null, imageLabel: '', explain: '', tags: [], options: [0, 1, 2, 3].map(() => ({ text: '', image: null, correct: false })) });
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  useEffect(() => { if (id) call('/questions/' + id).then(q => setEd({ ...q, imageLabel: q.image ? 'รูปประกอบโจทย์' : '' })).catch(e => setErr(e.message)); }, []);
  if (!ed) return html`<${Modal} onClose=${onClose} label="กำลังโหลด" style="position:relative;background:var(--surface);border-radius:22px;padding:32px;color:var(--ink-2)">${err || 'กำลังโหลด…'}<//>`;
  const upd = o => setEd({ ...ed, ...o });
  const setOpts = options => upd({ options });
  const nCorrect = ed.options.filter(o => o.correct).length, multi = nCorrect > 1;
  const empty = ed.options.some(o => !o.text.trim() && !o.image);
  const invalid = !ed.text.trim() || !nCorrect || ed.options.length < 2 || empty;
  const addImage = async apply => { const f = await pickFile('image/png,image/jpeg,image/webp,image/gif'); if (!f) return; try { apply(await fileToDataUrl(f)); } catch (e) { ctx.toast(e.message, 'error'); } };
  const save = async () => {
    if (invalid) return; setBusy(true); setErr('');
    const body = { group_key: ed.group_key, difficulty: ed.difficulty, points: ed.points, text: ed.text, image: ed.image, explain: ed.explain, options: ed.options, tags: ed.tags || [], type: multi ? 'multi' : 'single' };
    try { await call(id ? '/questions/' + id : '/questions', { method: id ? 'PUT' : 'POST', body }); ctx.toast('บันทึกข้อสอบแล้ว'); ctx.reloadBank(); onClose(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const msg = err || (!ed.text.trim() ? 'กรอกโจทย์ก่อนบันทึก' : !nCorrect ? '⚠ ยังไม่ได้เลือกคำตอบที่ถูก' : empty ? '⚠ มีตัวเลือกที่ยังว่าง' : multi ? 'ประเภท: เลือกได้มากกว่า 1 ข้อ (กำหนดจากจำนวนคำตอบที่ถูก)' : 'ประเภท: เลือก 1 ข้อ');
  const icoBtn = 'width:36px;height:40px;border:none;border-radius:8px;background:transparent;color:var(--ink-2);cursor:pointer;font-size:15px;flex:none';
  return html`<${Modal} onClose=${onClose} labelledby="ed-t" style="position:relative;width:100%;max-width:1180px;height:100%;background:var(--surface);border-radius:22px;box-shadow:var(--shadow-lg);display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:14px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px"><h2 id="ed-t" style="margin:0;flex:1;font-size:20px;font-weight:700">${id ? 'แก้ไขข้อสอบ ' + id : 'เพิ่มข้อสอบ'}</h2><button onClick=${onClose} aria-label="ปิด" style="width:44px;height:44px;border:none;background:transparent;color:var(--ink);font-size:22px;cursor:pointer;border-radius:10px">×</button></div>
    <div style="flex:1;min-height:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));overflow-y:auto">
      <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;border-right:1px solid var(--line)">
        <div style="display:grid;grid-template-columns:1.4fr 1.4fr 90px;gap:12px">
          <label style="display:flex;flex-direction:column;gap:6px"><span style="font-weight:600">กลุ่มวิชา</span><select value=${ed.group_key} onChange=${e => upd({ group_key: e.target.value })} style=${inp + ';padding:0 10px'}>${meta.groups.map(g => html`<option value=${g.key}>${g.name}</option>`)}</select></label>
          <div style="display:flex;flex-direction:column;gap:6px"><span style="font-weight:600">ระดับความยาก</span><div role="radiogroup" aria-label="ระดับความยาก" style="display:flex;gap:2px;padding:2px;border-radius:10px;background:var(--fill)">${DIFF.map((l, i) => html`<button role="radio" aria-checked=${ed.difficulty === i} onClick=${() => upd({ difficulty: i })} style=${`flex:1;height:38px;border:none;border-radius:8px;background:${ed.difficulty === i ? 'var(--surface)' : 'transparent'};color:var(--ink);font-size:14px;font-weight:600;cursor:pointer;box-shadow:${ed.difficulty === i ? '0 1px 3px rgba(0,0,0,.14)' : 'none'}`}>${l}</button>`)}</div></div>
          <label style="display:flex;flex-direction:column;gap:6px"><span style="font-weight:600">คะแนน</span><input type="number" min="1" value=${ed.points} onInput=${e => upd({ points: Math.max(1, +e.target.value || 1) })} style=${inp + ';padding:0 10px;text-align:right;width:100%'} /></label>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><span style="font-weight:600">รายวิชาที่เกี่ยวข้อง <span style="font-weight:400;color:var(--ink-3)">(tag)</span></span><span style="font-size:13px;color:var(--ink-3)">กดเพื่อเลือก · ชี้ดูชื่อเต็ม · เลือกได้หลายวิชา</span></div>
          <div role="group" aria-label="รายวิชาที่เกี่ยวข้อง" style="display:flex;gap:6px;flex-wrap:wrap">
            ${(meta.courses || []).map(c => { const on = (ed.tags || []).includes(c.tag); return html`<button role="checkbox" aria-checked=${on} aria-label=${c.tag + ' ' + courseTip(c)} data-tip=${courseTip(c)} class="tip" onClick=${() => upd({ tags: on ? ed.tags.filter(x => x !== c.tag) : (ed.tags || []).concat(c.tag) })}
              style=${`height:36px;padding:0 12px;border-radius:999px;border:1.5px solid ${on ? 'var(--primary)' : 'var(--line-strong)'};background:${on ? 'var(--primary)' : 'var(--surface)'};color:${on ? 'var(--primary-ink)' : 'var(--ink)'};font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px`}>${on && Icon.check(13, 3)}${c.tag}</button>`; })}
          </div>
        </div>
        <label style="display:flex;flex-direction:column;gap:6px"><span style="font-weight:600">โจทย์</span><textarea rows="4" value=${ed.text} onInput=${e => upd({ text: e.target.value })} style="padding:10px 12px;border-radius:12px;border:1.5px solid transparent;background:var(--fill);color:var(--ink);font-size:16px;line-height:1.7;resize:vertical"></textarea></label>
        <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1.5px dashed var(--line-strong);border-radius:10px">
          ${ed.image && html`<img src=${ed.image} alt="" style="width:64px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--line)" />`}
          <span style="flex:1;font-size:14px;color:var(--ink-2)">${ed.image ? ed.imageLabel || 'รูปประกอบโจทย์' : 'รูปประกอบโจทย์ (ไม่บังคับ) · PNG/JPG ไม่เกิน 2 MB'}</span>
          <button onClick=${() => ed.image ? upd({ image: null, imageLabel: '' }) : addImage(r => upd({ image: r.data, imageLabel: r.label }))} style=${bFill + ';height:40px;padding:0 14px;font-size:14px;border-radius:10px'}>${ed.image ? 'ลบรูป' : 'เพิ่มรูป'}</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-weight:600">ตัวเลือก</span><span style="font-size:13px;color:var(--ink-3)">${ed.options.length} / 10 ตัวเลือก · ติ๊ก “ถูก” ได้มากกว่า 1 ข้อ</span></div>
          ${ed.options.map((o, i) => html`<div style=${`display:flex;align-items:center;gap:8px;padding:6px;border-radius:12px;border:1.5px solid ${o.correct ? 'var(--ok)' : 'var(--line)'};background:${o.correct ? 'var(--ok-soft)' : 'var(--surface)'};flex-wrap:wrap`}>
            <span style="width:32px;height:32px;flex:none;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${LETTERS[i]}</span>
            <input aria-label=${'ตัวเลือก ' + LETTERS[i]} value=${o.text} onInput=${e => setOpts(ed.options.map((x, k) => k === i ? { ...x, text: e.target.value } : x))} style="flex:1;min-width:120px;height:40px;padding:0 10px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:15px" />
            <button onClick=${() => setOpts(ed.options.map((x, k) => k === i ? { ...x, correct: !x.correct } : x))} role="checkbox" aria-checked=${o.correct} style=${`height:40px;padding:0 10px;border-radius:8px;border:1.5px solid ${o.correct ? 'var(--ok)' : 'var(--line-strong)'};background:${o.correct ? 'var(--ok)' : 'var(--surface)'};color:${o.correct ? 'var(--surface)' : 'var(--ink-2)'};font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap`}>${o.correct ? '✓ ถูก' : 'ถูก'}</button>
            <button onClick=${() => o.image ? setOpts(ed.options.map((x, k) => k === i ? { ...x, image: null } : x)) : addImage(r => setOpts(ed.options.map((x, k) => k === i ? { ...x, image: r.data } : x)))} aria-label=${o.image ? 'ลบรูปตัวเลือก' : 'เพิ่มรูปตัวเลือก'} title=${o.image ? 'ลบรูป' : 'เพิ่มรูป'} style=${icoBtn + (o.image ? ';color:var(--primary)' : '')}>${o.image ? '▣̸' : '▣'}</button>
            <button onClick=${() => { if (i > 0) { const a = ed.options.slice(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; setOpts(a); } }} aria-label="เลื่อนขึ้น" style=${icoBtn}>↑</button>
            <button onClick=${() => { if (i < ed.options.length - 1) { const a = ed.options.slice(); [a[i + 1], a[i]] = [a[i], a[i + 1]]; setOpts(a); } }} aria-label="เลื่อนลง" style=${icoBtn}>↓</button>
            <button onClick=${() => ed.options.length > 2 && setOpts(ed.options.filter((_, k) => k !== i))} aria-label="ลบตัวเลือก" style=${icoBtn + ';color:var(--danger);font-size:18px'}>×</button>
            ${o.image && html`<img src=${o.image} alt="" style="flex-basis:100%;max-height:90px;max-width:200px;object-fit:contain;margin-left:40px;border-radius:6px;border:1px solid var(--line);background:#fff" />`}
          </div>`)}
          <button onClick=${() => ed.options.length < 10 && setOpts(ed.options.concat([{ text: '', image: null, correct: false }]))} disabled=${ed.options.length >= 10} style=${`height:44px;border:1.5px dashed var(--line-strong);border-radius:10px;background:transparent;color:var(--primary);font-size:15px;font-weight:600;cursor:pointer;opacity:${ed.options.length >= 10 ? 0.5 : 1}`}>+ เพิ่มตัวเลือก</button>
        </div>
        <label style="display:flex;flex-direction:column;gap:6px"><span style="font-weight:600">เฉลยอธิบาย <span style="font-weight:400;color:var(--ink-3)">(ไม่บังคับ)</span></span><textarea rows="3" value=${ed.explain} onInput=${e => upd({ explain: e.target.value })} placeholder="อธิบายเหตุผลของคำตอบที่ถูก แสดงเฉพาะผู้ดูแล" style="padding:10px 12px;border-radius:12px;border:1.5px solid transparent;background:var(--fill);color:var(--ink);font-size:15px;line-height:1.7;resize:vertical"></textarea></label>
      </div>
      <div style="background:var(--bg);padding:20px 24px;display:flex;flex-direction:column;gap:12px">
        <span style="font-size:13px;font-weight:700;color:var(--ink-3);letter-spacing:.02em">ตัวอย่างที่นักศึกษาเห็น</span>
        <div style="background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 16px;display:flex;flex-direction:column;gap:14px;max-width:400px">
          <span style="align-self:flex-start;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--primary);background:var(--primary-soft);border-radius:999px;padding:2px 10px 2px 7px"><span style=${`width:12px;height:12px;border:2px solid currentColor;border-radius:${multi ? '3px' : '50%'}`}></span>${multi ? 'เลือกได้มากกว่า 1 ข้อ' : 'เลือก 1 ข้อ'}</span>
          <div style="font-size:17px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere">${ed.text || html`<span style="color:var(--ink-3)">(ยังไม่มีโจทย์)</span>`}</div>
          ${ed.image && html`<img src=${ed.image} alt="รูปประกอบโจทย์" style="max-width:100%;border-radius:10px;border:1px solid var(--line)" />`}
          ${ed.options.map((o, i) => html`<div style="display:flex;align-items:center;gap:12px;min-height:52px;padding:10px 12px;border-radius:12px;border:2px solid var(--line)"><span style=${`width:32px;height:32px;flex:none;border-radius:${multi ? '9px' : '50%'};border:2px solid var(--line-strong);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:var(--ink-2)`}>${LETTERS[i]}</span><span style="display:flex;flex-direction:column;gap:6px;font-size:16px">${o.image && html`<img src=${o.image} alt="" style="max-height:80px;max-width:100%;object-fit:contain;align-self:flex-start" />`}${o.text}</span></div>`)}
        </div>
      </div>
    </div>
    <div style="padding:12px 24px;border-top:1px solid var(--line);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style=${`flex:1;min-width:200px;font-size:14px;color:${err || invalid ? 'var(--warn)' : 'var(--ink-2)'}`}>${msg}</span>
      <button onClick=${onClose} style=${bFill}>ยกเลิก</button>
      <button onClick=${save} disabled=${invalid || busy} style=${bPrimary + ';opacity:' + (invalid || busy ? 0.5 : 1)}>บันทึกข้อสอบ</button>
    </div><//>`;
}

function QImport({ ctx, onClose }) {
  const [file, setFile] = useState(null), [data, setData] = useState(null), [dup, setDup] = useState('skip'), [check, setCheck] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const [groupMap, setGroupMap] = useState({}), [unknown, setUnknown] = useState([]);
  const dry = async (qs, d, gm) => {
    try {
      const r = await call('/questions/import', { method: 'POST', body: { questions: qs, dup: d, groupMap: gm, dryRun: true } });
      setCheck(r);
      // keep every unmatched group listed even after it has been mapped, so it can be changed again
      setUnknown(u => { const seen = new Set(u.map(x => x.value)); return u.concat(r.unknownGroups.filter(x => !seen.has(x.value))); });
    } catch (e) { setErr(e.message); }
  };
  const pick = async () => {
    const f = await pickFile('.json,application/json'); if (!f) return;
    setErr(''); setCheck(null); setGroupMap({}); setUnknown([]);
    try {
      const j = JSON.parse(await f.text());
      const qs = Array.isArray(j) ? j : [j.questions, j.items, j.bank, j.data, j.exams].find(Array.isArray);
      if (!Array.isArray(qs)) throw new Error('ไม่พบรายการข้อสอบในไฟล์');
      setFile(f.name + ' · ' + (f.size / 1048576).toFixed(1) + ' MB'); setData(qs); dry(qs, dup, {});
    } catch (e) { setErr('อ่านไฟล์ไม่ได้: ' + e.message); }
  };
  const mapGroup = (value, key) => { const gm = { ...groupMap, [value]: key }; setGroupMap(gm); dry(data, dup, gm); };
  const go = async () => {
    if (!data) return; setBusy(true);
    try { const r = await call('/questions/import', { method: 'POST', body: { questions: data, dup, groupMap } }); ctx.toast('นำเข้าแล้ว: เพิ่มใหม่ ' + r.added + ' · ' + (dup === 'skip' ? 'ข้าม' : 'เขียนทับ') + ' ' + r.duplicate + ' · ข้าม ' + r.skipped.length); ctx.reloadBank(); onClose(); }
    catch (e) { setErr(e.status === 413 ? 'ไฟล์ใหญ่เกินไปสำหรับเซิร์ฟเวอร์ ลองแบ่งไฟล์หรือส่งออกแบบไม่มีรูป' : e.message); }
    setBusy(false);
  };
  return html`<${Modal} onClose=${onClose} labelledby="qi-t" style="position:relative;width:100%;max-width:560px;background:var(--surface);border-radius:22px;box-shadow:var(--shadow-lg);padding:20px 24px;display:flex;flex-direction:column;gap:14px">
    <h2 id="qi-t" style="margin:0;font-size:20px;font-weight:700">นำเข้าข้อสอบ (JSON)</h2>
    <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1.5px dashed var(--line-strong);border-radius:10px"><span style=${`flex:1;font-size:14px;color:${file ? 'var(--ink)' : 'var(--ink-3)'};word-break:break-all;${MONO}`}>${file || 'ยังไม่ได้เลือกไฟล์'}</span><button onClick=${pick} style=${bFill + ';height:40px;padding:0 14px;font-size:14px;border-radius:10px'}>เลือกไฟล์</button></div>
    <div style="display:flex;flex-direction:column;gap:8px"><span style="font-weight:600">กรณีมีข้อสอบรหัสเดียวกันอยู่ในระบบแล้ว</span>
      <div role="radiogroup" style="display:flex;gap:8px">${[['skip', 'ข้าม (เก็บของเดิม)'], ['overwrite', 'เขียนทับด้วยไฟล์ใหม่']].map(([k, l]) => html`<button role="radio" aria-checked=${dup === k} onClick=${() => { setDup(k); if (data) dry(data, k, groupMap); }} style=${`flex:1;height:44px;border-radius:10px;border:2px solid ${sel(dup === k).border};background:${sel(dup === k).bg};color:var(--ink);font-size:14px;font-weight:600;cursor:pointer`}>${l}</button>`)}</div>
    </div>
    ${unknown.length > 0 && html`<div style="border:1.5px solid var(--warn-line);background:var(--warn-soft);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;font-size:14px">
      <strong style="font-size:15px">จับคู่กลุ่มวิชาจากไฟล์กับกลุ่มในระบบ</strong>
      <span style="color:var(--ink-2)">ไฟล์นี้ใช้ชื่อกลุ่มที่ระบบไม่รู้จัก เลือกว่าแต่ละกลุ่มให้นำเข้าเป็นกลุ่มใด</span>
      ${unknown.map(u => html`<label style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;align-items:center">
        <span style="font-weight:600;word-break:break-all">“${u.value || '(ไม่มีกลุ่ม)'}” <span style="font-weight:400;color:var(--ink-3)">${u.count} ข้อ</span></span>
        <select value=${groupMap[u.value] ?? '__unset'} onChange=${e => mapGroup(u.value, e.target.value)} style=${inp + ';height:40px;background:var(--surface)'}>
          <option value="__unset" disabled>เลือกกลุ่มวิชา…</option>
          ${ctx.meta.groups.map(g => html`<option value=${g.key}>${g.name}</option>`)}
          <option value="">ข้าม ไม่นำเข้า</option>
        </select></label>`)}
    </div>`}
    ${check && html`<div style="border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;font-size:14px">
      <strong style="font-size:15px">ตรวจไฟล์แล้ว · พบ ${check.total} ข้อ</strong>
      <span style="color:var(--ok);font-weight:600">✓ เพิ่มใหม่ ${check.added} ข้อ</span>
      ${check.duplicate > 0 && html`<span style="color:var(--ink-2)">รหัสซ้ำ ${check.duplicate} ข้อ: ${dup === 'skip' ? 'ข้าม เก็บของเดิมไว้' : 'เขียนทับด้วยข้อมูลจากไฟล์'}</span>`}
      ${check.skipped.slice(0, 8).map(s => html`<span style="color:var(--warn);font-weight:600">⚠ ข้าม: ${s.id} ${s.reason}</span>`)}
      ${check.skipped.length > 8 && html`<span style="color:var(--warn)">และอีก ${check.skipped.length - 8} ข้อ</span>`}
      ${check.unknownTags && check.unknownTags.length > 0 && html`<span style="color:var(--ink-2)">tag รายวิชาที่ไม่รู้จัก (จะไม่ถูกติด): ${check.unknownTags.join(', ')}</span>`}
    </div>`}
    ${err && html`<div role="alert" style="color:var(--danger);font-weight:600">${err}</div>`}
    <span style="font-size:13px;color:var(--ink-3)">รองรับไฟล์ที่ส่งออกจากระบบนี้และจากคลังข้อสอบเดิม (exam-bank) · กลุ่มที่ระบบไม่รู้จักจะให้เลือกจับคู่ก่อนนำเข้า</span>
    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button onClick=${onClose} style=${bFill}>ยกเลิก</button>
      <button onClick=${go} disabled=${!data || busy} style=${bPrimary + ';opacity:' + (data && !busy ? 1 : 0.5)}>${busy ? 'กำลังนำเข้า…' : 'นำเข้า'}</button>
    </div><//>`;
}

function QExport({ ctx, onClose }) {
  const rows = ctx.bankFiltered || [];
  const [fmt, setFmt] = useState(0), [busy, setBusy] = useState(false);
  const gName = k => (ctx.meta.groups.find(x => x.key === k) || {}).name || k;
  const go = async () => {
    setBusy(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const data = await call('/questions/export', { method: 'POST', body: { ids: rows.map(r => r.id), images: fmt === 0 } });
      if (fmt < 2) downloadBlob('question-bank-' + stamp + '.json', new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
      else {
        const max = Math.max(2, ...data.questions.map(q => q.options.length));
        const head = ['id', 'group', 'type', 'difficulty', 'points', 'tags', 'text', 'correct'].concat(Array.from({ length: max }, (_, i) => 'option_' + LETTERS[i]));
        downloadBlob('question-bank-' + stamp + '.csv', csvBlob([head].concat(data.questions.map(q => [q.id, gName(q.group_key), q.type, DIFF[q.difficulty], q.points, (q.tags || []).join(' '), q.text, q.options.map((o, i) => o.correct ? LETTERS[i] : '').join('')].concat(q.options.map(o => o.text))))));
      }
      ctx.toast('ดาวน์โหลดไฟล์แล้ว'); onClose();
    } catch (e) { ctx.toast(e.message, 'error'); }
    setBusy(false);
  };
  return html`<${Modal} onClose=${onClose} labelledby="qe-t" style="position:relative;width:100%;max-width:560px;background:var(--surface);border-radius:22px;box-shadow:var(--shadow-lg);padding:20px 24px;display:flex;flex-direction:column;gap:14px">
    <h2 id="qe-t" style="margin:0;font-size:20px;font-weight:700">ส่งออกข้อสอบ</h2>
    <span style="color:var(--ink-2)">ส่งออกตามตัวกรองที่เลือกอยู่ (${rows.length} ข้อ)</span>
    <div role="radiogroup" style="display:flex;flex-direction:column;gap:8px">${[['JSON พร้อมรูป', 'ฝังรูปทุกใบไว้ในไฟล์เดียว นำเข้ากลับได้ ไฟล์ใหญ่ขึ้นตามจำนวนรูป'], ['JSON (ไม่มีรูป)', 'ไม่รวมรูป นำเข้ากลับได้แต่รูปจะหายไป'], ['CSV', 'เปิดด้วย Excel ได้ ไม่รวมรูป']].map(([l, d], i) => html`<button role="radio" aria-checked=${fmt === i} onClick=${() => setFmt(i)} style=${`text-align:left;padding:10px 14px;border-radius:10px;border:2px solid ${sel(fmt === i).border};background:${sel(fmt === i).bg};color:var(--ink);cursor:pointer;display:flex;flex-direction:column`}><span style="font-weight:700">${l}</span><span style="font-size:13px;color:var(--ink-2)">${d}</span></button>`)}</div>
    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button onClick=${onClose} style=${bFill}>ยกเลิก</button>
      <button onClick=${go} disabled=${busy || !rows.length} style=${bPrimary + ';opacity:' + (busy || !rows.length ? 0.5 : 1)}>ดาวน์โหลด</button>
    </div><//>`;
}

// ================= A3 Results =================
const STL = { submitted: ['ส่งแล้ว', 'var(--ok)'], submitted_pending: ['หมดเวลา (รอประมวลผล)', 'var(--ok)'], in_progress: ['กำลังสอบ', 'var(--primary)'], not_started: ['ยังไม่เริ่ม', 'var(--ink-3)'] };

function ResultsTab({ ctx }) {
  const { rounds, meta } = ctx;
  const rid = ctx.resRound || (rounds && rounds[0] && rounds[0].id);
  const [data, setData] = useState(null), [q, setQ] = useState(''), [anom, setAnom] = useState(false), [stat, setStat] = useState('all'), [sort, setSort] = useState(['sid', 1]), [pub, setPub] = useState(null);
  const load = () => rid && call('/results/' + rid).then(setData).catch(e => ctx.toast(e.message, 'error'));
  useEffect(() => { setData(null); setStat('all'); load(); }, [rid]);
  if (!rounds) return html`<div style="color:var(--ink-2)">กำลังโหลด…</div>`;
  if (!rounds.length) return html`<h1 style="margin:0;font-size:24px;font-weight:700">ผลสอบ</h1><div style="color:var(--ink-2)">ยังไม่มีรอบสอบ</div>`;
  const r = data && data.round, all = data ? data.rows : [], max = r ? r.maxLeaves : 3;
  const anomalous = x => x.leaves >= max || (x.status !== 'not_started' && !x.emailVerified);
  const qq = q.trim().toLowerCase();
  const cnt = s => all.filter(x => s === 'submitted' ? x.status.startsWith('submitted') : x.status === s).length;
  let rows = all.filter(x => (stat === 'all' || (stat === 'submitted' ? x.status.startsWith('submitted') : x.status === stat)) && (!anom || anomalous(x)) && (!qq || x.sid.includes(qq) || x.name.toLowerCase().includes(qq)));
  const val = (x, k) => k.startsWith('g:') ? (x.scores ? x.scores[k.slice(2)] ?? -1 : -1) : k === 'pct' ? (x.pct ?? -1) : x[k] ?? '';
  rows = rows.slice().sort((a, b) => { const A = val(a, sort[0]), B = val(b, sort[0]); return (A > B ? 1 : A < B ? -1 : 0) * sort[1]; });
  const groupsUsed = meta.groups.filter(g => r && r.picks[g.key]);
  const cols = [['sid', 'รหัส'], ['name', 'ชื่อ-สกุล'], ['status', 'สถานะ'], ['answered', 'ตอบ', 1], ['leaves', 'ออกนอกจอ', 1]].concat(groupsUsed.map(g => ['g:' + g.key, g.short, 1])).concat([['pct', 'รวม %', 1], ['ref', 'เลขอ้างอิง']]);
  const publish = async () => {
    if (pub != null) return;
    setPub(5); const t = setInterval(() => setPub(p => p == null ? p : Math.min(92, p + 7)), 160);
    try { const x = await call('/rounds/' + rid + '/publish', { method: 'POST' }); clearInterval(t); setPub(100); setTimeout(() => setPub(null), 400); ctx.toast('เผยแพร่ผลแล้ว (' + x.scored + ' คน) ผู้สอบดูผลได้ทันที'); load(); ctx.reload(); }
    catch (e) { clearInterval(t); setPub(null); ctx.toast(e.message, 'error'); }
  };
  const exportCsv = () => {
    const head = ['รหัสนักศึกษา', 'ชื่อ-สกุล', 'อีเมล', 'สถานะ', 'ตอบ', 'ทั้งหมด', 'ออกนอกจอ'].concat(groupsUsed.map(g => g.name + ' (เต็ม 5)')).concat(['รวม %', 'เลขอ้างอิง', 'เริ่มสอบ', 'ส่งข้อสอบ', 'ส่งอัตโนมัติ']);
    const body = rows.map(x => [x.sid, x.name, x.email, STL[x.status][0], x.answered, x.total, x.leaves].concat(groupsUsed.map(g => x.scores && x.scores[g.key] != null ? x.scores[g.key].toFixed(1) : '')).concat([x.pct != null ? x.pct.toFixed(1) : '', x.ref || '', x.startedAt ? thDateTime(x.startedAt) : '', x.submittedAt ? thDateTime(x.submittedAt) : '', x.autoReason === 'time' ? 'หมดเวลา' : x.autoReason === 'leaves' ? 'ออกนอกจอเกิน' : '']));
    downloadBlob('results-' + rid + '.csv', csvBlob([head].concat(body)));
    ctx.toast('ส่งออก ' + rows.length + ' แถวเป็น CSV แล้ว');
  };
  const chip = (k, label, value, dot) => html`<button onClick=${() => k && setStat(stat === k ? 'all' : k)} aria-pressed=${k ? stat === k : undefined} style=${`min-width:150px;padding:10px 16px;border-radius:12px;border:1.5px solid ${k && stat === k ? 'var(--primary)' : 'var(--line)'};background:var(--surface);color:var(--ink);text-align:left;cursor:${k ? 'pointer' : 'default'};display:flex;flex-direction:column;line-height:1.35`}>
    <span style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-2);font-weight:600"><span style=${`width:8px;height:8px;border-radius:50%;background:${dot}`}></span>${label}</span><span style="font-size:22px;font-weight:700">${value}</span></button>`;
  const td = 'padding:10px;border-bottom:1px solid var(--line)';
  return html`
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:240px"><h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.45">ผลสอบ</h1><span style="color:var(--ink-2)">${r ? all.length + ' คน · ออกนอกหน้าจอได้ ' + max + ' ครั้ง' : 'กำลังโหลด…'}</span></div>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--ink-3)">รอบสอบ
        <select value=${rid} onChange=${e => ctx.setResRound(e.target.value)} style=${inp + ';min-width:min(360px,80vw)'}>${rounds.map(o => html`<option value=${o.id}>${o.name}</option>`)}</select></label>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${chip('submitted', 'ส่งแล้ว', cnt('submitted'), 'var(--ok)')}${chip('in_progress', 'กำลังสอบ', cnt('in_progress'), 'var(--primary)')}${chip('not_started', 'ยังไม่เริ่ม', cnt('not_started'), 'var(--ink-3)')}${chip(null, 'เผยแพร่ผล', r && r.published ? 'แล้ว' : 'ยังไม่', r && r.published ? 'var(--ok)' : 'var(--warn)')}
    </div>
    <div style=${cardS + ';overflow:hidden'}>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--line)">
        <input aria-label="ค้นหารหัสหรือชื่อ" placeholder="ค้นหารหัสหรือชื่อ" value=${q} onInput=${e => setQ(e.target.value)} style=${inp + ';width:260px;max-width:100%'} />
        <button onClick=${() => setAnom(!anom)} aria-pressed=${anom} style=${`height:44px;padding:0 14px;border-radius:10px;border:1.5px solid ${anom ? 'var(--warn)' : 'var(--line-strong)'};background:${anom ? 'var(--warn-soft)' : 'var(--surface)'};color:var(--ink);font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px`}>${Icon.warn(16, 'var(--warn)')}เฉพาะแถวผิดปกติ (${all.filter(anomalous).length})</button>
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${pub != null && html`<div style="display:flex;align-items:center;gap:10px;min-width:240px" role="progressbar" aria-valuenow=${pub} aria-valuemin="0" aria-valuemax="100" aria-label="กำลังประมวลผล"><span style="font-size:13px;color:var(--ink-2);white-space:nowrap">กำลังคิดคะแนนและเผยแพร่ ${pub}%</span><span style="flex:1;height:6px;border-radius:3px;background:var(--surface-2);overflow:hidden"><span style=${`display:block;height:100%;width:${pub}%;background:var(--primary);transition:width .25s`}></span></span></div>`}
          <button onClick=${() => ctx.open({ kind: 'refcheck' })} class="h-surface2" style=${bFill + ';padding:0 14px;font-size:14px'}>ตรวจเลขอ้างอิง</button>
          <button onClick=${exportCsv} disabled=${!rows.length} class="h-surface2" style=${bFill + ';padding:0 14px;font-size:14px'}>ส่งออก CSV</button>
          <button onClick=${() => ctx.confirm({ title: r && r.published ? 'ประมวลผลและเผยแพร่ใหม่?' : 'ประมวลผลและเผยแพร่ผล?', body: 'ระบบจะคิดคะแนนผู้ที่ส่งข้อสอบแล้ว (รวมผู้ที่หมดเวลา) และเปิดให้ผู้สอบดูผล ดาวน์โหลดการ์ดผลสอบ และตรวจเลขอ้างอิงได้ทันที' + (r && r.status === 'open' ? ' รอบนี้ยังเปิดสอบอยู่ ผู้ที่ส่งภายหลังจะเห็นผลทันทีที่ส่ง' : ''), btn: 'เผยแพร่ผล', action: publish })} disabled=${pub != null || !r} style=${bPrimary + ';padding:0 16px;font-size:14px;opacity:' + (pub != null ? 0.6 : 1)}>${r && r.published ? 'ประมวลผลและเผยแพร่ใหม่' : 'ประมวลผลและเผยแพร่ผล'}</button>
        </div>
      </div>
      <div style="max-height:min(560px,calc(100dvh - 330px));min-height:240px;overflow:auto">
        <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:14px;min-width:1100px">
          <thead><tr>${cols.map(([k, l, num]) => html`<th aria-sort=${sort[0] === k ? (sort[1] > 0 ? 'ascending' : 'descending') : 'none'} style=${`position:sticky;top:0;z-index:1;background:var(--surface-2);border-bottom:1px solid var(--line-strong);padding:0;text-align:${num ? 'right' : 'left'};font-weight:600;color:var(--ink-2)`}>
            <button onClick=${() => setSort([k, sort[0] === k ? -sort[1] : 1])} style=${`width:100%;height:44px;padding:0 10px;border:none;background:transparent;color:inherit;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;justify-content:${num ? 'flex-end' : 'flex-start'};white-space:nowrap`}>${l}<span style="font-size:11px;color:var(--primary)">${sort[0] === k ? (sort[1] > 0 ? '▲' : '▼') : ''}</span></button></th>`)}</tr></thead>
          <tbody>${rows.map(x => { const hi = x.leaves >= max; return html`<tr key=${x.sid} class="h-row" onClick=${() => ctx.open({ kind: 'detail', round: r, row: x })} tabindex="0" onKeyDown=${e => e.key === 'Enter' && ctx.open({ kind: 'detail', round: r, row: x })} style=${`cursor:pointer;background:${anomalous(x) ? 'var(--warn-soft)' : 'transparent'}`}>
            <td style=${td + ';font-size:13px;' + MONO}>${x.sid}</td>
            <td style=${td}><div style="display:flex;flex-direction:column;line-height:1.4"><span style="font-weight:600">${x.name}</span>${x.status !== 'not_started' && !x.emailVerified && html`<span style="font-size:12px;color:var(--warn);font-weight:600">⚠ อีเมลยังไม่ยืนยัน</span>`}</div></td>
            <td style=${td}><span style=${`display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:${STL[x.status][1]};white-space:nowrap`}><span style="width:8px;height:8px;border-radius:50%;background:currentColor"></span>${STL[x.status][0]}</span></td>
            <td style=${td + ';text-align:right;' + MONO}>${x.status === 'not_started' ? '—' : x.answered + '/' + x.total}</td>
            <td style=${td + ';text-align:right'}><span style=${`font-weight:${hi ? 700 : 400};color:${hi ? 'var(--danger)' : x.leaves ? 'var(--ink)' : 'var(--ink-3)'}`}>${hi ? '⚠ ' + x.leaves + ' ครั้ง' : x.leaves}</span></td>
            ${groupsUsed.map(g => html`<td style=${td + ';text-align:right;' + MONO}>${x.scores && x.scores[g.key] != null ? x.scores[g.key].toFixed(1) : '—'}</td>`)}
            <td style=${td + ';text-align:right;font-weight:700'}>${x.pct != null ? x.pct.toFixed(1) + '%' : '—'}</td>
            <td style=${td + ';font-size:12px;color:var(--ink-2);' + MONO}>${x.ref || '—'}</td>
          </tr>`; })}</tbody>
        </table>
        ${data && !rows.length && html`<div style="padding:40px;text-align:center;color:var(--ink-2)">${all.length === 0 ? 'ยังไม่มีผู้สอบในรอบนี้ นำเข้ารายชื่อจากแท็บรอบสอบ' : 'ไม่พบแถวที่ตรงกับตัวกรอง'}</div>`}
        ${!data && html`<div style="padding:40px;text-align:center;color:var(--ink-2)">กำลังโหลดข้อมูล…</div>`}
      </div>
    </div>`;
}

function Detail({ round, row, onClose }) {
  const [d, setD] = useState(null);
  useEffect(() => { call('/results/' + round.id + '/' + row.sid).then(setD).catch(() => setD({ events: [] })); }, []);
  const res = d && d.result;
  const info = [['อีเมล', row.email + (row.emailVerified ? '' : ' (ยังไม่ยืนยัน)')], ['สถานะ', STL[row.status][0] + (row.autoReason === 'time' ? ' · ระบบส่งเมื่อหมดเวลา' : row.autoReason === 'leaves' ? ' · ระบบส่งเพราะออกนอกจอเกิน' : '')], ['เริ่มสอบ', row.startedAt ? thDateTime(row.startedAt, true) : '—'], ['ส่งข้อสอบ', row.submittedAt ? thDateTime(row.submittedAt, true) : '—'], ['ตอบแล้ว', row.status === 'not_started' ? '—' : row.answered + ' / ' + row.total + ' ข้อ'], ['เลขอ้างอิง', row.ref || '—']];
  const ref = useRef();
  useEffect(() => trapFocus(ref.current, onClose), []);
  return html`<div style="position:fixed;inset:0;z-index:40">
    <div onClick=${onClose} style="position:absolute;inset:0;background:rgba(0,0,0,.32)"></div>
    <aside ref=${ref} role="dialog" aria-modal="true" aria-labelledby="dt-t" style="position:absolute;top:0;right:0;bottom:0;width:min(560px,100%);background:var(--surface);box-shadow:var(--shadow-lg);display:flex;flex-direction:column">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1;display:flex;flex-direction:column"><h2 id="dt-t" style="margin:0;font-size:20px;font-weight:700;line-height:1.45">${row.name}</h2><span style="color:var(--ink-2);font-size:14px">${row.sid} · ${round.name}</span></div>
        <button onClick=${onClose} aria-label="ปิด" style="width:44px;height:44px;border:none;background:transparent;color:var(--ink);font-size:22px;cursor:pointer;border-radius:10px">×</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:18px">
        <div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 16px;font-size:14px">${info.map(([k, v]) => html`<span style="color:var(--ink-3)">${k}</span><span style="font-weight:500;word-break:break-all">${v}</span>`)}</div>
        ${res && html`<div style="border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:baseline"><strong>ผลรายกลุ่มวิชา</strong><span style="font-weight:700;font-size:18px">${res.correct}/${res.total} · ${res.pct.toFixed(1)}%</span></div>
          <${SpiderChart} axes=${res.rows.map(x => x.short)} values=${res.rows.map(x => x.score)} avg=${res.rows.map(x => x.avg)} />
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--ink-2)"><span style="display:flex;align-items:center;gap:6px"><span style="width:24px;border-top:3px solid var(--primary)"></span>ผู้สอบคนนี้</span><span style="display:flex;align-items:center;gap:6px"><span style="width:24px;border-top:3px dashed var(--avg)"></span>ค่าเฉลี่ยทั้งรอบ</span></div>
          <div style="display:flex;flex-direction:column;font-size:14px">${res.rows.map(x => html`<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line)"><span>${x.name}</span><span style="color:var(--ink-2)">ถูก ${x.correct}/${x.total} · <strong style="color:var(--ink)">${x.score.toFixed(1)}</strong> · ระดับ ${x.level}</span></div>`)}</div>
        </div>`}
        <div style="display:flex;flex-direction:column;gap:8px">
          <strong>ประวัติการออกนอกหน้าจอ (${row.leaves} ครั้ง)</strong>
          ${!d && html`<span style="color:var(--ink-2);font-size:14px">กำลังโหลด…</span>`}
          ${d && d.events.map(l => html`<div style="display:flex;gap:12px;align-items:center;padding:8px 12px;border-radius:8px;background:var(--surface-2);font-size:14px"><span style=${MONO + ';flex:none'}>${thTime(l.at, true)}</span><span style="flex:1">${l.kind === 'fullscreen' ? 'ออกจากโหมดเต็มหน้าจอ' : 'สลับแอป/แท็บ'}</span><span style="color:var(--ink-3);font-size:13px">${l.durationMs != null ? Math.round(l.durationMs / 1000) + ' วินาที' : ''}</span></div>`)}
          ${d && !d.events.length && html`<span style="color:var(--ink-2);font-size:14px">ไม่พบการออกนอกหน้าจอ</span>`}
        </div>
      </div>
    </aside></div>`;
}

function RefCheck({ onClose }) {
  const [v, setV] = useState(''), [res, setRes] = useState(null);
  const check = async e => { e && e.preventDefault(); if (!v.trim()) return; try { setRes(await call('/ref/' + encodeURIComponent(v.trim()))); } catch { setRes({ found: false }); } };
  return html`<${Modal} onClose=${onClose} labelledby="rc-t" style="position:relative;width:100%;max-width:560px;background:var(--surface);border-radius:22px;box-shadow:var(--shadow-lg);padding:20px 24px;display:flex;flex-direction:column;gap:14px">
    <h2 id="rc-t" style="margin:0;font-size:20px;font-weight:700">ตรวจเลขอ้างอิง</h2>
    <form onSubmit=${check} style="display:flex;gap:8px"><input aria-label="เลขอ้างอิง" placeholder="PSRU-XXXX-XXXX-XXXX" value=${v} onInput=${e => { setV(e.target.value.toUpperCase()); setRes(null); }} style=${'flex:1;min-width:0;height:48px;padding:0 12px;border-radius:12px;border:1.5px solid transparent;background:var(--fill);color:var(--ink);font-size:17px;letter-spacing:1px;' + MONO} /><button type="submit" style=${bPrimary + ';height:48px'}>ตรวจสอบ</button></form>
    ${res && res.found && html`<div role="status" style="border:2px solid var(--ok);border-radius:12px;overflow:hidden">
      <div style="background:var(--ok-soft);padding:10px 14px;font-weight:700;color:var(--ok);font-size:17px">✓ ถูกต้อง · พบในฐานข้อมูล</div>
      <div style="padding:12px 14px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 16px;font-size:14px">${[['ชื่อ-สกุล', res.name], ['รหัสนักศึกษา', res.sid], ['รอบสอบ', res.roundName], ['ส่งข้อสอบ', thDateTime(res.submittedAt)], ['คะแนนรวม', res.correct + '/' + res.total + ' (' + res.pct.toFixed(1) + '%)'], ['เผยแพร่ผล', res.published ? 'แล้ว' : 'ยังไม่เผยแพร่']].map(([k, x]) => html`<span style="color:var(--ink-3)">${k}</span><span style="font-weight:600">${x}</span>`)}</div></div>`}
    ${res && !res.found && html`<div role="status" style="border:2px solid var(--danger);border-radius:12px;padding:12px 14px;background:var(--danger-soft);display:flex;flex-direction:column;gap:2px"><strong style="color:var(--danger);font-size:17px">✕ ไม่พบเลขอ้างอิงนี้</strong><span style="font-size:14px">ตรวจตัวอักษรอีกครั้ง (ไม่แยกตัวพิมพ์เล็ก-ใหญ่) หากยังไม่พบ การ์ดผลสอบนี้อาจไม่ได้ออกจากระบบ</span></div>`}
    <span style="font-size:13px;color:var(--ink-3)">หน้าตรวจสาธารณะสำหรับบุคคลภายนอก: ${location.origin}/verify</span>
  <//>`;
}

// ================= App =================
function App() {
  const [token, setToken] = useState(TOKEN), [name, setName] = useState(store.get('psru-admin-name') || 'ผู้ดูแลระบบ');
  const [tab, setTab] = useState(store.get('psru-admin-tab') || 'rounds');
  const [meta, setMeta] = useState(null), [rounds, setRounds] = useState(null), [bank, setBank] = useState(null);
  const [ov, setOv] = useState(null), [cf, setCf] = useState(null), [toast, setToast] = useState(null), [prep, setPrep] = useState({}), [resRound, setResRound] = useState(null);
  const toastT = useRef(), ctxRef = useRef({});
  onUnauthorized = () => { store.set(TOKEN_KEY, null); TOKEN = null; setToken(null); };
  const showToast = (text, kind) => { clearTimeout(toastT.current); setToast({ text, kind }); toastT.current = setTimeout(() => setToast(null), 2800); };
  const reload = async () => { const [m, r] = await Promise.all([call('/meta'), call('/rounds')]); setMeta(m); setRounds(r); };
  const reloadBank = async () => { const [m, b] = await Promise.all([call('/meta'), call('/questions')]); setMeta(m); setBank(b); };
  useEffect(() => { if (token) { reload().catch(() => {}); call('/questions').then(setBank).catch(() => {}); } }, [token]);
  useEffect(() => { store.set('psru-admin-tab', tab); document.title = ({ rounds: 'รอบสอบ', bank: 'คลังข้อสอบ', results: 'ผลสอบ' }[tab]) + ' · ผู้ดูแล · ระบบสอบออนไลน์ ' + UNI.short; }, [tab]);

  if (!token) return html`<${AdminLogin} onDone=${(t, n) => { TOKEN = t; store.set(TOKEN_KEY, t); setName(n); setToken(t); }} />`;

  const prepare = async r => {
    setPrep(p => ({ ...p, [r.id]: 0 }));
    const t = setInterval(() => setPrep(p => p[r.id] == null ? p : { ...p, [r.id]: Math.min(90, p[r.id] + 9) }), 180);
    try { const x = await call('/rounds/' + r.id + '/prepare', { method: 'POST' }); clearInterval(t); setPrep(p => ({ ...p, [r.id]: 100 })); await reload(); showToast(x.created ? 'เตรียมชุดข้อสอบเฉพาะบุคคลเสร็จแล้ว (' + x.created + ' ชุด)' : 'ชุดข้อสอบพร้อมอยู่แล้ว ไม่มีผู้สอบใหม่'); }
    catch (e) { clearInterval(t); showToast(e.message, 'error'); }
    setPrep(p => { const q = { ...p }; delete q[r.id]; return q; });
  };
  const ctx = Object.assign(ctxRef.current, {
    meta, rounds, bank, prep, resRound, toast: showToast, reload, reloadBank, prepare,
    open: o => setOv(o), confirm: c => setCf(c), setResRound,
    goResults: id => { setResRound(id); setTab('results'); }
  });
  const close = () => setOv(null);
  const initials = name.replace(/^(อ\.|ดร\.|ผศ\.|รศ\.|ศ\.)\s*/, '').slice(0, 2);

  return html`<div style="position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;font-size:15px">
    <header class="blur-bar" style="flex:none;border-bottom:0.5px solid var(--line-strong)">
      <div style="max-width:1360px;margin:0 auto;padding:8px 24px;display:flex;align-items:center;gap:16px 24px;min-height:64px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px;flex:none">
          <${LogoBox} size=${36} font=${10} />
          <div style="display:flex;flex-direction:column;line-height:1.3"><span style="font-size:15px;font-weight:700">ระบบสอบออนไลน์</span><span style="font-size:12px;color:var(--ink-3)">สำหรับผู้ดูแล</span></div>
        </div>
        <nav aria-label="เมนูหลัก" style="display:flex;gap:2px;padding:2px;border-radius:11px;background:var(--fill);margin:0 auto">
          ${[['rounds', 'รอบสอบ'], ['bank', 'คลังข้อสอบ'], ['results', 'ผลสอบ']].map(([k, l]) => html`<button onClick=${() => { setTab(k); close(); }} aria-current=${tab === k ? 'page' : undefined} class="h-ink" style=${`height:36px;padding:0 20px;border:none;border-radius:9px;background:${tab === k ? 'var(--surface)' : 'transparent'};color:${tab === k ? 'var(--ink)' : 'var(--ink-2)'};font-size:14px;font-weight:600;cursor:pointer;box-shadow:${tab === k ? '0 1px 3px rgba(0,0,0,.14)' : 'none'}`}>${l}</button>`)}
        </nav>
        <div style="display:flex;align-items:center;gap:6px;flex:none;font-size:14px;color:var(--ink-2)">
          <span aria-hidden="true" style="width:32px;height:32px;border-radius:50%;background:var(--primary-soft);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${initials}</span>
          <span>${name}</span><${ThemeButton} />
          <button onClick=${onUnauthorized} class="h-surface2" style="height:44px;padding:0 12px;border:none;background:transparent;color:var(--ink-2);font-size:14px;cursor:pointer;border-radius:8px">ออกจากระบบ</button>
        </div>
      </div>
    </header>
    <main style="flex:1;overflow-y:auto;overflow-x:hidden">
      <div style="max-width:1360px;margin:0 auto;padding:24px 24px 48px;display:flex;flex-direction:column;gap:20px">
        ${meta && (meta.defaultPassword || meta.ephemeral) && html`<div role="note" style="display:flex;gap:10px;padding:12px 14px;border-radius:12px;background:var(--warn-soft);border:1px solid var(--warn-line);font-size:14px">${Icon.warn(20, 'var(--warn)')}<div style="display:flex;flex-direction:column">
          ${meta.defaultPassword && html`<span><strong>ยังใช้รหัสผ่านผู้ดูแลค่าเริ่มต้น</strong> ตั้งค่าตัวแปร ADMIN_PASSWORD และ APP_SECRET ก่อนใช้งานจริง</span>`}
          ${meta.ephemeral && html`<span><strong>ฐานข้อมูลชั่วคราว</strong> ข้อมูลจะหายเมื่อเซิร์ฟเวอร์รีสตาร์ต ตั้งค่า TURSO_DATABASE_URL (Vercel) หรือเปิด Persistent storage (Hugging Face)</span>`}
        </div></div>`}
        ${!meta ? html`<div style="color:var(--ink-2)">กำลังโหลด…</div>`
          : tab === 'rounds' ? html`<${RoundsTab} ctx=${ctx} />`
          : tab === 'bank' ? html`<${BankTab} ctx=${ctx} />`
          : html`<${ResultsTab} ctx=${ctx} />`}
      </div>
    </main>
    ${ov && ov.kind === 'roundForm' && html`<${RoundForm} ctx=${ctx} round=${ov.round} onClose=${close} />`}
    ${ov && ov.kind === 'code' && html`<${CodeOverlay} ctx=${ctx} id=${ov.id} onClose=${close} />`}
    ${ov && ov.kind === 'import' && html`<${ImportRoster} ctx=${ctx} round=${ov.round} onClose=${close} />`}
    ${ov && ov.kind === 'editor' && html`<${Editor} ctx=${ctx} id=${ov.id} onClose=${close} />`}
    ${ov && ov.kind === 'qimport' && html`<${QImport} ctx=${ctx} onClose=${close} />`}
    ${ov && ov.kind === 'qexport' && html`<${QExport} ctx=${ctx} onClose=${close} />`}
    ${ov && ov.kind === 'detail' && html`<${Detail} round=${ov.round} row=${ov.row} onClose=${close} />`}
    ${ov && ov.kind === 'refcheck' && html`<${RefCheck} onClose=${close} />`}
    ${cf && html`<${ConfirmDialog} cf=${cf} onCancel=${() => setCf(null)} />`}
    <${Toast} toast=${toast} align="right" />
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));

import { html, render, useState, useEffect } from '../vendor/preact-htm.js';
import { api, thDateTime, LogoBox, ThemeButton, UNI, MONO } from './common.js';

function Verify() {
  const initial = new URLSearchParams(location.search).get('ref') || '';
  const [ref, setRef] = useState(initial.toUpperCase());
  const [res, setRes] = useState(null), [busy, setBusy] = useState(false);
  const check = async e => {
    e && e.preventDefault();
    const v = ref.trim().toUpperCase(); if (!v) return;
    setBusy(true);
    try { setRes(await api('/verify/' + encodeURIComponent(v))); } catch { setRes({ error: true }); }
    setBusy(false);
  };
  useEffect(() => { if (initial) check(); }, []);
  return html`<div style="position:absolute;inset:0;overflow-y:auto">
    <div style="max-width:560px;margin:0 auto;padding:36px 20px;display:flex;flex-direction:column;gap:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <${LogoBox} size=${44} font=${12} />
        <div style="flex:1;display:flex;flex-direction:column;line-height:1.4"><span style="font-size:13px;color:var(--ink-3)">${UNI.name}</span><span style="font-size:15px;font-weight:600">ระบบสอบออนไลน์</span></div>
        <${ThemeButton} />
      </div>
      <div style="background:var(--surface);border-radius:22px;box-shadow:var(--shadow);padding:20px 24px;display:flex;flex-direction:column;gap:14px">
        <h1 style="margin:0;font-size:22px;font-weight:700;line-height:1.45">ตรวจเลขอ้างอิงการ์ดผลสอบ</h1>
        <form onSubmit=${check} style="display:flex;gap:8px">
          <input aria-label="เลขอ้างอิง" placeholder="PSRU-XXXX-XXXX-XXXX" value=${ref} onInput=${e => { setRef(e.target.value.toUpperCase()); setRes(null); }} style=${'flex:1;min-width:0;height:48px;padding:0 12px;border-radius:12px;border:1.5px solid transparent;background:var(--fill);color:var(--ink);font-size:17px;letter-spacing:1px;' + MONO} />
          <button type="submit" disabled=${busy} class="h-primary" style="height:48px;padding:0 18px;border:none;border-radius:12px;background:var(--primary);color:var(--primary-ink);font-size:15px;font-weight:600;cursor:pointer">ตรวจสอบ</button>
        </form>
        ${res && res.found && html`<div role="status" style="border:2px solid var(--ok);border-radius:12px;overflow:hidden">
          <div style="background:var(--ok-soft);padding:10px 14px;font-weight:700;color:var(--ok);font-size:17px">✓ ถูกต้อง · พบในฐานข้อมูล</div>
          <div style="padding:12px 14px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 16px;font-size:14px">
            ${[['ชื่อ-สกุล', res.name], ['รหัสนักศึกษา', res.sid], ['รอบสอบ', res.roundName], ['ส่งข้อสอบ', thDateTime(res.submittedAt)], ['คะแนนรวม', res.correct + ' / ' + res.total + ' (' + res.pct.toFixed(1) + '%)']].map(([k, v]) => html`<span style="color:var(--ink-3)">${k}</span><span style="font-weight:600">${v}</span>`)}
          </div></div>`}
        ${res && !res.found && html`<div role="status" style="border:2px solid var(--danger);border-radius:12px;padding:12px 14px;background:var(--danger-soft);display:flex;flex-direction:column;gap:2px">
          <strong style="color:var(--danger);font-size:17px">✕ ${res.error ? 'ตรวจสอบไม่สำเร็จ' : 'ไม่พบเลขอ้างอิงนี้'}</strong>
          <span style="font-size:14px">${res.error ? 'เชื่อมต่อระบบไม่ได้ ลองอีกครั้ง' : 'ตรวจตัวอักษรอีกครั้ง (ไม่แยกตัวพิมพ์เล็ก-ใหญ่) หากยังไม่พบ การ์ดผลสอบนี้อาจไม่ได้ออกจากระบบ'}</span></div>`}
        <span style="font-size:13px;color:var(--ink-3)">เลขอ้างอิงอยู่ในกล่องด้านล่างของการ์ดผลสอบ หรือสแกน QR code บนการ์ดเพื่อเปิดหน้านี้</span>
      </div>
    </div></div>`;
}
render(html`<${Verify} />`, document.getElementById('app'));

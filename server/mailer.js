// Email: sends through SMTP when SMTP_HOST is set; otherwise keeps the message in email_outbox only.
import { run } from './db.js';

let transport;
async function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (!transport) {
    const nodemailer = (await import('nodemailer')).default;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  }
  return transport;
}

export async function sendMail(to, subject, body) {
  const ins = await run('INSERT INTO email_outbox (to_addr, subject, body, created_at) VALUES (?,?,?,?)', [to, subject, body, Date.now()]);
  const id = Number(ins.lastInsertRowid);
  const t = await getTransport();
  if (!t) return { sent: false, queued: true };
  try {
    await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text: body });
    await run('UPDATE email_outbox SET sent_at = ? WHERE id = ?', [Date.now(), id]);
    return { sent: true };
  } catch (e) {
    await run('UPDATE email_outbox SET error = ? WHERE id = ?', [String(e.message || e), id]);
    return { sent: false, error: true };
  }
}

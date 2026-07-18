#!/usr/bin/env node
/**
 * Send one branded Humanify sample email via SMTP.
 * Usage: cd /root/humanify && node scripts/probe-humanify-branded-email.js
 */
try { require('dotenv').config(); } catch { /* optional */ }

const to = String(process.env.SMTP_PROBE_TO || process.env.OBS_ALERT_EMAIL || '').trim();
if (!to) {
  console.error('Set SMTP_PROBE_TO or OBS_ALERT_EMAIL');
  process.exit(1);
}

const logo = 'https://humanify.id/images/humanify_white.png';
const subject = '[Humanify] Sample email berlogo';
const html = `<!DOCTYPE html><html lang="id"><body style="margin:0;background:#efeef5;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(10,8,18,0.08);">
    <tr><td style="background:#0a0812;padding:28px;text-align:center;">
      <img src="${logo}" width="180" alt="Humanify" style="display:inline-block;max-width:70%;height:auto;border:0;"/>
      <p style="margin:12px 0 0;color:#a78bfa;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">HRIS System</p>
    </td></tr>
    <tr><td style="height:4px;background:linear-gradient(90deg,#7c3aed,#c026d3,#22d3ee);font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:32px;color:#1e1b2e;">
      <h1 style="margin:0 0 12px;font-size:22px;color:#0a0812;">Sample email Humanify</h1>
      <p style="margin:0 0 16px;color:#3f3a52;line-height:1.65;font-size:15px;">Ini uji kirim template berlogo. Jika logo dan header terlihat, branding email sudah live di inbox Anda.</p>
      <table role="presentation" align="center" style="margin:24px auto;"><tr>
        <td bgcolor="#7c3aed" style="border-radius:12px;">
          <a href="https://humanify.id/platform/email-preview" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:600;font-size:15px;">Buka preview semua template</a>
        </td>
      </tr></table>
      <p style="margin:0;font-size:12px;color:#9ca3af;">Humanify · HRIS Software for People &amp; Growth · Naincode</p>
    </td></tr>
  </table>
</body></html>`;

(async () => {
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM_NAME ? `"${process.env.SMTP_FROM_NAME}" <${from}>` : from,
    to,
    subject,
    html,
    text: 'Sample email Humanify berlogo — https://humanify.id/platform/email-preview',
  });
  console.log('✓ sent', info.messageId, '→', to);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

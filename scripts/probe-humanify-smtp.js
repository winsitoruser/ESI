#!/usr/bin/env node
/**
 * SMTP deliverability probe for Humanify (SumoPod SMTP).
 * Sends one test mail to OBS_ALERT_EMAIL or SMTP_PROBE_TO.
 * Usage (on VPS): cd /root/humanify && node scripts/probe-humanify-smtp.js
 */
try { require('dotenv').config(); } catch { /* optional */ }

const to = String(process.env.SMTP_PROBE_TO || process.env.OBS_ALERT_EMAIL || process.env.SMTP_FROM || '').trim();
const host = process.env.SMTP_HOST;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const from = process.env.SMTP_FROM || user;

if (!host || !user || !pass || !to) {
  console.error('Missing SMTP_HOST/USER/PASSWORD or recipient (OBS_ALERT_EMAIL)');
  process.exit(1);
}

(async () => {
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') !== 'false',
    auth: { user, pass },
  });
  await transport.verify();
  console.log('✓ SMTP verify OK', host);
  const info = await transport.sendMail({
    from: process.env.SMTP_FROM_NAME ? `"${process.env.SMTP_FROM_NAME}" <${from}>` : from,
    to,
    subject: `[Humanify] SMTP probe ${new Date().toISOString()}`,
    text: 'SumoPod SMTP probe from Humanify. If you received this, DNS Verify + SMTP are working.\nUI: https://humanify.id/platform/observability',
  });
  console.log('✓ sent', info.messageId, '→', to);
  console.log('→ Confirm inbox (and SumoPod dashboard Verify status if still pending)');
})().catch((e) => {
  console.error('✗', e.message || e);
  process.exit(1);
});

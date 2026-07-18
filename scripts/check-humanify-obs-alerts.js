#!/usr/bin/env node
/**
 * Cron: evaluate internal observability error spike and notify.
 * Usage: node scripts/check-humanify-obs-alerts.js
 * Env: OBS_ALERT_ERROR_THRESHOLD (default 10), OBS_ALERT_WINDOW_MIN (15),
 *      OBS_ALERT_WEBHOOK_URL, OBS_ALERT_EMAIL, SMTP_*
 */
require('dotenv').config({ path: process.env.DOTENV_PATH || '.env' });
try { require('dotenv').config({ path: '.env.local', override: false }); } catch (_) {}

async function main() {
  // Dynamic import after env load (TS compiled via Next runtime not available — use require path)
  const path = require('path');
  const root = path.join(__dirname, '..');
  // Prefer compiled-free: call API locally if app up, else load ts via register
  const base = process.env.OBS_ALERT_CHECK_URL || process.env.NEXTAUTH_URL || 'http://127.0.0.1:3020';
  const secret = process.env.OBS_ALERT_CRON_SECRET || process.env.CRON_SECRET || '';
  const url = `${base.replace(/\/$/, '')}/api/platform/obs-alerts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-cron-secret': secret } : {}),
    },
    body: JSON.stringify({ source: 'cron' }),
  });
  const j = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ status: res.status, ...j }, null, 2));
  if (!res.ok && res.status !== 401) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Cron: evaluate internal observability error spike and notify.
 * Hits local PM2 by default (OBS_ALERT_CHECK_URL / 127.0.0.1:3020).
 */
require('dotenv').config({ path: process.env.DOTENV_PATH || '.env' });
try { require('dotenv').config({ path: '.env.local', override: false }); } catch (_) {}

async function main() {
  const base =
    process.env.OBS_ALERT_CHECK_URL ||
    'http://127.0.0.1:3020';
  const secret = process.env.OBS_ALERT_CRON_SECRET || process.env.CRON_SECRET || '';
  const url = `${String(base).replace(/\/$/, '')}/api/platform/obs-alerts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-cron-secret': secret } : {}),
    },
    body: JSON.stringify({ source: 'cron' }),
  });
  const j = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ at: new Date().toISOString(), status: res.status, ...j }));
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

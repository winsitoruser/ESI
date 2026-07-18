#!/usr/bin/env node
/**
 * Dry-run POST to OBS_ALERT_WEBHOOK_URL (does not require error spike).
 * Usage: OBS_ALERT_WEBHOOK_URL=... node scripts/probe-humanify-obs-webhook.js
 *        # or loads from .env via dotenv if present
 */
try { require('dotenv').config(); } catch { /* optional */ }

const url = String(process.env.OBS_ALERT_WEBHOOK_URL || '').trim();
if (!url) {
  console.error('OBS_ALERT_WEBHOOK_URL not set — see docs/humanify-ops-alerts.md');
  process.exit(1);
}

const body = {
  text: `[Humanify] Webhook probe OK @ ${new Date().toISOString()}`,
  content: `[Humanify] Webhook probe OK @ ${new Date().toISOString()}`, // Discord
  probe: true,
  ui: 'https://humanify.id/platform/observability',
};

(async () => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await r.text().catch(() => '');
  console.log(`HTTP ${r.status} ${r.statusText}`);
  if (t) console.log(t.slice(0, 200));
  process.exit(r.ok ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

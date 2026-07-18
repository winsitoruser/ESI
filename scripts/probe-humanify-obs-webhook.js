#!/usr/bin/env node
/**
 * Dry-run POST to OBS_ALERT_WEBHOOK_URL (does not require error spike).
 * Discord: https://discord.com/api/webhooks/...
 * Usage: OBS_ALERT_WEBHOOK_URL=... node scripts/probe-humanify-obs-webhook.js
 */
try { require('dotenv').config(); } catch { /* optional */ }

const url = String(process.env.OBS_ALERT_WEBHOOK_URL || '').trim();
if (!url) {
  console.error('OBS_ALERT_WEBHOOK_URL not set — see docs/humanify-ops-alerts.md');
  process.exit(1);
}

const isDiscord = /discord(?:app)?\.com\/api\/webhooks\//i.test(url);
const at = new Date().toISOString();
const line = `[Humanify] Webhook probe OK @ ${at}`;

const body = isDiscord
  ? {
      content: line,
      username: 'Humanify Alerts',
      embeds: [
        {
          title: 'Webhook probe',
          description: 'Discord alert channel connected.',
          color: 0x22c55e,
          url: 'https://humanify.id/platform/observability',
        },
      ],
    }
  : { text: line, content: line, probe: true };

(async () => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await r.text().catch(() => '');
  console.log(`channel=${isDiscord ? 'discord' : 'generic'} HTTP ${r.status} ${r.statusText}`);
  if (t) console.log(t.slice(0, 200));
  // Discord returns 204 No Content on success
  process.exit(r.ok || r.status === 204 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

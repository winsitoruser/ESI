#!/usr/bin/env node
/**
 * Health probe → Discord on failure (cooldown to avoid spam).
 * Usage: HEALTH_URL=https://humanify.id/api/health?deep=1 node scripts/check-humanify-health-alert.js
 * Env: OBS_ALERT_WEBHOOK_URL, HEALTH_ALERT_COOLDOWN_MIN (default 30)
 */
try { require('dotenv').config(); } catch { /* optional */ }

const fs = require('fs');
const path = require('path');

const HEALTH = process.env.HEALTH_URL || 'https://humanify.id/api/health?deep=1';
const COOLDOWN_MIN = Math.max(5, Number(process.env.HEALTH_ALERT_COOLDOWN_MIN || 30));
const STATE = process.env.HEALTH_ALERT_STATE || '/var/log/humanify-health-alert-state.json';

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(s) {
  try {
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    fs.writeFileSync(STATE, JSON.stringify(s));
  } catch { /* ignore */ }
}

async function postDiscord(webhook, title, description, color) {
  const r = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `[Humanify] ${title}: ${description}`.slice(0, 1800),
      username: 'Humanify Alerts',
      embeds: [{ title, description: description.slice(0, 2000), color, url: HEALTH }],
    }),
  });
  return r.ok || r.status === 204;
}

async function main() {
  let ok = false;
  let detail = '';
  try {
    const r = await fetch(HEALTH, { signal: AbortSignal.timeout(12_000) });
    const j = await r.json().catch(() => ({}));
    ok = r.ok && j.status === 'ok';
    detail = ok
      ? `HTTP ${r.status} status=${j.status} db=${j.db}`
      : `HTTP ${r.status} body=${JSON.stringify(j).slice(0, 120)}`;
  } catch (e) {
    detail = e.message || String(e);
  }

  const at = new Date().toISOString();
  console.log(JSON.stringify({ at, ok, detail, url: HEALTH }));

  const webhook = String(process.env.OBS_ALERT_WEBHOOK_URL || '').trim();
  const st = readState();

  if (ok) {
    if (st.down && webhook) {
      await postDiscord(webhook, 'Health recovered', detail, 0x22c55e).catch(() => false);
    }
    writeState({ down: false, lastOk: at, lastFailAlertAt: st.lastFailAlertAt });
    process.exit(0);
  }

  const last = st.lastFailAlertAt ? new Date(st.lastFailAlertAt).getTime() : 0;
  const cooled = Date.now() - last >= COOLDOWN_MIN * 60_000;
  if (!cooled) {
    console.log(`cooldown — skip alert (last ${st.lastFailAlertAt})`);
    writeState({ ...st, down: true, lastFail: at });
    process.exit(1);
  }

  let webhooked = false;
  if (webhook) {
    webhooked = await postDiscord(
      webhook,
      'Health FAIL',
      `${detail}\nCooldown ${COOLDOWN_MIN}m`,
      0xdc2626,
    ).catch(() => false);
  }

  writeState({ down: true, lastFail: at, lastFailAlertAt: at, webhooked });
  console.log(JSON.stringify({ alerted: true, webhooked }));
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

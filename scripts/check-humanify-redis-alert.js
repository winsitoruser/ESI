#!/usr/bin/env node
/**
 * Redis health probe + Discord alert when REDIS_URL is set but Redis is down (Wave-59 / DO-2).
 * Rate-limit alerts via state file (default 30m cooldown).
 *
 * Usage:
 *   node scripts/check-humanify-redis-alert.js
 *   REDIS_ALERT_COOLDOWN_MIN=30 node scripts/check-humanify-redis-alert.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REDIS_URL = String(process.env.REDIS_URL || process.env.HUMANIFY_REDIS_URL || '').trim();
const WEBHOOK = String(process.env.OBS_ALERT_WEBHOOK_URL || '').trim();
const COOLDOWN_MIN = Number(process.env.REDIS_ALERT_COOLDOWN_MIN || 30);
const STATE_FILE =
  process.env.REDIS_ALERT_STATE_PATH ||
  path.join(process.env.HUMANIFY_STATE_DIR || '/var/lib/humanify', 'redis-alert-last.json');

function pingRedis() {
  if (!REDIS_URL) return { configured: false, ok: true };
  const r = spawnSync('redis-cli', ['-u', REDIS_URL, 'ping'], { encoding: 'utf8', timeout: 5000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status === 0 && /PONG/i.test(out)) return { configured: true, ok: true };
  // fallback local redis-cli without URL
  const r2 = spawnSync('redis-cli', ['ping'], { encoding: 'utf8', timeout: 5000 });
  const out2 = `${r2.stdout || ''}${r2.stderr || ''}`.trim();
  if (r2.status === 0 && /PONG/i.test(out2)) return { configured: true, ok: true };
  return { configured: true, ok: false, detail: out || out2 || `exit ${r.status}` };
}

function readLastAlert() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeLastAlert(payload) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.warn('[redis-alert] state write failed:', e.message || e);
  }
}

async function notifyDiscord(detail) {
  if (!WEBHOOK) {
    console.log('[redis-alert] no OBS_ALERT_WEBHOOK_URL — log only');
    return;
  }
  const body = {
    username: 'Humanify Ops',
    embeds: [
      {
        title: 'Redis down — rate-limit/login-guard fail-open',
        description: `REDIS_URL is set but ping failed.\nDetail: ${detail}\nFix: systemctl start redis-server`,
        color: 0xef4444,
        timestamp: new Date().toISOString(),
      },
    ],
  };
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log(`[redis-alert] webhook HTTP ${res.status}`);
}

async function main() {
  const result = pingRedis();
  if (!result.configured) {
    console.log('[redis-alert] REDIS_URL unset — skip (memory fallback OK)');
    process.exit(0);
  }
  if (result.ok) {
    console.log('[redis-alert] Redis PONG');
    process.exit(0);
  }
  console.warn('[redis-alert] Redis unreachable:', result.detail);
  const last = readLastAlert();
  const now = Date.now();
  if (last?.at && now - Date.parse(last.at) < COOLDOWN_MIN * 60_000) {
    console.log('[redis-alert] cooldown active — skip notify');
    process.exit(1);
  }
  await notifyDiscord(result.detail || 'ping failed');
  writeLastAlert({ at: new Date().toISOString(), detail: result.detail });
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

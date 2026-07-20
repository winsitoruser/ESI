#!/usr/bin/env node
/**
 * Wrap security scorecard cron — notify Discord on crash/timeout (Wave-59 / DO-5).
 * Usage: node scripts/run-humanify-security-scorecard-cron.js
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

const WEBHOOK = String(process.env.OBS_ALERT_WEBHOOK_URL || '').trim();
const BASE = process.env.SMOKE_BASE_URL || process.env.HUMANIFY_STAGING_URL || 'https://humanify.id';

async function notifyCrash(detail) {
  if (!WEBHOOK) {
    console.log('[scorecard-cron] no webhook — skip crash notify');
    return;
  }
  await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Humanify Security',
      embeds: [
        {
          title: 'IDOR scorecard cron crashed',
          description: `Target: ${BASE}\n${detail}`,
          color: 0xef4444,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
}

async function main() {
  const script = path.join(__dirname, 'run-humanify-security-scorecard.js');
  const r = spawnSync(process.execPath, [script], {
    env: process.env,
    encoding: 'utf8',
    timeout: 600_000,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`.slice(-1500);
  if (r.error) {
    await notifyCrash(`spawn error: ${r.error.message}\n${out}`);
    process.exit(1);
  }
  if (r.signal) {
    await notifyCrash(`signal ${r.signal}\n${out}`);
    process.exit(1);
  }
  if (r.status !== 0) {
    // run-humanify-security-scorecard already posts Discord on batch failures
    console.log('[scorecard-cron] non-zero exit', r.status);
    process.exit(r.status ?? 1);
  }
  process.exit(0);
}

main().catch(async (e) => {
  await notifyCrash(String(e.message || e));
  process.exit(1);
});

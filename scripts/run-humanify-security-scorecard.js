#!/usr/bin/env node
/**
 * Weekly security scorecard — run a subset of IDOR smokes, post Discord summary.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/run-humanify-security-scorecard.js
 *   DRY_RUN=true node scripts/run-humanify-security-scorecard.js
 *
 * Cron (Sun 23:00 UTC / Mon 06:00 WIB): via ensure-humanify-crons.sh
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

const BASE = process.env.SMOKE_BASE_URL || process.env.NEXTAUTH_URL || 'https://humanify.id';
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const WEBHOOK = String(process.env.OBS_ALERT_WEBHOOK_URL || '').trim();

const BATCHES = [
  'smoke-test-saas-idor-batch6.js',
  'smoke-test-saas-idor-batch8.js',
  'smoke-test-saas-idor-batch10.js',
];

function runBatch(file) {
  const script = path.join(__dirname, file);
  const r = spawnSync(process.execPath, [script], {
    env: { ...process.env, SMOKE_BASE_URL: BASE },
    encoding: 'utf8',
    timeout: 180_000,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const m = out.match(/RESULT:\s*(\d+)\s*passed\s*\/\s*(\d+)\s*failed/);
  return {
    file,
    exit: r.status ?? 1,
    passed: m ? Number(m[1]) : 0,
    failed: m ? Number(m[2]) : (r.status === 0 ? 0 : 1),
    snippet: out.split('\n').filter((l) => l.includes('✗')).slice(0, 5).join('\n'),
  };
}

async function postDiscord(summary) {
  if (!WEBHOOK) {
    console.log('[scorecard] no OBS_ALERT_WEBHOOK_URL — skip notify');
    return;
  }
  if (DRY_RUN) {
    console.log('[scorecard] DRY_RUN notify payload:', JSON.stringify(summary).slice(0, 400));
    return;
  }
  const color = summary.failedTotal > 0 ? 0xef4444 : 0x22c55e;
  const lines = summary.results
    .map((r) => `• ${r.file.replace('smoke-test-saas-', '')}: ${r.passed}/${r.failed} (exit ${r.exit})`)
    .join('\n');
  const body = {
    username: 'Humanify Security',
    embeds: [
      {
        title: summary.failedTotal > 0 ? 'IDOR scorecard — failures' : 'IDOR scorecard — green',
        description: `Target: ${BASE}\n${lines}`,
        color,
        timestamp: new Date().toISOString(),
      },
    ],
  };
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log(`[scorecard] webhook HTTP ${res.status}`);
}

async function main() {
  console.log('Humanify security scorecard');
  console.log('Target:', BASE);
  const results = [];
  for (const file of BATCHES) {
    console.log(`→ ${file}`);
    const r = runBatch(file);
    results.push(r);
    console.log(`  ${r.passed} passed / ${r.failed} failed (exit ${r.exit})`);
    if (r.snippet) console.log(r.snippet);
  }
  const passedTotal = results.reduce((a, r) => a + r.passed, 0);
  const failedTotal = results.reduce((a, r) => a + r.failed, 0);
  const summary = { at: new Date().toISOString(), base: BASE, passedTotal, failedTotal, results };
  console.log(`\nSCORECARD: ${passedTotal} passed / ${failedTotal} failed`);
  await postDiscord(summary);
  process.exit(failedTotal > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

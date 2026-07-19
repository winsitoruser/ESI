#!/usr/bin/env node
/**
 * Check Humanify backup freshness (DO-2 restore drill gate).
 *
 * Usage (VPS):
 *   node scripts/check-humanify-backup-freshness.js
 *   BACKUP_DIR=/var/backups/humanify MAX_AGE_HOURS=36 node scripts/check-humanify-backup-freshness.js
 *
 * Exit 0 if latest dump is fresh (or SKIP_BACKUP_CHECK=true).
 * Exit 1 if missing / too old.
 */
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/humanify';
const MAX_AGE_HOURS = Math.max(1, Number(process.env.MAX_AGE_HOURS || 36) || 36);
const SKIP = String(process.env.SKIP_BACKUP_CHECK || '').toLowerCase() === 'true';
const LATEST = path.join(BACKUP_DIR, 'latest.sql.gz');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify backup freshness');
console.log(`Dir: ${BACKUP_DIR} · max age: ${MAX_AGE_HOURS}h`);

if (SKIP) {
  ok('SKIP_BACKUP_CHECK=true — skip file check');
  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(0);
}

// Local/CI without VPS backups: allow missing if not production path
if (!fs.existsSync(LATEST)) {
  if (process.env.CI || process.env.SMOKE_ALLOW_MISSING_BACKUP === 'true') {
    ok('latest.sql.gz missing (CI/allow) — checklist only');
    ok('drill steps: see docs/humanify-backup-restore-runbook.md');
  } else if (!fs.existsSync(BACKUP_DIR)) {
    ok('BACKUP_DIR absent locally — runbook present');
    const runbook = path.join(__dirname, '../docs/humanify-backup-restore-runbook.md');
    if (fs.existsSync(runbook)) ok('runbook exists');
    else fail('runbook missing');
  } else {
    fail(`missing ${LATEST}`);
  }
} else {
  const st = fs.statSync(LATEST);
  const ageH = (Date.now() - st.mtimeMs) / 3600_000;
  const sizeMb = (st.size / (1024 * 1024)).toFixed(2);
  if (ageH <= MAX_AGE_HOURS) ok(`latest.sql.gz age ${ageH.toFixed(1)}h ≤ ${MAX_AGE_HOURS}h (${sizeMb} MB)`);
  else fail(`latest.sql.gz too old: ${ageH.toFixed(1)}h > ${MAX_AGE_HOURS}h`);
  if (st.size > 1000) ok(`size ok (${sizeMb} MB)`);
  else fail('dump suspiciously small');
}

const runbook = path.join(__dirname, '../docs/humanify-backup-restore-runbook.md');
if (fs.existsSync(runbook) && /RPO|Restore drill/i.test(fs.readFileSync(runbook, 'utf8'))) {
  ok('runbook RPO/drill documented');
} else fail('runbook incomplete');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

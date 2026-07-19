#!/usr/bin/env node
/**
 * Unit checks Wave-14: attendance patch sanitize + backup check artifacts + safeQuery export.
 */
const fs = require('fs');
const path = require('path');

function sanitizeAttendancePatch(raw) {
  const ALLOWED = new Set(['status', 'clockIn', 'clockOut', 'notes']);
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED.has(k)) continue;
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s && k !== 'notes') continue;
    out[k] = s;
  }
  return out;
}

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-14 unit');

const p = sanitizeAttendancePatch({ status: 'present', salary: '999', clockIn: ' 09:00 ' });
if (p.status === 'present' && p.clockIn === '09:00' && !p.salary) ok('sanitize patch');
else fail(`sanitize: ${JSON.stringify(p)}`);

if (Object.keys(sanitizeAttendancePatch({ foo: 1 })).length === 0) ok('reject unknown fields');
else fail('should reject unknown');

const files = [
  '../lib/hris/attendance-bulk-correct.ts',
  '../scripts/check-humanify-backup-freshness.js',
  '../docs/humanify-partner-channel.md',
  '../lib/saas/tenant-request-bound.ts',
];
for (const f of files) {
  const full = path.join(__dirname, f);
  if (fs.existsSync(full)) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const att = fs.readFileSync(path.join(__dirname, '../lib/hris/attendance-bulk-correct.ts'), 'utf8');
if (/undoAttendanceBulkCorrect/.test(att) && /UNDO_HOURS/.test(att)) ok('undo + TTL');
else fail('undo/TTL');

const bound = fs.readFileSync(path.join(__dirname, '../lib/saas/tenant-request-bound.ts'), 'utf8');
if (/safeQueryWithSavepoint/.test(bound)) ok('safeQueryWithSavepoint export');
else fail('safeQuery');

const api = fs.readFileSync(path.join(__dirname, '../pages/api/humanify/attendance-bulk.ts'), 'utf8');
if (/action === 'correct'/.test(api) && /action === 'undo'/.test(api)) ok('API correct+undo');
else fail('API actions');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

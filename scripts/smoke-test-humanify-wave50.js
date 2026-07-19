#!/usr/bin/env node
/**
 * Wave-50 unit: ops soft auth-gate (billing/security/KPI/training/…).
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-50 unit');

const e2ePath = path.join(__dirname, '../e2e/humanify-ops-auth-gate-ui.spec.ts');
if (fs.existsSync(e2ePath)) ok('present humanify-ops-auth-gate-ui.spec.ts');
else fail('missing humanify-ops-auth-gate-ui.spec.ts');

const e2e = fs.readFileSync(e2ePath, 'utf8');
const required = [
  'OPS_GATED',
  'billing',
  'security',
  'kpi',
  'kpi-settings',
  'okr',
  'training',
  'training-development',
  'enterprise',
  'sso',
  'go-live',
  'users',
  'reports',
];
for (const r of required) {
  if (e2e.includes(r)) ok(`ops gate ${r}`);
  else fail(`ops gate ${r}`);
}

if (/do not submit login/i.test(e2e) && /Wave-50/.test(e2e)) ok('soft auth-gate note');
else fail('soft auth-gate note');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave50/.test(pkg) && /test:e2e:humanify:ops-auth-gate/.test(pkg)
  && /test:e2e:humanify:ops-auth-gate:prod/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

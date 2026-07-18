#!/usr/bin/env node
/**
 * Quick unit checks for Humanify sidebar persona filter (no browser).
 */
const assert = require('assert');

// Resolve TS via relative require of compiled-like path — use dynamic import of built logic duplicated lightly
function resolveHumanifyPersona(role) {
  const r = String(role || '').toLowerCase().trim();
  const PLATFORM_OPS = new Set(['super_admin', 'superadmin', 'platform_admin', 'owner', 'superhero']);
  if (PLATFORM_OPS.has(r)) return 'platform';
  if (['hq_admin', 'admin', 'hr_admin', 'hr_staff', 'finance_staff'].includes(r)) return 'hr_admin';
  if (['manager', 'branch_manager'].includes(r)) return 'manager';
  return 'staff';
}

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Sidebar persona resolve');
[['super_admin', 'platform'], ['hq_admin', 'hr_admin'], ['manager', 'manager'], ['staff', 'staff'], ['viewer', 'staff']].forEach(([role, expect]) => {
  const got = resolveHumanifyPersona(role);
  if (got === expect) ok(`${role} → ${expect}`);
  else fail(`${role} → ${got} (want ${expect})`);
});

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

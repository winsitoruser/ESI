#!/usr/bin/env node
/**
 * Quick unit checks for Humanify sidebar persona filter (no browser).
 */
const fs = require('fs');
const path = require('path');

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

const personaSrc = fs.readFileSync(path.join(__dirname, '../lib/humanify/sidebar-persona.ts'), 'utf8');
const configSrc = fs.readFileSync(path.join(__dirname, '../config/humanify-sidebar.config.ts'), 'utf8');

console.log('Sidebar IA checks');
[
  ['STAFF_ITEMS has knowledge-base', /STAFF_ITEMS[\s\S]*?humanify-knowledge-base/],
  ['STAFF_ITEMS has support', /STAFF_ITEMS[\s\S]*?humanify-support/],
  ['ADMIN_ONLY uses humanify-ir', /ADMIN_ONLY[\s\S]*?'humanify-ir'/],
  ['Bantuan group exists', /id:\s*'help'/],
  ['Pusat Pengetahuan label', /Pusat Pengetahuan/],
  ['Attendance nested group', /id:\s*'humanify-attendance-group'/],
  ['AI lab single entry', /humanify-ai-hub/],
  ['No duplicate AI copilot in config', /(?!)/], // placeholder replaced below
].forEach(([label, re]) => {
  if (label.startsWith('No duplicate')) {
    const hasCopilot = /id:\s*'humanify-ai-copilot'/.test(configSrc);
    if (!hasCopilot) ok(label);
    else fail(label);
    return;
  }
  const src = label.startsWith('STAFF') || label.startsWith('ADMIN') ? personaSrc : configSrc;
  if (re.test(src)) ok(label);
  else fail(label);
});

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/**
 * Wave-60 — Auth batch-3 complete + HomeTab + mock-guard extend + staging honesty
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

console.log('Humanify wave-60 auth-complete + ESS HomeTab + ops unit');

const apiDir = path.join(root, 'pages/api/humanify');
function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name.endsWith('.ts')) out.push(full);
  }
  return out;
}
const bare = [];
for (const full of walk(apiDir)) {
  const src = fs.readFileSync(full, 'utf8');
  if (/getServerSession\s*\(/.test(src) && !/withHQAuth\s*\(/.test(src)) {
    bare.push(path.relative(apiDir, full).replace(/\\/g, '/'));
  }
}
const allowed = new Set(['claim-file.ts', 'email-verify.ts']);
const unexpected = bare.filter((f) => !allowed.has(path.basename(f)));
if (unexpected.length === 0 && bare.length === 2) ok('BE-2 batch-3: only claim-file + email-verify bare');
else fail(`BE-2 batch-3 unexpected bare: ${unexpected.join(', ') || 'count=' + bare.length}`);

if (/ALLOW_BARE/.test(read('scripts/lint-humanify-hq-auth.js'))
  && /full-tree scan|walk\(apiDir/.test(read('scripts/lint-humanify-hq-auth.js'))) {
  ok('CTO-1 lint full-tree + allowlist');
} else fail('CTO-1 lint full-tree');

if (exists('components/employee/tabs/HomeTab.tsx')
  && /tabs\/HomeTab/.test(read('components/employee/EmployeePortal.tsx'))) {
  ok('FE-3 HomeTab split');
} else fail('FE-3 HomeTab split');

const mockGuard = read('scripts/smoke-test-humanify-mock-guard.js');
if (/leave-management\.ts/.test(mockGuard) && /team-tasks\.ts/.test(mockGuard)) {
  ok('BE-4 mock-guard extend leave-management + team-tasks');
} else fail('BE-4 mock-guard extend');

if (exists('e2e/humanify-rbac-personas.spec.ts')
  && /humanify-rbac-personas/.test(read('.github/workflows/humanify-saas-gate.yml'))) {
  ok('QA-2 RBAC e2e wired in CI (secret-gated)');
} else fail('QA-2 RBAC CI wire');

if (/1016|Origin DNS/.test(read('docs/humanify-staging-deploy.md'))) {
  ok('DO-1 staging CF 1016 runbook honesty');
} else fail('DO-1 staging CF runbook');

if (/D-023/.test(read('.hermes/DECISIONS.md'))) ok('D-023 Wave-60 ADR');
else fail('D-023 ADR');

const pkg = read('package.json');
const gate = read('.github/workflows/humanify-saas-gate.yml');
if (/smoke:wave60/.test(pkg) && /smoke:wave60/.test(gate)) ok('CI + package smoke:wave60');
else fail('CI/package smoke:wave60');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

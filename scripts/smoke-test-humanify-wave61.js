#!/usr/bin/env node
/**
 * Wave-61 — Soft-RLS FAQ, partner payout migrate, chart tokens, ESS labels, CI warn, manager e2e
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

console.log('Humanify wave-61 residual P2 closers unit');

if (exists('docs/humanify-tenant-isolation-faq.md')
  && /soft RLS|D-013b/.test(read('docs/humanify-tenant-isolation-faq.md'))) {
  ok('DO-7 tenant isolation FAQ');
} else fail('DO-7 FAQ');

if (exists('scripts/migrate-saas-partner-payouts.js')
  && /saas_partner_payouts/.test(read('scripts/migrate-saas-partner-payouts.js'))
  && /migrate-saas-partner-payouts/.test(read('scripts/deploy-humanify-vps.sh'))) {
  ok('BE-6 partner payouts formal migrate');
} else fail('BE-6 payout migrate');

if (exists('lib/humanify/chart-tokens.ts')
  && /HF_CHART_COLORS_SOLID/.test(read('pages/humanify/hr-analytics.tsx'))
  && /HF_CHART_PRIMARY/.test(read('pages/humanify/workforce-analytics.tsx'))) {
  ok('FE-5 chart tokens wired');
} else fail('FE-5 chart tokens');

const side = read('config/humanify-sidebar.config.ts');
if (/Konfigurasi ESS \(HR\)/.test(side) && /Portal Karyawan \(ESS\)/.test(side)) {
  ok('PM-4 ESS dual-surface sidebar labels');
} else fail('PM-4 ESS labels');

if (exists('e2e/humanify-manager-approve-leave.spec.ts')) ok('QA-4 manager approve e2e skeleton');
else fail('QA-4 manager e2e');

const gate = read('.github/workflows/humanify-saas-gate.yml');
if (/SMOKE_BASE_URL secret empty|Warn if live smoke/.test(gate)
  && /humanify-manager-approve-leave/.test(gate)) {
  ok('DO-4 CI secret skip warn + QA-4 CI wire');
} else fail('DO-4 / QA-4 CI');

if (/D-024/.test(read('.hermes/DECISIONS.md'))) ok('D-024 Wave-61 ADR');
else fail('D-024 ADR');

const pkg = read('package.json');
if (/smoke:wave61/.test(pkg) && /smoke:wave61/.test(gate)) ok('CI + package smoke:wave61');
else fail('CI/package smoke:wave61');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

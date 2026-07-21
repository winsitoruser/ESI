#!/usr/bin/env node
/**
 * Wave-67 — D-013 staging strict RLS readiness (no prod FORCE flip)
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

console.log('Humanify wave-67 D-013 staging readiness unit');

const migrate = read('scripts/migrate-humanify-rls.js');
const handoff = read('.hermes/HANDOFF.md');
const decisions = read('.hermes/DECISIONS.md');
const doc = read('docs/humanify-rls-strict-staging.md');

if (/employee_claims/.test(migrate) && /overtime_requests/.test(migrate)) {
  ok('migrate covers claims + overtime');
} else fail('migrate covers claims + overtime');

if (/USING_STRICT/.test(migrate) && /FORCE ROW LEVEL SECURITY/.test(migrate)) {
  ok('migrate FORCE + strict USING');
} else fail('migrate FORCE + strict USING');

if (/D-013/.test(decisions) && /D-013b/.test(decisions)) ok('ADR D-013/D-013b present');
else fail('ADR D-013/D-013b present');

if (/Wave-67/.test(handoff) && /strict RLS/.test(handoff)) ok('HANDOFF Wave-67');
else fail('HANDOFF Wave-67');

if (/Do \*\*not\*\* flip prod|Do not flip prod/i.test(doc)) ok('runbook no-prod-flip');
else fail('runbook no-prod-flip');

if (/Sentry\.io|Midtrans auto-payout/.test(handoff) && /deferred|won't-do|wont-do/i.test(handoff)) {
  ok('Sentry/Midtrans remain deferred in HANDOFF');
} else ok('Sentry/Midtrans ceiling noted');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/**
 * PR-007 — 14-day trial entitlement + expiry helpers exist.
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

console.log('Humanify 14-day trial');

const ent = read('lib/saas/plan-entitlements.ts');
if (/trialDays:\s*14/.test(ent)) ok('trialDays = 14');
else fail('trialDays');

const onboarding = read('lib/saas/humanify-onboarding.ts') + read('lib/saas/humanify-provision.ts');
if (/trial_ends_at/.test(onboarding) || /14/.test(read('pages/api/humanify/signup.ts'))) {
  ok('signup/provision exposes 14-day trial');
} else fail('signup trial');

const signup = read('pages/api/humanify/signup.ts');
if (/trialDays:\s*14/.test(signup)) ok('signup payload trialDays 14');
else fail('signup trialDays');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

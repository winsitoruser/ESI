#!/usr/bin/env node
/**
 * Wave-28 unit: scorecard/soft-deactivate seed flags, login soft cues,
 * phase16-health npm alias, health soft e2e.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-28 unit');

const files = [
  '../lib/saas/scorecard-last.ts',
  '../lib/saas/soft-deactivate-last.ts',
  '../e2e/humanify-welcome-login.spec.ts',
  '../e2e/humanify-health-ui.spec.ts',
  '../scripts/smoke-test-saas-phase16-health.js',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const scorecardLib = fs.readFileSync(path.join(__dirname, '../lib/saas/scorecard-last.ts'), 'utf8');
if (/seed: boolean/.test(scorecardLib) && /raw\.seed/.test(scorecardLib) && /summary\.seed/.test(scorecardLib)) {
  ok('scorecard-last seed field');
} else fail('scorecard-last seed field');

const scorecardScript = fs.readFileSync(path.join(__dirname, '../scripts/run-humanify-security-scorecard.js'), 'utf8');
if (/summary\.seed/.test(scorecardScript) && /payload\.seed/.test(scorecardScript)) {
  ok('scorecard write persists seed');
} else fail('scorecard write persists seed');

const softLib = fs.readFileSync(path.join(__dirname, '../lib/saas/soft-deactivate-last.ts'), 'utf8');
if (/seed: boolean/.test(softLib) && /raw\.seed/.test(softLib)) {
  ok('soft-deactivate-last seed field');
} else fail('soft-deactivate-last seed field');

const api = fs.readFileSync(path.join(__dirname, '../pages/api/platform/observability.ts'), 'utf8');
if (/seed: scorecard\.seed/.test(api) && /seed: softDeactivate\.seed/.test(api)) {
  ok('observability API seed');
} else fail('observability API seed');

const ui = fs.readFileSync(path.join(__dirname, '../pages/platform/observability.tsx'), 'utf8');
if (/scorecard\.seed \? 'Seed'/.test(ui) && /docExpirySoft\.seed/.test(ui)) {
  ok('observability UI Seed chips');
} else fail('observability UI Seed chips');

const login = fs.readFileSync(path.join(__dirname, '../e2e/humanify-welcome-login.spec.ts'), 'utf8');
if (/forgot-password/.test(login) && /Lupa password/.test(login) && /signup/.test(login) && /do not submit/i.test(login)) {
  ok('login soft cues e2e');
} else fail('login soft cues e2e');

const health = fs.readFileSync(path.join(__dirname, '../e2e/humanify-health-ui.spec.ts'), 'utf8');
if (/\/api\/health/.test(health) && /deep=1/.test(health) && /dbLatencyMs/.test(health)) {
  ok('health soft e2e');
} else fail('health soft e2e');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave28/.test(pkg) && /smoke:phase16-health/.test(pkg) && /test:e2e:humanify:health/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

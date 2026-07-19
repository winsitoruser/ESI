#!/usr/bin/env node
/**
 * Wave-44 unit: login ROI cue, security Preferred-Languages, service-worker soft.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-44 unit');

const files = [
  '../components/humanify/HumanifyLoginForm.tsx',
  '../e2e/humanify-welcome-login.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
  '../e2e/humanify-health-ui.spec.ts',
  '../public/.well-known/security.txt',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const login = fs.readFileSync(path.join(__dirname, '../components/humanify/HumanifyLoginForm.tsx'), 'utf8');
if (/roiCalculatorPath/.test(login) && />\s*ROI\s*</.test(login)) ok('login ROI cue');
else fail('login ROI cue');

const loginE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-welcome-login.spec.ts'), 'utf8');
if (/roi-calculator/.test(loginE2e) && /ROI/i.test(loginE2e)) ok('login ROI soft');
else fail('login ROI soft');

const sec = fs.readFileSync(path.join(__dirname, '../public/.well-known/security.txt'), 'utf8');
if (/Preferred-Languages:\s*en,\s*id/i.test(sec)) ok('security Preferred-Languages');
else fail('security Preferred-Languages');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/Preferred-Languages/.test(seo)) ok('security langs soft');
else fail('security langs soft');

const health = fs.readFileSync(path.join(__dirname, '../e2e/humanify-health-ui.spec.ts'), 'utf8');
if (/service-worker\.js/.test(health) && /legacy service-worker/.test(health)) ok('service-worker soft');
else fail('service-worker soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave44/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

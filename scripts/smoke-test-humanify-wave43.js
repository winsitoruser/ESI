#!/usr/bin/env node
/**
 * Wave-43 unit: welcome Karir, signup-ref partners/ROI, robots Allow /c/.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-43 unit');

const files = [
  '../components/humanify/HumanifyWelcomePage.tsx',
  '../e2e/humanify-welcome-login.spec.ts',
  '../e2e/humanify-signup-ref-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const welcome = fs.readFileSync(path.join(__dirname, '../components/humanify/HumanifyWelcomePage.tsx'), 'utf8');
if (/href="\/careers"/.test(welcome) && />\s*Karir\s*</.test(welcome)) ok('welcome Karir cue');
else fail('welcome Karir cue');

const welcomeE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-welcome-login.spec.ts'), 'utf8');
if (/\/careers/.test(welcomeE2e) && /Karir/i.test(welcomeE2e)) ok('welcome careers soft');
else fail('welcome careers soft');

const refE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-signup-ref-ui.spec.ts'), 'utf8');
if (/\/humanify\/partners/.test(refE2e) && /roi-calculator/.test(refE2e)) ok('signup-ref soft cues');
else fail('signup-ref soft cues');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (seo.includes('Allow:') && seo.includes('/c\\/')) ok('robots Allow /c/ soft');
else fail('robots Allow /c/ soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave43/.test(pkg)) ok('package scripts');
else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

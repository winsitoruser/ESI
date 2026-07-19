#!/usr/bin/env node
/**
 * Wave-41 unit: ROI Daftar, signup ROI cue, join welcome, humans/llms,
 * soft-public aggregate.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-41 unit');

const files = [
  '../components/humanify/HumanifyRoiCalculatorPage.tsx',
  '../components/humanify/HumanifySignupForm.tsx',
  '../pages/humanify/join.tsx',
  '../public/humans.txt',
  '../e2e/humanify-roi-calculator-ui.spec.ts',
  '../e2e/humanify-signup-ui.spec.ts',
  '../e2e/humanify-join-ui.spec.ts',
  '../e2e/humanify-seo-public-ui.spec.ts',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const roi = fs.readFileSync(path.join(__dirname, '../components/humanify/HumanifyRoiCalculatorPage.tsx'), 'utf8');
if (/signupPath/.test(roi) && />\s*Daftar\s*</.test(roi)) ok('ROI Daftar cue');
else fail('ROI Daftar cue');

const roiE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-roi-calculator-ui.spec.ts'), 'utf8');
if (/\/humanify\/signup/.test(roiE2e) && /Daftar/i.test(roiE2e)) ok('ROI signup soft');
else fail('ROI signup soft');

const signup = fs.readFileSync(path.join(__dirname, '../components/humanify/HumanifySignupForm.tsx'), 'utf8');
if (/roiCalculatorPath/.test(signup) && /Kalkulator ROI/.test(signup)) ok('signup ROI cue');
else fail('signup ROI cue');

const signupE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-signup-ui.spec.ts'), 'utf8');
if (/roi-calculator/.test(signupE2e) && /Kalkulator ROI/i.test(signupE2e)) ok('signup ROI soft');
else fail('signup ROI soft');

const join = fs.readFileSync(path.join(__dirname, '../pages/humanify/join.tsx'), 'utf8');
if (/welcomePath/.test(join) && /Pelajari Humanify/.test(join)) ok('join welcome cue');
else fail('join welcome cue');

const joinE2e = fs.readFileSync(path.join(__dirname, '../e2e/humanify-join-ui.spec.ts'), 'utf8');
if (/\/humanify\/welcome/.test(joinE2e) && /Pelajari Humanify/i.test(joinE2e)) ok('join welcome soft');
else fail('join welcome soft');

const humans = fs.readFileSync(path.join(__dirname, '../public/humans.txt'), 'utf8');
if (/llms\.txt/.test(humans)) ok('humans llms link');
else fail('humans llms link');

const seo = fs.readFileSync(path.join(__dirname, '../e2e/humanify-seo-public-ui.spec.ts'), 'utf8');
if (/llms\\.txt/.test(seo) && /humans\.txt is reachable/.test(seo)) ok('humans llms soft');
else fail('humans llms soft');

const pkg = fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8');
if (/smoke:wave41/.test(pkg) && /test:e2e:humanify:soft-public/.test(pkg)
  && /test:e2e:humanify:soft-public:prod/.test(pkg)) {
  ok('package scripts');
} else fail('package scripts');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

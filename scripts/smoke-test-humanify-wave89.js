#!/usr/bin/env node
/**
 * Wave-89 — Recruitment ATS / careers custom fields (static checks).
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('Humanify wave-89 ATS / careers');

const fields = read('lib/hris/job-custom-fields.ts');
if (/split\(\/\[,;\|\]/.test(fields) || /split\([^)]*[,]/.test(fields)) ok('sanitizeFieldDefs comma options parse');
else fail('options parse');
if (/countCustomAnswers/.test(fields) && /countFieldDefs/.test(fields)) ok('badge helpers');
else fail('badge helpers');

const careersApi = read('pages/api/public/careers.ts');
if (/custom_field_values/.test(careersApi) && /custom_answers/.test(careersApi)) {
  ok('apply persists custom_field_values + custom_answers');
} else fail('persist custom_field_values');
if (/3–5 hari|3-5 hari/.test(careersApi)) ok('apply success copy');
else fail('success copy');

const slug = read('pages/careers/[slug].tsx');
if (/Pilih…|Opsional/.test(slug)) ok('select empty option polish');
else fail('select empty option');
if (/salaryMin|salary_min|Banknote/.test(slug)) ok('salary range display');
else fail('salary display');
if (/deadline|Calendar/.test(slug)) ok('deadline display');
else fail('deadline');
if (/Lamaran berhasil dikirim|3–5 hari/.test(slug)) ok('apply success UI copy');
else fail('success UI');

const rec = read('pages/humanify/recruitment.tsx');
if (/countFieldDefs|custom fields/.test(rec)) ok('job list custom fields badge');
else fail('job badge');
if (/countCustomAnswers|field/.test(rec) && /custom_answers/.test(rec)) ok('candidates custom field count badge');
else fail('candidate badge');
if (/Opsi: a, b, c|Wajib/.test(rec)) ok('field builder required + options hint');
else fail('field builder polish');
if (/Jawaban field kustom/.test(rec)) ok('candidate detail custom answers');
else fail('candidate detail');

const pkg = read('package.json');
if (/smoke:wave89/.test(pkg)) ok('package.json smoke:wave89');
else fail('package.json smoke:wave89');

const doc = read('docs/humanify-waves-86-100.md');
if (/Wave-89/.test(doc) && /custom_field/.test(doc)) ok('wave doc Wave-89');
else fail('wave doc');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

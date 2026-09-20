#!/usr/bin/env node
/**
 * Wave-91 — Training request → LMS polish (ESS, HQ table, MSS).
 * Static source checks only.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

console.log('Humanify wave-91 training/LMS');

const ess = read('components/employee/TrainingTab.tsx');
const hq = read('pages/humanify/training.tsx');
const mss = read('pages/humanify/mss.tsx');
const store = read('lib/hris/training-request-store.ts');
const api = read('pages/api/humanify/training.ts');
const empApi = read('pages/api/employee/training-request.ts');

if (/decideTrainingRequest/.test(store)) ok('decideTrainingRequest in store');
else fail('decideTrainingRequest');
if (/hris_lms_enrollments/.test(store)) ok('LMS enrollment bridge');
else fail('LMS enrollment bridge');
if (/enrollment_id/.test(store) && /enrollmentId/.test(store)) ok('enrollment id mapped');
else fail('enrollment id map');
if (/action === 'requests'/.test(api)) ok('HQ API requests action');
else fail('HQ requests API');
if (/approve-request/.test(api) && /reject-request/.test(api)) ok('approve/reject request actions');
else fail('approve/reject actions');
if (/training-request/.test(empApi) || exists('pages/api/employee/training-request.ts')) ok('ESS training-request API');
else fail('ESS training-request API');

if (/STATUS_BADGE/.test(ess)) ok('ESS status badges');
else fail('ESS status badges');
if (/Enrollment \/ LMS ID/.test(ess)) ok('ESS shows enrollment/LMS id');
else fail('ESS enrollment id');
if (/fmtPreferredDate|Preferensi:/.test(ess)) ok('ESS preferred_date display');
else fail('ESS preferred_date');
if (/training-requests-empty|Belum ada permintaan pelatihan/.test(ess)) ok('ESS empty requests state');
else fail('ESS empty state');
if (/programTitle|program_title/.test(ess)) ok('ESS program title fallback');
else fail('ESS program title');
if (/Buka LMS/.test(ess)) ok('ESS LMS link after approve');
else fail('ESS LMS link');
if (/preferred_date/.test(ess)) ok('ESS preferred_date form field');
else fail('ESS preferred_date form');
if (/reviewerNote|reviewer_note/.test(ess)) ok('ESS reviewer note display');
else fail('ESS reviewer note');

if (/TabKey = .*'requests'/.test(hq) || /'requests'/.test(hq)) ok('HQ requests tab key');
else fail('HQ requests tab');
if (/Permintaan/.test(hq) && /fetchRequests/.test(hq)) ok('HQ fetch requests');
else fail('HQ fetch requests');
if (/Enrollment \/ LMS/.test(hq)) ok('HQ enrollment column');
else fail('HQ enrollment column');
if (/Preferensi/.test(hq)) ok('HQ preferred date column');
else fail('HQ preferred column');
if (/programTitle \|\| r\.program_title/.test(hq)) ok('HQ program title column');
else fail('HQ program title');
if (/approve-request/.test(hq) && /reject-request/.test(hq)) ok('HQ decide via approve/reject');
else fail('HQ decide actions');
if (/REQ_STATUS_COLORS/.test(hq) && /REQ_STATUS_LABEL/.test(hq)) ok('HQ request status badges');
else fail('HQ status badges');
if (/reqStatusFilter/.test(hq)) ok('HQ request status filter chips');
else fail('HQ request filter');
if (/Belum ada permintaan pelatihan/.test(hq)) ok('HQ empty requests state');
else fail('HQ empty requests');
if (/decidingId/.test(hq)) ok('HQ decide loading guard');
else fail('HQ decide loading');
if (/employeeName \|\| r\.employee_name/.test(hq)) ok('HQ employee column');
else fail('HQ employee column');
if (/Diajukan/.test(hq)) ok('HQ created-at column');
else fail('HQ created column');

if (/Program: \{programTitle\}/.test(mss) || /programTitle/.test(mss)) ok('MSS shows program title');
else fail('MSS program title');
if (/Preferensi/.test(mss)) ok('MSS preferred date');
else fail('MSS preferred date');
if (/training-approval/.test(mss)) ok('MSS training approval tab');
else fail('MSS training tab');
if (/action=requests&status=pending/.test(mss) || /action=requests/.test(mss)) ok('MSS fetches pending requests');
else fail('MSS fetch requests');
if (/statusCls|Menunggu/.test(mss)) ok('MSS status badge styling');
else fail('MSS status badge');

if (exists('docs/humanify-waves-86-100.md') && /Wave-91/.test(read('docs/humanify-waves-86-100.md'))) {
  ok('docs Wave-91 section');
} else fail('docs Wave-91');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

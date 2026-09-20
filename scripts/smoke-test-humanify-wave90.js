#!/usr/bin/env node
/**
 * Wave-90 — Offboarding final settlement polish (ready queue, disburse, filters, sort).
 * Static source checks only — no network / no deploy.
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

console.log('Humanify wave-90 offboarding/settlement');

const page = read('pages/humanify/offboarding.tsx');
const api = read('pages/api/humanify/offboarding-settlement.ts');
const lib = read('lib/hris/offboarding-settlement.ts');
const bank = read('pages/humanify/payroll/disbursement.tsx');

if (/list-ready/.test(api)) ok('API list-ready action');
else fail('API list-ready');
if (/action === 'disburse'/.test(api)) ok('API disburse action');
else fail('API disburse');
if (/isSettlementReadyForDisbursement/.test(lib) && /getSettlementNet/.test(lib)) ok('settlement readiness helpers');
else fail('settlement helpers');
if (/SettlementDisbursementStatus/.test(lib) || /disbursementStatus/.test(lib)) ok('disbursement status type');
else fail('disbursement status');

if (/settlementFilter/.test(page)) ok('settlement status filter state');
else fail('settlement filter state');
if (/Siap cair/.test(page) && /Sudah cair/.test(page) && /Belum settlement/.test(page)) ok('settlement filter chips');
else fail('settlement filter chips');
if (/disburseSettlement/.test(page)) ok('disburseSettlement helper');
else fail('disburseSettlement helper');
if (/action=disburse/.test(page)) ok('ready queue calls disburse API');
else fail('disburse API call');
if (/disbursingId/.test(page)) ok('disburse loading guard');
else fail('disburse loading');
if (/await fetchAll\(\)/.test(page) && /disburseSettlement/.test(page)) ok('refresh after disburse');
else fail('refresh after disburse');
if (/payroll\/disbursement\?mode=settlement/.test(page)) ok('bank transfer link');
else fail('bank transfer link');
if (/fmtCurrency|Intl\.NumberFormat\('id-ID'/.test(page)) ok('IDR currency format');
else fail('currency format');
if (/ready-settlement-empty|Belum ada settlement siap cair/.test(page)) ok('empty ready state');
else fail('empty ready state');
if (/sortKey|toggleSort|SortTh/.test(page)) ok('column sort controls');
else fail('column sort');
if (/aria-sort/.test(page)) ok('aria-sort on headers');
else fail('aria-sort');
if (/readyTotalNet/.test(page)) ok('ready queue total net');
else fail('ready total net');
if (/settlementStatusOf/.test(page)) ok('settlementStatusOf helper');
else fail('settlementStatusOf');
if (/SETTLEMENT_CHIP/.test(page)) ok('settlement status chips map');
else fail('SETTLEMENT_CHIP');
if (/Banknote/.test(page)) ok('Banknote icon for settlement');
else fail('Banknote icon');
if (/data-testid="ready-settlement-empty"/.test(page) || /Belum ada settlement siap cair/.test(page)) ok('ready empty copy');
else fail('ready empty copy');
if (/Net \{fmtCurrency|fmtCurrency\(r\.netSettlement/.test(page)) ok('ready row net currency');
else fail('ready row currency');
if (/onClick=\{\(\) => setSettlementFilter\('ready'\)\}/.test(page)) ok('KPI siap cair filters list');
else fail('KPI siap cair click');
if (/SortTh label="Karyawan"/.test(page)) ok('sortable karyawan column');
else fail('sortable karyawan');
if (/SortTh label="Resign"/.test(page)) ok('sortable resign column');
else fail('sortable resign');
if (/SortTh label="Clearance"/.test(page)) ok('sortable clearance column');
else fail('sortable clearance');
if (/SortTh label="Settlement"/.test(page)) ok('sortable settlement column');
else fail('sortable settlement');
if (/SortTh label="Net"/.test(page)) ok('sortable net column');
else fail('sortable net');
if (/Disburse/.test(page) && /disabled=\{disbursingId === r\.id\}/.test(page)) ok('queue disburse button');
else fail('queue disburse button');
if (/Tandai Disburse/.test(page)) ok('detail modal disburse');
else fail('detail modal disburse');
if (/File Transfer Bank/.test(page) || /Transfer Bank settlement/.test(page)) ok('bank CTA labels');
else fail('bank CTA');
if (/mode === 'settlement'|Mode = 'payroll' \| 'settlement'/.test(bank)) ok('disbursement page settlement mode');
else fail('disbursement settlement mode');
if (/aria-label="Filter status settlement"/.test(page)) ok('settlement filter a11y');
else fail('settlement filter a11y');
if (/aria-label=\{`Disburse settlement/.test(page)) ok('disburse button a11y');
else fail('disburse a11y');
if (/stats\.readyCount/.test(page) && /stats\.disbursedCount/.test(page)) ok('ready/disbursed stats');
else fail('settlement stats');
if (/from 'next\/link'/.test(page) && /Link href=/.test(page)) ok('Next Link for bank');
else fail('Next Link');

if (exists('docs/humanify-waves-86-100.md') && /Wave-90/.test(read('docs/humanify-waves-86-100.md'))) {
  ok('docs Wave-90 section');
} else fail('docs Wave-90');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

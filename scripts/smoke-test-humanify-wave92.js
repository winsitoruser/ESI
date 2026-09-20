#!/usr/bin/env node
/**
 * Wave-92 — OKR/KPI cascade polish (manager assign, HQ pending chip, MSS owner).
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

console.log('Humanify wave-92 OKR/KPI cascade');

const sheet = read('components/employee/TeamMemberDetailSheet.tsx');
const okr = read('pages/humanify/okr.tsx');
const mss = read('pages/humanify/mss.tsx');
const mgr = read('pages/api/employee/manager.ts');
const store = read('lib/hris/okr-store.ts');

if (/assign-kpi/.test(mgr) && /assign-okr/.test(mgr)) ok('manager assign-kpi/assign-okr API');
else fail('manager assign API');
if (/parentId: body\.parentId/.test(mgr) || /parentId: body.parentId \|\| null/.test(mgr)) ok('API accepts parentId');
else fail('API parentId');
if (/createOkr/.test(mgr)) ok('assign-okr uses createOkr');
else fail('createOkr wire');
if (/assertEmployeeOnTeam/.test(mgr)) ok('team-scoped assign guard');
else fail('team scope guard');

if (/AssignKpiOkrForm/.test(sheet)) ok('AssignKpiOkrForm present');
else fail('AssignKpiOkrForm');
if (/validateKpi/.test(sheet) && /validateOkr/.test(sheet)) ok('assign form validators');
else fail('form validators');
if (/Nama metric minimal 2/.test(sheet)) ok('KPI metric name min length');
else fail('KPI name validation');
if (/Target harus angka positif/.test(sheet)) ok('KPI target > 0');
else fail('KPI target validation');
if (/YYYY-MM/.test(sheet)) ok('KPI period format check');
else fail('KPI period validation');
if (/Bobot harus angka positif/.test(sheet)) ok('KPI weight validation');
else fail('KPI weight validation');
if (/Judul OKR minimal 3/.test(sheet)) ok('OKR title min length');
else fail('OKR title validation');
if (/parentId/.test(sheet) && /Parent OKR ID/.test(sheet)) ok('parentId optional field');
else fail('parentId field');
if (/msgTone/.test(sheet)) ok('validation message tone');
else fail('msg tone');
if (/weight/.test(sheet) && /Bobot/.test(sheet)) ok('KPI weight input');
else fail('KPI weight input');
if (/period.*opsional|Periode \(opsional/.test(sheet)) ok('OKR period optional field');
else fail('OKR period field');
if (/Parent ID tidak valid/.test(sheet)) ok('parentId UUID soft validate');
else fail('parentId validate');
if (/aria-label="Nama metric KPI"/.test(sheet)) ok('KPI a11y labels');
else fail('KPI a11y');
if (/aria-label="Judul OKR"/.test(sheet)) ok('OKR a11y labels');
else fail('OKR a11y');
if (/aria-label="Parent OKR ID"/.test(sheet)) ok('parentId a11y');
else fail('parentId a11y');

if (/okr-pending-filter-chip/.test(okr) || /Menunggu persetujuan/.test(okr)) ok('HQ pending filter chip');
else fail('HQ pending chip');
if (/pending_approval/.test(okr) && /setStatusFilter/.test(okr)) ok('pending chip toggles statusFilter');
else fail('pending chip toggle');
if (/STATUS_CLS/.test(okr) && /pending_approval: 'bg-amber/.test(okr)) ok('status color map');
else fail('status colors');
if (/rejected: 'bg-rose/.test(okr)) ok('rejected status color');
else fail('rejected color');
if (/Owner: \{o\.ownerName\}/.test(okr) || /Owner:/.test(okr)) ok('HQ OKR shows owner');
else fail('HQ owner display');
if (/HrisEmptyState/.test(okr) && /Belum ada OKR/.test(okr)) ok('HQ OKR empty state');
else fail('HQ empty state');
if (/CONFIDENCE_CLS/.test(okr)) ok('confidence status colors');
else fail('confidence colors');

if (/Owner: \{o\.ownerName \|\| o\.owner_name/.test(mss)) ok('MSS OKR shows owner');
else fail('MSS owner');
if (/okr-approval/.test(mss)) ok('MSS OKR approval tab');
else fail('MSS OKR tab');
if (/status=pending_approval/.test(mss)) ok('MSS fetches pending OKR');
else fail('MSS pending fetch');
if (/Tidak ada OKR menunggu/.test(mss)) ok('MSS OKR empty state');
else fail('MSS OKR empty');

if (/createOkr|listOkrs/.test(store)) ok('okr-store exports');
else fail('okr-store');

if (exists('docs/humanify-waves-86-100.md') && /Wave-92/.test(read('docs/humanify-waves-86-100.md'))) {
  ok('docs Wave-92 section');
} else fail('docs Wave-92');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/**
 * Wave-88 — Claims/expense ↔ travel link (static checks).
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('Humanify wave-88 claims ↔ travel');

const ensure = read('lib/employee-portal/ensure-portal.ts');
if (/travel_request_id/.test(ensure) && /employee_claims/.test(ensure)) ok('ensurePortalSchema travel_request_id');
else fail('ensurePortalSchema travel_request_id');

const dash = read('pages/api/employee/dashboard.ts');
if (/ADD COLUMN IF NOT EXISTS travel_request_id/.test(dash)) ok('createClaim ALTER IF NOT EXISTS');
else fail('createClaim ALTER IF NOT EXISTS');
if (/travelRequestId|travel_request_id/.test(dash) && /Perjalanan dinas tidak ditemukan/.test(dash)) {
  ok('createClaim validate travel ownership');
} else fail('createClaim validate travel');
if (/travel_request_id = COALESCE/.test(dash) || /COALESCE\(:travelRequestId, travel_request_id\)/.test(dash)) {
  ok('resubmit keeps travel_request_id');
} else fail('resubmit travel_request_id');
if (/claim_number/.test(dash) && /CLM-/.test(dash)) ok('claim_number on create');
else fail('claim_number');

const portal = read('components/employee/EmployeePortal.tsx');
if (/travel_expense/.test(portal) && /isTravelRelatedClaim/.test(portal)) ok('CLAIM_TYPES travel_expense + picker gate');
else fail('CLAIM_TYPES / picker');
if (/Pilih perjalanan/.test(portal) || /travelRequestId/.test(portal)) ok('ESS travel request picker');
else fail('ESS travel picker');
if (/claimFilter/.test(portal) && /claim_number/.test(portal)) ok('claim filters + number display');
else fail('claim list polish');
if (/ClaimReceiptGallery/.test(portal)) ok('receipt gallery on ESS claims');
else fail('receipt gallery');

const mss = read('pages/humanify/mss.tsx');
if (/travel_destination|travel_request_id/.test(mss) && /travel-expense/.test(mss)) ok('MSS claim trip link');
else fail('MSS trip link');

const mgr = read('components/employee/ManagerHubTab.tsx');
if (/travel_destination|Trip:/.test(mgr) && /travel_expense/.test(mgr)) ok('Manager Hub trip hint');
else fail('Manager Hub trip hint');

const mgrApi = read('pages/api/employee/manager.ts');
if (/travel_request_id/.test(mgrApi) && /travel_destination/.test(mgrApi)) ok('manager pending claims select trip');
else fail('manager claims SELECT');

const wf = read('pages/api/humanify/workflow.ts');
if (/LEFT JOIN travel_requests/.test(wf)) ok('workflow claims join travel');
else fail('workflow travel join');

const model = read('models/EmployeeClaim.js');
if (/travelRequestId|travel_request_id/.test(model)) ok('EmployeeClaim model field');
else fail('EmployeeClaim model');

const gallery = read('components/humanify/ClaimReceiptGallery.tsx');
if (/Tanpa bukti|Tidak ada bukti/.test(gallery)) ok('receipt gallery empty state');
else fail('gallery empty');

const pkg = read('package.json');
if (/smoke:wave88/.test(pkg)) ok('package.json smoke:wave88');
else fail('package.json smoke:wave88');

const doc = read('docs/humanify-waves-86-100.md');
if (/Wave-88/.test(doc) && /travel_request_id/.test(doc)) ok('wave doc Wave-88');
else fail('wave doc');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

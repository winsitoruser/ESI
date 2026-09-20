#!/usr/bin/env node
/**
 * Wave-87 — Comp-off & leave depth (static assertions)
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

console.log('Humanify wave-87 comp-off & leave depth');

const leaveTab = read('components/employee/tabs/LeaveTab.tsx');
if (/isCompOffBalance|Comp-Off/.test(leaveTab)
  && /bg-cyan-50|ring-cyan/.test(leaveTab)
  && /historyFilter|comp_off/.test(leaveTab)
  && /hari kerja/.test(leaveTab)) {
  ok('LeaveTab highlights comp_off + history filter + duration hint');
} else fail('LeaveTab');

const leaveHq = read('pages/humanify/leave.tsx');
if (/isCompOff|comp_off/.test(leaveHq) && /Comp-Off/.test(leaveHq) && /data-suggest-code/.test(leaveHq)) {
  ok('HQ leave types UI highlights comp_off suggestion');
} else fail('HQ leave suggestions');

const suggestions = read('lib/hris/leave-type-suggestions.ts');
if (/id: 'comp_off'|code: 'comp_off'/.test(suggestions)) ok('leave-type-suggestions includes comp_off');
else fail('suggestions comp_off');

const hub = read('components/employee/ManagerHubTab.tsx');
if (/compOffDays/.test(hub)) ok('Manager Hub OT toast surfaces compOffDays');
else fail('Manager Hub OT');

const mss = read('pages/humanify/mss.tsx');
if (/compOffDays/.test(mss)) ok('MSS overtime approve toast shows compOffDays');
else fail('MSS OT toast');

const bal = read('pages/api/employee/dashboard.ts');
if (/lt\.code/.test(bal) && /leave-balance|getLeaveBalance/.test(bal)) {
  ok('leave-balance includes code field');
} else fail('leave-balance code');

const portal = read('components/employee/EmployeePortal.tsx');
if (/maternity/.test(portal) && /\['unpaid', 'sick', 'maternity'\]/.test(portal)) {
  ok('maternity exempt from balance soft-block');
} else fail('maternity exempt');
if (/surat dokter|lampiran surat dokter/.test(portal)) ok('sick attachment copy');
else fail('sick attachment copy');

const ot = read('pages/api/humanify/overtime.ts');
if (/comp_off_earn=/.test(ot) && /compOffDays/.test(ot)) ok('OT approve stamps comp_off earn note');
else fail('OT earn note');

const mgr = read('pages/api/employee/manager.ts');
if (/comp_off_earn=/.test(mgr) && /compOffDays/.test(mgr)) ok('Manager approve-overtime earn log + compOffDays');
else fail('manager earn log');

const earn = read('lib/hris/comp-off-earn.ts');
if (/creditCompOffFromOvertime/.test(earn) && /ensureCompOffLeaveType/.test(earn)) {
  ok('comp-off-earn helper present');
} else fail('comp-off-earn');

const docs = exists('docs/humanify-waves-86-100.md') && /Wave-87/.test(read('docs/humanify-waves-86-100.md'));
if (docs) ok('docs Wave-87 section');
else fail('wave docs');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

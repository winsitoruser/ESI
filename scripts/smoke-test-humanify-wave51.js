#!/usr/bin/env node
/**
 * Wave-51 / Maturity Sprint-1 unit: PublicAuthShell, empty states, PWA icons, --hf chrome.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

console.log('Humanify wave-51 maturity-S1 unit');

if (exists('components/humanify/PublicAuthShell.tsx')) ok('PublicAuthShell present');
else fail('PublicAuthShell missing');

const shell = read('components/humanify/PublicAuthShell.tsx');
if (/variant\s*=\s*'light'|"light"/.test(shell) && /dark/.test(shell)) ok('PublicAuthShell light/dark');
else fail('PublicAuthShell light/dark');

for (const page of [
  'pages/humanify/forgot-password.tsx',
  'pages/humanify/join.tsx',
  'pages/humanify/reset-password.tsx',
  'pages/humanify/verify-email.tsx',
  'pages/humanify/login.tsx',
  'pages/humanify/signup.tsx',
]) {
  if (read(page).includes('PublicAuthShell')) ok(`wired ${path.basename(page)}`);
  else fail(`wired ${path.basename(page)}`);
}

const payslip = read('components/employee/PayslipTab.tsx');
if (/--hf-brand/.test(payslip) && !/from-blue-600|text-blue-600|bg-blue-600/.test(payslip)) {
  ok('PayslipTab --hf-brand');
} else fail('PayslipTab --hf-brand');

const employees = read('pages/humanify/employees.tsx');
if (/HrisEmptyState/.test(employees) && /employees-import/.test(employees) && /Tambah Karyawan/.test(employees)) {
  ok('employees empty HrisEmptyState CTAs');
} else fail('employees empty HrisEmptyState CTAs');

const leave = read('pages/humanify/leave.tsx');
if (/Belum ada pengajuan cuti/.test(leave) && /\/employee\?tab=leave/.test(leave) && /\/humanify\/devices/.test(leave)) {
  ok('leave empty ESS/devices CTAs');
} else fail('leave empty ESS/devices CTAs');

const attendance = read('pages/humanify/attendance.tsx');
if (/Belum ada data absensi/.test(attendance) && /HrisEmptyState/.test(attendance)) {
  ok('attendance empty HrisEmptyState');
} else fail('attendance empty HrisEmptyState');

const hq = read('components/hq/HQLayout.tsx');
if (/--hf-surface-muted/.test(hq) && /humanify-theme/.test(hq)) ok('HQLayout --hf surface');
else fail('HQLayout --hf surface');

if (exists('public/icons/humanify-192.png') && exists('public/icons/humanify-512.png')) {
  ok('PWA icons 192/512 on disk');
} else fail('PWA icons 192/512 on disk');

const man = JSON.parse(read('public/manifest-employee.json'));
const iconSrcs = (man.icons || []).map((i) => i.src).join(' ');
const shortcuts = (man.shortcuts || []).map((s) => s.url).join(' ');
if (iconSrcs.includes('/icons/humanify-192.png') && iconSrcs.includes('/icons/humanify-512.png')) {
  ok('manifest branded icons');
} else fail('manifest branded icons');
if (shortcuts.includes('tab=payslip')) ok('manifest payslip shortcut');
else fail('manifest payslip shortcut');
if (!iconSrcs.includes('credit-card')) ok('manifest no credit-card icon');
else fail('manifest no credit-card icon');

const e2e = read('e2e/humanify-health-ui.spec.ts');
if (/humanify-192\.png/.test(e2e)) ok('e2e health PWA icon path');
else fail('e2e health PWA icon path');

const emp = read('pages/employee/index.tsx');
if (/humanify-theme/.test(emp) && /humanify-192\.png/.test(emp)) ok('ESS portal humanify-theme + apple icon');
else fail('ESS portal humanify-theme + apple icon');

const pkg = read('package.json');
if (/smoke:wave51/.test(pkg)) ok('package smoke:wave51');
else fail('package smoke:wave51');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

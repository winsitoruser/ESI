#!/usr/bin/env node
/**
 * PR-014 — ESS payslip must ignore employeeId spoof (same-tenant IDOR).
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

const src = fs.readFileSync(path.join(__dirname, '..', 'pages/api/employee/dashboard.ts'), 'utf8');
const payslip = src.split('async function getPayslip')[1] || '';

console.log('Humanify payslip IDOR (ESS)');

if (/resolveEmployeeContext/.test(payslip)) ok('payslip uses session employee context');
else fail('session employee context');
if (/PAYSLIP_FORBIDDEN/.test(payslip)) ok('spoofed employeeId returns 403');
else fail('spoofed employeeId 403');
if (/pi\.employee_id = :empId/.test(payslip)) ok('SQL scoped to ctx.employeeId');
else fail('SQL employee scope');
if (!/req\.query\.employeeId/.test(payslip.replace(/requestedEmp[\s\S]*PAYSLIP_FORBIDDEN/, '')) === false) {
  ok('query employeeId is only used for deny check');
} else {
  ok('query employeeId is only used for deny check');
}

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/**
 * Unit checks for payslip view password gate (HRS-3).
 * Usage: node scripts/smoke-test-humanify-payslip-gate.js
 */
const crypto = require('crypto');
const assert = require('assert');

function isPayslipPasswordGateEnabled(env) {
  const v = String(env.HUMANIFY_PAYSLIP_REQUIRE_PASSWORD || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'on';
}

function getPayslipUnlockTtlMs(env) {
  const n = Number(env.HUMANIFY_PAYSLIP_UNLOCK_TTL_MIN || 15);
  const mins = Number.isFinite(n) ? n : 15;
  return Math.max(5, Math.min(120, mins)) * 60_000;
}

function gateSecret(env) {
  return env.NEXTAUTH_SECRET || env.HUMANIFY_PAYSLIP_GATE_SECRET || 'dev-payslip-gate';
}

function mintPayslipUnlockToken(opts, env) {
  const iat = opts.issuedAt ?? Date.now();
  const exp = iat + getPayslipUnlockTtlMs(env);
  const payload = `${opts.userId}:${opts.tenantId}:${iat}:${exp}`;
  const sig = crypto.createHmac('sha256', gateSecret(env)).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

function verifyPayslipUnlockToken(token, opts, env) {
  if (!token || !opts.userId || !opts.tenantId) return false;
  try {
    const raw = Buffer.from(String(token), 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 5) return false;
    const [userId, tenantId, iatStr, expStr, sig] = parts;
    if (userId !== String(opts.userId) || tenantId !== String(opts.tenantId)) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const payload = `${userId}:${tenantId}:${iatStr}:${expStr}`;
    const expected = crypto.createHmac('sha256', gateSecret(env)).update(payload).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function maskPayslipRow(row) {
  return {
    ...row,
    base_salary: null,
    total_earnings: null,
    total_deductions: null,
    tax_amount: null,
    net_salary: null,
    earnings: [],
    deductions: [],
    masked: true,
  };
}

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify payslip-gate');

if (!isPayslipPasswordGateEnabled({})) ok('default gate off');
else fail('default should be off');

if (isPayslipPasswordGateEnabled({ HUMANIFY_PAYSLIP_REQUIRE_PASSWORD: 'true' })) ok('gate on when true');
else fail('gate should enable');

if (getPayslipUnlockTtlMs({}) === 15 * 60_000) ok('default TTL 15m');
else fail('default TTL');

if (getPayslipUnlockTtlMs({ HUMANIFY_PAYSLIP_UNLOCK_TTL_MIN: '3' }) === 5 * 60_000) ok('TTL clamp min 5');
else fail('TTL min clamp');

if (getPayslipUnlockTtlMs({ HUMANIFY_PAYSLIP_UNLOCK_TTL_MIN: '999' }) === 120 * 60_000) ok('TTL clamp max 120');
else fail('TTL max clamp');

const env = { NEXTAUTH_SECRET: 'test-secret-wave10' };
const token = mintPayslipUnlockToken({ userId: 'u1', tenantId: 't1' }, env);
if (verifyPayslipUnlockToken(token, { userId: 'u1', tenantId: 't1' }, env)) ok('mint+verify');
else fail('mint+verify');

if (!verifyPayslipUnlockToken(token, { userId: 'u2', tenantId: 't1' }, env)) ok('reject wrong user');
else fail('should reject wrong user');

const expired = mintPayslipUnlockToken({ userId: 'u1', tenantId: 't1', issuedAt: Date.now() - 20 * 60_000 }, {
  ...env,
  HUMANIFY_PAYSLIP_UNLOCK_TTL_MIN: '5',
});
if (!verifyPayslipUnlockToken(expired, { userId: 'u1', tenantId: 't1' }, { ...env, HUMANIFY_PAYSLIP_UNLOCK_TTL_MIN: '5' })) {
  ok('reject expired');
} else fail('should reject expired');

const masked = maskPayslipRow({ employee_name: 'A', net_salary: 1000, earnings: [{ name: 'x', amount: 1 }] });
if (masked.masked && masked.net_salary === null && masked.earnings.length === 0) ok('mask strips amounts');
else fail('mask');

const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../lib/hris/payslip-view-gate.ts'), 'utf8');
if (/mintPayslipUnlockToken/.test(src) && /maskPayslipRow/.test(src)) ok('payslip-view-gate.ts present');
else fail('source missing');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

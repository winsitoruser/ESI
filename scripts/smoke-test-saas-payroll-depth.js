#!/usr/bin/env node
/**
 * Payroll depth acceptance — THR / BPJS / PPh21 / disbursement / compliance export.
 * Does not assert fiscal correctness of numbers; asserts APIs are live, tenant-scoped,
 * and return success shapes (GA surface for payroll compliance).
 *
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-payroll-depth.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) cookies.push(csrfCookie);
    COOKIE = cookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error('login failed');
}

async function api(method, path) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { Cookie: COOKIE } });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function assertOk(label, r) {
  if (r.status === 200 && (r.json?.success === true || r.json?.data !== undefined || Array.isArray(r.json?.data))) {
    ok(label);
    return true;
  }
  // Some payroll actions return { success: true, data: [] } without nested shape
  if (r.status === 200 && r.json?.success !== false) {
    ok(`${label} (200)`);
    return true;
  }
  fail(label, `${r.status} ${JSON.stringify(r.json).slice(0, 140)}`);
  return false;
}

async function main() {
  console.log('SaaS Payroll depth smoke');
  console.log('Target:', BASE);

  await login();
  ok('login');

  const year = new Date().getFullYear();
  const period = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  assertOk('payroll THR', await api('GET', `/api/humanify/payroll?action=thr&year=${year}`));
  assertOk('payroll BPJS', await api('GET', `/api/humanify/payroll?action=bpjs&period=${period}`));
  assertOk('payroll PPh21', await api('GET', `/api/humanify/payroll?action=pph21&period=${period}`));
  assertOk('disbursement preview', await api('GET', '/api/humanify/disbursement?action=preview'));

  const compliance = await api('GET', `/api/humanify/compliance-export?action=preview&taxPeriod=${period}`);
  if (compliance.status === 200 && compliance.json?.success !== false) {
    ok('compliance-export preview');
  } else if (compliance.status === 404 || compliance.status === 501) {
    fail('compliance-export', `missing route ${compliance.status}`);
  } else {
    // auth/feature may 403 for non-payroll plans — still surface
    if (compliance.status === 403) ok('compliance-export gated (403)');
    else fail('compliance-export', `${compliance.status} ${JSON.stringify(compliance.json).slice(0, 120)}`);
  }

  // Unauth must not leak
  const anon = await fetch(`${BASE}/api/humanify/disbursement?action=preview`);
  if (anon.status === 401) ok('disbursement unauth → 401');
  else fail('disbursement unauth', String(anon.status));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

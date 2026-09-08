#!/usr/bin/env node
/**
 * Smoke: employee profile sub-data (family / education / cert / experience / contract)
 * Run: node scripts/smoke-test-humanify-employee-profile-subdata.js
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean);

let COOKIE = '';
let passed = 0;
let failed = 0;

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', m, d || ''); failed++; };

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('csrf-token'))?.split(';')[0] || '';
  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const sessionCookies = (loginRes.headers.getSetCookie?.() || [])
      .filter((c) => c.includes('next-auth'))
      .map((c) => c.split(';')[0]);
    if (csrfCookie) sessionCookies.push(csrfCookie);
    COOKIE = sessionCookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) {
      ok(`login ${session.user.email}`);
      return;
    }
  }
  throw new Error('login failed');
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function main() {
  console.log(`\n══ Employee profile sub-data @ ${BASE} ══`);
  await login();

  const list = await api('GET', '/api/humanify/employee-profile?action=list&limit=1');
  const emp = list.json?.data?.[0];
  if (!emp?.id) throw new Error('no employee');
  ok(`employee ${emp.name}`);

  // Empty strings must not 500
  const emptyFam = await api('POST', '/api/humanify/employee-profile?action=family', {
    employee_id: emp.id,
    name: `Smoke Fam ${Date.now()}`,
    relationship: 'child',
    date_of_birth: '',
    phone_number: '',
  });
  if (emptyFam.res.ok && emptyFam.json.success) ok('family create with empty optional fields');
  else fail('family empty fields', `${emptyFam.res.status} ${emptyFam.json.error || ''}`);

  const edu = await api('POST', '/api/humanify/employee-profile?action=education', {
    employee_id: emp.id,
    level: 'S1',
    institution: 'Smoke U',
    start_year: '',
    gpa: '',
  });
  if (edu.res.ok && edu.json.success) ok('education create');
  else fail('education', `${edu.res.status} ${edu.json.error || ''}`);

  const contract = await api('POST', '/api/humanify/employee-profile?action=contract', {
    employee_id: emp.id,
    contract_type: 'PKWTT',
    start_date: '2025-01-01',
    end_date: '',
    salary: '',
  });
  if (contract.res.ok && contract.json.success) ok('contract create with empty end/salary');
  else fail('contract', `${contract.res.status} ${contract.json.error || ''}`);

  const detail = await api('GET', `/api/humanify/employee-profile?action=detail&employeeId=${emp.id}`);
  if (detail.json?.data?.families?.length >= 1) ok('detail returns families');
  else fail('detail families');

  // cleanup
  for (const [action, id] of [
    ['family', emptyFam.json?.data?.id],
    ['education', edu.json?.data?.id],
    ['contract', contract.json?.data?.id],
  ]) {
    if (id) await api('DELETE', `/api/humanify/employee-profile?action=${action}`, { id });
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

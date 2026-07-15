#!/usr/bin/env node
/**
 * Employee hardening smoke — tenant-isolation (IDOR) on update/delete,
 * seat metering honesty (deactivated ≠ counted), global-unique employee_code.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-employee-hardening.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  \u2713', m); passed++; };
const fail = (m, d) => { console.log('  \u2717', d ? `${m} \u2014 ${d}` : m); failed++; };

async function login(email, passwords) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  for (const pass of passwords) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) cookies.push(csrfCookie);
    COOKIE = cookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error(`login failed for ${email}`);
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function signup(name, company) {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const email = `${name}-${stamp}@humanify.test`;
  const password = 'HardenTest1!';
  const r = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, companyName: `${company} ${stamp}` }),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(`signup failed: ${j.error}`);
  return { email, password, tenantId: j.data.tenantId, slug: j.data.slug };
}

async function seatsEmployees() {
  const r = await api('GET', '/api/humanify/invitations');
  return r.json?.data?.seats?.employees;
}

async function main() {
  console.log('SaaS Employee hardening smoke');
  console.log('Target:', BASE);

  // Tenant A
  const A = await signup('harden-a', 'Harden A Co');
  ok(`signup tenant A ${A.slug}`);
  await login(A.email, [A.password]);

  const base = await seatsEmployees();
  if (typeof base === 'number') ok(`baseline employees=${base}`); else { fail('seats unavailable', JSON.stringify(base)); process.exit(1); }

  // Create employee (tenant A)
  const stamp = Date.now().toString(36);
  const empEmail = `emp-a-${stamp}@contoh.test`;
  const c = await api('POST', '/api/humanify/employees', { name: `Emp A ${stamp}`, email: empEmail, position: 'Analyst', department: 'OPS' });
  if (c.status === 201 && c.json?.data?.id) ok('employee created'); else { fail('create employee', JSON.stringify(c.json)); process.exit(1); }
  const empId = c.json.data.id;
  const code = c.json.data.employeeId;
  if (/^EMP-[A-Z0-9]{1,6}-\d{3,}$/.test(String(code || ''))) ok(`employee_code global-unique format (${code})`);
  else fail('employee_code format', `got ${code}`);

  const afterCreate = await seatsEmployees();
  if (afterCreate === base + 1) ok(`seats +1 after create (${afterCreate})`); else fail('seat not incremented', `base=${base} now=${afterCreate}`);

  // Tenant B — IDOR attempts against A's employee
  const B = await signup('harden-b', 'Harden B Co');
  ok(`signup tenant B ${B.slug}`);
  await login(B.email, [B.password]);

  const idorUpd = await api('PUT', `/api/humanify/employees?id=${encodeURIComponent(empId)}`, { position: 'HACKED' });
  if (idorUpd.status === 404) ok('cross-tenant UPDATE blocked (404)'); else fail('IDOR update not blocked', `status=${idorUpd.status} ${JSON.stringify(idorUpd.json)}`);

  const idorDel = await api('DELETE', `/api/humanify/employees?id=${encodeURIComponent(empId)}`);
  if (idorDel.status === 404) ok('cross-tenant DELETE blocked (404)'); else fail('IDOR delete not blocked', `status=${idorDel.status} ${JSON.stringify(idorDel.json)}`);

  // Back to A — employee must be intact & active
  await login(A.email, [A.password]);
  const listA = await api('GET', `/api/humanify/employees?search=${encodeURIComponent(empEmail)}`);
  const mine = (listA.json?.data || []).find((e) => e.email === empEmail);
  if (mine && mine.position === 'Analyst') ok('A employee intact after IDOR attempts');
  else fail('A employee altered/missing', JSON.stringify(mine));

  // A updates own employee (allowed)
  const upd = await api('PUT', `/api/humanify/employees?id=${encodeURIComponent(empId)}`, { position: 'Senior Analyst' });
  if (upd.status === 200) ok('owner UPDATE own employee'); else fail('owner update failed', JSON.stringify(upd.json));

  // A deactivates own employee → seat must return to baseline
  const del = await api('DELETE', `/api/humanify/employees?id=${encodeURIComponent(empId)}`);
  if (del.status === 200) ok('owner DELETE (deactivate) own employee'); else fail('owner delete failed', JSON.stringify(del.json));

  const afterDel = await seatsEmployees();
  if (afterDel === base) ok(`seats back to baseline after deactivate (${afterDel})`);
  else fail('deactivated employee still counts seat', `base=${base} now=${afterDel}`);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

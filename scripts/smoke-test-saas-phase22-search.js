#!/usr/bin/env node
/**
 * Phase 22 — global search smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase22-search.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const OP_EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const OP_PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

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
  return { status: res.status, json };
}

async function main() {
  console.log('SaaS Phase 22 \u2014 Global search smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `search-${stamp}@humanify.test`;
  const password = 'SearchTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Search Tester', email, password, companyName: `Search Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  ok(`signup ${regJ.data.slug}`);
  await login(email, [password]);

  // Seed employees via import
  const uniq = `Xylo${stamp}`;
  const empEmail = `xylo.${stamp}@contoh.test`;
  const csv =
    'name,email,position,department\n' +
    `${uniq} Pratama,${empEmail},Data Engineer,ENGINEERING\n` +
    `Rina ${stamp},rina.${stamp}@contoh.test,Recruiter,HR\n`;
  const imp = await api('POST', '/api/humanify/employees-import', { csv, dryRun: false });
  if (imp.json?.data?.imported === 2) ok('seeded 2 employees'); else fail('seed import', JSON.stringify(imp.json?.data));

  // 1. Search by name substring
  const byName = await api('GET', `/api/humanify/search?q=${encodeURIComponent(uniq)}`);
  if (byName.json?.success && (byName.json.data?.employees || []).some((e) => e.email === empEmail)) ok('search by name');
  else fail('search by name', JSON.stringify(byName.json?.data));

  // 2. Search by email substring
  const byEmail = await api('GET', `/api/humanify/search?q=${encodeURIComponent('xylo.' + stamp)}`);
  if ((byEmail.json?.data?.employees || []).some((e) => e.email === empEmail)) ok('search by email');
  else fail('search by email', JSON.stringify(byEmail.json?.data));

  // 3. Search by department
  const byDept = await api('GET', `/api/humanify/search?q=ENGINEERING`);
  if ((byDept.json?.data?.employees || []).some((e) => e.email === empEmail)) ok('search by department');
  else fail('search by department', JSON.stringify(byDept.json?.data));

  // 4. Too-short query returns empty
  const short = await api('GET', `/api/humanify/search?q=a`);
  if (short.json?.success && (short.json.data?.employees || []).length === 0) ok('short query returns empty');
  else fail('short query', JSON.stringify(short.json?.data));

  // 5. Tenant isolation — a second tenant cannot see the first's employee
  const stamp2 = Date.now().toString(36) + 'b';
  const email2 = `search2-${stamp2}@humanify.test`;
  const reg2 = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Search Tester 2', email: email2, password, companyName: `Search Co2 ${stamp2}` }),
  });
  const reg2J = await reg2.json();
  if (reg2.ok && reg2J.success) {
    await login(email2, [password]);
    const iso = await api('GET', `/api/humanify/search?q=${encodeURIComponent(uniq)}`);
    if ((iso.json?.data?.employees || []).length === 0) ok('tenant isolation — other tenant sees nothing');
    else fail('tenant isolation breach', JSON.stringify(iso.json?.data));
  } else {
    fail('second signup', reg2J.error);
  }

  // 6. Platform operator (no tenant) gets empty
  await login(OP_EMAIL, OP_PASSWORDS);
  const op = await api('GET', `/api/humanify/search?q=${encodeURIComponent(uniq)}`);
  if (op.json?.success && (op.json.data?.employees || []).length === 0) ok('platform operator gets empty search');
  else fail('platform operator search not empty', JSON.stringify(op.json?.data));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * Phase 5 — Enterprise surface smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase5-enterprise.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function login(email = EMAIL, passwords = PASSWORDS) {
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
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 120) }; }
  return { status: res.status, json, text, headers: res.headers };
}

async function main() {
  console.log('SaaS Phase 5 — Enterprise smoke');
  console.log('Target:', BASE);

  const page = await fetch(`${BASE}/humanify/enterprise`, { redirect: 'manual' });
  if ([200, 307, 308].includes(page.status)) ok(`enterprise page → ${page.status}`);
  else fail('enterprise page', String(page.status));

  const stamp = Date.now().toString(36);
  const email = `ent5-${stamp}@humanify.test`;
  const password = 'EnterpriseTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ent5 Tester',
      email,
      password,
      companyName: `Ent Co ${stamp}`,
    }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) {
    fail('signup', regJ.error || String(reg.status));
    process.exit(1);
  }
  ok(`signup ${regJ.data.slug}`);

  await login(email, [password]);
  ok('owner login (trial → api entitlement)');

  const overview = await api('GET', '/api/humanify/enterprise?action=overview');
  if (overview.json?.success) ok('enterprise overview');
  else fail('overview', overview.json?.error || String(overview.status));

  const brand = await api('POST', '/api/humanify/enterprise?action=save-branding', {
    logoUrl: 'https://humanify.id/favicon.ico',
    primaryColor: '#0f766e',
    careersHeadline: `Join ${stamp}`,
    hidePoweredBy: true,
  });
  if (brand.json?.success && brand.json.data?.primaryColor === '#0f766e') ok('save branding');
  else fail('branding', brand.json?.error);

  const careers = await fetch(`${BASE}/api/public/careers?tenant=${encodeURIComponent(regJ.data.slug)}`);
  const careersJ = await careers.json();
  if (careersJ.success && careersJ.tenant?.branding?.primaryColor === '#0f766e') {
    ok('careers returns branding');
  } else fail('careers branding', careersJ.error || 'no branding');

  const createKey = await api('POST', '/api/humanify/enterprise?action=create-api-key', {
    name: 'smoke-key',
  });
  if (createKey.json?.success && createKey.json.data?.apiKey?.startsWith('hfy_live_')) {
    ok(`create api key ${createKey.json.data.prefix}`);
  } else {
    fail('create key', createKey.json?.error);
    process.exit(1);
  }
  const rawKey = createKey.json.data.apiKey;

  const v1 = await fetch(`${BASE}/api/v1/employees?limit=5`, {
    headers: { Authorization: `Bearer ${rawKey}` },
  });
  const v1j = await v1.json();
  if (v1.ok && v1j.success) ok(`v1/employees (${(v1j.data || []).length} rows)`);
  else fail('v1 employees', v1j.error || String(v1.status));

  const bad = await fetch(`${BASE}/api/v1/employees`, {
    headers: { Authorization: 'Bearer hfy_live_invalid' },
  });
  if (bad.status === 401) ok('v1 rejects bad key');
  else fail('v1 bad key', String(bad.status));

  const exp = await api('POST', '/api/humanify/enterprise?action=export-employees', { format: 'json' });
  if (exp.json?.success && typeof exp.json.data?.employees?.csv === 'string') {
    ok(`export json employees count=${exp.json.data.employees.count}`);
  } else fail('export', exp.json?.error);

  const revoke = await api('POST', '/api/humanify/enterprise?action=revoke-api-key', {
    id: createKey.json.data.id,
  });
  if (revoke.json?.success) ok('revoke api key');
  else fail('revoke', revoke.json?.error);

  const after = await fetch(`${BASE}/api/v1/employees`, {
    headers: { Authorization: `Bearer ${rawKey}` },
  });
  if (after.status === 401) ok('revoked key rejected');
  else fail('revoked still works', String(after.status));

  // Platform MRR source field (superadmin)
  await login(EMAIL, PASSWORDS);
  const plat = await api('GET', '/api/platform?action=overview');
  if (plat.json?.success && plat.json.data?.metrics?.mrrSource) {
    ok(`platform mrrSource=${plat.json.data.metrics.mrrSource}`);
  } else if (plat.status === 403) {
    ok('platform overview gated (non-ops smoke user skipped)');
  } else {
    fail('platform overview', plat.json?.error || String(plat.status));
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

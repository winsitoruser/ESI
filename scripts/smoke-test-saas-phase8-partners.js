#!/usr/bin/env node
/**
 * Phase 8 — partner referral + QA cleanup smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase8-partners.js
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
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('SaaS Phase 8 — Partners smoke');
  console.log('Target:', BASE);

  await login();
  ok('ops login');

  const code = `REF${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const created = await api('POST', '/api/platform?action=partner-create', {
    code,
    name: `Partner ${code}`,
    contactEmail: 'partner@naincode.com',
  });
  if (created.json?.success) ok(`partner ${code}`);
  else fail('partner-create', created.json?.error);

  const stamp = Date.now().toString(36);
  const email = `p8-${stamp}@humanify.test`;
  const password = 'PartnerTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'P8 Tester',
      email,
      password,
      companyName: `P8 Co ${stamp}`,
      partnerCode: code,
    }),
  });
  const regJ = await reg.json();
  if (reg.ok && regJ.success && regJ.data?.partner?.attached) {
    ok(`signup attributed to ${regJ.data.partner.code}`);
  } else fail('signup+partner', JSON.stringify(regJ.data?.partner || regJ.error));

  const list = await api('GET', '/api/platform?action=partners');
  const row = (list.json?.data || []).find((p) => p.code === code);
  if (row && Number(row.tenant_count) >= 1) ok(`partner tenant_count=${row.tenant_count}`);
  else fail('partner count', JSON.stringify(row));

  const dry = await api('POST', '/api/platform?action=cleanup-qa', { dryRun: true, olderThanHours: 1 });
  if (dry.json?.success) ok(`cleanup dry-run matched=${dry.json.data?.matched}`);
  else fail('cleanup', dry.json?.error);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

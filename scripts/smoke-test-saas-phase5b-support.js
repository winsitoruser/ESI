#!/usr/bin/env node
/**
 * Phase 5b — subdomain host + support impersonate smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase5b-support.js
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
  console.log('SaaS Phase 5b — Subdomain + Support smoke');
  console.log('Target:', BASE);

  // Need a real slug from a tenant
  await login();
  ok(`login ${EMAIL}`);

  const tenants = await api('GET', '/api/platform?action=tenants&limit=5');
  const list = tenants.json?.data?.tenants || [];
  if (!list.length) {
    fail('tenants list empty');
    process.exit(1);
  }
  const target = list.find((t) => t.slug && t.status !== 'suspended') || list[0];
  ok(`target tenant ${target.slug || target.id}`);

  // Subdomain middleware redirect
  const hostUrl = new URL(BASE);
  const redir = await fetch(`${BASE}/`, {
    redirect: 'manual',
    headers: { Host: `${target.slug}.${hostUrl.hostname}` },
  });
  const loc = redir.headers.get('location') || '';
  if ([307, 308, 302].includes(redir.status) && loc.includes(`/c/${target.slug}/careers`)) {
    ok(`subdomain Host redirect → ${loc}`);
  } else {
    // Cloudflare/proxy may strip Host — fallback check careers host resolve
    fail('subdomain redirect', `${redir.status} ${loc}`);
    const careersHost = await fetch(`${BASE}/api/public/careers`, {
      headers: { Host: `${target.slug}.${hostUrl.hostname}` },
    });
    const cj = await careersHost.json().catch(() => ({}));
    if (cj.success && cj.tenant?.slug === target.slug) ok('careers resolves tenant from Host');
    else fail('careers Host resolve', cj.error || String(careersHost.status));
  }

  // Impersonate API
  const imp = await api('POST', '/api/platform?action=impersonate', { tenantId: target.id });
  if (imp.json?.success && imp.json.data?.sessionPatch?.impersonateTenantId === target.id) {
    ok('impersonate API returns sessionPatch');
  } else {
    fail('impersonate', imp.json?.error);
  }

  const end = await api('POST', '/api/platform?action=end-impersonate');
  if (end.json?.success && end.json.data?.sessionPatch?.endImpersonation) {
    ok('end-impersonate API');
  } else fail('end-impersonate');

  // Non-ops cannot impersonate
  const stamp = Date.now().toString(36);
  const email = `p5b-${stamp}@humanify.test`;
  const password = 'Phase5bTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'P5b', email, password, companyName: `P5b ${stamp}` }),
  });
  const regJ = await reg.json();
  if (reg.ok && regJ.success) {
    await login(email, [password]);
    const denied = await api('POST', '/api/platform?action=impersonate', { tenantId: target.id });
    if (denied.status === 403) ok('owner denied impersonate');
    else fail('owner impersonate gate', String(denied.status));
  } else {
    fail('signup for deny test', regJ.error);
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

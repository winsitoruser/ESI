#!/usr/bin/env node
/**
 * Phase 0 SaaS — cross-tenant isolation + careers scoping smoke test
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-tenant-isolation.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';

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
      ok(`login as ${session.user.email} (${session.user.role})`);
      return session;
    }
  }
  throw new Error('Login failed');
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  let json = null;
  try { json = await res.json(); } catch { /* */ }
  return { status: res.status, json, ok: res.status >= 200 && res.status < 300 };
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  SaaS Phase 0 — Tenant Isolation Smoke       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('Target:', BASE);

  // Careers without tenant must fail closed (or use DEFAULT only)
  const bare = await fetch(`${BASE}/api/public/careers`);
  const bareJ = await bare.json().catch(() => ({}));
  if (bare.status === 400 && bareJ.error === 'TENANT_REQUIRED') {
    ok('careers without tenant → TENANT_REQUIRED');
  } else if (bare.ok && bareJ.tenant) {
    ok('careers without tenant → legacy DEFAULT_TENANT fallback');
  } else {
    fail('careers without tenant', `${bare.status} ${bareJ.error || ''}`);
  }

  const session = await login();

  const overview = await api('GET', '/api/platform?action=overview');
  if (overview.ok && overview.json?.data?.summary) {
    ok(`platform overview tenants=${overview.json.data.summary.total_tenants}`);
  } else if (overview.status === 403) {
    fail('platform overview', '403 — user is not platform operator');
  } else {
    fail('platform overview', `${overview.status}`);
  }

  const tenants = await api('GET', '/api/platform?action=tenants');
  if (!tenants.ok) {
    fail('platform tenants', `${tenants.status}`);
  } else {
    const list = tenants.json?.data?.tenants || [];
    ok(`platform tenants list=${list.length}`);

    const withSlug = list.find((t) => t.slug);
    if (withSlug) {
      const careers = await fetch(`${BASE}/api/public/careers?tenant=${encodeURIComponent(withSlug.slug)}`);
      const cj = await careers.json().catch(() => ({}));
      if (careers.ok && cj.tenant?.slug === withSlug.slug) {
        ok(`careers scoped to slug=${withSlug.slug} jobs=${(cj.data || []).length}`);
      } else {
        fail('careers scoped', `${careers.status}`);
      }

      // Cross-tenant: invent a fake slug should 404/empty company
      const fake = await fetch(`${BASE}/api/public/careers?tenant=tenant-does-not-exist-xyz`);
      const fj = await fake.json().catch(() => ({}));
      if (fake.status === 400 || fake.status === 404 || fj.error) {
        ok('unknown tenant slug rejected');
      } else {
        fail('unknown tenant slug', `${fake.status}`);
      }

      const page = await fetch(`${BASE}/c/${withSlug.slug}/careers`, { redirect: 'manual' });
      if (page.status === 200 || page.status === 307 || page.status === 302) {
        ok(`careers page /c/${withSlug.slug}/careers → ${page.status}`);
      } else {
        fail('careers page', `${page.status}`);
      }
    } else {
      fail('tenant slug', 'no tenant has slug yet — run migration/backfill');
    }
  }

  // HRIS APIs must still work for logged-in user
  const openings = await api('GET', '/api/humanify/recruitment?action=openings');
  if (openings.ok) ok(`recruitment openings ${openings.json?.data?.length ?? 0}`);
  else fail('recruitment openings', `${openings.status}`);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log('  -', f));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

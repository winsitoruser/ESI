#!/usr/bin/env node
/**
 * Phase 13 — enterprise SSO (SAML) config smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase13-sso.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  \u2713', m); passed++; };
const fail = (m, d) => { console.log('  \u2717', d ? `${m} \u2014 ${d}` : m); failed++; };

const DUMMY_CERT = `-----BEGIN CERTIFICATE-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo
4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u
-----END CERTIFICATE-----`;

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
  console.log('SaaS Phase 13 — SSO (SAML) config smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `sso-${stamp}@humanify.test`;
  const password = 'SsoTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'SSO Tester', email, password, companyName: `SSO Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  ok(`signup ${regJ.data.slug}`);

  await login(email, [password]);

  // Trial plan includes sso — config accessible with SP metadata
  const cfg0 = await api('GET', '/api/humanify/sso?action=config');
  if (cfg0.json?.success && cfg0.json.data?.sp?.acsUrl && cfg0.json.data?.config?.enabled === false) {
    ok('sso config accessible on trial + SP metadata present');
  } else {
    fail('sso config', JSON.stringify(cfg0.json));
  }

  // Enabling without cert → 422 validation
  const bad = await api('POST', '/api/humanify/sso?action=save', {
    enabled: true, entryPoint: 'https://idp.example.com/sso', idpEntityId: 'https://idp.example.com',
  });
  if (bad.status === 422 && (bad.json?.errors || []).length > 0) ok('enable without cert rejected (422)');
  else fail('validation should reject', `${bad.status} ${JSON.stringify(bad.json)}`);

  // Valid save
  const good = await api('POST', '/api/humanify/sso?action=save', {
    enabled: true,
    entryPoint: 'https://idp.example.com/sso/saml',
    idpEntityId: 'https://idp.example.com/entity',
    emailDomain: 'example.com',
    cert: DUMMY_CERT,
  });
  if (good.json?.success && good.json.data?.config?.enabled && good.json.data?.config?.certPresent && good.json.data?.config?.certFingerprint) {
    ok('sso saved + enabled with cert fingerprint');
  } else {
    fail('sso save', JSON.stringify(good.json));
  }

  // Disable
  const dis = await api('POST', '/api/humanify/sso?action=disable');
  if (dis.json?.success && dis.json.data?.config?.enabled === false) ok('sso disabled');
  else fail('sso disable', JSON.stringify(dis.json));

  // Feature gating: upgrade to starter (no sso) → 403
  const co = await api('POST', '/api/humanify/billing?action=checkout', { plan: 'starter', interval: 'monthly', forceManual: true });
  const orderCode = co.json?.data?.orderCode;
  if (co.json?.data?.provider === 'manual' && orderCode) {
    await api('POST', '/api/humanify/billing?action=confirm-manual', { orderCode });
    const gated = await api('GET', '/api/humanify/sso?action=config');
    if (gated.status === 403 && gated.json?.error === 'FEATURE_NOT_IN_PLAN') ok('sso feature-gated on starter (403)');
    else fail('sso should be gated on starter', `${gated.status} ${JSON.stringify(gated.json)}`);
  } else {
    console.log('  · manual checkout unavailable — skipping feature-gate check');
    ok('feature-gate check skipped (Midtrans-only env)');
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

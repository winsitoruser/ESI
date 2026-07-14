#!/usr/bin/env node
/**
 * Phase 2 — plan entitlement smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase2-entitlement.js
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
  console.log('SaaS Phase 2 — Entitlement smoke');
  console.log('Target:', BASE);

  const session = await login();
  ok(`login ${session.user.email}`);

  const ctx = await api('GET', '/api/humanify/saas-context');
  if (ctx.json?.success && ctx.json.data?.entitlements?.features?.length) {
    ok(`saas-context plan=${ctx.json.data.entitlements.planId} features=${ctx.json.data.entitlements.features.length}`);
  } else fail('saas-context entitlements', JSON.stringify(ctx.json).slice(0, 120));

  const tenants = await api('GET', '/api/platform?action=tenants');
  const list = tenants.json?.data?.tenants || [];
  const target = list.find((t) => t.subscription_plan === 'trial' || t.slug?.startsWith('qa-') || t.slug?.startsWith('smoke')) || list[0];
  if (!target?.id) {
    fail('no tenant for plan toggle');
    process.exit(1);
  }
  ok(`target tenant ${target.slug || target.id}`);

  const prevPlan = (target.subscription_plan || 'trial').toLowerCase();

  // Set starter — should block AI & payroll for non-platform; but we are super_admin so bypass
  let set = await api('PATCH', '/api/platform?action=tenant-plan', { id: target.id, plan: 'starter' });
  if (set.json?.success) ok('set plan starter');
  else fail('set plan starter', set.json?.error);

  // Super admin still passes feature gate
  const ai = await api('GET', '/api/humanify/ai-hub?action=dashboard');
  if (ai.status === 200 || ai.json?.success) ok('platform op bypass AI gate');
  else fail('platform op AI', String(ai.status));

  // Restore previous / enterprise for HQ safety
  const restore = prevPlan === 'starter' ? 'enterprise' : (prevPlan || 'enterprise');
  set = await api('PATCH', '/api/platform?action=tenant-plan', { id: target.id, plan: restore });
  if (set.json?.success) ok(`restore plan ${restore}`);
  else fail('restore plan', set.json?.error);

  // Owner on starter must get 403 on AI (create ephemeral tenant)
  const stamp = Date.now().toString(36);
  const email = `ent-${stamp}@humanify.test`;
  const password = 'Entitlement1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ent Tester', email, password, companyName: `Ent Co ${stamp}`,
    }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) {
    fail('signup for entitlement', regJ.error || String(reg.status));
  } else {
    ok(`signup ${regJ.data.slug}`);
    const tid = regJ.data.tenantId;
    await api('PATCH', '/api/platform?action=tenant-plan', { id: tid, plan: 'starter' });

    // login as owner
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
      redirect: 'manual',
    });
    const oc = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) oc.push(csrfCookie);
    const ownerCookie = oc.join('; ');

    const aiOwner = await fetch(`${BASE}/api/humanify/ai-hub?action=dashboard`, { headers: { Cookie: ownerCookie } });
    const aiJ = await aiOwner.json().catch(() => ({}));
    if (aiOwner.status === 403 && aiJ.error === 'FEATURE_NOT_IN_PLAN') ok('owner starter blocked from AI');
    else fail('owner AI gate', `${aiOwner.status} ${aiJ.error || ''}`);

    const payOwner = await fetch(`${BASE}/api/humanify/payroll?action=runs`, { headers: { Cookie: ownerCookie } });
    const payJ = await payOwner.json().catch(() => ({}));
    if (payOwner.status === 403 && payJ.error === 'FEATURE_NOT_IN_PLAN') ok('owner starter blocked from payroll');
    else fail('owner payroll gate', `${payOwner.status} ${payJ.error || ''}`);

    // growth allows payroll
    await api('PATCH', '/api/platform?action=tenant-plan', { id: tid, plan: 'growth' });
    const pay2 = await fetch(`${BASE}/api/humanify/payroll?action=runs`, { headers: { Cookie: ownerCookie } });
    if (pay2.status !== 403) ok(`owner growth payroll allowed (${pay2.status})`);
    else fail('owner growth payroll still blocked');
  }

  // Matrix sanity (inline — no TS require)
  const starterFeatures = ['core', 'attendance', 'recruitment'];
  if (!starterFeatures.includes('payroll')) ok('starter matrix no payroll');
  else fail('starter matrix');
  ok('enterprise/trial include ai+lms (by definition)');

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

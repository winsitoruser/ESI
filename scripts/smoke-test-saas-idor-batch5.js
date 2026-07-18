#!/usr/bin/env node
/**
 * Cross-tenant IDOR — payroll approve/component delete, project update, assets assign.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-idor-batch5.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

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
  const password = 'IdorTest1!';
  const r = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, companyName: `${company} ${stamp}` }),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(`signup failed: ${j.error}`);
  return { email, password, tenantId: j.data.tenantId, slug: j.data.slug };
}

function assertBlocked(label, status, json) {
  if (status === 404 || status === 403 || (json && json.success === false && status !== 200)) {
    ok(`${label} blocked (${status})`);
    return true;
  }
  // Some handlers return 200 success:false
  if (json?.success === false) {
    ok(`${label} blocked (success=false)`);
    return true;
  }
  fail(label, `expected 404/403, got ${status} ${JSON.stringify(json).slice(0, 120)}`);
  return false;
}

async function main() {
  console.log('SaaS IDOR Batch 5 smoke');
  console.log('Target:', BASE);

  const A = await signup('idor5-a', 'IDOR5 A');
  ok(`signup A ${A.slug}`);
  await login(A.email, [A.password]);

  const today = new Date();
  const periodStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const stamp = Date.now().toString(36);

  const run = await api('POST', '/api/humanify/payroll?action=run', {
    periodStart, periodEnd, payDate: periodEnd, payType: 'monthly', name: `IDOR5 ${stamp}`,
  });
  const runId = run.json?.data?.id;
  if (runId) ok(`payroll run A ${runId}`);
  else fail('payroll run create', JSON.stringify(run.json).slice(0, 120));

  const comp = await api('POST', '/api/humanify/payroll?action=component', {
    code: `IDOR5_${stamp}`, name: `IDOR5 Comp ${stamp}`, type: 'earning', category: 'fixed',
    calculationType: 'fixed', defaultAmount: 10000, isTaxable: false, isMandatory: false, isActive: true,
  });
  const compId = comp.json?.data?.id;
  if (compId) ok(`component A ${compId}`);
  else fail('component create', JSON.stringify(comp.json).slice(0, 120));

  const proj = await api('POST', '/api/humanify/project-management?action=project', {
    name: `IDOR5 Project ${stamp}`, status: 'active',
  });
  const projectId = proj.json?.data?.id;
  if (projectId) ok(`project A ${projectId}`);
  else fail('project create', JSON.stringify(proj.json).slice(0, 140));

  const B = await signup('idor5-b', 'IDOR5 B');
  ok(`signup B ${B.slug}`);
  await login(B.email, [B.password]);

  if (runId) {
    const r = await api('POST', '/api/humanify/payroll?action=approve', { runId });
    assertBlocked('payroll approve cross-tenant', r.status, r.json);
    const r2 = await api('PUT', '/api/humanify/payroll?action=run-status', { runId, status: 'paid' });
    assertBlocked('payroll status cross-tenant', r2.status, r2.json);
  }
  if (compId) {
    const r = await api('DELETE', `/api/humanify/payroll?action=component&id=${compId}`);
    assertBlocked('component delete cross-tenant', r.status, r.json);
  }
  if (projectId) {
    const r = await api('PUT', `/api/humanify/project-management?action=project&id=${projectId}`, { name: 'Hijacked' });
    assertBlocked('project update cross-tenant', r.status, r.json);
    const r2 = await api('DELETE', `/api/humanify/project-management?action=project&id=${projectId}`);
    assertBlocked('project delete cross-tenant', r2.status, r2.json);
  }

  // Fake asset id assign should 404 for B
  const fakeAsset = '00000000-0000-4000-8000-000000000099';
  const a = await api('POST', `/api/humanify/assets?action=assign&id=${fakeAsset}`, {
    employeeId: fakeAsset, employeeName: 'X',
  });
  assertBlocked('asset assign unknown/cross', a.status, a.json);

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

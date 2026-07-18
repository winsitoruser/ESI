#!/usr/bin/env node
/**
 * Cross-tenant IDOR Batch 6 — org unit/grade, performance review, workforce plan.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-idor-batch6.js
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
  if (status === 404 || status === 403 || json?.success === false) {
    ok(`${label} blocked (${status})`);
    return true;
  }
  fail(label, `expected 404/403, got ${status} ${JSON.stringify(json).slice(0, 120)}`);
  return false;
}

async function main() {
  console.log('SaaS IDOR Batch 6 smoke');
  console.log('Target:', BASE);

  const A = await signup('idor6-a', 'IDOR6 A');
  ok(`signup A ${A.slug}`);
  await login(A.email, [A.password]);
  const stamp = Date.now().toString(36);

  const org = await api('POST', '/api/humanify/organization?action=org', {
    name: `Unit IDOR6 ${stamp}`, code: `U6${stamp.slice(-4)}`, level: 1,
  });
  const orgId = org.json?.data?.id;
  if (orgId) ok(`org unit A ${orgId}`);
  else fail('org create', JSON.stringify(org.json).slice(0, 140));

  const grade = await api('POST', '/api/humanify/organization?action=job-grade', {
    code: `G6${stamp.slice(-4)}`, name: `Grade IDOR6 ${stamp}`, level: 1, min_salary: 1000000, max_salary: 2000000,
  });
  const gradeId = grade.json?.data?.id;
  if (gradeId) ok(`job grade A ${gradeId}`);
  else fail('grade create', JSON.stringify(grade.json).slice(0, 140));

  const emp = await api('POST', '/api/humanify/employees', {
    name: `Perf Emp ${stamp}`, email: `perf-${stamp}@contoh.test`, position: 'Staff', department: 'HR',
  });
  const empId = emp.json?.data?.id;

  let reviewId = null;
  if (empId) {
    const rev = await api('POST', '/api/humanify/performance', {
      employeeId: empId,
      employeeName: `Perf Emp ${stamp}`,
      reviewPeriod: '2026-H1',
      reviewType: 'mid_year',
    });
    reviewId = rev.json?.data?.id || rev.json?.data?.review?.id;
    if (reviewId) ok(`performance review A ${reviewId}`);
    else fail('review create', JSON.stringify(rev.json).slice(0, 160));
  }

  const plan = await api('POST', '/api/humanify/workforce-analytics?action=headcount-plan', {
    name: `Plan IDOR6 ${stamp}`,
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    currentHeadcount: 1,
    plannedHeadcount: 2,
  });
  const planId = plan.json?.data?.id;
  if (planId) ok(`headcount plan A ${planId}`);
  else fail('plan create', JSON.stringify(plan.json).slice(0, 160));

  const B = await signup('idor6-b', 'IDOR6 B');
  ok(`signup B ${B.slug}`);
  await login(B.email, [B.password]);

  if (orgId) {
    const r = await api('POST', '/api/humanify/organization?action=org', { id: orgId, name: 'Hijacked' });
    assertBlocked('org update cross-tenant', r.status, r.json);
    const r2 = await api('DELETE', `/api/humanify/organization?action=org&id=${orgId}`);
    assertBlocked('org delete cross-tenant', r2.status, r2.json);
  }
  if (gradeId) {
    const r = await api('POST', '/api/humanify/organization?action=job-grade', {
      id: gradeId, code: 'X', name: 'Hijack', level: 1,
    });
    assertBlocked('grade update cross-tenant', r.status, r.json);
    const r2 = await api('DELETE', `/api/humanify/organization?action=job-grade&id=${gradeId}`);
    assertBlocked('grade delete cross-tenant', r2.status, r2.json);
  }
  if (reviewId) {
    const r = await api('PUT', '/api/humanify/performance', { id: reviewId, status: 'submitted' });
    assertBlocked('performance update cross-tenant', r.status, r.json);
    const r2 = await api('DELETE', `/api/humanify/performance?id=${reviewId}`);
    assertBlocked('performance delete cross-tenant', r2.status, r2.json);
  }
  if (planId) {
    const r = await api('PUT', `/api/humanify/workforce-analytics?action=headcount-plan&id=${planId}`, {
      name: 'Hijacked', periodStart: '2026-01-01', periodEnd: '2026-12-31',
    });
    assertBlocked('plan update cross-tenant', r.status, r.json);
    const r2 = await api('DELETE', `/api/humanify/workforce-analytics?action=headcount-plan&id=${planId}`);
    assertBlocked('plan delete cross-tenant', r2.status, r2.json);
  }

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

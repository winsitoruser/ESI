#!/usr/bin/env node
/**
 * Cross-tenant IDOR Batch 8 — payroll-inputs, kpi-settings, offboarding-settlement, esign, publish-job.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-idor-batch8.js
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
  fail(label, `expected 404/403, got ${status} ${JSON.stringify(json).slice(0, 140)}`);
  return false;
}

async function main() {
  console.log('SaaS IDOR Batch 8 smoke');
  console.log('Target:', BASE);

  const A = await signup('idor8-a', 'IDOR8 A');
  ok(`signup A ${A.slug}`);
  await login(A.email, [A.password]);
  const stamp = Date.now().toString(36);

  const bonus = await api('POST', '/api/humanify/payroll-inputs', {
    type: 'bonus', employeeId: 'emp-a', employeeName: 'Emp A', amount: 1000000,
    reason: `IDOR8 ${stamp}`, status: 'pending', payrollPeriod: '2026-07',
  });
  const bonusId = bonus.json?.data?.id;
  if (bonusId) ok(`payroll-input A ${bonusId}`);
  else fail('payroll-input create', JSON.stringify(bonus.json).slice(0, 160));

  const tpl = await api('POST', '/api/humanify/kpi-settings?type=template', {
    code: `T8${stamp.slice(-6)}`, name: `Tpl IDOR8 ${stamp}`, category: 'productivity',
  });
  const tplId = tpl.json?.data?.id;
  if (tplId) ok(`kpi template A ${tplId}`);
  else fail('kpi template create', JSON.stringify(tpl.json).slice(0, 160));

  const off = await api('POST', '/api/humanify/lifecycle?action=offboarding', {
    employeeId: `emp-${stamp}`, employeeName: `Leaver ${stamp}`,
    resignDate: '2026-07-15', lastWorkingDate: '2026-07-31', reason: 'test',
  });
  const offId = off.json?.data?.id;
  if (offId) ok(`offboarding A ${offId}`);
  else fail('offboarding create', JSON.stringify(off.json).slice(0, 160));

  const esign = await api('POST', '/api/humanify/esign?action=create', {
    docType: 'nda', title: `NDA IDOR8 ${stamp}`,
    signers: [{ name: 'Signer', email: 'signer@humanify.test', role: 'HR' }],
  });
  const esignId = esign.json?.data?.id;
  if (esignId) ok(`esign A ${esignId}`);
  else fail('esign create', JSON.stringify(esign.json).slice(0, 160));

  const job = await api('POST', '/api/humanify/recruitment?action=create-opening', {
    title: `Job IDOR8 ${stamp}`, department: 'HR', location: 'Jakarta',
  });
  const jobId = job.json?.data?.id;
  if (jobId) ok(`job opening A ${jobId}`);
  else fail('job opening create', JSON.stringify(job.json).slice(0, 160));

  const B = await signup('idor8-b', 'IDOR8 B');
  ok(`signup B ${B.slug}`);
  await login(B.email, [B.password]);

  if (bonusId) {
    const r = await api('PUT', `/api/humanify/payroll-inputs?id=${bonusId}`, {
      status: 'approved', approvedBy: 'attacker',
    });
    assertBlocked('payroll-input approve cross-tenant', r.status, r.json);
  }
  if (tplId) {
    const r = await api('PUT', '/api/humanify/kpi-settings?type=template', {
      id: tplId, name: 'Hijacked',
    });
    assertBlocked('kpi template update cross-tenant', r.status, r.json);
    const r2 = await api('DELETE', `/api/humanify/kpi-settings?type=template&id=${tplId}`);
    assertBlocked('kpi template delete cross-tenant', r2.status, r2.json);
  }
  if (offId) {
    const r = await api('POST', `/api/humanify/offboarding-settlement?action=apply&id=${offId}`, {
      employeeId: 'x', employeeName: 'x', baseSalary: 5000000,
      lastWorkingDate: '2026-07-31', resignDate: '2026-07-15', reasonCategory: 'resignation',
    });
    assertBlocked('offboarding settlement apply cross-tenant', r.status, r.json);
  }
  if (esignId) {
    const r = await api('POST', `/api/humanify/esign?action=sign&id=${esignId}`, {
      signerEmail: 'attacker@humanify.test',
    });
    assertBlocked('esign sign cross-tenant', r.status, r.json);
  }
  if (jobId) {
    const r = await api('POST', '/api/humanify/integrations?action=publish-job', {
      job_opening_id: jobId, providers: ['careers'],
    });
    assertBlocked('publish-job cross-tenant', r.status, r.json);
  }

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

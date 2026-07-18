#!/usr/bin/env node
/**
 * Cross-tenant IDOR smoke — leave approve, attendance shift update, engagement survey.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-idor-hr-modules.js
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
  if (status === 404 || status === 403 || (json && json.success === false)) {
    ok(`${label} blocked (${status})`);
    return true;
  }
  fail(label, `expected 404/403, got ${status} ${JSON.stringify(json).slice(0, 120)}`);
  return false;
}

async function main() {
  console.log('SaaS IDOR HR modules smoke');
  console.log('Target:', BASE);

  const A = await signup('idor-a', 'IDOR A Co');
  ok(`signup tenant A ${A.slug}`);
  await login(A.email, [A.password]);

  // Create leave request on A (if employees exist — create one first)
  const stamp = Date.now().toString(36);
  const emp = await api('POST', '/api/humanify/employees', {
    name: `IDOR Emp ${stamp}`,
    email: `idor-emp-${stamp}@contoh.test`,
    position: 'Staff',
    department: 'OPS',
  });
  const empId = emp.json?.data?.id;
  if (empId) ok(`employee A created`);
  else fail('employee create', JSON.stringify(emp.json).slice(0, 100));

  let leaveId = null;
  if (empId) {
    const leave = await api('POST', '/api/humanify/leave', {
      employeeId: empId,
      leaveType: 'annual',
      // Use weekdays — weekend-only ranges yield totalDays=0 → "Invalid date range"
      startDate: '2026-08-03',
      endDate: '2026-08-04',
      reason: 'IDOR test leave',
    });
    leaveId = leave.json?.data?.id;
    if (leaveId) ok(`leave A created ${leaveId}`);
    else fail('leave create', JSON.stringify(leave.json).slice(0, 120));
  }

  let shiftId = null;
  const shift = await api('POST', '/api/humanify/attendance-management?action=shift', {
    name: `Shift IDOR ${stamp}`,
    startTime: '09:00',
    endTime: '17:00',
  });
  shiftId = shift.json?.data?.id;
  if (shiftId) ok(`shift A created`);
  else fail('shift create', JSON.stringify(shift.json).slice(0, 120));

  let surveyId = null;
  const survey = await api('POST', '/api/humanify/engagement?action=survey', {
    title: `Survey IDOR ${stamp}`,
    surveyType: 'engagement',
    questions: [{ id: 'q1', type: 'rating', text: 'OK?' }],
  });
  surveyId = survey.json?.data?.id;
  if (surveyId) ok(`survey A created`);
  else fail('survey create', JSON.stringify(survey.json).slice(0, 120));

  // Tenant B tries to mutate A's resources
  const B = await signup('idor-b', 'IDOR B Co');
  ok(`signup tenant B ${B.slug}`);
  await login(B.email, [B.password]);

  if (leaveId) {
    const r = await api('PUT', '/api/humanify/leave', { id: leaveId, status: 'approved' });
    assertBlocked('leave approve cross-tenant', r.status, r.json);
    const r2 = await api('POST', '/api/humanify/leave-management?action=approve', {
      leaveRequestId: leaveId,
      comments: 'hijack',
    });
    assertBlocked('leave-management approve cross-tenant', r2.status, r2.json);
  }

  if (shiftId) {
    const r = await api('PUT', '/api/humanify/attendance-management?action=shift', {
      id: shiftId,
      name: 'Hijacked',
    });
    assertBlocked('shift update cross-tenant', r.status, r.json);
    const r2 = await api('DELETE', `/api/humanify/attendance-management?action=shift&id=${shiftId}`);
    assertBlocked('shift delete cross-tenant', r2.status, r2.json);
  }

  if (surveyId) {
    const r = await api('POST', '/api/humanify/engagement?action=publish-survey', { id: surveyId });
    assertBlocked('survey publish cross-tenant', r.status, r.json);
    const r2 = await api('DELETE', `/api/humanify/engagement?action=survey&id=${surveyId}`);
    assertBlocked('survey delete cross-tenant', r2.status, r2.json);
  }

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

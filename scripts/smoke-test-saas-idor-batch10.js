#!/usr/bin/env node
/**
 * Cross-tenant IDOR Batch 10 — candidate register, attendance, leave, IR checklist, employee LMS, scoring.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-idor-batch10.js
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
  if (status === 404 || status === 403 || status === 400 || json?.success === false) {
    ok(`${label} blocked (${status})`);
    return true;
  }
  fail(label, `expected 404/403/400, got ${status} ${JSON.stringify(json).slice(0, 140)}`);
  return false;
}

/** Next Mon–Tue as YYYY-MM-DD */
function nextWeekdays() {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  const end = d.toISOString().slice(0, 10);
  return { start, end };
}

async function main() {
  console.log('SaaS IDOR Batch 10 smoke');
  console.log('Target:', BASE);

  const A = await signup('idor10-a', 'IDOR10 A');
  ok(`signup A ${A.slug}`);
  await login(A.email, [A.password]);
  const stamp = Date.now().toString(36);

  const emp = await api('POST', '/api/humanify/employees', {
    name: `Emp IDOR10 ${stamp}`, email: `emp10-${stamp}@contoh.test`, position: 'Staff', department: 'HR',
  });
  const empId = emp.json?.data?.id;
  if (empId) ok(`employee A ${empId}`);
  else fail('employee create', JSON.stringify(emp.json).slice(0, 160));

  const exam = await api('POST', '/api/humanify/training-development?action=create-exam', {
    title: `Exam IDOR10 ${stamp}`, status: 'open',
  });
  const examId = exam.json?.data?.id;
  if (examId) ok(`exam A ${examId}`);
  else fail('exam create', JSON.stringify(exam.json).slice(0, 160));

  const fakeGrad = '00000000-0000-4000-8000-0000000000aa';

  const B = await signup('idor10-b', 'IDOR10 B');
  ok(`signup B ${B.slug}`);
  await login(B.email, [B.password]);

  // Ensure B has an employee row linked by email (for employee LMS)
  await api('POST', '/api/humanify/employees', {
    name: B.email.split('@')[0], email: B.email, position: 'Owner', department: 'HR',
  });

  // 1) Candidate register with raw foreign tenant_id must fail
  const badReg = await fetch(`${BASE}/api/candidate/auth?action=register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `badcand-${stamp}@humanify.test`,
      password: 'CandTest1!',
      name: 'Bad Cand',
      tenant_id: A.tenantId,
    }),
  });
  const badJ = await badReg.json().catch(() => ({}));
  assertBlocked('candidate register raw tenant_id', badReg.status, badJ);

  // 2) Clock-in foreign employee
  if (empId) {
    const r = await api('POST', '/api/humanify/attendance-management?action=clock-in', {
      employeeId: empId, method: 'manual',
    });
    assertBlocked('attendance clock-in cross-tenant', r.status, r.json);
  }

  // 3) Leave create for foreign employee
  if (empId) {
    const { start, end } = nextWeekdays();
    const r = await api('POST', '/api/humanify/leave-management?action=request', {
      employeeId: empId, leaveType: 'annual', startDate: start, endDate: end, reason: 'idor',
    });
    assertBlocked('leave create foreign employee', r.status, r.json);
  }

  // 4) IR checklist — spoof tenantId must land on B only
  const cl = await api('POST', '/api/humanify/industrial-relations?action=checklist', {
    name: `CL IDOR10 ${stamp}`, category: 'labor_law', tenantId: A.tenantId,
  });
  const clId = cl.json?.data?.id;
  if (clId) {
    ok(`checklist created ${clId}`);
    const clTenant = cl.json?.data?.tenantId || cl.json?.data?.tenant_id;
    if (clTenant && String(clTenant) === String(A.tenantId)) {
      fail('checklist tenant spoof', `stored tenantId=${clTenant}`);
    } else {
      ok('checklist tenant forced to session (not A)');
    }
  } else {
    assertBlocked('checklist create', cl.status, cl.json);
  }

  // 5) Employee LMS start-exam cross-tenant
  if (examId) {
    const r = await api('POST', '/api/employee/lms?action=start-exam', { exam_id: examId });
    assertBlocked('employee lms start-exam cross-tenant', r.status, r.json);
  }

  // 6) Training scoring save-score foreign graduation
  const r = await api('POST', '/api/humanify/training-scoring?action=save-score', {
    graduation_id: fakeGrad, employee_id: empId || fakeGrad, exam_score: 99,
  });
  assertBlocked('training save-score foreign graduation', r.status, r.json);

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

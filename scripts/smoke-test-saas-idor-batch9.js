#!/usr/bin/env node
/**
 * Cross-tenant IDOR Batch 9 — performance-360, training questions, OKR, candidate start-exam.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-idor-batch9.js
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
  console.log('SaaS IDOR Batch 9 smoke');
  console.log('Target:', BASE);

  const A = await signup('idor9-a', 'IDOR9 A');
  ok(`signup A ${A.slug}`);
  await login(A.email, [A.password]);
  const stamp = Date.now().toString(36);

  const emp = await api('POST', '/api/humanify/employees', {
    name: `Emp IDOR9 ${stamp}`, email: `emp9-${stamp}@contoh.test`, position: 'Staff', department: 'HR',
  });
  const empId = emp.json?.data?.id;
  if (empId) ok(`employee A ${empId}`);
  else fail('employee create', JSON.stringify(emp.json).slice(0, 160));

  let reviewId = null;
  let feedbackId = null;
  if (empId) {
    const rev = await api('POST', '/api/humanify/performance', {
      employeeId: empId,
      employeeName: `Emp IDOR9 ${stamp}`,
      reviewPeriod: '2026-H2',
      reviewType: 'mid_year',
    });
    reviewId = rev.json?.data?.id || rev.json?.data?.review?.id;
    if (reviewId) ok(`review A ${reviewId}`);
    else fail('review create', JSON.stringify(rev.json).slice(0, 160));

    if (reviewId) {
      const fb = await api('POST', '/api/humanify/performance-360', {
        reviewId, employeeId: empId, feedbackType: 'peer', rating: 4, comments: 'ok',
      });
      feedbackId = fb.json?.data?.id;
      if (feedbackId) ok(`feedback A ${feedbackId}`);
      else fail('feedback create', JSON.stringify(fb.json).slice(0, 160));
    }
  }

  const exam = await api('POST', '/api/humanify/training-development?action=create-exam', {
    title: `Exam IDOR9 ${stamp}`, status: 'open',
  });
  const examId = exam.json?.data?.id;
  if (examId) ok(`exam A ${examId}`);
  else fail('exam create', JSON.stringify(exam.json).slice(0, 160));

  let questionId = null;
  if (examId) {
    const q = await api('POST', '/api/humanify/training-development?action=create-question', {
      exam_id: examId, question_text: `Q ${stamp}`, options: [{ label: 'A', isCorrect: true }],
      correct_answer: 'A',
    });
    questionId = q.json?.data?.id;
    if (questionId) ok(`question A ${questionId}`);
    else fail('question create', JSON.stringify(q.json).slice(0, 160));
  }

  const okrTitle = `OKR IDOR9 ${stamp}`;
  const okr = await api('POST', '/api/humanify/okr', {
    title: okrTitle, level: 'company', period: 'Q3-2026',
    keyResults: [{ id: 'kr1', title: 'KR1', targetValue: 10, currentValue: 1, unit: 'x', weight: 1, confidence: 'on_track' }],
  });
  const okrId = okr.json?.data?.id;
  if (okrId) ok(`okr A ${okrId}`);
  else fail('okr create', JSON.stringify(okr.json).slice(0, 160));

  const B = await signup('idor9-b', 'IDOR9 B');
  ok(`signup B ${B.slug}`);
  await login(B.email, [B.password]);

  if (reviewId && empId) {
    const r = await api('POST', '/api/humanify/performance-360', {
      reviewId, employeeId: empId, feedbackType: 'peer', rating: 1, comments: 'hijack',
    });
    assertBlocked('performance-360 create cross-tenant', r.status, r.json);
  }
  if (feedbackId) {
    const r = await api('DELETE', `/api/humanify/performance-360?id=${feedbackId}`);
    assertBlocked('performance-360 delete cross-tenant', r.status, r.json);
  }
  if (questionId) {
    const r = await api('DELETE', `/api/humanify/training-development?action=delete-question&id=${questionId}`);
    assertBlocked('delete-question cross-tenant', r.status, r.json);
  }
  if (examId) {
    const r = await api('POST', '/api/humanify/training-development?action=create-question', {
      exam_id: examId, question_text: 'Hijack Q',
    });
    assertBlocked('create-question into foreign exam', r.status, r.json);
  }

  const list = await api('GET', '/api/humanify/okr');
  const leaked = Array.isArray(list.json?.data) && list.json.data.some((o) => o.id === okrId || o.title === okrTitle);
  if (!leaked) ok('okr list scoped (no leak)');
  else fail('okr list leak', `found ${okrTitle}`);

  // Candidate portal: register under B, try start A's exam
  if (examId) {
    const candEmail = `cand9-${stamp}@humanify.test`;
    const reg = await fetch(`${BASE}/api/candidate/auth?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: candEmail, password: 'CandTest1!', name: 'Cand B', slug: B.slug,
      }),
    });
    const regJ = await reg.json().catch(() => ({}));
    let token = regJ.token;
    if (!token && reg.ok) {
      const loginC = await fetch(`${BASE}/api/candidate/auth?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: candEmail, password: 'CandTest1!' }),
      });
      const lj = await loginC.json().catch(() => ({}));
      token = lj.token;
    }
    if (token) {
      ok('candidate B registered');
      const start = await fetch(`${BASE}/api/candidate/portal?action=start-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exam_id: examId }),
      });
      const sj = await start.json().catch(() => ({}));
      assertBlocked('candidate start-exam cross-tenant', start.status, sj);
    } else {
      fail('candidate register', JSON.stringify(regJ).slice(0, 160));
    }
  }

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

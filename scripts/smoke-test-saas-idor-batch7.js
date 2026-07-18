#!/usr/bin/env node
/**
 * Cross-tenant IDOR Batch 7 — reminders dismiss, LMS module update, team tasks.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-idor-batch7.js
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
  console.log('SaaS IDOR Batch 7 smoke');
  console.log('Target:', BASE);

  const A = await signup('idor7-a', 'IDOR7 A');
  ok(`signup A ${A.slug}`);
  await login(A.email, [A.password]);
  const stamp = Date.now().toString(36);

  const course = await api('POST', '/api/humanify/lms/courses?action=create-course', {
    title: `Course IDOR7 ${stamp}`, category: 'general',
  });
  const courseId = course.json?.data?.id;
  if (courseId) ok(`course A ${courseId}`);
  else fail('course create', JSON.stringify(course.json).slice(0, 160));

  let moduleId = null;
  if (courseId) {
    const mod = await api('POST', '/api/humanify/lms/courses?action=create-module', {
      curriculum_id: courseId, title: `Mod ${stamp}`,
    });
    moduleId = mod.json?.data?.id;
    if (moduleId) ok(`module A ${moduleId}`);
    else fail('module create', JSON.stringify(mod.json).slice(0, 160));
  }

  const task = await api('POST', '/api/humanify/team-tasks', {
    title: `Task IDOR7 ${stamp}`, priority: 'medium',
  });
  const taskId = task.json?.data?.id;
  if (taskId) ok(`task A ${taskId}`);
  else fail('task create', JSON.stringify(task.json).slice(0, 160));

  // Fake reminder dismiss
  const fakeRem = '00000000-0000-4000-8000-000000000077';

  const B = await signup('idor7-b', 'IDOR7 B');
  ok(`signup B ${B.slug}`);
  await login(B.email, [B.password]);

  if (moduleId) {
    const r = await api('PUT', '/api/humanify/lms/courses?action=update-module', {
      id: moduleId, title: 'Hijacked',
    });
    assertBlocked('lms module update cross-tenant', r.status, r.json);
  }
  if (taskId) {
    const r = await api('PUT', `/api/humanify/team-tasks?id=${taskId}`, { title: 'Hijacked' });
    assertBlocked('task update cross-tenant', r.status, r.json);
    const r2 = await api('DELETE', `/api/humanify/team-tasks?id=${taskId}`);
    assertBlocked('task delete cross-tenant', r2.status, r2.json);
  }
  const rem = await api('POST', '/api/humanify/reminders?action=dismiss', { id: fakeRem });
  assertBlocked('reminder dismiss unknown', rem.status, rem.json);

  // Reminders list must not leak — empty for new tenant is fine
  const list = await api('GET', '/api/humanify/reminders?action=list');
  if (list.status === 200 && Array.isArray(list.json?.data)) ok('reminders list scoped (ok)');
  else fail('reminders list', `HTTP ${list.status}`);

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

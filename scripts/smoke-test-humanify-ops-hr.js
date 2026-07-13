#!/usr/bin/env node
/**
 * Smoke + stress + workflow test — Humanify Operasional HR modules
 * Usage: node scripts/smoke-test-humanify-ops-hr.js
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean);
const UNIQUE = [...new Set(PASSWORDS)];
const STRESS_CONCURRENCY = parseInt(process.env.STRESS_CONCURRENCY || '20', 10);

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

  for (const pass of UNIQUE) {
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
      ok(`login as ${session.user.email}`);
      return session;
    }
  }
  throw new Error('Login failed');
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { res, json, text };
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200), _html: text.startsWith('<!') }; }
  return { res, json };
}

function expectPage(path, { res }) {
  if ([200, 307, 308].includes(res.status)) ok(`page ${path}`);
  else fail(`page ${path}`, `HTTP ${res.status}`);
}

function expectApi(name, { res, json }, statuses = [200]) {
  if (!statuses.includes(res.status)) {
    fail(name, `HTTP ${res.status}${json.error ? ': ' + json.error : json._html ? ' (HTML)' : ''}`);
    return false;
  }
  if (json.success === false && json.error) {
    fail(name, json.error);
    return false;
  }
  ok(name);
  return true;
}

const OPS_PAGES = [
  '/humanify/team-members',
  '/humanify/tasks',
  '/humanify/activities',
  '/humanify/mutations',
  '/humanify/travel-expense',
  '/humanify/project-management',
  '/humanify/industrial-relations',
  '/humanify/disciplinary-letters',
];

const OPS_API_READS = [
  ['team-members list', 'GET', '/api/humanify/team-members?limit=10'],
  ['team-members search', 'GET', '/api/humanify/team-members?search=a&limit=5'],
  ['team-tasks list', 'GET', '/api/humanify/team-tasks?limit=10'],
  ['team-tasks filter', 'GET', '/api/humanify/team-tasks?status=pending&limit=5'],
  ['activities list', 'GET', '/api/humanify/activities?limit=20'],
  ['activities filter', 'GET', '/api/humanify/activities?type=leave_request&limit=5'],
  ['workflow summary', 'GET', '/api/humanify/workflow?action=summary'],
  ['workflow mutations', 'GET', '/api/humanify/workflow?action=mutations'],
  ['workflow claims', 'GET', '/api/humanify/workflow?action=claims'],
  ['workflow approval-config', 'GET', '/api/humanify/workflow?action=approval-config'],
  ['travel overview', 'GET', '/api/humanify/travel-expense?action=overview'],
  ['travel requests', 'GET', '/api/humanify/travel-expense?action=requests'],
  ['travel expenses', 'GET', '/api/humanify/travel-expense?action=expenses'],
  ['travel budgets', 'GET', '/api/humanify/travel-expense?action=budgets'],
  ['project overview', 'GET', '/api/humanify/project-management?action=overview'],
  ['project list', 'GET', '/api/humanify/project-management?action=projects'],
  ['project workers', 'GET', '/api/humanify/project-management?action=workers'],
  ['project timesheets', 'GET', '/api/humanify/project-management?action=timesheets'],
  ['project payroll', 'GET', '/api/humanify/project-management?action=payroll'],
  ['project documents', 'GET', '/api/humanify/project-documents?action=templates'],
  ['ir overview', 'GET', '/api/humanify/industrial-relations?action=overview'],
  ['ir regulations', 'GET', '/api/humanify/industrial-relations?action=regulations'],
  ['ir warnings', 'GET', '/api/humanify/industrial-relations?action=warnings'],
  ['ir cases', 'GET', '/api/humanify/industrial-relations?action=cases'],
  ['ir terminations', 'GET', '/api/humanify/industrial-relations?action=terminations'],
  ['ir checklists', 'GET', '/api/humanify/industrial-relations?action=checklists'],
  ['disciplinary summary', 'GET', '/api/humanify/disciplinary-letters?action=summary'],
  ['disciplinary list', 'GET', '/api/humanify/disciplinary-letters?action=list'],
  ['disciplinary sop', 'GET', '/api/humanify/disciplinary-letters?action=sop-templates'],
  ['master-data', 'GET', '/api/humanify/master-data'],
  ['employee list', 'GET', '/api/humanify/employee-profile?action=list&limit=5'],
];

const STRESS_ENDPOINTS = [
  '/api/humanify/team-members?limit=5',
  '/api/humanify/team-tasks?limit=5',
  '/api/humanify/activities?limit=10',
  '/api/humanify/workflow?action=mutations',
  '/api/humanify/travel-expense?action=overview',
  '/api/humanify/project-management?action=overview',
  '/api/humanify/industrial-relations?action=overview',
  '/api/humanify/disciplinary-letters?action=summary',
];

async function workflowTests() {
  console.log('\n── Workflow / Business Flow ──');

  // Create team task
  const taskRes = await api('POST', '/api/humanify/team-tasks', {
    title: `Smoke Task ${Date.now()}`,
    description: 'Automated ops HR smoke test',
    priority: 'medium',
    status: 'pending',
    taskType: 'general',
    category: 'hr_ops',
  });
  if (expectApi('workflow: create task', taskRes, [200, 201])) {
    const taskId = taskRes.json.data?.id;
    if (taskId) {
      const upd = await api('PUT', `/api/humanify/team-tasks?id=${taskId}`, { status: 'in_progress' });
      expectApi('workflow: update task status', upd);
      const del = await api('DELETE', `/api/humanify/team-tasks?id=${taskId}`);
      expectApi('workflow: delete task', del);
    }
  }

  // Log activity
  const actRes = await api('POST', '/api/humanify/activities', {
    activityType: 'hr_ops',
    title: 'Smoke test aktivitas HR Ops',
    description: 'Workflow test dari smoke script',
    entityType: 'task',
    entityId: 'smoke-test',
  });
  expectApi('workflow: create activity', actRes, [200, 201]);

  // Disciplinary draft (if employee exists)
  const empRes = await get('/api/humanify/employee-profile?action=list&limit=1');
  const emp = empRes.json?.data?.[0];
  if (emp?.id) {
    const letterRes = await api('POST', '/api/humanify/disciplinary-letters?action=create', {
      employee_id: emp.id,
      letter_type: 'sp1',
      violation_date: new Date().toISOString().split('T')[0],
      violation_description: 'Smoke test — jangan diproses',
      notes: 'AUTO SMOKE TEST',
    });
    if (letterRes.res.status === 200 || letterRes.res.status === 201) {
      ok('workflow: create disciplinary draft');
      const letterId = letterRes.json.data?.id;
      if (letterId) {
        const cancel = await api('POST', `/api/humanify/disciplinary-letters?action=cancel&id=${letterId}`, {});
        if (cancel.res.status === 200) ok('workflow: cancel disciplinary draft');
        else fail('workflow: cancel disciplinary draft', `HTTP ${cancel.res.status}`);
      }
    } else {
      fail('workflow: create disciplinary draft', `HTTP ${letterRes.res.status}: ${letterRes.json.error || ''}`);
    }
  } else {
    ok('workflow: disciplinary skip (no employee in DB)');
  }
}

async function stressTest() {
  console.log(`\n── Stress Test (${STRESS_CONCURRENCY} rounds × ${STRESS_ENDPOINTS.length} endpoints) ──`);
  const start = Date.now();
  const results = [];
  const batchSize = 8;
  for (let round = 0; round < STRESS_CONCURRENCY; round++) {
    for (let i = 0; i < STRESS_ENDPOINTS.length; i += batchSize) {
      const batch = STRESS_ENDPOINTS.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((ep) =>
          fetch(`${BASE}${ep}`, { headers: { Cookie: COOKIE } })
            .then((r) => ({ ep, status: r.status, ok: r.ok }))
            .catch((e) => ({ ep, status: 0, ok: false, err: e.message }))
        )
      );
      results.push(...batchResults);
    }
  }
  const elapsed = Date.now() - start;
  const errors = results.filter((r) => !r.ok || r.status >= 500);
  const rate = (results.length / (elapsed / 1000)).toFixed(1);
  if (errors.length === 0) {
    ok(`stress: ${results.length} requests in ${elapsed}ms (${rate} req/s, 0 errors)`);
  } else {
    fail(`stress: ${errors.length}/${results.length} failed`, errors.slice(0, 3).map((e) => `${e.ep}→${e.status}`).join(', '));
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Humanify Operasional HR — Smoke/Stress/Flow');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Base: ${BASE}\n`);

  await login();

  console.log('\n── Pages ──');
  for (const p of OPS_PAGES) {
    expectPage(p, await get(p));
  }

  console.log('\n── API Reads ──');
  for (const [name, method, path] of OPS_API_READS) {
    const result = await api(method, path);
    expectApi(name, result);
  }

  await workflowTests();
  await stressTest();

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  PASSED: ${passed}  FAILED: ${failed}`);
  if (failures.length) {
    console.log('\n  Failures:');
    failures.forEach((f) => console.log('   -', f));
  }
  console.log('═══════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});

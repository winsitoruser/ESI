#!/usr/bin/env node
/**
 * Smoke + stress test — Manager SP request → HR investigation workflow
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-sp-manager-workflow.js
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASS = process.env.SMOKE_PASSWORD || 'superadmin123';
const STRESS_ROUNDS = parseInt(process.env.STRESS_ROUNDS || '5', 10);

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
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, json: 'true' }),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || [])
    .filter((c) => c.includes('next-auth'))
    .map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  COOKIE = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  if (!session?.user?.email) throw new Error('Login failed');
  ok(`login as ${session.user.email}`);
  return session;
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { res, json };
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { res, json };
}

async function runWorkflowSmoke() {
  console.log('\n── SP Manager Workflow Smoke ──');

  const pages = [
    ['/employee/login', [200, 307]],
    ['/humanify/disciplinary-letters', [200, 307]],
  ];
  for (const [path, expect] of pages) {
    const { res } = await get(path);
    const codes = Array.isArray(expect) ? expect : [expect];
    if (codes.includes(res.status)) ok(`GET ${path} → ${res.status}`);
    else fail(`GET ${path}`, `HTTP ${res.status}`);
  }

  const sum = await get('/api/humanify/disciplinary-letters?action=summary');
  if (sum.res.status === 200 && sum.json.success) {
    ok(`summary API (managerRequests=${sum.json.data?.managerRequests ?? '?'})`);
  } else fail('summary API', `HTTP ${sum.res.status}`);

  const list = await get('/api/humanify/disciplinary-letters?action=list&request_source=manager_portal');
  if (list.res.status === 200 && list.json.success !== false) {
    ok(`list manager_portal (${(list.json.data || []).length} rows)`);
  } else fail('list manager_portal', list.json.error || `HTTP ${list.res.status}`);

  const mgrTeam = await get('/api/employee/manager?action=team');
  if (mgrTeam.res.status === 200 && mgrTeam.json.success) {
    ok(`manager team API (${(mgrTeam.json.data || []).length} members)`);
  } else fail('manager team API', mgrTeam.json.error || `HTTP ${mgrTeam.res.status}`);

  const employees = mgrTeam.json.data || [];
  if (employees.length > 0) {
    const emp = employees[0];
    const create = await post('/api/employee/manager?action=create-disciplinary', {
      employee_id: emp.id,
      letter_type: 'SP1',
      violation_type: 'discipline',
      violation_description: `[SMOKE TEST] Pelanggaran disiplin — ${new Date().toISOString()}`,
      incident_date: new Date().toISOString().split('T')[0],
      request_reason: 'Smoke test permohonan SP dari manajer',
      notes: 'Automated smoke test — safe to reject',
      attachments: [{ name: 'smoke-evidence.txt', type: 'text/plain', data: 'data:text/plain;base64,c21va2UgdGVzdA==' }],
    });
    if (create.res.status === 200 && create.json.success) {
      ok(`create-disciplinary → status=${create.json.data?.status}`);
      const letterId = create.json.data?.id;

      if (letterId) {
        const startInv = await post('/api/humanify/disciplinary-letters?action=start-investigation', {
          id: letterId,
          investigation_notes: 'Smoke test investigasi HR',
        });
        if (startInv.res.status === 200 && startInv.json.success) {
          ok('start-investigation');
        } else fail('start-investigation', startInv.json.error || `HTTP ${startInv.res.status}`);

        const completeInv = await post('/api/humanify/disciplinary-letters?action=complete-investigation', {
          id: letterId,
          investigation_notes: 'Smoke test investigasi selesai',
        });
        if (completeInv.res.status === 200 && completeInv.json.success) {
          ok('complete-investigation');
        } else fail('complete-investigation', completeInv.json.error || `HTTP ${completeInv.res.status}`);

        const reject = await post('/api/humanify/disciplinary-letters?action=reject', {
          id: letterId,
          comments: 'Smoke test cleanup — ditolak otomatis',
        });
        if (reject.res.status === 200 && reject.json.success) {
          ok('reject (cleanup)');
        } else fail('reject cleanup', reject.json.error);
      }
    } else {
      fail('create-disciplinary', create.json.error || `HTTP ${create.res.status}`);
    }
  } else {
    ok('create-disciplinary skipped (no team members)');
  }
}

async function runStress() {
  console.log(`\n── Stress test (${STRESS_ROUNDS} parallel summary calls) ──`);
  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: STRESS_ROUNDS }, () => get('/api/humanify/disciplinary-letters?action=summary')),
  );
  const elapsed = Date.now() - start;
  const allOk = results.every((r) => r.res.status === 200 && r.json.success);
  if (allOk) ok(`${STRESS_ROUNDS} parallel summary in ${elapsed}ms`);
  else fail('stress summary', `${results.filter((r) => r.res.status !== 200).length} failures`);
}

async function main() {
  console.log(`SP Workflow Smoke Test — ${BASE}`);
  try {
    await login();
    await runWorkflowSmoke();
    await runStress();
  } catch (e) {
    fail('fatal', e.message);
  }

  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  -', f));
    process.exit(1);
  }
  console.log('\nAll tests passed ✓');
}

main();

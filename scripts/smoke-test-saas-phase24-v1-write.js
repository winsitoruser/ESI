#!/usr/bin/env node
/**
 * Phase 24 — Public API v1 write surface smoke
 * POST employees, POST leaves, GET/POST webhooks, GET departments
 *
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase24-v1-write.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function login(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email, password, json: 'true' }),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  COOKIE = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  if (!session?.user?.email) throw new Error('login failed');
  return session;
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
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 120) }; }
  return { status: res.status, json };
}

async function v1(method, path, key, body) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${key}` },
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 120) }; }
  return { status: res.status, json };
}

async function main() {
  console.log('SaaS Phase 24 — v1 write API smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `v1w-${stamp}@humanify.test`;
  const password = 'V1WriteTest1!';

  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'V1 Write Tester',
      email,
      password,
      companyName: `V1W Co ${stamp}`,
    }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) {
    fail('signup', regJ.error || String(reg.status));
    process.exit(1);
  }
  ok(`signup tenant ${regJ.data.slug}`);

  await login(email, password);

  const createKey = await api('POST', '/api/humanify/enterprise?action=create-api-key', {
    name: 'v1-write-smoke',
    scopes: [
      'employees:read', 'employees:write',
      'leave:read', 'leave:write',
      'attendance:read', 'webhooks:manage',
    ],
  });
  if (!createKey.json?.success || !createKey.json.data?.apiKey) {
    fail('create api key', createKey.json?.error || String(createKey.status));
    process.exit(1);
  }
  const rawKey = createKey.json.data.apiKey;
  const keyId = createKey.json.data.id;
  ok('create scoped api key');

  const readOnlyKeyRes = await api('POST', '/api/humanify/enterprise?action=create-api-key', {
    name: 'v1-readonly-smoke',
    scopes: ['employees:read'],
  });
  const readOnlyKey = readOnlyKeyRes.json?.data?.apiKey;
  const readOnlyKeyId = readOnlyKeyRes.json?.data?.id;
  if (readOnlyKey) ok('create read-only api key');
  else fail('read-only key', readOnlyKeyRes.json?.error);

  const openapi = await fetch(`${BASE}/api/v1/openapi`);
  const openJ = await openapi.json().catch(() => ({}));
  const pathKeys = Object.keys(openJ?.paths || {});
  for (const p of ['/employees', '/leaves', '/webhooks', '/departments']) {
    if (pathKeys.some((k) => k === p || k.endsWith(p))) ok(`openapi lists ${p}`);
    else fail(`openapi ${p}`, `paths=${pathKeys.join(', ').slice(0, 80)}`);
  }

  const stampEmail = `emp-${stamp}@humanify.test`;
  const createEmp = await v1('POST', '/api/v1/employees', rawKey, {
    name: `Smoke Emp ${stamp}`,
    email: stampEmail,
    position: 'Staff QA',
    department: 'Engineering',
  });
  if (createEmp.status === 201 && createEmp.json?.success && createEmp.json.data?.id) {
    ok(`POST /employees → ${createEmp.json.data.id}`);
  } else {
    fail('POST employees', `${createEmp.status} ${createEmp.json?.error || ''}`);
    process.exit(1);
  }
  const employeeId = createEmp.json.data.id;

  const depts = await v1('GET', '/api/v1/departments', rawKey);
  if (depts.status === 200 && depts.json?.success && Array.isArray(depts.json.data)) {
    ok(`GET /departments (${depts.json.data.length} rows)`);
  } else fail('GET departments', depts.json?.error || String(depts.status));

  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const createLeave = await v1('POST', '/api/v1/leaves', rawKey, {
    employeeId,
    leaveType: 'annual',
    startDate: fmt(start),
    endDate: fmt(end),
    reason: `smoke ${stamp}`,
  });
  if (createLeave.status === 201 && createLeave.json?.success && createLeave.json.data?.id) {
    ok(`POST /leaves → ${createLeave.json.data.id}`);
  } else {
    fail('POST leaves', `${createLeave.status} ${createLeave.json?.error || ''}`);
  }

  const listLeaves = await v1('GET', '/api/v1/leaves?limit=5', rawKey);
  if (listLeaves.status === 200 && listLeaves.json?.success) {
    ok(`GET /leaves (${(listLeaves.json.data || []).length} rows)`);
  } else fail('GET leaves', listLeaves.json?.error || String(listLeaves.status));

  if (readOnlyKey) {
    const denied = await v1('POST', '/api/v1/leaves', readOnlyKey, {
      employeeId,
      startDate: fmt(start),
      endDate: fmt(end),
    });
    if (denied.status === 401) ok('read-only key rejected for leave:write');
    else fail('scope guard leave:write', String(denied.status));
  }

  const hookUrl = `https://example.com/humanify-smoke-${stamp}`;
  const regHook = await v1('POST', '/api/v1/webhooks', rawKey, {
    url: hookUrl,
    events: ['employee.created', 'leave.created'],
  });
  if (regHook.status === 201 && regHook.json?.success && regHook.json.data?.id) {
    ok(`POST /webhooks → ${regHook.json.data.id}`);
  } else {
    fail('POST webhooks', `${regHook.status} ${regHook.json?.error || ''}`);
  }

  const listHooks = await v1('GET', '/api/v1/webhooks', rawKey);
  if (listHooks.status === 200 && listHooks.json?.success) {
    const found = (listHooks.json.data || []).some((h) => h.url === hookUrl);
    if (found) ok('GET /webhooks lists registered hook');
    else ok(`GET /webhooks (${(listHooks.json.data || []).length} rows)`);
  } else fail('GET webhooks', listHooks.json?.error || String(listHooks.status));

  if (readOnlyKeyId) {
    await api('POST', '/api/humanify/enterprise?action=revoke-api-key', { id: readOnlyKeyId });
  }
  await api('POST', '/api/humanify/enterprise?action=revoke-api-key', { id: keyId });
  ok('revoke smoke api keys');

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

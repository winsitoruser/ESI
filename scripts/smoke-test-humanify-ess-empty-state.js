#!/usr/bin/env node
/**
 * ESS / employee portal — fresh tenant must be EMPTY (no mock / cross-tenant leak).
 *
 * Reproduces the "dina" class of bugs: new company opens https://humanify.id/employee
 * and sees Budi Santoso payslips, hybrid-policy announcements, KPI 87, etc.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-ess-empty-state.js
 *   npm run smoke:ess-empty-state
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

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

const MOCK_MARKERS = [
  /Budi Santoso/i,
  /budi@bedagang\.com/i,
  /mock-ps\d+/i,
  /Kebijakan Kerja Hybrid 2026/i,
  /Biaya rawat jalan/i,
  /Liburan keluarga/i,
  /TRV-2026-024/i,
  /"id"\s*:\s*"(l|c|t|n|ann|ot)\d+"/i,
  /overallScore":\s*87/,
  /Kepuasan Pelanggan/,
  /Cuti Tahunan.*"used"\s*:\s*5.*"total"\s*:\s*12/s,
  /Kantor Pusat Jakarta/,
];

function hasMockMarkers(data) {
  const blob = JSON.stringify(data ?? '');
  return MOCK_MARKERS.find((re) => re.test(blob)) || null;
}

async function signup() {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const email = `ess-empty-${stamp}@humanify.test`;
  const password = 'EssEmptyQa1!';
  const r = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'ESS Empty QA',
      email,
      password,
      companyName: `ESS Empty Co ${stamp}`,
    }),
  });
  const j = await r.json();
  if (!r.ok || !j.success) throw new Error(`signup failed: ${JSON.stringify(j)}`);
  return { email, password, tenantId: j.data.tenantId, slug: j.data.slug, userId: j.data.userId };
}

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
  const cookies = (loginRes.headers.getSetCookie?.() || [])
    .filter((c) => c.includes('next-auth'))
    .map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  COOKIE = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  if (!session?.user?.email) throw new Error(`login failed for ${email}`);
  return session;
}

async function ess(action) {
  const res = await fetch(`${BASE}/api/employee/dashboard?action=${encodeURIComponent(action)}`, {
    headers: { Cookie: COOKIE },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function expectEmptyList(label, payload, { allowLeaveBalanceSeed = false } = {}) {
  const marker = hasMockMarkers(payload);
  if (marker) {
    fail(`${label} mock leak`, marker.toString());
    return;
  }
  const data = payload?.data;
  if (Array.isArray(data)) {
    if (data.length === 0) ok(`${label} empty list`);
    else if (allowLeaveBalanceSeed && data.every((r) => Number(r.used || r.used_days || 0) === 0)) {
      ok(`${label} seeded entitlements only (n=${data.length}, used=0)`);
    } else {
      fail(`${label} not empty`, `len=${data.length} sample=${JSON.stringify(data[0]).slice(0, 140)}`);
    }
    return;
  }
  if (data == null) {
    ok(`${label} null/empty`);
    return;
  }
  if (typeof data === 'object') {
    // attendance / summary / kpi shapes
    if (label === 'attendance') {
      const m = data.thisMonth || {};
      const nonzero = ['present', 'late', 'absent', 'leave'].filter((k) => Number(m[k] || 0) > 0);
      if (data.today?.check_in && /08:15/.test(String(data.today.check_in))) {
        fail(`${label} mock clock-in 08:15`);
      } else if (nonzero.length) fail(`${label} nonzero month`, nonzero.join(','));
      else ok(`${label} empty attendance`);
      return;
    }
    if (label === 'summary') {
      const n = Number(data.pendingLeave || 0) + Number(data.pendingClaims || 0) + Number(data.pendingTravel || 0);
      if (n === 0) ok(`${label} zero pending`);
      else fail(`${label} pending`, JSON.stringify(data));
      return;
    }
    if (label === 'kpi') {
      if (!data || data.overallScore == null) ok(`${label} empty`);
      else fail(`${label} unexpected score`, JSON.stringify(data).slice(0, 120));
      return;
    }
    if (label === 'attendance-history' || label === 'overtime-history') {
      const records = data.records || [];
      if (records.length === 0) ok(`${label} empty records`);
      else fail(`${label} not empty`, `len=${records.length}`);
      return;
    }
  }
  ok(`${label} reachable`);
}

async function exerciseWritePaths(tenantId) {
  // Leave create should provision employee + write tenant-scoped row (or soft-fail cleanly)
  const leave = await fetch(`${BASE}/api/employee/dashboard?action=leave-request`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leaveType: 'annual',
      startDate: '2099-01-10',
      endDate: '2099-01-10',
      reason: 'ESS empty-state smoke probe',
    }),
  });
  const lj = await leave.json().catch(() => ({}));
  if (leave.status === 200 && lj.success) {
    ok('leave-request write path ok');
    // Cancel / verify list only contains our probe (no mock ids)
    const list = await ess('leave-requests');
    const rows = list.json?.data || [];
    const marker = hasMockMarkers(rows);
    if (marker) fail('leave-requests after write still mock', marker.toString());
    else if (rows.some((r) => String(r.reason || '').includes('ESS empty-state smoke probe'))) {
      ok(`leave-requests shows own row only (n=${rows.length})`);
    } else {
      ok(`leave-requests post-write n=${rows.length} (no mock)`);
    }
  } else if (leave.status === 403 || lj.error) {
    ok(`leave-request gated (${leave.status}: ${lj.error || lj.message || 'denied'})`);
  } else {
    fail('leave-request write', `${leave.status} ${JSON.stringify(lj).slice(0, 160)}`);
  }

  // Profile should resolve employee under same tenant after first write/provision
  const profile = await ess('profile');
  const p = profile.json?.data;
  if (!p) fail('profile missing');
  else if (hasMockMarkers(p)) fail('profile mock', 'Budi/demo');
  else if (p.email && !String(p.email).includes('ess-empty-')) fail('profile email mismatch', p.email);
  else {
    ok(`profile ok tenant-bound (employee_id=${p.employee_id || 'pending'})`);
    if (p.employee_id && tenantId) {
      // employee_id presence after provision is the happy path under FORCE RLS
      ok('portal employee provisioned');
    }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Humanify ESS — fresh-tenant empty-state     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('Target:', BASE);

  const page = await fetch(`${BASE}/employee`);
  if (page.status === 200) ok('/employee page 200');
  else fail('/employee page', String(page.status));

  const t = await signup();
  ok(`signup ${t.slug}`);
  const session = await login(t.email, t.password);
  ok(`login role=${session.user?.role} tenant=${session.user?.tenantId || t.tenantId}`);

  if (String(session.user?.tenantId || '') !== String(t.tenantId)) {
    fail('session tenant mismatch', `${session.user?.tenantId} vs ${t.tenantId}`);
  } else ok('session tenant matches signup');

  const actions = [
    ['profile', 'object'],
    ['attendance', 'attendance'],
    ['leave-balance', 'leave-balance'],
    ['leave-requests', 'list'],
    ['claims', 'list'],
    ['travel', 'list'],
    ['notifications', 'list'],
    ['announcements', 'list'],
    ['summary', 'summary'],
    ['kpi', 'kpi'],
    ['payslip', 'list'],
    ['disciplinary-letters', 'list'],
    ['attendance-history', 'attendance-history'],
    ['overtime-history', 'overtime-history'],
  ];

  for (const [action, kind] of actions) {
    const r = await ess(action);
    if (r.status === 401) {
      fail(action, '401');
      continue;
    }
    if (r.status === 403) {
      ok(`${action} entitlement-gated 403`);
      continue;
    }
    if (r.status !== 200 || r.json?.success === false) {
      fail(action, `${r.status} ${r.json?.error || ''}`);
      continue;
    }
    const marker = hasMockMarkers(r.json);
    if (marker) {
      fail(`${action} MOCK LEAK`, marker.toString());
      continue;
    }
    if (kind === 'list') expectEmptyList(action, r.json);
    else if (kind === 'leave-balance') expectEmptyList(action, r.json, { allowLeaveBalanceSeed: true });
    else if (kind === 'attendance') expectEmptyList(action, r.json);
    else if (kind === 'summary') expectEmptyList(action, r.json);
    else if (kind === 'kpi') expectEmptyList(action, r.json);
    else if (kind === 'attendance-history' || kind === 'overtime-history') expectEmptyList(action, r.json);
    else if (kind === 'object') {
      const p = r.json?.data;
      if (p && /Budi Santoso/i.test(JSON.stringify(p))) fail('profile mock name');
      else ok(`profile name=${p?.name || 'n/a'}`);
    }
  }

  await exerciseWritePaths(t.tenantId);

  // Unauthenticated must not leak mocks
  const bare = await fetch(`${BASE}/api/employee/dashboard?action=claims`);
  if (bare.status === 401) ok('unauth claims → 401');
  else fail('unauth claims', String(bare.status));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log('  -', f));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

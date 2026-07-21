#!/usr/bin/env node
/**
 * Focused QA for People Ops / Attendance / Performance / Payroll / Talent pages.
 *
 * Covers formal types lightly in one harness:
 *   Smoke · Sanity · Retest · API · UI · DB-probe · Exploratory · Ad-hoc
 *
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id \
 *   SMOKE_EMAIL=… SMOKE_PASSWORD=… \
 *   node scripts/smoke-test-humanify-module-pages.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const failList = [];
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { const x = d ? `${m} — ${d}` : m; console.log('  ✗', x); failList.push(x); failed++; };

const PAGES = [
  '/humanify/employees',
  '/humanify/employees-import',
  '/humanify/organization',
  '/humanify/onboarding',
  '/humanify/offboarding',
  '/humanify/contracts',
  '/humanify/assets',
  '/humanify/org-settings',
  '/humanify/ess',
  '/humanify/mss',
  '/humanify/attendance',
  '/humanify/attendance-management',
  '/humanify/attendance/daily',
  '/humanify/attendance/devices',
  '/humanify/attendance/settings',
  '/humanify/leave',
  '/humanify/okr',
  '/humanify/kpi',
  '/humanify/kpi-settings',
  '/humanify/performance',
  '/humanify/payroll',
  '/humanify/payroll/main',
  '/humanify/payroll/slip-gaji',
  '/humanify/payroll/thr',
  '/humanify/payroll/pph21',
  '/humanify/payroll/bpjs',
  '/humanify/payroll/lembur',
  '/humanify/payroll/bonus',
  '/humanify/payroll/cash-advance',
  '/humanify/payroll/loan',
  '/humanify/payroll/laporan',
  '/humanify/payroll/disbursement',
  '/humanify/reimbursement',
  '/humanify/casual-workforce',
  '/humanify/recruitment',
  '/careers',
  '/humanify/lms',
];

const API_PROBES = [
  { label: 'employees list', path: '/api/humanify/employee-profile?action=list&limit=5', expect: (j) => Array.isArray(j.data) || Array.isArray(j.employees) || j.success === true },
  { label: 'org summary', path: '/api/humanify/organization?action=summary', expect: (j) => j.success && j.data && (j.data.totalUnits != null || j.data.orgUnits != null) },
  { label: 'org tree', path: '/api/humanify/organization?action=org-tree', expect: (j) => j.success && Array.isArray(j.data) },
  { label: 'job grades', path: '/api/humanify/organization?action=job-grades', expect: (j) => j.success && Array.isArray(j.data) },
  { label: 'leave list', path: '/api/humanify/leave', expect: (j, s) => s < 500 },
  { label: 'attendance overview', path: '/api/humanify/attendance-management?action=overview', expect: (j, s) => s < 500 },
  { label: 'payroll', path: '/api/humanify/payroll', expect: (j, s) => s < 500 },
  { label: 'recruitment', path: '/api/humanify/recruitment', expect: (j, s) => s < 500 },
  { label: 'performance', path: '/api/humanify/performance', expect: (j, s) => s < 500 },
  { label: 'kpi', path: '/api/humanify/kpi', expect: (j, s) => s < 500 },
  { label: 'okr', path: '/api/humanify/okr', expect: (j, s) => s < 500 },
  { label: 'assets', path: '/api/humanify/assets', expect: (j, s) => s < 500 },
  { label: 'contracts', path: '/api/humanify/lifecycle?action=contracts', expect: (j, s) => s < 500 && j.success !== false },
  { label: 'onboarding', path: '/api/humanify/lifecycle?action=onboarding', expect: (j, s) => s < 500 && j.success !== false },
  { label: 'offboarding', path: '/api/humanify/lifecycle?action=offboarding', expect: (j, s) => s < 500 },
  { label: 'reimbursement', path: '/api/humanify/workflow?action=claims', expect: (j, s) => s < 500 && j.success !== false },
  { label: 'lms courses', path: '/api/humanify/lms?action=courses', expect: (j, s) => s < 500 },
  { label: 'health deep', path: '/api/health?deep=1', auth: false, expect: (j) => j.status === 'ok' && j.db === true },
];

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) cookies.push(csrfCookie);
    COOKIE = cookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error('login failed');
}

function analyzeHtml(html, route) {
  const issues = [];
  const lower = html.toLowerCase();
  if (/\/humanify\/login/.test(html) && route !== '/careers' && /selamat datang|masuk ke akun/.test(lower) && !/humanify-layout|hq-layout|sidebar/.test(lower)) {
    issues.push('looks like login redirect');
  }
  if (/application error|internal server error|__next_error__|chunkloaderror/.test(lower)) {
    issues.push('error overlay/text in page');
  }
  if (html.length < 800 && route !== '/careers') {
    issues.push(`suspiciously short html (${html.length}b)`);
  }
  return issues;
}

async function fetchPage(route) {
  const res = await fetch(`${BASE}${route}`, {
    headers: { Cookie: COOKIE, Accept: 'text/html' },
    redirect: 'follow',
  });
  const html = await res.text();
  return { status: res.status, html, finalUrl: res.url };
}

async function main() {
  console.log('══════════════════════════════════════════════════');
  console.log(' Humanify Module Pages QA');
  console.log(' Target:', BASE);
  console.log(' Pages:', PAGES.length);
  console.log('══════════════════════════════════════════════════');

  // ── Smoke: health + login ──
  console.log('\n── Smoke ──');
  const health = await (await fetch(`${BASE}/api/health?deep=1`)).json();
  if (health.status === 'ok') ok('health deep');
  else fail('health deep', JSON.stringify(health).slice(0, 120));

  const session = await login();
  ok(`login as ${session.user.email}`);

  // ── UI / Smoke: page crawl ──
  console.log('\n── UI page load ──');
  const pageMeta = {};
  for (const route of PAGES) {
    try {
      const { status, html, finalUrl } = await fetchPage(route);
      pageMeta[route] = { status, bytes: html.length };
      if (status >= 500) {
        fail(`${route}`, `HTTP ${status}`);
        continue;
      }
      if (status === 404) {
        fail(`${route}`, '404');
        continue;
      }
      const issues = analyzeHtml(html, route);
      // Public careers may be unauthenticated marketing — OK
      if (route === '/careers') {
        if (status < 400) ok(`${route} → ${status}`);
        else fail(route, `HTTP ${status}`);
        continue;
      }
      if (/\/humanify\/login/.test(finalUrl) || issues.includes('looks like login redirect')) {
        fail(route, 'auth redirect to login');
        continue;
      }
      if (issues.length) fail(route, issues.join('; '));
      else ok(`${route} → ${status} (${html.length}b)`);
    } catch (e) {
      fail(route, e.message);
    }
  }

  // ── Sanity / Retest: organization summary keys ──
  console.log('\n── Retest organization summary ──');
  try {
    const res = await fetch(`${BASE}/api/humanify/organization?action=summary`, { headers: { Cookie: COOKIE } });
    const j = await res.json();
    if (!j.success) fail('org summary success', j.error || String(res.status));
    else {
      ok('org summary success');
      const d = j.data || {};
      if (d.totalUnits != null && d.totalGrades != null && d.totalEmployees != null && d.totalDepartments != null) {
        ok(`org summary keys totalUnits=${d.totalUnits} grades=${d.totalGrades} emp=${d.totalEmployees} dept=${d.totalDepartments}`);
      } else {
        fail('org summary keys', `got ${Object.keys(d).join(',')}`);
      }
    }
  } catch (e) {
    fail('org summary', e.message);
  }

  // ── API ──
  console.log('\n── API probes ──');
  for (const probe of API_PROBES) {
    try {
      const headers = probe.auth === false ? {} : { Cookie: COOKIE, Accept: 'application/json' };
      const res = await fetch(`${BASE}${probe.path}`, { headers });
      let j = {};
      try { j = await res.json(); } catch { j = {}; }
      if (probe.expect(j, res.status)) ok(`api ${probe.label} → ${res.status}`);
      else fail(`api ${probe.label}`, `HTTP ${res.status} ${JSON.stringify(j).slice(0, 140)}`);
    } catch (e) {
      fail(`api ${probe.label}`, e.message);
    }
  }

  // ── Ad-hoc: concurrent page GETs ──
  console.log('\n── Ad-hoc concurrent pages ──');
  const sample = PAGES.filter((p) => p !== '/careers').slice(0, 12);
  const t0 = Date.now();
  const results = await Promise.all(sample.map(async (route) => {
    const res = await fetch(`${BASE}${route}`, { headers: { Cookie: COOKIE, Accept: 'text/html' } });
    return { route, status: res.status };
  }));
  const bad = results.filter((r) => r.status >= 500);
  if (bad.length) fail('concurrent pages', bad.map((b) => `${b.route}:${b.status}`).join(', '));
  else ok(`concurrent ${sample.length} pages — 0×5xx (${Date.now() - t0}ms)`);

  // ── Exploratory: page shell is a real Next/Humanify app (CSR pages OK) ──
  console.log('\n── Exploratory content markers ──');
  const markerRoutes = [
    '/humanify/employees',
    '/humanify/organization',
    '/humanify/leave',
    '/humanify/payroll/main',
    '/humanify/attendance',
    '/humanify/recruitment',
    '/humanify/lms',
  ];
  for (const route of markerRoutes) {
    try {
      const { html, status } = await fetchPage(route);
      if (status >= 400) { fail(`markers ${route}`, `HTTP ${status}`); continue; }
      const hasNext = /__NEXT_DATA__|_next\/static|id="__next"/i.test(html);
      const hasApp = /humanify|naincode|hq-layout|sidebar/i.test(html);
      const hasTable = /<table|role="table"|data-table|DataTable/i.test(html);
      const hasForm = /<form|type="submit"|Tambah|Add |Create |Import/i.test(html);
      const hasTab = /role="tab"|border-b-2|activeTab|tab-/i.test(html);
      if (hasNext || hasApp || hasTable || hasForm || hasTab) {
        ok(`markers ${route} next=${hasNext} app=${hasApp} table=${hasTable} form=${hasForm} tab=${hasTab}`);
      } else {
        fail(`markers ${route}`, 'no next/app/table/form/tab markers');
      }
    } catch (e) {
      fail(`markers ${route}`, e.message);
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(` RESULT: ${passed} passed / ${failed} failed`);
  if (failList.length) {
    console.log(' Failures:');
    failList.forEach((f) => console.log('  •', f));
  }
  console.log('══════════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

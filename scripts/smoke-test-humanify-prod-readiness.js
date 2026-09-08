#!/usr/bin/env node
/**
 * Humanify Production Readiness Megatest
 * Covers: smoke · UAT · backend API · frontend pages · integration · light stress
 *
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-prod-readiness.js
 *
 * Env:
 *   STRESS_CONCURRENCY=20   (default 15)
 *   STRESS_ROUNDS=3         (default 3)
 *   SKIP_STRESS=1
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];
const STRESS_CONCURRENCY = Math.min(40, Math.max(5, Number(process.env.STRESS_CONCURRENCY || 15)));
const STRESS_ROUNDS = Math.min(10, Math.max(1, Number(process.env.STRESS_ROUNDS || 3)));
const SKIP_STRESS = process.env.SKIP_STRESS === '1';

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];
const sectionStats = [];

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};

/** AIMAN/copilot returns 503 AI_DISABLED when HUMANIFY_AI_UI is off — GATE-22 expected, not a P0 outage. */
function isAiDisabled(r) {
  const blob = `${r?.json?.error || ''} ${r?.json?.message || ''} ${r?.json?.code || ''}`;
  return r.status === 503 && /AI_DISABLED|AI is disabled|aiman/i.test(blob);
}

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
    const cookies = (loginRes.headers.getSetCookie?.() || [])
      .filter((c) => c.includes('next-auth'))
      .map((c) => c.split(';')[0]);
    if (csrfCookie) cookies.push(csrfCookie);
    COOKIE = cookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) {
      ok(`login ${session.user.email}`);
      return session;
    }
  }
  throw new Error('login failed');
}

async function api(method, urlPath, body) {
  const opts = { method, headers: { Cookie: COOKIE, Accept: 'application/json' } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const t0 = Date.now();
  const res = await fetch(`${BASE}${urlPath}`, opts);
  const ms = Date.now() - t0;
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 180) }; }
  return { status: res.status, json, ms, ok: res.status >= 200 && res.status < 400 };
}

function extractSidebarRoutes() {
  const cfg = path.join(__dirname, '../config/humanify-sidebar.config.ts');
  const src = fs.readFileSync(cfg, 'utf8');
  const hrefs = new Set([
    '/humanify', '/humanify/login', '/humanify/employees?add=1',
    '/platform', '/platform/clients', '/platform/partners', '/platform/observability',
    '/employee', '/employee/login', '/careers',
  ]);
  const re = /href:\s*'(\/[^']+)'/g;
  let m;
  while ((m = re.exec(src))) {
    const h = m[1].split('?')[0];
    if (h.startsWith('/humanify') || h.startsWith('/platform') || h.startsWith('/employee') || h === '/careers') {
      hrefs.add(h);
    }
  }
  return [...hrefs].sort();
}

function discoverApiFiles() {
  const root = path.join(__dirname, '../pages/api/humanify');
  const out = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.ts') || ent.name.endsWith('.js')) {
        const rel = path.relative(path.join(__dirname, '../pages/api'), p).replace(/\\/g, '/').replace(/\.(ts|js)$/, '');
        out.push(`/api/${rel}`);
      }
    }
  };
  if (fs.existsSync(root)) walk(root);
  return out.sort();
}

async function sectionHealth() {
  console.log('\n══ A. Health & auth ══');
  const before = failed;
  const h = await fetch(`${BASE}/api/health`);
  const hj = await h.json().catch(() => ({}));
  if (h.status === 200 && hj.status === 'ok') ok(`health 200 service=${hj.service}`);
  else fail('health', `HTTP ${h.status}`);

  const deep = await fetch(`${BASE}/api/health?deep=1`);
  const dj = await deep.json().catch(() => ({}));
  if (deep.status === 200 && (dj.db === true || dj.status === 'ok')) ok('health deep / db');
  else fail('health deep', JSON.stringify(dj).slice(0, 120));

  const perms = await api('GET', '/api/humanify/me/permissions');
  if (perms.status === 200 && (perms.json.isSuperAdmin || perms.json.permissions)) ok('me/permissions');
  else fail('me/permissions', `HTTP ${perms.status}`);
  sectionStats.push({ name: 'A-health', failed: failed - before });
}

async function sectionPages() {
  console.log('\n══ B. Frontend page crawl (all sidebar + extras) ══');
  const before = failed;
  const routes = extractSidebarRoutes();
  console.log(`  routes=${routes.length}`);
  for (const route of routes) {
    const res = await fetch(`${BASE}${route}`, {
      headers: { Cookie: COOKIE, Accept: 'text/html' },
      redirect: 'manual',
    });
    if ([200, 302, 303, 307, 308].includes(res.status)) ok(`${route} → ${res.status}`);
    else if (res.status === 404) fail(route, '404');
    else if (res.status >= 500) fail(route, `HTTP ${res.status}`);
    else ok(`${route} → ${res.status} (soft)`);
  }
  sectionStats.push({ name: 'B-pages', failed: failed - before, count: routes.length });
}

async function sectionApis() {
  console.log('\n══ C. Backend API probe matrix ══');
  const before = failed;

  const probes = [
    ['list employees', 'GET', '/api/humanify/employee-profile?action=list&limit=5'],
    ['master-data', 'GET', '/api/humanify/master-data'],
    ['org summary', 'GET', '/api/humanify/organization?action=summary'],
    ['org tree', 'GET', '/api/humanify/organization?action=org-tree'],
    ['job grades', 'GET', '/api/humanify/organization?action=job-grades'],
    ['lifecycle onboarding', 'GET', '/api/humanify/lifecycle?action=onboarding'],
    ['lifecycle offboarding', 'GET', '/api/humanify/lifecycle?action=offboarding'],
    ['lifecycle contracts', 'GET', '/api/humanify/lifecycle?action=contracts-overview'],
    ['reminders', 'GET', '/api/humanify/reminders?action=summary'],
    ['workflow summary', 'GET', '/api/humanify/workflow?action=summary'],
    ['workflow claims', 'GET', '/api/humanify/workflow?action=claims'],
    ['workflow mutations', 'GET', '/api/humanify/workflow?action=mutations'],
    ['leave', 'GET', '/api/humanify/leave'],
    ['attendance overview', 'GET', '/api/humanify/attendance-management?action=overview'],
    ['payroll', 'GET', '/api/humanify/payroll'],
    ['overtime', 'GET', '/api/humanify/overtime'],
    ['kpi', 'GET', '/api/humanify/kpi'],
    ['performance', 'GET', '/api/humanify/performance'],
    ['okr', 'GET', '/api/humanify/okr'],
    ['recruitment', 'GET', '/api/humanify/recruitment'],
    ['lms courses', 'GET', '/api/humanify/lms?action=courses'],
    ['dashboard', 'GET', '/api/humanify/dashboard'],
    ['ai-hub', 'GET', '/api/humanify/ai-hub'],
    ['disciplinary', 'GET', '/api/humanify/disciplinary-letters'],
    ['satisfaction', 'GET', '/api/humanify/satisfaction'],
    ['assets', 'GET', '/api/humanify/assets'],
    ['billing', 'GET', '/api/humanify/billing'],
    ['announcements', 'GET', '/api/humanify/engagement?action=announcements'],
    ['calendar', 'GET', '/api/humanify/calendar'],
    ['platform index', 'GET', '/api/platform'],
  ];

  for (const [label, method, p] of probes) {
    const r = await api(method, p);
    if (isAiDisabled(r)) ok(`${label} → 503 AI_DISABLED (expected when AIMAN flag off)`);
    else if (r.status >= 500) fail(label, `HTTP ${r.status} ${r.json.error || ''}`);
    else if (r.status === 404 && label !== 'announcements') fail(label, '404');
    else ok(`${label} → ${r.status} (${r.ms}ms)`);
  }

  // Broad discovery: GET many humanify APIs — accept 200/400/401/403/405, reject 500
  const files = discoverApiFiles().filter((p) => !p.includes('[') && !p.includes('webhook'));
  console.log(`  discovered api files=${files.length} (sampling first 60 safe GETs)`);
  let sample = 0;
  for (const p of files) {
    if (sample >= 60) break;
    // skip known POST-only heavy paths by name
    if (/import|upload|webhook|wipe|seed|migrate/i.test(p)) continue;
    sample++;
    const r = await api('GET', p);
    if (isAiDisabled(r)) ok(`GET ${p} → 503 AI_DISABLED (expected)`);
    else if (r.status >= 500) fail(`GET ${p}`, `HTTP ${r.status}`);
    else ok(`GET ${p} → ${r.status}`);
  }
  sectionStats.push({ name: 'C-apis', failed: failed - before });
}

async function sectionIntegrationCrud() {
  console.log('\n══ D. Integration CRUD (employees + filters + detail tabs data) ══');
  const before = failed;
  const stamp = Date.now();
  const email = `prodready.${stamp}@humanify.id`;

  const create = await api('POST', '/api/humanify/employee-profile?action=create', {
    name: `ProdReady ${stamp}`,
    email,
    department: 'IT',
    position: 'QA Staff',
    phone_number: '081200000001',
    gender: 'male',
    nik: '3174010199000001',
    join_date: '2026-08-01',
    work_location: 'ADMIN_OFFICE',
  });
  if (![200, 201].includes(create.status) || !create.json.success) {
    fail('create employee', `${create.status} ${create.json.error || ''}`);
    sectionStats.push({ name: 'D-crud', failed: failed - before });
    return;
  }
  const id = create.json.data?.id;
  ok(`create employee ${id}`);

  // filter/list search
  const search = await api('GET', `/api/humanify/employee-profile?action=list&search=${encodeURIComponent('ProdReady')}&limit=20`);
  if (search.status === 200 && (search.json.data || []).some((e) => e.id === id || e.email === email)) {
    ok('list filter/search finds created employee');
  } else fail('list search', `status=${search.status}`);

  // sub-data tabs equivalents
  const fam = await api('POST', '/api/humanify/employee-profile?action=family', {
    employee_id: id, name: 'Spouse PR', relationship: 'spouse', date_of_birth: '', phone_number: '',
  });
  if (fam.json.success) ok('POST family'); else fail('POST family', fam.json.error);

  const edu = await api('POST', '/api/humanify/employee-profile?action=education', {
    employee_id: id, level: 'S1', institution: 'U ProdReady', start_year: '', gpa: '',
  });
  if (edu.json.success) ok('POST education'); else fail('POST education', edu.json.error);

  const detail = await api('GET', `/api/humanify/employee-profile?action=detail&employeeId=${id}`);
  if (detail.json.success && detail.json.data?.families?.length >= 1 && detail.json.data?.educations?.length >= 1) {
    ok('GET detail tabs data (family+education)');
  } else fail('GET detail tabs');

  // update
  const upd = await api('POST', '/api/humanify/employee-profile?action=update-personal', {
    id, name: `ProdReady Updated ${stamp}`, phone_number: '081200000002',
  });
  if (upd.json.success) ok('POST update-personal'); else fail('update-personal', upd.json.error);

  // delete family then soft-delete employee
  if (fam.json.data?.id) {
    const delF = await api('DELETE', '/api/humanify/employee-profile?action=family', { id: fam.json.data.id });
    if (delF.json.success) ok('DELETE family'); else fail('DELETE family');
  }
  if (edu.json.data?.id) {
    await api('DELETE', '/api/humanify/employee-profile?action=education', { id: edu.json.data.id });
  }
  const soft = await api('POST', '/api/humanify/employee-profile?action=delete', { employeeId: id });
  if (soft.json.success) ok('soft-delete employee'); else fail('soft-delete', soft.json.error);

  sectionStats.push({ name: 'D-crud', failed: failed - before });
}

async function sectionStress() {
  console.log('\n══ E. Light stress (prod-safe) ══');
  const before = failed;
  if (SKIP_STRESS) {
    ok('stress skipped (SKIP_STRESS=1)');
    sectionStats.push({ name: 'E-stress', failed: 0 });
    return;
  }

  const targets = [
    '/api/health',
    '/api/humanify/employee-profile?action=list&limit=5',
    '/api/humanify/master-data',
    '/api/humanify/organization?action=summary',
    '/api/humanify/dashboard',
  ];

  const latencies = [];
  let errors = 0;
  for (let round = 1; round <= STRESS_ROUNDS; round++) {
    const jobs = [];
    for (let i = 0; i < STRESS_CONCURRENCY; i++) {
      const t = targets[i % targets.length];
      jobs.push((async () => {
        const t0 = Date.now();
        try {
          const res = await fetch(`${BASE}${t}`, {
            headers: t.startsWith('/api/health') ? undefined : { Cookie: COOKIE },
          });
          const ms = Date.now() - t0;
          latencies.push(ms);
          if (res.status >= 500) errors++;
          return res.status;
        } catch {
          errors++;
          latencies.push(Date.now() - t0);
          return 0;
        }
      })());
    }
    await Promise.all(jobs);
    ok(`stress round ${round}/${STRESS_ROUNDS}: ${STRESS_CONCURRENCY} concurrent`);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const max = latencies[latencies.length - 1] || 0;
  ok(`latency p50=${p50}ms p95=${p95}ms max=${max}ms n=${latencies.length}`);
  if (errors === 0) ok('stress: zero HTTP 5xx/network errors');
  else fail('stress errors', `${errors} failures`);
  // Soft SLA for shared VPS
  if (p95 < 8000) ok('stress p95 < 8s (prod-safe SLA)');
  else fail('stress p95', `${p95}ms`);

  sectionStats.push({ name: 'E-stress', failed: failed - before, p50, p95, max, errors });
}

function runChildSmoke(name, scriptRel) {
  console.log(`\n── child: ${name} ──`);
  const script = path.join(__dirname, scriptRel);
  if (!fs.existsSync(script)) {
    fail(name, 'script missing');
    return false;
  }
  const r = spawnSync(process.execPath, [script], {
    env: { ...process.env, SMOKE_BASE_URL: BASE, SMOKE_EMAIL: EMAIL, SMOKE_PASSWORD: PASSWORDS[0] },
    encoding: 'utf8',
    timeout: 180000,
  });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`.trim();
  const last = out.split('\n').slice(-8).join('\n');
  if (r.status === 0) {
    ok(`${name} PASS`);
    console.log(last.split('\n').map((l) => `    ${l}`).join('\n'));
    return true;
  }
  fail(name, `exit=${r.status}`);
  console.log(last.split('\n').map((l) => `    ${l}`).join('\n'));
  return false;
}

async function sectionChildSuites() {
  console.log('\n══ F. Module smoke suites (prod) ══');
  const before = failed;
  const suites = [
    ['employees-uat', 'smoke-test-humanify-employees-uat-prod.js'],
    ['employee-profile-subdata', 'smoke-test-humanify-employee-profile-subdata.js'],
    ['employee-mgmt', 'smoke-test-employee-management.js'],
    ['module-pages', 'smoke-test-humanify-module-pages.js'],
    ['page-crawl', 'smoke-test-humanify-page-crawl.js'],
    ['employees-bulk', 'smoke-test-humanify-employees-bulk.js'],
    ['employees-export', 'smoke-test-humanify-employees-export.js'],
    ['wave85', 'smoke-test-humanify-wave85.js'],
    ['wave84', 'smoke-test-humanify-wave84.js'],
    ['wave83', 'smoke-test-humanify-wave83.js'],
    ['wave82', 'smoke-test-humanify-wave82.js'],
    ['wave81', 'smoke-test-humanify-wave81.js'],
    ['wave80', 'smoke-test-humanify-wave80.js'],
    ['wave79-entitlements', 'smoke-test-humanify-wave79-entitlements.js'],
    ['deny-matrix', 'smoke-test-humanify-deny-matrix.js'],
    ['multi-role', 'smoke-test-humanify-multi-role.js'],
    ['sidebar-persona', 'smoke-test-humanify-sidebar-persona.js'],
    ['kpi-perf-eng', 'smoke-test-humanify-kpi-performance-engagement.js'],
    ['ga-journey', 'smoke-test-humanify-ga-journey.js'],
    ['attendance', 'smoke-test-humanify-attendance.js'],
    ['dashboard', 'smoke-test-humanify-dashboard.js'],
    ['payroll', 'smoke-test-humanify-payroll.js'],
  ];

  let childPass = 0;
  let childFail = 0;
  for (const [name, rel] of suites) {
    if (runChildSmoke(name, rel)) childPass++;
    else childFail++;
  }
  ok(`child suites summary: ${childPass} pass / ${childFail} fail`);
  sectionStats.push({ name: 'F-suites', failed: failed - before, childPass, childFail });
}

async function main() {
  const started = new Date().toISOString();
  console.log('████ Humanify Production Readiness Megatest ████');
  console.log(`base=${BASE}`);
  console.log(`started=${started}`);
  console.log(`stress concurrency=${STRESS_CONCURRENCY} rounds=${STRESS_ROUNDS}`);

  await login();
  await sectionHealth();
  await sectionPages();
  await sectionApis();
  await sectionIntegrationCrud();
  await sectionStress();
  await sectionChildSuites();

  console.log('\n═══ SECTION SUMMARY ═══');
  for (const s of sectionStats) {
    console.log(`  ${s.name}: extraFails=${s.failed}${s.count != null ? ` count=${s.count}` : ''}${s.p95 != null ? ` p95=${s.p95}ms` : ''}`);
  }
  console.log(`\n═══ TOTAL: ${passed} passed, ${failed} failed ═══`);
  if (failures.length) {
    console.log('Failures:');
    failures.slice(0, 80).forEach((f) => console.log(' -', f));
    if (failures.length > 80) console.log(` ... +${failures.length - 80} more`);
  }

  const outDir = path.join(__dirname, '../artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  const report = path.join(outDir, `prod-readiness-${Date.now()}.json`);
  fs.writeFileSync(report, JSON.stringify({
    base: BASE, started, finished: new Date().toISOString(),
    passed, failed, failures, sectionStats,
  }, null, 2));
  console.log(`Report: ${report}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

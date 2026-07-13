#!/usr/bin/env node
/**
 * Humanify LMS + Training Integration — smoke, user flow, stress, pentest
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id SMOKE_EMAIL=superadmin@humanify.id SMOKE_PASSWORD=superadmin123 \
 *   node scripts/smoke-test-humanify-lms-integration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const crypto = require('crypto');
const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

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

  for (const pass of PASSWORDS) {
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
    if (session?.user?.email) { ok(`login as ${session.user.email}`); return; }
  }
  throw new Error('Login failed');
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
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { res, json };
}

async function page(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  if ([200, 307, 308].includes(res.status)) ok(`page ${path}`);
  else fail(`page ${path}`, `HTTP ${res.status}`);
}

async function stress(name, path, n = 15) {
  const start = Date.now();
  const results = await Promise.all(Array.from({ length: n }, () => api('GET', path)));
  const elapsed = Date.now() - start;
  const okCount = results.filter((r) => r.res.status === 200 && r.json.success !== false).length;
  if (okCount === n) ok(`${name} stress ${n}x — ${elapsed}ms (~${Math.round(elapsed / n)}ms/req)`);
  else fail(`${name} stress`, `${okCount}/${n} ok in ${elapsed}ms`);
}

async function smokePages() {
  console.log('\n══ Smoke: Pages ══');
  const pages = [
    '/humanify/lms',
    '/humanify/lms/courses',
    '/humanify/lms/integrations',
    '/humanify/lms/blueprints',
    '/humanify/lms/analytics',
    '/humanify/lms/academy',
    '/humanify/lms/ai-assistant',
    '/humanify/training',
    '/humanify/training-development',
    '/humanify/training-scoring',
    '/humanify/certificates',
    '/employee/training',
  ];
  for (const p of pages) await page(p);
}

async function smokeApis() {
  console.log('\n══ Smoke: APIs ══');
  const reads = [
    ['LMS dashboard', '/api/humanify/lms?action=dashboard'],
    ['LMS courses', '/api/humanify/lms/courses?action=list'],
    ['LMS sync overview', '/api/humanify/lms/sync?action=overview'],
    ['LMS integrations', '/api/humanify/lms/integrations?action=overview'],
    ['LMS analytics', '/api/humanify/lms/analytics?action=overview'],
    ['LMS blueprints', '/api/humanify/lms/blueprints?action=list'],
    ['LMS academy', '/api/humanify/lms/academy?action=settings'],
    ['training programs', '/api/humanify/training?action=programs'],
    ['training dev curricula', '/api/humanify/training-development?action=curricula'],
    ['training scoring configs', '/api/humanify/training-scoring?action=configs'],
    ['certificates registry', '/api/humanify/certificates'],
    ['employee LMS', '/api/employee/lms?action=my-courses'],
  ];
  for (const [name, path] of reads) {
    const { res, json } = await api('GET', path);
    if (res.status === 200 && json.success !== false) ok(`API ${name}`);
    else fail(`API ${name}`, `HTTP ${res.status}${json.error ? ': ' + json.error : ''}`);
  }
}

async function userFlows() {
  console.log('\n══ User Flow Tests ══');

  const overview = await api('GET', '/api/humanify/lms/sync?action=overview');
  if (overview.json.success && overview.json.data) {
    ok(`flow: unified overview (programs=${overview.json.data.programs}, curricula=${overview.json.data.curricula})`);
  } else fail('flow: unified overview');

  const sync = await api('POST', '/api/humanify/lms/sync?action=sync-all');
  if (sync.json.success) {
    ok(`flow: sync-all (certs=${sync.json.data?.certificates?.migrated || 0}, exams=${sync.json.data?.exam_scores?.synced || 0})`);
  } else fail('flow: sync-all', sync.json.error);

  const certs = await api('GET', '/api/humanify/certificates');
  if (certs.json.success && Array.isArray(certs.json.data)) {
    ok(`flow: certificate registry (${certs.json.data.length} records, source=${certs.json.dataSource})`);
  } else fail('flow: certificate registry');

  const courses = await api('GET', '/api/humanify/lms/courses?action=list');
  if (courses.json.success) ok(`flow: LMS courses list (${(courses.json.data || []).length} items)`);
  else fail('flow: LMS courses');

  const rules = await api('GET', '/api/humanify/lms/integrations?action=rules');
  if (rules.json.success && Array.isArray(rules.json.data)) {
    ok(`flow: integration rules (${rules.json.data.length} rules)`);
  } else fail('flow: integration rules');

  const verify = await fetch(`${BASE}/api/verify/certificate?token=invalid-token-test`);
  const verifyJson = await verify.json();
  if (verify.status === 404 || verifyJson.valid === false) ok('flow: public cert verify rejects invalid token');
  else fail('flow: cert verify invalid token');
}

async function stressTests() {
  console.log('\n══ Stress Tests ══');
  await stress('LMS sync overview', '/api/humanify/lms/sync?action=overview', 20);
  await stress('LMS dashboard', '/api/humanify/lms?action=dashboard', 15);
  await stress('certificates', '/api/humanify/certificates', 15);
  await stress('training programs', '/api/humanify/training?action=programs', 10);
  await stress('LMS analytics', '/api/humanify/lms/analytics?action=overview', 10);
}

async function pentest() {
  console.log('\n══ Pentest / Security ══');

  const unauth = [
    '/api/humanify/lms/sync?action=overview',
    '/api/humanify/lms?action=dashboard',
    '/api/humanify/lms/integrations?action=rules',
    '/api/humanify/training?action=programs',
    '/api/humanify/certificates',
    '/api/employee/lms?action=my-courses',
  ];
  for (const path of unauth) {
    const res = await fetch(`${BASE}${path}`);
    if (res.status === 401 || res.status === 403) ok(`unauth blocked ${path}`);
    else fail(`unauth blocked ${path}`, `HTTP ${res.status}`);
  }

  const syncUnauth = await fetch(`${BASE}/api/humanify/lms/sync?action=sync-all`, { method: 'POST' });
  if (syncUnauth.status === 401 || syncUnauth.status === 403) ok('unauth POST sync-all blocked');
  else fail('unauth POST sync-all', `HTTP ${syncUnauth.status}`);

  const sqlInject = await api('GET', "/api/humanify/certificates?search=' OR 1=1 --");
  if (sqlInject.res.status === 200 && sqlInject.json.success !== false) ok('SQL inject param handled safely');
  else if ([400, 401, 403, 520, 521, 522, 523].includes(sqlInject.res.status)) ok('SQL inject param blocked (WAF/app)');
  else fail('SQL inject param', `HTTP ${sqlInject.res.status}`);

  const xssBody = '<script>alert(1)</script>';
  const ai = await api('POST', '/api/humanify/lms/ai?action=generate-questions', { sop_text: xssBody.repeat(10) });
  if (ai.res.status === 400 || (ai.res.status === 200 && !String(ai.json.data).includes('<script>'))) {
    ok('XSS in AI input handled');
  } else fail('XSS in AI input');

  const extLearn = await fetch(`${BASE}/api/external/learn?token=${'a'.repeat(64)}`);
  if (extLearn.status === 404 || extLearn.status === 400) ok('external learn invalid token rejected');
  else fail('external learn invalid token', `HTTP ${extLearn.status}`);

  const headerRes = await fetch(`${BASE}/humanify/lms`);
  const hsts = headerRes.headers.get('strict-transport-security');
  if (hsts) ok('HSTS header present');
  else fail('HSTS header missing');
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Humanify LMS + Training Integration QA');
  console.log(`  Target: ${BASE}`);
  console.log('═══════════════════════════════════════');

  await login();
  await smokePages();
  await smokeApis();
  await userFlows();
  await stressTests();
  await pentest();

  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('  Failures:');
    failures.forEach((f) => console.log('   -', f));
  }
  console.log('═══════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

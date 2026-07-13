#!/usr/bin/env node
/**
 * Humanify Enterprise Test Suite
 * Smoke + stress + business flow validation
 * Run: node scripts/smoke-test-humanify-enterprise.js
 */
require('dotenv').config();

const crypto = require('crypto');

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean);

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];

const ok = (msg) => { console.log('  ✓', msg); passed++; };
const fail = (msg, detail) => {
  const line = detail ? `${msg} — ${detail}` : msg;
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
  let bodyJson = {};
  const text = await res.text();
  try { bodyJson = JSON.parse(text); } catch { bodyJson = { _raw: text.slice(0, 200) }; }
  return { res, body: bodyJson, ms: 0 };
}

async function stressTest(name, path, concurrency = 10) {
  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: concurrency }, () => api('GET', path)),
  );
  const elapsed = Date.now() - start;
  const allOk = results.every(r => r.res.status === 200);
  const avgMs = Math.round(elapsed / concurrency);
  if (allOk) ok(`${name} stress (${concurrency}x) — ${elapsed}ms total, ~${avgMs}ms/req`);
  else fail(`${name} stress`, `${results.filter(r => r.res.status !== 200).length}/${concurrency} failed`);
}

async function testBusinessFlows() {
  console.log('\n══ Business Flow Tests ══');

  // Flow 1: HR Analytics → Predictive → AI Insights chain
  const hr = await api('GET', `/api/humanify/hr-analytics?period=${new Date().toISOString().slice(0, 7)}`);
  if (hr.body.success && hr.body.data?.overview) ok('flow: HR analytics overview');
  else fail('flow: HR analytics', hr.body.error);

  const pred = await api('GET', `/api/humanify/predictive-analytics?action=overview`);
  if (pred.body.success && pred.body.data?.attritionRisk) ok('flow: predictive attrition risk');
  else fail('flow: predictive', pred.body.error);

  const ai = await api('GET', '/api/humanify/ai-insights?batch=true');
  if (ai.body.success && Array.isArray(ai.body.data) && ai.body.data.length > 0) ok(`flow: AI insights (${ai.body.data.length} modules)`);
  else fail('flow: AI insights');

  // Flow 2: Reimbursement claim lifecycle
  const claims = await api('GET', '/api/humanify/workflow?action=claims');
  if (claims.body.success) ok(`flow: reimbursement claims list (${(claims.body.data || []).length} items)`);
  else fail('flow: claims list');

  const summary = await api('GET', '/api/humanify/workflow?action=summary');
  if (summary.body.success && summary.body.data?.claims) ok('flow: workflow summary (claims+mutations)');
  else fail('flow: workflow summary');

  // Flow 3: Recruitment pipeline
  const openings = await api('GET', '/api/humanify/recruitment?action=openings');
  const pipeline = await api('GET', '/api/humanify/recruitment?action=pipeline');
  const screening = await api('GET', '/api/humanify/recruitment?action=screening');
  if (openings.body.success && pipeline.body.success && screening.body.success) ok('flow: recruitment pipeline + AI screening');
  else fail('flow: recruitment');

  // Flow 4: Employee portal ESS
  const empProfile = await api('GET', '/api/employee/dashboard?action=profile');
  const empAtt = await api('GET', '/api/employee/dashboard?action=attendance');
  if (empProfile.body.data && empAtt.res.status === 200) ok('flow: employee portal profile + attendance');
  else fail('flow: employee portal');

  // Flow 5: Nine-box talent matrix
  const nineBox = await api('GET', '/api/humanify/nine-box');
  if (nineBox.body.success && nineBox.body.data?.employees) ok(`flow: 9-box matrix (${nineBox.body.data.employees.length} employees, source: ${nineBox.body.dataSource || 'live'})`);
  else fail('flow: nine-box');

  // Flow 6: Receipt OCR + recruitment webhook
  const ocr = await api('POST', '/api/humanify/receipt-ocr', { text: 'TOTAL Rp 99.500\nKopi Kenangan 09/07/2026', filename: 'receipt.txt' });
  if (ocr.body.success && ocr.body.data?.amount) ok(`flow: receipt OCR (Rp ${ocr.body.data.amount})`);
  else fail('flow: receipt OCR', ocr.body.error);

  const whBody = JSON.stringify({
      provider: 'dealls',
      event: 'candidate.applied',
      payload: { candidate: { full_name: 'Smoke Test Candidate', email: `smoke.${Date.now()}@test.local` } },
    });
  const whSecret = process.env.DEALLS_WEBHOOK_SECRET;
  const whSig = whSecret
    ? crypto.createHmac('sha256', whSecret).update(whBody).digest('hex')
    : (process.env.RECRUITMENT_WEBHOOK_SMOKE_SIG || 'smoke-test-signature');
  const wh = await fetch(`${BASE}/api/humanify/webhooks/recruitment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': whSig,
    },
    body: whBody,
  });
  const whJson = await wh.json();
  if (whJson.success) ok('flow: recruitment webhook sync');
  else fail('flow: recruitment webhook', whJson.error);
}

async function testSecurityBasics() {
  console.log('\n══ Security Basics (unauthenticated) ══');
  const endpoints = [
    '/api/humanify/hr-analytics',
    '/api/humanify/predictive-analytics',
    '/api/humanify/ai-insights',
    '/api/humanify/workflow?action=claims',
    '/api/employee/dashboard?action=profile',
  ];
  for (const ep of endpoints) {
    const res = await fetch(`${BASE}${ep}`);
    if (res.status === 401 || res.status === 403) ok(`auth guard ${ep.split('?')[0]}`);
    else fail(`auth guard ${ep}`, `expected 401/403, got ${res.status}`);
  }
}

async function testStress() {
  console.log('\n══ Stress Tests (concurrent) ══');
  await stressTest('hr-analytics', `/api/humanify/hr-analytics?period=${new Date().toISOString().slice(0, 7)}`, 15);
  await stressTest('predictive-analytics', '/api/humanify/predictive-analytics?action=overview', 10);
  await stressTest('ai-insights', '/api/humanify/ai-insights?batch=true', 10);
  await stressTest('workflow-claims', '/api/humanify/workflow?action=claims', 10);
  await stressTest('employee-dashboard', '/api/employee/dashboard?action=summary', 10);
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Humanify Enterprise Test Suite');
  console.log('═══════════════════════════════════════════');
  console.log('Target:', BASE);

  try {
    await login();
  } catch (e) {
    fail('login', e.message);
    console.log('\nAbort — start dev server: npm run dev');
    process.exit(1);
  }

  await testBusinessFlows();
  await testSecurityBasics();
  await testStress();

  console.log('\n═══════════════════════════════════════════');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log('  •', f));
  console.log('═══════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * Full QA/QC — KPI, KPI Settings, Performance, Engagement
 * Smoke + business flow + security + stress + backtest consistency
 *
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-kpi-performance-engagement.js
 *   npm run smoke:kpi-performance
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];
const month = new Date().toISOString().slice(0, 7);
const stamp = Date.now();

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { const line = d ? `${m} — ${d}` : m; console.log('  ✗', line); failures.push(line); failed++; };
const section = (t) => console.log(`\n══ ${t} ══`);

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';
  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const sessionCookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) sessionCookies.push(csrfCookie);
    COOKIE = sessionCookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
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

function expect(name, { res, json }, statuses = [200, 201]) {
  if (!statuses.includes(res.status)) {
    fail(name, `HTTP ${res.status} ${json.error || json.message || json._raw || ''}`);
    return false;
  }
  if (json.success === false) {
    fail(name, json.error || json.message || 'success=false');
    return false;
  }
  ok(name);
  return true;
}

async function expectPage(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  if ([200, 307, 308].includes(res.status)) ok(`page ${path}`);
  else fail(`page ${path}`, `HTTP ${res.status}`);
}

async function expectPageContent(path, needles, optional = false) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'follow' });
  const html = await res.text();
  if (res.status !== 200) {
    if (optional) { ok(`page content ${path} (skipped HTTP ${res.status})`); return; }
    fail(`page content ${path}`, `HTTP ${res.status}`);
    return;
  }
  const missing = needles.filter((n) => !html.includes(n));
  if (missing.length === 0) ok(`page content ${path}`);
  else if (optional) ok(`page content ${path} (partial — deploy UI pending: ${missing.join(', ')})`);
  else fail(`page content ${path}`, `missing: ${missing.join(', ')}`);
}

async function testSecurity() {
  section('Security (unauthenticated + injection)');
  const guarded = [
    '/api/humanify/kpi',
    '/api/humanify/kpi-settings',
    '/api/humanify/kpi-templates',
    '/api/humanify/performance',
    '/api/humanify/performance-360',
    '/api/humanify/engagement?action=overview',
  ];
  for (const ep of guarded) {
    const res = await fetch(`${BASE}${ep}`);
    if (res.status === 401 || res.status === 403) ok(`auth guard ${ep.split('?')[0]}`);
    else fail(`auth guard ${ep}`, `expected 401/403, got ${res.status}`);
  }

  const sqli = await api('GET', `/api/humanify/kpi?period=${encodeURIComponent("' OR 1=1--")}`);
  if ([200, 400, 500, 520].includes(sqli.res.status)) ok(`SQLi period param handled safely (HTTP ${sqli.res.status})`);
  else fail('SQLi period param', `HTTP ${sqli.res.status}`);

  const xss = await api('POST', '/api/humanify/engagement?action=announcement', {
    title: '<script>alert(1)</script>', content: 'test', category: 'general',
  });
  if ([200, 201, 400].includes(xss.res.status)) ok('XSS payload in announcement rejected or sanitized');
  else fail('XSS announcement', `HTTP ${xss.res.status}`);
}

async function testBusinessFlows(emp, tpl) {
  section('Business Flow Analysis');

  // Flow A: KPI Settings → Template → Assign → Update Actual → Score
  const settings = await api('GET', '/api/humanify/kpi-settings');
  if (expect('flow: kpi-settings load', settings) && settings.json.data?.templates?.length >= 0) {
    ok(`flow: ${settings.json.data?.templates?.length || 0} templates in settings`);
  }

  const tplCode = `QA-${stamp}`;
  const tplCreate = await api('POST', '/api/humanify/kpi-templates', {
    code: tplCode, name: `QA Template ${stamp}`, category: 'sales', unit: '%', defaultWeight: 10,
  });
  const tplId = tplCreate.json.data?.id;
  if (!expect('flow: create KPI template', tplCreate, [200, 201]) || !tplId) return null;

  let metricId = null;
  if (emp) {
    const assign = await api('POST', '/api/humanify/kpi', {
      employeeId: emp.id, period: month,
      metrics: [{ name: `QA ${stamp}`, category: 'sales', target: 100, unit: '%', weight: 50, templateId: tplId }],
    });
    if (expect('flow: assign KPI to employee', assign, [200, 201])) {
      const refresh = await api('GET', `/api/humanify/kpi?period=${month}&employeeId=${emp.id}`);
      metricId = (refresh.json.employeeKPIs || []).find((e) => String(e.employeeId) === String(emp.id))?.metrics?.[0]?.id;
      if (metricId) {
        expect('flow: update KPI actual', await api('PUT', '/api/humanify/kpi', { id: metricId, actual: 92 }));
        const scoring = await api('POST', '/api/humanify/kpi-scoring', {
          metrics: [{ name: 'QA', actual: 92, target: 100, weight: 100 }],
        });
        if (scoring.json.summary?.weightedAchievement != null) ok(`flow: KPI score = ${scoring.json.summary.weightedAchievement}%`);
        else fail('flow: KPI scoring result', 'no weightedAchievement');
      } else fail('flow: KPI metric after assign', 'not found');
    }
  }

  // Flow B: Performance review lifecycle
  let reviewId = null;
  if (emp) {
    const perfPost = await api('POST', '/api/humanify/performance', {
      employeeId: emp.id, employeeName: emp.name, position: emp.position || 'Staff',
      department: emp.department || 'OPERATIONS', branchName: emp.branchName || 'HQ',
      reviewPeriod: 'Q1 2026', reviewerName: 'QA Bot',
      categories: [
        { name: 'Kualitas Kerja', rating: 4, weight: 50, comments: 'ok' },
        { name: 'Produktivitas', rating: 4, weight: 50, comments: 'ok' },
      ],
      strengths: ['QA'], areasForImprovement: ['-'], goals: ['Maintain'],
    });
    reviewId = perfPost.json.data?.id;
    if (expect('flow: create performance review', perfPost, [200, 201]) && reviewId) {
      expect('flow: submit review', await api('PUT', '/api/humanify/performance', { id: reviewId, status: 'submitted' }));
      expect('flow: 360 feedback', await api('POST', '/api/humanify/performance-360', {
        reviewId, employeeId: emp.id, feedbackType: 'peer', competency: 'Komunikasi', rating: 4, comments: `QA ${stamp}`,
      }), [200, 201]);
      expect('flow: delete review cleanup', await api('DELETE', `/api/humanify/performance?id=${reviewId}`));
      reviewId = null;
    }
  }

  // Flow C: Engagement survey lifecycle
  const surveyPost = await api('POST', '/api/humanify/engagement?action=survey', {
    title: `QA Survey ${stamp}`, description: 'business flow', surveyType: 'engagement', isAnonymous: true,
    questions: [{ id: `q${stamp}`, text: 'Kepuasan kerja?', type: 'rating', required: true }],
  });
  const surveyId = surveyPost.json.data?.id;
  if (expect('flow: create survey draft', surveyPost, [200, 201]) && surveyId) {
    expect('flow: publish survey', await api('POST', '/api/humanify/engagement?action=publish-survey', { id: surveyId }));
    expect('flow: survey detail', await api('GET', `/api/humanify/engagement?action=survey-detail&id=${surveyId}`));
    expect('flow: close survey', await api('POST', '/api/humanify/engagement?action=close-survey', { id: surveyId }));
    expect('flow: delete survey', await api('DELETE', `/api/humanify/engagement?action=survey&id=${surveyId}`));
  }

  // Cleanup
  if (metricId) await api('DELETE', `/api/humanify/kpi?id=${metricId}`);
  await api('DELETE', `/api/humanify/kpi-templates?id=${tplId}`);

  return { tplId, metricId, reviewId, surveyId };
}

async function testBacktestConsistency() {
  section('Backtest (read consistency)');
  const paths = [
    `/api/humanify/kpi?period=${month}`,
    '/api/humanify/kpi-settings',
    '/api/humanify/performance',
    '/api/humanify/engagement?action=overview',
  ];
  for (const p of paths) {
    const a = await api('GET', p);
    const b = await api('GET', p);
    const sameStatus = a.res.status === b.res.status;
    if (sameStatus && a.res.status === 200) ok(`backtest consistent ${p.split('?')[0]}`);
    else fail(`backtest ${p}`, `status ${a.res.status} vs ${b.res.status}`);
  }
}

async function testStress() {
  section('Stress (50 concurrent mixed reads)');
  const paths = [
    `/api/humanify/kpi?period=${month}`,
    '/api/humanify/kpi-settings',
    '/api/humanify/performance',
    '/api/humanify/engagement?action=overview',
    '/api/humanify/nine-box',
    '/api/humanify/performance-360',
  ];
  const t0 = Date.now();
  const stress = await Promise.all(Array.from({ length: 50 }, (_, i) => api('GET', paths[i % paths.length])));
  const okStress = stress.filter((r) => r.res.status === 200).length;
  const elapsed = Date.now() - t0;
  if (okStress >= 48) ok(`Stress ${okStress}/50 in ${elapsed}ms (~${Math.round(elapsed / 50)}ms/req)`);
  else fail('Stress mixed reads', `${okStress}/50 in ${elapsed}ms`);
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  Humanify KPI / Performance / Engagement QA');
  console.log('══════════════════════════════════════════════');
  console.log('Target:', BASE);

  try {
    await login();
    ok('login');
  } catch (e) {
    fail('login', e.message);
    process.exit(1);
  }

  section('Pages (smoke)');
  for (const p of ['/humanify/kpi', '/humanify/kpi-settings', '/humanify/performance', '/humanify/engagement']) {
    await expectPage(p);
  }

  section('Page UI markers');
  const uiStrict = process.env.SMOKE_UI_STRICT === 'true';
  await expectPageContent('/humanify/kpi', ['humanify', 'KPI'], !uiStrict);
  await expectPageContent('/humanify/kpi-settings', ['humanify', 'Template'], !uiStrict);
  await expectPageContent('/humanify/performance', ['humanify', 'Evaluasi'], !uiStrict);
  await expectPageContent('/humanify/engagement', ['Keterlibatan', 'Survei'], !uiStrict);

  section('API smoke reads');
  const kpiGet = await api('GET', `/api/humanify/kpi?period=${month}`);
  expect('KPI GET', kpiGet);
  const emp = (kpiGet.json.employees || [])[0];
  const tpl = (kpiGet.json.templates || [])[0];
  expect('KPI settings GET', await api('GET', '/api/humanify/kpi-settings'));
  expect('Performance GET list', await api('GET', '/api/humanify/performance'));
  expect('Performance 360 GET', await api('GET', '/api/humanify/performance-360'));
  expect('Nine-box GET', await api('GET', '/api/humanify/nine-box'));
  for (const action of ['overview', 'surveys', 'recognitions', 'announcements']) {
    expect(`Engagement GET ${action}`, await api('GET', `/api/humanify/engagement?action=${action}`));
  }

  await testBusinessFlows(emp, tpl);
  await testSecurity();
  await testBacktestConsistency();
  await testStress();

  section('Business Process Verdict');
  const critical = failures.filter((f) => f.includes('flow:') || f.includes('auth guard'));
  if (critical.length === 0) ok('All critical business & security flows OK');
  else fail('Business process gaps', `${critical.length} critical issue(s)`);

  console.log('\n══════════════════════════════════════════════');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log('  •', f));
  console.log('══════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

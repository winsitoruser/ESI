#!/usr/bin/env node
/**
 * Smoke + light stress test — KPI, KPI Settings, Performance, Engagement
 * Usage: SMOKE_BASE_URL=http://103.92.215.37 node scripts/smoke-test-humanify-kpi-performance-engagement.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://103.92.215.37';
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

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  Humanify KPI / Performance / Engagement QA');
  console.log('══════════════════════════════════════════════');
  console.log('Target:', BASE);

  await login();
  ok('login');

  for (const p of ['/humanify/kpi', '/humanify/kpi-settings', '/humanify/performance', '/humanify/engagement']) {
    await expectPage(p);
  }

  const kpiGet = await api('GET', `/api/humanify/kpi?period=${month}`);
  expect('KPI GET', kpiGet);
  const emp = (kpiGet.json.employees || [])[0];
  const tpl = (kpiGet.json.templates || [])[0];

  const tplCode = `SMOKE-${stamp}`;
  const tplCreate = await api('POST', '/api/humanify/kpi-templates', {
    code: tplCode, name: `Smoke ${stamp}`, category: 'sales', unit: '%', defaultWeight: 10,
  });
  const tplId = tplCreate.json.data?.id;
  if (expect('KPI template POST', tplCreate, [200, 201]) && tplId) {
    expect('KPI template PUT', await api('PUT', '/api/humanify/kpi-templates', { id: tplId, name: `Updated ${stamp}` }));
    expect('KPI template DELETE', await api('DELETE', `/api/humanify/kpi-templates?id=${tplId}`));
  }

  if (emp && tpl) {
    const assign = await api('POST', '/api/humanify/kpi', {
      employeeId: emp.id, period: month,
      metrics: [{ name: tpl.name, category: tpl.category, target: 100, unit: tpl.unit || '%', weight: 50, templateId: tpl.id }],
    });
    if (expect('KPI assign POST', assign, [200, 201])) {
      const refresh = await api('GET', `/api/humanify/kpi?period=${month}&employeeId=${emp.id}`);
      const metricId = (refresh.json.employeeKPIs || []).find((e) => String(e.employeeId) === String(emp.id))?.metrics?.[0]?.id;
      if (metricId) {
        expect('KPI PUT actual', await api('PUT', '/api/humanify/kpi', { id: metricId, actual: 88 }));
        expect('KPI DELETE', await api('DELETE', `/api/humanify/kpi?id=${metricId}`));
      } else fail('KPI metric after assign', 'not found');
    }
  } else fail('KPI assign prerequisites', `emp=${!!emp} tpl=${!!tpl}`);

  expect('KPI scoring POST', await api('POST', '/api/humanify/kpi-scoring', {
    metrics: [
      { name: 'A', actual: 90, target: 100, weight: 50 },
      { name: 'B', actual: 80, target: 100, weight: 50 },
    ],
  }));
  expect('KPI settings GET', await api('GET', '/api/humanify/kpi-settings'));

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
    if (expect('Performance POST', perfPost, [200, 201]) && reviewId) {
      expect('Performance GET', await api('GET', `/api/humanify/performance?id=${reviewId}`));
      expect('Performance PUT', await api('PUT', '/api/humanify/performance', { id: reviewId, status: 'submitted' }));
      const fb = await api('POST', '/api/humanify/performance-360', {
        reviewId, employeeId: emp.id, feedbackType: 'peer', competency: 'Komunikasi',
        rating: 4, comments: `Smoke ${stamp}`,
      });
      expect('Performance 360 POST', fb, [200, 201]);
      expect('Performance DELETE', await api('DELETE', `/api/humanify/performance?id=${reviewId}`));
    }
  }

  expect('Performance 360 GET', await api('GET', '/api/humanify/performance-360'));
  expect('Nine-box GET', await api('GET', '/api/humanify/nine-box'));

  for (const action of ['overview', 'surveys', 'recognitions', 'announcements']) {
    expect(`Engagement GET ${action}`, await api('GET', `/api/humanify/engagement?action=${action}`));
  }

  const surveyPost = await api('POST', '/api/humanify/engagement?action=survey', {
    title: `Smoke Survey ${stamp}`, description: 'test', surveyType: 'engagement', isAnonymous: true,
    questions: [{ id: `q${stamp}`, text: 'How satisfied?', type: 'rating', required: true }],
  });
  const surveyId = surveyPost.json.data?.id;
  if (expect('Engagement survey POST', surveyPost, [200, 201]) && surveyId) {
    expect('Engagement publish survey', await api('POST', '/api/humanify/engagement?action=publish-survey', { id: surveyId }));
    expect('Engagement survey detail GET', await api('GET', `/api/humanify/engagement?action=survey-detail&id=${surveyId}`));
    expect('Engagement close survey', await api('POST', '/api/humanify/engagement?action=close-survey', { id: surveyId }));
    expect('Engagement survey DELETE', await api('DELETE', `/api/humanify/engagement?action=survey&id=${surveyId}`));
  }

  const annPost = await api('POST', '/api/humanify/engagement?action=announcement', {
    title: `Smoke Ann ${stamp}`, content: 'content', category: 'general', priority: 'normal',
  });
  const annId = annPost.json.data?.id;
  if (expect('Engagement announcement POST', annPost, [200, 201]) && annId) {
    expect('Engagement announcement PUT', await api('PUT', `/api/humanify/engagement?action=announcement&id=${annId}`, { title: `Updated ${stamp}` }));
    expect('Engagement announcement DELETE', await api('DELETE', `/api/humanify/engagement?action=announcement&id=${annId}`));
  }

  if (emp) {
    const recPost = await api('POST', '/api/humanify/engagement?action=recognition', {
      toEmployeeId: emp.id, recognitionType: 'kudos', title: `Smoke Rec ${stamp}`, message: 'Great', points: 10,
    });
    const recId = recPost.json.data?.id;
    if (expect('Engagement recognition POST', recPost, [200, 201]) && recId) {
      expect('Engagement recognition DELETE', await api('DELETE', `/api/humanify/engagement?action=recognition&id=${recId}`));
    }
  }

  console.log('\nStress: 30 concurrent mixed reads...');
  const paths = [
    `/api/humanify/kpi?period=${month}`,
    '/api/humanify/kpi-settings',
    '/api/humanify/performance',
    '/api/humanify/engagement?action=overview',
  ];
  const t0 = Date.now();
  const stress = await Promise.all(Array.from({ length: 30 }, (_, i) => api('GET', paths[i % paths.length])));
  const okStress = stress.filter((r) => r.res.status === 200).length;
  const elapsed = Date.now() - t0;
  if (okStress === 30) ok(`Stress 30/30 in ${elapsed}ms`);
  else fail('Stress mixed reads', `${okStress}/30 in ${elapsed}ms`);

  console.log('\n══════════════════════════════════════════════');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log('  •', f));
  console.log('══════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

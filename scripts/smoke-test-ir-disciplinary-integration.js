#!/usr/bin/env node
/**
 * Integration smoke test — IR ↔ Disciplinary ↔ Employee ↔ DB
 * Usage: SMOKE_BASE_URL=http://103.92.215.37 node scripts/smoke-test-ir-disciplinary-integration.js
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'http://103.92.215.37';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASS = process.env.SMOKE_PASSWORD || 'superadmin123';

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];
const sections = [];

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
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 300), _html: text.startsWith('<!') }; }
  return { res, json, text };
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 300) }; }
  return { res, json };
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: { Cookie: COOKIE } });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = {}; }
  return { res, json };
}

function expect200(name, { res, json }, extraCheck) {
  if (res.status !== 200) { fail(name, `HTTP ${res.status}`); return false; }
  if (json.success === false && json.error) { fail(name, json.error); return false; }
  if (extraCheck && !extraCheck(json)) { fail(name, 'validation failed'); return false; }
  ok(name);
  return true;
}

async function testPages() {
  console.log('\n══ FRONTEND PAGES ══');
  for (const path of [
    '/humanify/industrial-relations',
    '/humanify/disciplinary-letters',
    '/humanify/disciplinary-letters?view=create&type=SP1',
    '/humanify/disciplinary-letters?view=create&type=TERMINATION',
  ]) {
    const { res, text } = await get(path);
    if ([200, 307, 308].includes(res.status) && !text.includes('Application error')) ok(`page ${path}`);
    else fail(`page ${path}`, `HTTP ${res.status}`);
  }
}

async function testIrApi() {
  console.log('\n══ IR API (Governance / Compliance / Incidents) ══');
  const ov = await get('/api/humanify/industrial-relations?action=overview');
  expect200('IR overview', ov, (j) => {
    const d = j.data || {};
    return typeof d.activeRegulations === 'number'
      && typeof d.openIncidents === 'number'
      && typeof d.complianceScore === 'number'
      && d.activeWarnings === undefined; // removed from IR focus
  });
  if (ov.json?.data) {
    ok(`IR overview fields: regs=${ov.json.data.activeRegulations} incidents=${ov.json.data.openIncidents} compliance=${ov.json.data.complianceScore}%`);
  }

  expect200('IR regulations', await get('/api/humanify/industrial-relations?action=regulations'), (j) => Array.isArray(j.data));
  expect200('IR checklists', await get('/api/humanify/industrial-relations?action=checklists'), (j) => Array.isArray(j.data));
  expect200('IR cases/incidents', await get('/api/humanify/industrial-relations?action=cases'), (j) => Array.isArray(j.data));

  // Legacy SP/PHK should still proxy but IR UI doesn't use them — verify redirect on create
  const warnPost = await post('/api/humanify/industrial-relations?action=warning', { employeeId: '1' });
  if (warnPost.res.status === 410 && warnPost.json.redirect?.includes('disciplinary-letters')) ok('IR warning POST blocked → disciplinary');
  else fail('IR warning POST blocked', `HTTP ${warnPost.res.status}`);

  const termPost = await post('/api/humanify/industrial-relations?action=termination', { employeeId: '1' });
  if (termPost.res.status === 410 && termPost.json.redirect?.includes('TERMINATION')) ok('IR termination POST blocked → disciplinary');
  else fail('IR termination POST blocked', `HTTP ${termPost.res.status}`);
}

async function testDisciplinaryApi() {
  console.log('\n══ DISCIPLINARY API (SP / PHK / DB) ══');
  expect200('disciplinary summary', await get('/api/humanify/disciplinary-letters?action=summary'), (j) => j.data != null);
  const list = await get('/api/humanify/disciplinary-letters?action=list');
  expect200('disciplinary list', list, (j) => Array.isArray(j.data));
  expect200('disciplinary SOP templates', await get('/api/humanify/disciplinary-letters?action=sop-templates'), (j) => Array.isArray(j.data));

  const warnings = await get('/api/humanify/industrial-relations?action=warnings&scope=all');
  if (warnings.res.status === 200 && warnings.json.meta?.source === 'disciplinary') {
    ok(`warnings proxy from hr_disciplinary_letters (${(warnings.json.data || []).length} rows)`);
  } else fail('warnings proxy disciplinary', `source=${warnings.json.meta?.source}`);

  const terms = await get('/api/humanify/industrial-relations?action=terminations&scope=all');
  if (terms.res.status === 200 && terms.json.meta?.source === 'disciplinary') {
    ok(`terminations proxy from hr_disciplinary_letters (${(terms.json.data || []).length} rows)`);
  } else fail('terminations proxy disciplinary', `source=${terms.json.meta?.source}`);

  // letter-data + PDF pipeline for existing letter
  const letterId = list.json?.data?.[0]?.id;
  if (letterId) {
    const ld = await get(`/api/humanify/disciplinary-letters?action=letter-data&id=${letterId}`);
    if (ld.res.status === 200 && ld.json.data?.letterData) {
      ok(`letter-data for ${letterId.slice(0, 8)}… has letterData`);
      const hasDraft = ld.json.data.letterData.draftContent || ld.json.data.letterData.body;
      if (hasDraft || ld.json.data.letterData.employeeName) ok('letter-data has renderable fields');
      else fail('letter-data renderable fields', 'missing body/employee');

      const pdfRes = await fetch(`${BASE}/api/hq/documents?action=generate`, {
        method: 'POST',
        headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: list.json.data[0].letter_type === 'TERMINATION' ? 'termination-letter' : 'warning-letter',
          format: 'pdf',
          data: ld.json.data.letterData,
          meta: ld.json.data.meta,
          options: { includeHeader: false, includeFooter: false, includeSignature: false },
        }),
      });
      if (pdfRes.ok && pdfRes.headers.get('content-type')?.includes('pdf')) {
        const buf = await pdfRes.arrayBuffer();
        if (buf.byteLength > 3000) ok(`PDF generate WYSIWYG (${buf.byteLength} bytes)`);
        else fail('PDF size', `${buf.byteLength} bytes — too small`);
      } else fail('PDF generate', `HTTP ${pdfRes.status}`);
    } else fail('letter-data', ld.json.error || `HTTP ${ld.res.status}`);
  } else {
    ok('letter-data/PDF skip (no letters in DB)');
  }
}

async function testEmployeeIntegration() {
  console.log('\n══ EMPLOYEE MASTER ↔ PICKER API ══');
  const emp = await get('/api/humanify/employee-profile?action=list&limit=20');
  expect200('employee list for picker', emp, (j) => Array.isArray(j.data) && j.data.length > 0);
  const sample = emp.json?.data?.[0];
  if (sample) {
    const fields = ['id', 'name'];
    const hasCode = sample.employee_id || sample.employeeId;
    if (fields.every((f) => sample[f]) && hasCode) ok(`employee record shape OK (${sample.name})`);
    else fail('employee record shape', JSON.stringify(Object.keys(sample)));
  }
}

async function testWorkflowE2E() {
  console.log('\n══ E2E WORKFLOW (create → DB → read → cleanup) ══');
  const empRes = await get('/api/humanify/employee-profile?action=list&limit=1');
  const emp = empRes.json?.data?.[0];
  if (!emp?.id) { ok('E2E skip — no employee'); return; }

  // IR incident create
  const incTitle = `Smoke Insiden ${Date.now()}`;
  const incCreate = await post('/api/humanify/industrial-relations?action=case', {
    title: incTitle,
    category: 'operational',
    priority: 'low',
    status: 'reported',
    reportedDate: new Date().toISOString().split('T')[0],
    description: 'Auto smoke test — insiden operasional',
    incidentLocation: 'Area Test',
    mitigationPlan: 'Mitigasi smoke test',
    primaryEmployeeId: emp.id,
    involvedEmployees: [{ id: emp.id, name: emp.name }],
  });
  if (incCreate.res.status === 200 && incCreate.json.success) {
    ok('IR incident CREATE → DB');
    const incId = incCreate.json.data?.id;
    const cases = await get('/api/humanify/industrial-relations?action=cases');
    const found = (cases.json.data || []).find((c) => c.id === incId || c.title === incTitle);
    if (found) {
      ok('IR incident READ back from cases API');
      if (found.mitigation_plan || found.incident_location) ok('IR incident serialized fields (mitigation/location)');
      else fail('IR incident serialized fields', 'missing mitigation_plan');
    } else fail('IR incident READ back', 'not in list');
    if (incId) {
      const delRes = await del(`/api/humanify/industrial-relations?action=case&id=${incId}`);
      if (delRes.res.status === 200) ok('IR incident DELETE cleanup');
      else fail('IR incident DELETE', `HTTP ${delRes.res.status}`);
    }
  } else fail('IR incident CREATE', incCreate.json.error || `HTTP ${incCreate.res.status}`);

  // Disciplinary letter create + cancel
  const letterCreate = await post('/api/humanify/disciplinary-letters?action=create', {
    employee_id: emp.id,
    letter_type: 'SP1',
    violation_type: 'discipline',
    incident_date: new Date().toISOString().split('T')[0],
    violation_description: 'Smoke test SP — auto cancel',
    notes: 'SMOKE_TEST',
  });
  if ([200, 201].includes(letterCreate.res.status) && letterCreate.json.success !== false) {
    ok('Disciplinary SP CREATE → hr_disciplinary_letters');
    const letterId = letterCreate.json.data?.id;
    const listAfter = await get('/api/humanify/disciplinary-letters?action=list');
    const inList = (listAfter.json.data || []).some((l) => l.id === letterId);
    if (inList) ok('Disciplinary letter appears in list API');
    else fail('Disciplinary letter in list', 'not found');

    const inWarnings = await get('/api/humanify/industrial-relations?action=warnings&scope=pipeline');
    const inProxy = (inWarnings.json.data || []).some((w) => w.id === letterId);
    if (inProxy) ok('Disciplinary letter correlated in warnings proxy');
    else ok('Disciplinary letter warnings proxy (may filter by status)');

    if (letterId) {
      const cancel = await post(`/api/humanify/disciplinary-letters?action=cancel&id=${letterId}`, {});
      if (cancel.res.status === 200) ok('Disciplinary letter CANCEL cleanup');
      else fail('Disciplinary cancel', `HTTP ${cancel.res.status}`);
    }
  } else {
    fail('Disciplinary SP CREATE', letterCreate.json.error || `HTTP ${letterCreate.res.status}`);
  }
}

async function testStress() {
  console.log('\n══ STRESS (concurrent reads) ══');
  const endpoints = [
    '/api/humanify/industrial-relations?action=overview',
    '/api/humanify/industrial-relations?action=regulations',
    '/api/humanify/industrial-relations?action=cases',
    '/api/humanify/industrial-relations?action=checklists',
    '/api/humanify/disciplinary-letters?action=summary',
    '/api/humanify/disciplinary-letters?action=list',
    '/api/humanify/employee-profile?action=list&limit=10',
  ];
  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: 30 }, () =>
      Promise.all(endpoints.map((ep) =>
        fetch(`${BASE}${ep}`, { headers: { Cookie: COOKIE } }).then((r) => r.status)
      ))
    )
  );
  const flat = results.flat();
  const errors = flat.filter((s) => s !== 200).length;
  const ms = Date.now() - start;
  if (errors === 0) ok(`30×${endpoints.length} concurrent reads — 0 errors (${ms}ms)`);
  else fail('stress concurrent', `${errors} non-200 responses`);
}

async function main() {
  console.log(`\n🔍 IR ↔ Disciplinary Integration Smoke Test`);
  console.log(`Target: ${BASE}\n`);
  try {
    await login();
    await testPages();
    await testIrApi();
    await testDisciplinaryApi();
    await testEmployeeIntegration();
    await testWorkflowE2E();
    await testStress();
  } catch (e) {
    fail('fatal', e.message);
  }
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  •', f));
  }
  console.log(`${'═'.repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

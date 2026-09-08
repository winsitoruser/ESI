#!/usr/bin/env node
/**
 * Production UAT + Backend + Frontend + Integration smoke
 * for Humanify employees / profile sub-data.
 *
 * Run:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-employees-uat-prod.js
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean);

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];
const stamp = Date.now();
const created = { employeeId: null, familyId: null, educationId: null, certId: null, expId: null, contractId: null };

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
    .find((c) => c.includes('csrf-token'))?.split(';')[0] || '';
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
    if (session?.user?.email) {
      ok(`login as ${session.user.email} (role=${session.user.role || '?'})`);
      return session;
    }
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
  return { res, json, status: res.status };
}

function expectOk(name, { status, json }, opts = {}) {
  const allow = opts.allowStatus || [200, 201];
  if (!allow.includes(status)) {
    fail(name, `HTTP ${status} ${json.error || json.message || json._raw || ''}`);
    return false;
  }
  if (json.success === false) {
    fail(name, json.error || 'success=false');
    return false;
  }
  ok(name);
  return true;
}

async function sectionHealth() {
  console.log('\n══ 1. Health / Backend readiness ══');
  const health = await fetch(`${BASE}/api/health`);
  const hj = await health.json().catch(() => ({}));
  if (health.status === 200 && (hj.status === 'ok' || hj.ok === true || hj.service)) {
    ok(`GET /api/health → ${health.status} service=${hj.service || '?'}`);
  } else fail('GET /api/health', `HTTP ${health.status}`);

  const perms = await api('GET', '/api/humanify/me/permissions');
  if (expectOk('GET /api/humanify/me/permissions', perms)) {
    if (perms.json.isSuperAdmin || perms.json.permissions?.['*'] || perms.json.permissions?.['employees.*']) {
      ok('permissions include employee access');
    } else fail('permissions employee access', JSON.stringify(Object.keys(perms.json.permissions || {}).slice(0, 8)));
  }
}

async function sectionFrontendUat() {
  console.log('\n══ 2. Frontend / UAT page smoke ══');
  const pages = [
    '/humanify/login',
    '/humanify/employees',
    '/humanify/employees?add=1',
    '/humanify/organization',
    '/humanify/contracts',
    '/humanify/onboarding',
    '/api/health',
  ];
  for (const p of pages) {
    const res = await fetch(`${BASE}${p}`, {
      headers: p.startsWith('/api') ? undefined : { Cookie: COOKIE },
      redirect: 'manual',
    });
    // login may 200; protected pages 200 when authed, or 307/302 to login if cookie not enough for HTML
    const okStatus = [200, 302, 307, 308].includes(res.status);
    if (okStatus) ok(`page ${p} → ${res.status}`);
    else fail(`page ${p}`, `HTTP ${res.status}`);
  }

  // Authenticated HTML should not be the bare login shell only for employees
  const empPage = await fetch(`${BASE}/humanify/employees`, { headers: { Cookie: COOKIE } });
  const html = await empPage.text();
  if (empPage.status === 200) {
    ok('employees HTML 200');
    // Next.js pages router still hydrates client-side; ensure chunk/app shell present
    if (html.includes('__NEXT_DATA__') || html.includes('/_next/static')) ok('employees page has Next.js shell');
    else fail('employees Next.js shell');
  } else fail('employees HTML', `HTTP ${empPage.status}`);

  // Public login CTA copy
  const loginHtml = await (await fetch(`${BASE}/humanify/login`)).text();
  if (/Masuk|Humanify|password/i.test(loginHtml)) ok('login page has auth UI markers');
  else fail('login page markers');
}

async function sectionBackendApis() {
  console.log('\n══ 3. Backend API smoke ══');
  const list = await api('GET', '/api/humanify/employee-profile?action=list&limit=5');
  expectOk('list employees', list);
  if ((list.json.data || []).length >= 1) ok(`list returned ${list.json.data.length} row(s)`);
  else fail('list has rows');

  const master = await api('GET', '/api/humanify/master-data');
  expectOk('master-data', master);

  const sample = list.json.data?.[0];
  if (sample?.id) {
    const detail = await api('GET', `/api/humanify/employee-profile?action=detail&employeeId=${sample.id}`);
    if (expectOk('detail employee', detail)) {
      const d = detail.json.data || {};
      for (const key of ['families', 'educations', 'certifications', 'experiences', 'contracts', 'documents']) {
        if (Array.isArray(d[key])) ok(`detail.${key} is array (${d[key].length})`);
        else fail(`detail.${key} array`);
      }
    }
  }

  // Validation: missing required should 400
  const badFam = await api('POST', '/api/humanify/employee-profile?action=family', {
    employee_id: sample?.id,
    name: '',
    relationship: '',
  });
  if (badFam.status === 400 || badFam.json.success === false) ok('family rejects empty required fields');
  else fail('family validation', `HTTP ${badFam.status}`);
}

async function sectionIntegration() {
  console.log('\n══ 4. Integration / UAT employee journey ══');
  const email = `uat.emp.${stamp}@humanify.id`;
  const create = await api('POST', '/api/humanify/employee-profile?action=create', {
    name: `UAT Karyawan ${stamp}`,
    email,
    phone_number: '081234567890',
    department: 'IT',
    position: 'Staff UAT',
    work_location: 'ADMIN_OFFICE',
    gender: 'female',
    nik: '3174010101900099',
    join_date: '2026-08-01',
    employment_category: 'permanent',
    contract_type: 'PKWTT',
  });
  if (!expectOk('create employee', create, { allowStatus: [200, 201] })) return;
  created.employeeId = create.json.data?.id;
  if (!created.employeeId) {
    fail('create returned id');
    return;
  }
  ok(`created id=${created.employeeId}`);

  const fam = await api('POST', '/api/humanify/employee-profile?action=family', {
    employee_id: created.employeeId,
    name: 'Ibu UAT',
    relationship: 'parent',
    gender: 'FEMALE',
    date_of_birth: '',
    phone_number: '',
    is_emergency_contact: true,
    is_dependent: false,
  });
  if (expectOk('add family (empty optional dates)', fam, { allowStatus: [200, 201] })) {
    created.familyId = fam.json.data?.id;
  }

  const edu = await api('POST', '/api/humanify/employee-profile?action=education', {
    employee_id: created.employeeId,
    level: 'S1',
    institution: 'Universitas UAT',
    major: 'Informatika',
    degree: 'S.Kom',
    start_year: '',
    end_year: 2020,
    gpa: '',
    is_highest: true,
  });
  if (expectOk('add education', edu, { allowStatus: [200, 201] })) {
    created.educationId = edu.json.data?.id;
  }

  const cert = await api('POST', '/api/humanify/employee-profile?action=certification', {
    employee_id: created.employeeId,
    name: 'BNSP UAT',
    issuing_organization: 'BNSP',
    issue_date: '2024-01-01',
    expiry_date: '2027-01-01',
  });
  if (expectOk('add certification', cert, { allowStatus: [200, 201] })) {
    created.certId = cert.json.data?.id;
  }

  const exp = await api('POST', '/api/humanify/employee-profile?action=experience', {
    employee_id: created.employeeId,
    company_name: 'PT UAT',
    position: 'Intern',
    start_date: '2019-01-01',
    end_date: '2020-01-01',
    description: 'smoke',
  });
  if (expectOk('add experience', exp, { allowStatus: [200, 201] })) {
    created.expId = exp.json.data?.id;
  }

  const contract = await api('POST', '/api/humanify/employee-profile?action=contract', {
    employee_id: created.employeeId,
    contract_type: 'PKWTT',
    start_date: '2026-08-01',
    end_date: '',
    salary: '',
    position: 'Staff UAT',
    department: 'IT',
  });
  if (expectOk('add contract (empty end/salary)', contract, { allowStatus: [200, 201] })) {
    created.contractId = contract.json.data?.id;
  }

  const personal = await api('POST', '/api/humanify/employee-profile?action=update-personal', {
    id: created.employeeId,
    name: `UAT Karyawan ${stamp}`,
    gender: 'FEMALE',
    national_id: '3174010101900099',
    phone_number: '081234567891',
  });
  expectOk('update personal', personal);

  const detail = await api('GET', `/api/humanify/employee-profile?action=detail&employeeId=${created.employeeId}`);
  if (expectOk('detail after writes', detail)) {
    const d = detail.json.data || {};
    const checks = [
      ['families', 1],
      ['educations', 1],
      ['certifications', 1],
      ['experiences', 1],
      ['contracts', 1],
    ];
    for (const [k, min] of checks) {
      const n = d[k]?.length || 0;
      if (n >= min) ok(`detail.${k} >= ${min} (got ${n})`);
      else fail(`detail.${k}`, `expected >=${min} got ${n}`);
    }
    if (d.gender === 'FEMALE' || d.gender === 'female') ok('detail.gender persisted');
    else fail('detail.gender', String(d.gender));
    if (d.national_id === '3174010101900099') ok('detail.national_id persisted');
    else fail('detail.national_id', String(d.national_id));
  }

  // Update + delete family
  if (created.familyId) {
    const upd = await api('POST', '/api/humanify/employee-profile?action=family', {
      id: created.familyId,
      employee_id: created.employeeId,
      name: 'Ibu UAT Updated',
      relationship: 'parent',
    });
    expectOk('update family', upd);
    const del = await api('DELETE', '/api/humanify/employee-profile?action=family', { id: created.familyId });
    expectOk('delete family', del);
  }
}

async function cleanup() {
  console.log('\n══ 5. Cleanup ══');
  for (const [action, id] of [
    ['education', created.educationId],
    ['certification', created.certId],
    ['experience', created.expId],
    ['contract', created.contractId],
  ]) {
    if (!id) continue;
    const del = await api('DELETE', `/api/humanify/employee-profile?action=${action}`, { id });
    if (del.json.success) ok(`cleanup ${action}`);
    else fail(`cleanup ${action}`, del.json.error || `HTTP ${del.status}`);
  }
  if (created.employeeId) {
    const soft = await api('POST', '/api/humanify/employee-profile?action=delete', {
      employeeId: created.employeeId,
    });
    expectOk('soft-delete employee', soft);
  }
}

async function main() {
  console.log(`\n████ Humanify Employees UAT @ ${BASE} ████`);
  console.log(`stamp=${stamp}`);
  await login();
  await sectionHealth();
  await sectionFrontendUat();
  await sectionBackendApis();
  await sectionIntegration();
  await cleanup();

  console.log(`\n═══ RESULT: ${passed} passed, ${failed} failed ═══`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log(' -', f));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

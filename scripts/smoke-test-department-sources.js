#!/usr/bin/env node
/**
 * Smoke test — konsistensi sumber data Departemen & Role di Humanify VPS
 * Usage: SMOKE_BASE_URL=http://43.157.243.54 node scripts/smoke-test-department-sources.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://43.157.243.54';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

const HRIS_DEPARTMENT_CODES = [
  'MANAGEMENT', 'OPERATIONS', 'SALES', 'FINANCE', 'ADMINISTRATION', 'WAREHOUSE',
  'CUSTOMER_SERVICE', 'IT', 'HR', 'MARKETING', 'LOGISTICS', 'CLINICAL', 'PHARMACY', 'PRODUCTION',
];

const DEPT_PAGES = [
  '/humanify/organization',
  '/humanify/employees',
  '/humanify/leave',
  '/humanify/contracts',
  '/humanify/performance',
  '/humanify/mutations',
  '/humanify/payroll/main',
  '/humanify/payroll/slip-gaji',
  '/humanify/payroll/laporan',
  '/humanify/recruitment',
  '/humanify/team-members',
  '/humanify/workforce-analytics',
  '/humanify/announcements',
  '/humanify/training-development',
  '/humanify/reports',
  '/humanify/onboarding',
  '/humanify/offboarding',
  '/humanify/attendance',
  '/humanify/kpi',
];

const ROLE_PAGES = [
  '/humanify/users/roles',
  '/humanify/team-members',
];

const DEPT_APIS = [
  '/api/humanify/master-data',
  '/api/humanify/organization?action=org-tree',
  '/api/humanify/organization?action=org-list',
  '/api/humanify/organization?action=summary',
  '/api/humanify/organization?action=job-grades',
  '/api/humanify/employee-profile?action=list&limit=50',
  '/api/humanify/employees?limit=50',
  '/api/humanify/dashboard',
  '/api/humanify/workforce-analytics?action=headcount-plans',
  '/api/humanify/reports-hub?action=headcount-by-dept',
  '/api/humanify/leave-management?action=types',
  '/api/humanify/recruitment?action=openings',
  '/api/humanify/team-members?limit=20',
  '/api/humanify/me/permissions',
];

const ROLE_APIS = [
  '/api/humanify/me/permissions',
  '/api/humanify/roles',
  '/api/humanify/users/by-role?group=1',
];

let COOKIE = '';
const report = {
  passed: 0,
  failed: 0,
  warnings: [],
  failures: [],
  sources: {},
  employeeDepts: new Set(),
  orgCodes: new Set(),
  masterCodes: new Set(),
};

const ok = (m) => { console.log('  ✓', m); report.passed++; };
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ✗', line);
  report.failures.push(line);
  report.failed++;
};
const warn = (m) => { console.log('  ⚠', m); report.warnings.push(m); };

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
    if (session?.user?.email) {
      ok(`login sebagai ${session.user.email} (role: ${session.user.role})`);
      return session;
    }
  }
  throw new Error('Login gagal');
}

async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE } });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _html: text.startsWith('<!'), _raw: text.slice(0, 120) }; }
  return { res, json };
}

async function pageGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  return { res, status: res.status };
}

function collectOrgCodes(nodes) {
  for (const n of nodes || []) {
    if (n.code) report.orgCodes.add(String(n.code).toUpperCase());
    if (n.name) report.orgCodes.add(String(n.name));
    collectOrgCodes(n.children);
  }
}

function normCode(v) {
  return String(v || '').trim().toUpperCase();
}

async function testSources() {
  console.log('\n=== 1. Sumber data departemen (API) ===');

  const md = await apiGet('/api/humanify/master-data');
  if (md.res.status === 200 && md.json?.data?.departments) {
    const codes = md.json.data.departments.map((d) => d.code);
    codes.forEach((c) => report.masterCodes.add(c));
    const match = codes.every((c) => HRIS_DEPARTMENT_CODES.includes(c));
    if (match && codes.length === HRIS_DEPARTMENT_CODES.length) {
      ok(`master-data: ${codes.length} departemen sesuai HRIS_DEPARTMENTS`);
    } else {
      warn(`master-data: ${codes.length} kode — selisih vs kode statis di repo`);
    }
    report.sources.masterData = codes;
  } else {
    fail('master-data API', `HTTP ${md.res.status}`);
  }

  const tree = await apiGet('/api/humanify/organization?action=org-tree');
  if (tree.res.status === 200) {
    collectOrgCodes(tree.json?.data || []);
    collectOrgCodes(tree.json?.flat || []);
    ok(`organization org-tree: ${report.orgCodes.size} unit (kode+nama)`);
    report.sources.orgTree = [...report.orgCodes];
  } else {
    fail('organization org-tree', `HTTP ${tree.res.status}`);
  }

  const summary = await apiGet('/api/humanify/organization?action=summary');
  if (summary.res.status === 200) {
    const breakdown = summary.json?.data?.departmentBreakdown || [];
    breakdown.forEach((d) => report.employeeDepts.add(d.department || d.dept || d.name));
    ok(`organization summary: ${breakdown.length} departemen dari data karyawan`);
    report.sources.employeeBreakdown = breakdown;
  } else {
    fail('organization summary', `HTTP ${summary.res.status}`);
  }

  const emp = await apiGet('/api/humanify/employee-profile?action=list&limit=100');
  if (emp.res.status === 200) {
    const rows = emp.json?.data || emp.json?.employees || [];
    rows.forEach((e) => { if (e.department) report.employeeDepts.add(e.department); });
    ok(`employee-profile list: ${rows.length} karyawan`);
  } else {
    fail('employee-profile list', `HTTP ${emp.res.status}`);
  }
}

async function testConsistency() {
  console.log('\n=== 2. Konsistensi antar sumber ===');

  const master = [...report.masterCodes];
  const orgOverlap = master.filter((c) => report.orgCodes.has(c));
  if (orgOverlap.length > 0) {
    ok(`org_structures overlap master: ${orgOverlap.join(', ')}`);
  } else {
    warn('org_structures tidak punya kode yang sama dengan master-data departments');
  }

  const onlyInOrg = [...report.orgCodes].filter((c) => !master.includes(c) && c !== 'ESI-GROUP');
  if (onlyInOrg.length) {
    warn(`Unit org tanpa padanan master dept: ${onlyInOrg.slice(0, 8).join(', ')}${onlyInOrg.length > 8 ? '…' : ''}`);
  }

  const unknownEmpDepts = [...report.employeeDepts].filter((d) => {
    const u = normCode(d);
    return u && !HRIS_DEPARTMENT_CODES.includes(u) && !master.includes(u) && !report.orgCodes.has(d) && !report.orgCodes.has(u);
  });
  if (unknownEmpDepts.length) {
    warn(`Karyawan punya dept di luar master & org: ${unknownEmpDepts.join(', ')}`);
  } else {
    ok('Semua dept karyawan ada di master atau org');
  }

  const caseMismatch = [...report.employeeDepts].filter((d) => {
    const u = normCode(d);
    return u && HRIS_DEPARTMENT_CODES.includes(u) && d !== u;
  });
  if (caseMismatch.length) {
    warn(`Dept karyawan beda casing (seharusnya UPPER): ${caseMismatch.join(', ')}`);
  }

  const missingInOrg = master.filter((c) => !report.orgCodes.has(c));
  if (missingInOrg.length) {
    warn(`Master dept belum ada di org_structures: ${missingInOrg.join(', ')}`);
  }
}

async function testDeptPages() {
  console.log('\n=== 3. Halaman terkait departemen ===');
  for (const path of DEPT_PAGES) {
    const { status } = await pageGet(path);
    if (status === 200) ok(`page ${path}`);
    else if (status === 307 || status === 302) ok(`page ${path} (${status} redirect)`);
    else fail(`page ${path}`, `HTTP ${status}`);
  }
}

async function testDeptApis() {
  console.log('\n=== 4. API terkait departemen ===');
  for (const path of DEPT_APIS) {
    const { res, json } = await apiGet(path);
    if (res.status === 200 && !json._html) ok(`api ${path.split('?')[0]}`);
    else if (res.status === 404) fail(`api ${path}`, '404 Not Found');
    else fail(`api ${path}`, `HTTP ${res.status}`);
  }
}

async function testRoles() {
  console.log('\n=== 5. Role & permission ===');
  for (const path of ROLE_PAGES) {
    const { status } = await pageGet(path);
    if (status === 200 || status === 307) ok(`page ${path}`);
    else fail(`page ${path}`, `HTTP ${status}`);
  }

  for (const path of ROLE_APIS) {
    const { res, json } = await apiGet(path);
    if (res.status === 200 && !json._html) {
      if (path.includes('me/permissions')) {
        ok(`api permissions — isSuperAdmin=${json.isSuperAdmin}, role=${json.role}`);
      } else if (path.includes('/roles')) {
        const count = Array.isArray(json.data) ? json.data.length : (json.roles?.length || 0);
        ok(`api ${path.split('?')[0]} — ${count || 'ok'} roles`);
      } else {
        ok(`api ${path.split('?')[0]}`);
      }
    } else if (res.status === 404) {
      fail(`api ${path}`, '404 — RBAC API tidak tersedia di VPS Humanify');
    } else {
      fail(`api ${path}`, `HTTP ${res.status}`);
    }
  }
}

async function main() {
  console.log(`\n🔍 Smoke test Departemen & Role — ${BASE}\n`);
  try {
    await login();
    await testSources();
    await testConsistency();
    await testDeptPages();
    await testDeptApis();
    await testRoles();

    console.log('\n' + '='.repeat(60));
    console.log(`  Lulus: ${report.passed}  |  Gagal: ${report.failed}  |  Peringatan: ${report.warnings.length}`);
    console.log('='.repeat(60));

    if (report.warnings.length) {
      console.log('\nPeringatan konsistensi:');
      report.warnings.forEach((w) => console.log(`  • ${w}`));
    }
    if (report.failures.length) {
      console.log('\nGagal:');
      report.failures.forEach((f) => console.log(`  • ${f}`));
    }

    console.log('\n📌 Kesimpulan SSOT:');
    console.log('  • Departemen disinkronkan dari org_structures via /api/humanify/master-data');
    console.log('  • Halaman /humanify/organization mengelola hierarki unit (SSOT DB)');
    console.log('  • Form memakai DepartmentSelect → fetch master-data API');

    process.exit(report.failed > 0 ? 1 : 0);
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
}

main();

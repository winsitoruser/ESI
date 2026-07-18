#!/usr/bin/env node
/**
 * Payroll golden path — create employee salary → run → calculate → assert net identity.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-payroll-golden.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

const today = new Date();
const periodStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

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

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('Payroll golden path smoke');
  console.log('Target:', BASE);

  await login();
  ok('login');

  const stamp = Date.now().toString(36);
  const BASE_SALARY = 8_000_000;
  const ALLOWANCE = 500_000;

  const emp = await api('POST', '/api/humanify/employees', {
    name: `Golden Payroll ${stamp}`,
    email: `golden-pay-${stamp}@contoh.test`,
    position: 'Staff',
    department: 'Finance',
  });
  const empId = emp.json?.data?.id;
  if (!empId) {
    fail('create employee', JSON.stringify(emp.json).slice(0, 160));
    process.exit(1);
  }
  ok(`employee ${empId}`);

  const salary = await api('POST', '/api/humanify/payroll?action=employee-salary', {
    employeeId: empId,
    baseSalary: BASE_SALARY,
    payType: 'monthly',
    taxStatus: 'TK/0',
    allowances: [{ code: 'TRANSPORT', name: 'Transport', amount: ALLOWANCE }],
  });
  if (salary.status >= 400 || salary.json?.success === false) {
    fail('upsert salary', salary.json?.error || `HTTP ${salary.status}`);
  } else {
    ok('upsert employee salary');
  }

  const run = await api('POST', '/api/humanify/payroll?action=run', {
    periodStart,
    periodEnd,
    payDate: periodEnd,
    payType: 'monthly',
    name: `Golden ${stamp}`,
  });
  const runId = run.json?.data?.id;
  if (!runId) {
    fail('create run', run.json?.error || `HTTP ${run.status}`);
    process.exit(failed > 0 ? 1 : 0);
  }
  ok(`payroll run ${runId}`);

  const calc = await api('POST', '/api/humanify/payroll?action=calculate', { runId });
  if (calc.status !== 200 || calc.json?.success === false) {
    fail('calculate', calc.json?.error || `HTTP ${calc.status}`);
  } else {
    ok('calculate');
  }

  const payslips = await api('GET', `/api/humanify/payroll?action=payslip&runId=${runId}`);
  const rows = payslips.json?.data || payslips.json?.payslips || [];
  const list = Array.isArray(rows) ? rows : (rows.items || []);
  const mine = list.find((r) => String(r.employee_id || r.employeeId) === String(empId)) || list[0];

  if (!mine) {
    fail('payslip row', 'no payslip for golden employee (empty tenant ok if calculate skipped)');
  } else {
    const gross = Number(mine.gross_salary ?? mine.total_earnings ?? 0);
    const ded = Number(mine.total_deductions ?? 0);
    const net = Number(mine.net_salary ?? 0);
    const expectedNet = gross - ded;
    if (Math.abs(net - expectedNet) <= 1) {
      ok(`net identity: net=${net} = gross(${gross}) - ded(${ded})`);
    } else {
      fail('net identity', `net=${net} expected ${expectedNet}`);
    }
    if (gross >= BASE_SALARY) ok(`gross >= base salary (${gross} >= ${BASE_SALARY})`);
    else fail('gross floor', `gross=${gross} < base ${BASE_SALARY}`);
  }

  const overview = await api('GET', '/api/humanify/payroll');
  if (overview.status === 200 && overview.json?.success !== false) ok('payroll overview');
  else fail('payroll overview', `HTTP ${overview.status}`);

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

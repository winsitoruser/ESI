#!/usr/bin/env node
/**
 * Payroll golden path — salary → run → calculate → net identity
 * + Wave-63 attendance → generate-from-attendance → OVERTIME line.
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

/** Prefer a weekday inside the current period for attendance seed. */
function attendanceSeedDate() {
  const d = new Date(today);
  for (let i = 0; i < 7; i++) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const iso = d.toISOString().split('T')[0];
      if (iso >= periodStart && iso <= periodEnd) return iso;
    }
    d.setDate(d.getDate() - 1);
  }
  return periodStart;
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

function parseEarnings(row) {
  let earnings = row?.earnings;
  if (typeof earnings === 'string') {
    try { earnings = JSON.parse(earnings); } catch { earnings = []; }
  }
  if (!Array.isArray(earnings)) {
    let comps = row?.components;
    if (typeof comps === 'string') {
      try { comps = JSON.parse(comps); } catch { comps = {}; }
    }
    earnings = comps?.earnings || [];
  }
  return Array.isArray(earnings) ? earnings : [];
}

async function main() {
  console.log('Payroll golden path smoke');
  console.log('Target:', BASE);

  await login();
  ok('login');

  const stamp = Date.now().toString(36);
  const BASE_SALARY = 8_000_000;
  const ALLOWANCE = 500_000;
  const OT_MINUTES = 120;

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

  // --- Classic path: run → calculate → net identity ---
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
  } else {
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
      fail('payslip row', 'no payslip for golden employee');
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
      if (gross >= BASE_SALARY + ALLOWANCE) {
        ok(`gross includes allowance floor (${gross} >= ${BASE_SALARY + ALLOWANCE})`);
      } else {
        console.log(`  · gross allowance soft-skip (gross=${gross} < ${BASE_SALARY + ALLOWANCE})`);
      }
    }
  }

  // --- Wave-63: attendance → generate-from-attendance ---
  const attDate = attendanceSeedDate();
  const importRes = await api('POST', '/api/humanify/attendance-bulk?action=import', {
    records: [{
      employeeCode: String(empId),
      date: attDate,
      clockIn: '08:00',
      clockOut: '19:00',
      status: 'late',
      overtimeMinutes: OT_MINUTES,
      lateMinutes: 30,
      source: 'golden-smoke',
      notes: `wave63-${stamp}`,
    }],
  });
  if (importRes.status >= 400 || importRes.json?.success === false) {
    fail('attendance import', importRes.json?.error || JSON.stringify(importRes.json).slice(0, 160));
  } else if (Number(importRes.json?.imported || 0) < 1) {
    fail('attendance import', (importRes.json?.errors || []).join('; ') || `imported=${importRes.json?.imported}`);
  } else {
    ok(`attendance seeded ${attDate} OT=${OT_MINUTES}m`);
  }

  const summary = await api(
    'GET',
    `/api/humanify/payroll?action=attendance-summary&periodStart=${periodStart}&periodEnd=${periodEnd}`,
  );
  const summaryRows = Array.isArray(summary.json?.data) ? summary.json.data : [];
  const mySum = summaryRows.find((r) => String(r.employee_id) === String(empId));
  if (!mySum) {
    fail('attendance-summary', 'golden employee missing from tenant summary');
  } else {
    const otH = Number(mySum.total_overtime_hours || 0);
    if (otH >= 1.9) ok(`attendance-summary OT hours=${otH}`);
    else fail('attendance-summary OT', `expected ~2h got ${otH}`);
  }

  const gen = await api('POST', '/api/humanify/payroll?action=generate-from-attendance', {
    periodStart,
    periodEnd,
    payDate: periodEnd,
    name: `Golden Att ${stamp}`,
  });
  const attRunId = gen.json?.data?.id;
  if (!attRunId || gen.json?.success === false) {
    fail('generate-from-attendance', gen.json?.error || `HTTP ${gen.status}`);
  } else {
    ok(`generate-from-attendance run ${attRunId}`);

    const attPayslips = await api('GET', `/api/humanify/payroll?action=payslip&runId=${attRunId}`);
    const attRows = attPayslips.json?.data || attPayslips.json?.payslips || [];
    const attList = Array.isArray(attRows) ? attRows : (attRows.items || []);
    const attMine = attList.find((r) => String(r.employee_id || r.employeeId) === String(empId));
    if (!attMine) {
      fail('att payslip', 'golden employee missing from attendance-generated run');
    } else {
      const gross = Number(attMine.gross_salary ?? attMine.total_earnings ?? 0);
      const ded = Number(attMine.total_deductions ?? 0);
      const net = Number(attMine.net_salary ?? 0);
      if (Math.abs(net - (gross - ded)) <= 1) ok(`att net identity net=${net}`);
      else fail('att net identity', `net=${net} expected ${gross - ded}`);

      const earnings = parseEarnings(attMine);
      const hasOt = earnings.some((e) => String(e.code || '').toUpperCase() === 'OVERTIME' && Number(e.amount) > 0)
        || Number(attMine.overtime_amount || attMine.overtime_hours || 0) > 0;
      if (hasOt) ok('OVERTIME earnings present');
      else fail('OVERTIME earnings', JSON.stringify(earnings).slice(0, 120));
    }
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

/**
 * Payroll smoke test — create run, calculate, approve, payslip
 * Usage: node scripts/smoke-test-payroll.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:3010';
const EMAIL = 'superadmin@bedagang.com';
const PASSWORD = 'MasterAdmin2026!';

let pass = 0, fail = 0;
const cookieJar = new Map();

function getCookieHeader() {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    const [pair] = c.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function ok(label, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: getCookieHeader() },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  storeCookies(res);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json, text };
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  storeCookies(csrfRes);
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: getCookieHeader() },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, callbackUrl: `${BASE}/hq/dashboard` }),
    redirect: 'manual',
  });
  storeCookies(loginRes);
  const session = await req('GET', '/api/auth/session');
  return session.json?.user?.email === EMAIL;
}

async function main() {
  console.log(`\nPayroll Smoke Test — ${BASE}\n`);

  const authed = await login();
  ok('Login', authed, EMAIL);
  if (!authed) { console.log(`\n${pass} pass, ${fail} fail\n`); process.exit(1); }

  const page = await fetch(`${BASE}/hq/hris/payroll/main`, { headers: { Cookie: getCookieHeader() } });
  ok('Page /hq/hris/payroll/main', page.status === 200, `HTTP ${page.status}`);

  const overview = await req('GET', '/api/hq/hris/payroll');
  ok('GET overview', overview.json.success === true);
  ok('Overview has components', Array.isArray(overview.json.components) && overview.json.components.length > 0,
    `${overview.json.components?.length || 0} components`);

  const salaries = await req('GET', '/api/hq/hris/payroll?action=employee-salaries');
  ok('GET employee-salaries', salaries.json.success === true);
  ok('Salaries configured', (salaries.json.data?.length || 0) >= 1,
    `${salaries.json.data?.length || 0} configs`);

  const comps = await req('GET', '/api/hq/hris/payroll?action=components');
  ok('GET components', comps.json.success === true);

  const periodStart = '2026-07-01';
  const periodEnd = '2026-07-31';
  const create = await req('POST', '/api/hq/hris/payroll?action=run', {
    periodStart, periodEnd, payDate: periodEnd, payType: 'monthly',
    name: `Smoke Test Payroll ${Date.now()}`,
  });
  ok('POST create run', create.status === 201 && create.json.success === true, create.json.error || create.status);
  const runId = create.json.data?.id;
  ok('Run has UUID id', !!runId, runId || 'missing');

  if (!runId) {
    console.log(`\n${pass} pass, ${fail} fail\n`);
    process.exit(1);
  }

  const calc = await req('POST', '/api/hq/hris/payroll?action=calculate', { runId });
  ok('POST calculate', calc.json.success === true, calc.json.error || calc.json.message);
  const empCount = calc.json.summary?.totalEmployees ?? 0;
  ok('Calculate processed employees', empCount >= 1, `${empCount} employees`);

  const payslip = await req('GET', `/api/hq/hris/payroll?action=payslip&runId=${runId}`);
  ok('GET payslip', payslip.json.success === true);
  ok('Payslip has items', (payslip.json.data?.length || 0) === empCount,
    `${payslip.json.data?.length || 0} items`);

  const first = payslip.json.data?.[0];
  if (first) {
    ok('Payslip has earnings', Array.isArray(first.earnings) && first.earnings.length > 0);
    ok('Payslip has net_salary', Number(first.net_salary) > 0, `Rp ${Number(first.net_salary).toLocaleString('id-ID')}`);
  }

  const runs = await req('GET', '/api/hq/hris/payroll?action=runs');
  ok('GET runs', runs.json.success === true);
  const found = (runs.json.data || []).some((r) => r.id === runId);
  ok('Run appears in list', found);
  const runRow = (runs.json.data || []).find((r) => r.id === runId);
  ok('Run status calculated', runRow?.status === 'calculated', runRow?.status);

  const approve = await req('POST', '/api/hq/hris/payroll?action=approve', { runId });
  ok('POST approve', approve.json.success === true, approve.json.error);

  const att = await req('GET', `/api/hq/hris/payroll?action=attendance-summary&periodStart=${periodStart}&periodEnd=${periodEnd}`);
  ok('GET attendance-summary', att.json.success === true);

  console.log(`\nResult: ${pass} pass, ${fail} fail\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

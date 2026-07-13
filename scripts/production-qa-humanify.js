#!/usr/bin/env node
/**
 * Humanify Production QA — orchestrates smoke, stress, business flow, security, pentest
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id SMOKE_EMAIL=superadmin@humanify.id SMOKE_PASSWORD=superadmin123 \
 *   node scripts/production-qa-humanify.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const env = { ...process.env, SMOKE_BASE_URL: BASE };

const suites = [
  { name: 'Comprehensive VPS Smoke', script: 'smoke-test-humanify-vps.js' },
  { name: 'Enterprise Business Flow', script: 'smoke-test-humanify-enterprise.js' },
  { name: 'HRIS Full Integration', script: 'smoke-test-hris-full.js' },
  { name: 'Employee Portal', script: 'smoke-test-employee-portal-full.js' },
  { name: 'Payroll Module', script: 'smoke-test-humanify-payroll.js' },
  { name: 'Attendance Module', script: 'smoke-test-humanify-attendance.js' },
  { name: 'IR & Disciplinary', script: 'smoke-test-ir-disciplinary-integration.js' },
  { name: 'KPI Performance Engagement', script: 'smoke-test-humanify-kpi-performance-engagement.js' },
  { name: 'Recruitment Training', script: 'smoke-test-humanify-recruitment-training.js' },
  { name: 'Ops HR', script: 'smoke-test-humanify-ops-hr.js' },
];

function runPentest() {
  console.log('\n═══════════════════════════════════════');
  console.log('  Pentest & Security Headers');
  console.log('═══════════════════════════════════════');
  let failed = 0;
  const checks = [];

  const headerRes = spawnSync('curl', ['-sI', `${BASE}/humanify/login`], { encoding: 'utf8' });
  const headerText = (headerRes.stdout || '').toLowerCase();
  const hsts = headerText.includes('strict-transport-security');
  const xfo = headerText.includes('x-frame-options');
  const xcto = headerText.includes('x-content-type-options');
  if (hsts) checks.push(['HSTS', true]); else { checks.push(['HSTS', false]); failed++; }
  if (xfo) checks.push(['X-Frame-Options', true]); else { checks.push(['X-Frame-Options', false]); failed++; }
  if (xcto) checks.push(['X-Content-Type-Options', true]); else { checks.push(['X-Content-Type-Options', false]); failed++; }

  const unauthEndpoints = [
    '/api/humanify/dashboard',
    '/api/humanify/employees',
    '/api/humanify/payroll',
    '/api/employee/dashboard?action=profile',
  ];
  for (const ep of unauthEndpoints) {
    const code = statusCode(`${BASE}${ep}`);
    const ok = code === 401 || code === 403;
    checks.push([`Unauth blocked ${ep}`, ok]);
    if (!ok) failed++;
  }

  const debugPaths = ['/api/debug/test-login', '/api/debug/env'];
  for (const ep of debugPaths) {
    const code = statusCode(`${BASE}${ep}`);
    const ok = code === 401 || code === 403 || code === 404;
    checks.push([`Debug locked ${ep}`, ok]);
    if (!ok) failed++;
  }

  // Webhook should accept when no secret (or with signature)
  const wh = fetchSync(`${BASE}/api/humanify/webhooks/recruitment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-signature': 'qa-smoke' },
    body: JSON.stringify({
      provider: 'dealls',
      event: 'candidate.applied',
      payload: { candidate: { full_name: 'QA Pentest', email: `qa.${Date.now()}@test.local` } },
    }),
  });
  const whOk = wh.status === 200 && wh.json?.success;
  checks.push(['Recruitment webhook (signed)', whOk]);
  if (!whOk) failed++;

  for (const [name, ok] of checks) {
    console.log(ok ? '  ✓' : '  ✗', name);
  }
  return failed;
}

function statusCode(url) {
  try {
    const res = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', url], { encoding: 'utf8' });
    return parseInt(res.stdout.trim(), 10) || 0;
  } catch { return 0; }
}

function fetchSync(url, opts = {}) {
  const args = ['-s', '-w', '\n%{http_code}', '-X', opts.method || 'GET'];
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) args.push('-H', `${k}: ${v}`);
  }
  if (opts.body) args.push('-d', opts.body);
  args.push(url);
  const res = spawnSync('curl', args, { encoding: 'utf8' });
  const lines = res.stdout.trim().split('\n');
  const code = parseInt(lines.pop(), 10) || 0;
  const body = lines.join('\n');
  let json = {};
  try { json = JSON.parse(body); } catch {}
  return { status: code, json, body };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Humanify Production QA — Full Test Matrix        ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('Target:', BASE);
  console.log('Time:', new Date().toISOString());

  const results = [];
  for (const suite of suites) {
    console.log(`\n▶ Running: ${suite.name}...`);
    const scriptPath = path.join(__dirname, suite.script);
    const r = spawnSync('node', [scriptPath], { env, encoding: 'utf8', stdio: 'pipe' });
    const out = (r.stdout || '') + (r.stderr || '');
    const passMatch = out.match(/(\d+)\s+passed,\s*(\d+)\s+failed/i) || out.match(/PASSED:\s*(\d+)\s+FAILED:\s*(\d+)/i) || out.match(/Result:\s*(\d+)\s+passed,\s*(\d+)\s+failed/i);
    const passed = passMatch ? parseInt(passMatch[1], 10) : (r.status === 0 ? 1 : 0);
    const failed = passMatch ? parseInt(passMatch[2], 10) : (r.status === 0 ? 0 : 1);
    results.push({ name: suite.name, passed, failed, exit: r.status });
    console.log(r.status === 0 ? `  ✓ ${suite.name} OK` : `  ✗ ${suite.name} FAILED (exit ${r.status})`);
    if (r.status !== 0) {
      const tail = out.split('\n').slice(-15).join('\n');
      console.log(tail);
    }
  }

  const pentestFailed = runPentest();

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                    QA SUMMARY                        ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  let totalPass = 0;
  let totalFail = 0;
  for (const r of results) {
    totalPass += r.passed;
    totalFail += r.failed;
    const icon = r.exit === 0 ? '✓' : '✗';
    console.log(`  ${icon} ${r.name}: ${r.passed} passed, ${r.failed} failed`);
  }
  console.log(`  Pentest checks failed: ${pentestFailed}`);
  console.log(`\n  TOTAL: ~${totalPass} assertions passed, ${totalFail + pentestFailed} failed`);
  const allOk = totalFail === 0 && pentestFailed === 0 && results.every((r) => r.exit === 0);
  console.log(allOk ? '\n✅ PRODUCTION QA PASSED' : '\n❌ PRODUCTION QA HAS FAILURES');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });

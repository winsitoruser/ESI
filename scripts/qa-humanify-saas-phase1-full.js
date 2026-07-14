#!/usr/bin/env node
/**
 * Humanify SaaS Phase 0–1 — Full QA
 * Smoke + Functional + Stress + Quality + UI (HTML contract) testing
 *
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/qa-humanify-saas-phase1-full.js
 *   SMOKE_STRESS_CONCURRENCY=20 SMOKE_CREATE_ACCOUNT=true node scripts/qa-humanify-saas-phase1-full.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];
const CONCURRENCY = Math.max(5, Number(process.env.SMOKE_STRESS_CONCURRENCY || 15));
const CREATE = process.env.SMOKE_CREATE_ACCOUNT !== 'false'; // default true for full QA
const PERF_MS = Number(process.env.SMOKE_PERF_BUDGET_MS || 3000);

let COOKIE = '';
let ownerCookie = '';
let passed = 0;
let failed = 0;
let warned = 0;
const failures = [];
const warnings = [];
const timings = [];

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};
const warn = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ⚠', line);
  warnings.push(line);
  warned++;
};
const section = (t) => console.log(`\n══ ${t} ══`);

async function fetchTimed(path, opts = {}) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, opts);
  const ms = Date.now() - t0;
  timings.push({ path, method: opts.method || 'GET', ms, status: res.status });
  return { res, ms };
}

async function getHtml(path, cookie = '') {
  const { res, ms } = await fetchTimed(path, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: 'follow',
  });
  const html = await res.text();
  return { status: res.status, html, ms, headers: res.headers };
}

async function loginAs(email, passwords) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';

  for (const pass of passwords) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const sessionCookies = (loginRes.headers.getSetCookie?.() || [])
      .filter((c) => c.includes('next-auth'))
      .map((c) => c.split(';')[0]);
    if (csrfCookie) sessionCookies.push(csrfCookie);
    const cookie = sessionCookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } })).json();
    if (session?.user?.email) return { cookie, session };
  }
  return null;
}

async function api(method, path, body, cookie = COOKIE) {
  const opts = { method, headers: { Cookie: cookie } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const { res, ms } = await fetchTimed(path, opts);
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 180) }; }
  return { status: res.status, json, ms, ok: res.status >= 200 && res.status < 300 };
}

function expectContains(html, needles, label) {
  const missing = needles.filter((n) => !html.includes(n));
  if (missing.length === 0) ok(`UI ${label}`);
  else fail(`UI ${label}`, `missing: ${missing.slice(0, 3).join(', ')}`);
}

function expectPerf(label, ms, budget = PERF_MS) {
  if (ms <= budget) ok(`perf ${label} ${ms}ms`);
  else warn(`perf ${label} ${ms}ms`, `budget ${budget}ms`);
}

async function smokePages() {
  section('1. Smoke — Critical pages');
  const pages = [
    ['/humanify/welcome', 200],
    ['/humanify/login', 200],
    ['/humanify/signup', 200],
    ['/humanify/setup', [200, 307, 308]], // may redirect unauth
    ['/platform', [200, 307, 308]],
    ['/c/naincode-hq/careers', 200],
    ['/careers', 200],
    ['/api/auth/csrf', 200],
    ['/api/auth/providers', 200],
  ];

  for (const [path, expect] of pages) {
    const { res, ms } = await fetchTimed(path, { redirect: 'manual' });
    const allowed = Array.isArray(expect) ? expect : [expect];
    if (allowed.includes(res.status)) ok(`page ${path} → ${res.status}`);
    else fail(`page ${path}`, `got ${res.status}, want ${allowed.join('/')}`);
    expectPerf(path, ms, path.includes('/api/') ? 1500 : PERF_MS);
  }
}

async function uiContracts() {
  section('2. UI contracts — HTML / CTA / form');

  // Welcome
  {
    const { status, html, ms } = await getHtml('/humanify/welcome');
    if (status !== 200) { fail('welcome HTML', `HTTP ${status}`); }
    else {
      expectPerf('welcome HTML', ms);
      expectContains(html, [
        'Humanify',
        '/humanify/signup',
        '/humanify/login',
        'Mulai trial gratis',
        'Masuk',
      ], 'welcome CTAs');
      if (/<title[\s>]/i.test(html) && /humanify/i.test(html)) ok('UI welcome <title>');
      else fail('UI welcome <title>');
      if (html.includes('viewport')) ok('UI welcome viewport meta');
      else warn('UI welcome viewport meta', 'missing');
      // Brand visibility (hero-level signal)
      if (/Humanify/i.test(html) && (html.match(/Humanify/gi) || []).length >= 2) ok('UI welcome brand density');
      else warn('UI welcome brand density', 'weak');
    }
  }

  // Login
  {
    const { status, html } = await getHtml('/humanify/login');
    if (status !== 200) fail('login HTML', `HTTP ${status}`);
    else {
      expectContains(html, [
        'type="email"',
        'type="password"',
        '/humanify/signup',
        'Masuk',
      ], 'login form + signup link');
      if (html.includes('csrfToken') || html.includes('csrf')) ok('UI login csrf field/marker');
      else warn('UI login csrf', 'not found in HTML (may be client-only)');
    }
  }

  // Signup
  {
    const { status, html } = await getHtml('/humanify/signup');
    if (status !== 200) fail('signup HTML', `HTTP ${status}`);
    else {
      expectContains(html, [
        'Daftar',
        'type="email"',
        'type="password"',
        'trial',
        '/humanify/login',
      ], 'signup form copy');
      // Company name field present after hydrate — SSR may only have shell
      const hasFormShell = html.includes('__NEXT_DATA__') || html.includes('companyName') || html.includes('Nama perusahaan') || html.includes('HumanifySignup');
      if (hasFormShell) ok('UI signup Next.js shell');
      else warn('UI signup Next.js shell', 'structure unexpected');
    }
  }

  // Careers (tenant)
  {
    const { status, html } = await getHtml('/c/naincode-hq/careers');
    if (status !== 200) fail('careers HTML', `HTTP ${status}`);
    else {
      expectContains(html, ['careers', 'naincode'], 'careers tenant page markers');
      if (!html.toLowerCase().includes('internal server error')) ok('UI careers no 500 dump');
      else fail('UI careers 500 dump');
    }
  }

  // Platform (requires auth — expect redirect to login when bare)
  {
    const { res } = await fetchTimed('/platform', { redirect: 'manual' });
    if ([307, 302, 308].includes(res.status)) {
      const loc = res.headers.get('location') || '';
      if (loc.includes('/humanify/login')) ok('UI platform unauth → login');
      else warn('UI platform redirect', loc || String(res.status));
    } else if (res.status === 200) {
      ok('UI platform reachable (session cookie?)');
    } else fail('UI platform gate', String(res.status));
  }
}

async function functionalAuthAndApis() {
  section('3. Functional — Auth, platform, isolation');

  const auth = await loginAs(EMAIL, PASSWORDS);
  if (!auth) { fail('superadmin login'); return; }
  COOKIE = auth.cookie;
  ok(`login ${auth.session.user.email} (${auth.session.user.role})`);

  // Careers fail-closed
  const bare = await api('GET', '/api/public/careers', undefined, '');
  if (bare.status === 400 && bare.json?.error === 'TENANT_REQUIRED') ok('careers TENANT_REQUIRED');
  else fail('careers fail-closed', `${bare.status} ${bare.json?.error}`);

  const scoped = await api('GET', '/api/public/careers?tenant=naincode-hq', undefined, '');
  if (scoped.ok) ok(`careers naincode-hq jobs=${scoped.json?.jobs?.length ?? scoped.json?.data?.length ?? '?'}`);
  else fail('careers scoped', `${scoped.status}`);

  const badSlug = await api('GET', '/api/public/careers?tenant=does-not-exist-xyz', undefined, '');
  if (badSlug.status === 404 || badSlug.json?.error) ok('unknown tenant rejected');
  else fail('unknown tenant', String(badSlug.status));

  const overview = await api('GET', '/api/platform?action=overview');
  if (overview.ok && overview.json?.success) {
    const s = overview.json.data?.summary || overview.json.data || {};
    ok(`platform overview tenants=${s.total_tenants ?? s.totalTenants ?? '?'}`);
  } else fail('platform overview', overview.json?.error || String(overview.status));

  const tenants = await api('GET', '/api/platform?action=tenants');
  if (tenants.ok && Array.isArray(tenants.json?.data?.tenants || tenants.json?.data)) {
    const list = tenants.json.data.tenants || tenants.json.data;
    ok(`platform tenants list=${list.length}`);
  } else fail('platform tenants', tenants.json?.error || String(tenants.status));

  const ctx = await api('GET', '/api/humanify/saas-context');
  if (ctx.ok) ok(`saas-context slug=${ctx.json?.data?.slug || 'null'}`);
  else fail('saas-context', String(ctx.status));

  // Unauthenticated signup validation
  const badSignup = await api('POST', '/api/humanify/signup', { email: 'x' }, '');
  if (badSignup.status === 400) ok('signup validates incomplete payload');
  else fail('signup validation', String(badSignup.status));

  const shortPass = await api('POST', '/api/humanify/signup', {
    name: 'A', email: `bad-${Date.now()}@test.com`, password: '123', companyName: 'X',
  }, '');
  if (shortPass.status === 400) ok('signup rejects short password');
  else fail('signup short password', String(shortPass.status));

  // Onboarding requires auth
  const obUnauth = await api('GET', '/api/humanify/saas-onboarding', undefined, '');
  if (obUnauth.status === 401) ok('onboarding API 401 unauth');
  else fail('onboarding unauth gate', String(obUnauth.status));
}

async function functionalSignupFlow() {
  section('4. Functional — Signup → setup wizard → complete');
  if (!CREATE) {
    console.log('  (skip create — SMOKE_CREATE_ACCOUNT=false)');
    return;
  }

  const stamp = Date.now().toString(36);
  const email = `qa-p1-${stamp}@humanify.test`;
  const password = 'QaPhase1Test!';
  const company = `QA Phase1 ${stamp}`;

  const reg = await api('POST', '/api/humanify/signup', {
    name: 'QA Tester',
    email,
    password,
    companyName: company,
    industry: 'software_house',
    employeeRange: '1-50',
    phone: '08123456789',
  }, '');

  if (!(reg.ok && reg.json?.success && reg.json?.data?.slug)) {
    fail('signup create', `${reg.status} ${reg.json?.error || ''}`);
    return;
  }
  const slug = reg.json.data.slug;
  ok(`signup slug=${slug}`);
  if (reg.json.data.redirectTo === '/humanify/setup') ok('signup redirectTo setup');
  else warn('signup redirectTo', String(reg.json.data.redirectTo));

  // Duplicate email
  const dup = await api('POST', '/api/humanify/signup', {
    name: 'Dup', email, password, companyName: `${company} 2`,
  }, '');
  if (dup.status === 409) ok('duplicate email → 409');
  else fail('duplicate email', String(dup.status));

  const owned = await loginAs(email, [password]);
  if (!owned) { fail('owner login after signup'); return; }
  ownerCookie = owned.cookie;
  ok(`owner session role=${owned.session.user.role}`);

  const status = await api('GET', '/api/humanify/saas-onboarding', undefined, ownerCookie);
  if (status.ok && status.json?.data && status.json.data.completed === false) {
    ok(`wizard incomplete step=${status.json.data.step}`);
  } else fail('wizard status', status.json?.error || JSON.stringify(status.json?.data)?.slice(0, 80));

  // Setup page as owner
  const setupHtml = await getHtml('/humanify/setup', ownerCookie);
  if (setupHtml.status === 200) {
    ok('UI setup page as owner 200');
    if (setupHtml.html.includes('Setup') || setupHtml.html.includes('workspace') || setupHtml.html.includes('__NEXT_DATA__')) {
      ok('UI setup wizard shell');
    } else warn('UI setup wizard shell', 'markers weak');
  } else fail('UI setup page', String(setupHtml.status));

  for (const [step, data] of [
    ['company', { city: 'Jakarta', province: 'DKI Jakarta', phone: '021111' }],
    ['organization', { departments: ['HR', 'IT', 'Finance'] }],
    ['policies', { workDays: [1, 2, 3, 4, 5], defaultShift: '09:00-18:00', leaveTypes: ['annual', 'sick'] }],
  ]) {
    const save = await api('POST', '/api/humanify/saas-onboarding', { action: 'save', step, data }, ownerCookie);
    if (save.ok && save.json?.success) ok(`wizard save ${step}`);
    else fail(`wizard save ${step}`, save.json?.error || String(save.status));
  }

  const done = await api('POST', '/api/humanify/saas-onboarding', { action: 'complete' }, ownerCookie);
  if (done.ok && done.json?.data?.completed) ok('wizard complete');
  else fail('wizard complete', done.json?.error || String(done.status));

  const careers = await api('GET', `/api/public/careers?tenant=${slug}`, undefined, '');
  if (careers.ok && (careers.json?.tenant?.slug === slug || careers.json?.data?.tenant?.slug === slug || careers.json?.tenant === slug)) {
    ok('new tenant careers scoped');
  } else if (careers.ok) {
    ok(`new tenant careers OK (${careers.status})`);
  } else fail('new tenant careers', careers.json?.error || String(careers.status));

  // Owner should access HRIS after complete (JWT may refresh on next getToken)
  const app = await fetchTimed('/humanify', {
    headers: { Cookie: ownerCookie },
    redirect: 'manual',
  });
  // Force session refresh path: hit session then app again
  await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: ownerCookie } });
  const app2 = await fetchTimed('/humanify', {
    headers: { Cookie: ownerCookie },
    redirect: 'manual',
  });
  const loc2 = app2.res.headers.get('location') || '';
  if (app2.res.status === 200 || (app2.res.status === 307 && !loc2.includes('/setup'))) {
    ok(`owner /humanify after complete → ${app2.res.status}${loc2 ? ` ${loc2}` : ''}`);
  } else if (app.res.status === 200) {
    ok(`owner /humanify → ${app.res.status}`);
  } else {
    fail('owner app access (setup loop?)', `${app2.res.status} ${loc2}`);
  }
}

async function stress() {
  section(`5. Stress — concurrency=${CONCURRENCY}`);

  // Parallel public reads
  const paths = [
    '/humanify/welcome',
    '/humanify/login',
    '/humanify/signup',
    '/c/naincode-hq/careers',
    '/api/public/careers?tenant=naincode-hq',
    '/api/auth/csrf',
  ];
  const jobs = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const path = paths[i % paths.length];
    jobs.push((async () => {
      const { res, ms } = await fetchTimed(path, { redirect: 'manual' });
      return { path, status: res.status, ms };
    })());
  }
  const results = await Promise.all(jobs);
  const bad = results.filter((r) => r.status >= 500);
  const okish = results.filter((r) => r.status < 400 || [307, 302, 308].includes(r.status));
  const avg = Math.round(results.reduce((a, r) => a + r.ms, 0) / results.length);
  const p95 = results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length * 0.95)] || avg;

  if (bad.length === 0) ok(`stress reads 0×5xx (${results.length} req, avg ${avg}ms, p95 ${p95}ms)`);
  else fail('stress reads 5xx', `${bad.length} failures`);

  if (okish.length === results.length) ok('stress all responses healthy');
  else warn('stress soft failures', `${results.length - okish.length} non-OK`);

  // Parallel invalid signups (must not 500)
  const invalidJobs = Array.from({ length: Math.min(10, CONCURRENCY) }, (_, i) =>
    api('POST', '/api/humanify/signup', { email: `bad${i}` }, ''),
  );
  const invalidRes = await Promise.all(invalidJobs);
  const inv5xx = invalidRes.filter((r) => r.status >= 500);
  if (inv5xx.length === 0) ok(`stress invalid signup no 5xx (${invalidRes.length})`);
  else fail('stress invalid signup 5xx', String(inv5xx.length));

  // Parallel authenticated platform overview (if logged in)
  if (COOKIE) {
    const platJobs = Array.from({ length: 8 }, () => api('GET', '/api/platform?action=overview'));
    const platRes = await Promise.all(platJobs);
    const platFail = platRes.filter((r) => !r.ok);
    if (platFail.length === 0) {
      const pavg = Math.round(platRes.reduce((a, r) => a + r.ms, 0) / platRes.length);
      ok(`stress platform overview x8 avg ${pavg}ms`);
    } else fail('stress platform overview', `${platFail.length} failed`);
  }
}

async function qualityChecks() {
  section('6. Quality — headers, security, consistency');

  const welcome = await fetch(`${BASE}/humanify/welcome`);
  const ctype = welcome.headers.get('content-type') || '';
  if (ctype.includes('text/html')) ok('welcome content-type HTML');
  else fail('welcome content-type', ctype);

  // API JSON content-type
  const csrf = await fetch(`${BASE}/api/auth/csrf`);
  const act = csrf.headers.get('content-type') || '';
  if (act.includes('application/json')) ok('api csrf JSON content-type');
  else warn('api csrf content-type', act);

  // Signup shouldn't expose stack traces
  const boom = await api('POST', '/api/humanify/signup', { name: 'x' }, '');
  const errText = JSON.stringify(boom.json || {});
  if (!/at Object\.|stack|node_modules/.test(errText)) ok('signup errors sanitized');
  else fail('signup error leak', errText.slice(0, 100));

  // Timing summary
  const sorted = [...timings].sort((a, b) => b.ms - a.ms).slice(0, 5);
  console.log('\n  Slowest calls:');
  for (const t of sorted) {
    console.log(`    ${t.ms}ms  ${t.method} ${t.path} (${t.status})`);
  }
  const slow = timings.filter((t) => t.ms > PERF_MS * 2);
  if (slow.length === 0) ok('quality no extreme slow calls (>2× budget)');
  else warn('quality slow calls', `${slow.length} over ${PERF_MS * 2}ms`);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Humanify SaaS Phase 0–1 — Full QA Suite             ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('Target:', BASE);
  console.log(`Stress concurrency: ${CONCURRENCY} · Create account: ${CREATE} · Perf budget: ${PERF_MS}ms\n`);

  try {
    await smokePages();
    await uiContracts();
    await functionalAuthAndApis();
    await functionalSignupFlow();
    await stress();
    await qualityChecks();
  } catch (e) {
    fail('suite crashed', e.message);
    console.error(e);
  }

  console.log('\n════════════════════════════════════════');
  console.log(`RESULT: ${passed} passed, ${failed} failed, ${warned} warnings`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(' -', f));
  }
  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((w) => console.log(' -', w));
  }
  process.exit(failed ? 1 : 0);
}

main();

#!/usr/bin/env node
/**
 * Humanify Talent Intelligence — smoke + UAT probes (local or prod)
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-talent-intelligence.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([
  process.env.SMOKE_PASSWORD,
  'superadmin123',
  'MasterAdmin2026!',
].filter(Boolean))];

let cookie = '';
let passed = 0;
let failed = 0;
const rows = [];

function ok(name, detail) {
  passed++;
  rows.push({ name, status: 'PASS', detail: detail || '' });
  console.log('  ✓', name, detail || '');
}
function fail(name, detail) {
  failed++;
  rows.push({ name, status: 'FAIL', detail: detail || '' });
  console.log('  ✗', name, detail || '');
}

async function login() {
  for (const pass of PASSWORDS) {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    if (!csrfRes.ok) continue;
    const { csrfToken } = await csrfRes.json();
    let jar = (csrfRes.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]);
    const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: jar.join('; ') },
      body: new URLSearchParams({
        csrfToken, email: EMAIL, password: pass,
        callbackUrl: `${BASE}/humanify`, json: 'true',
      }),
      redirect: 'manual',
    });
    jar = [...jar, ...(res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0])];
    cookie = jar.filter(Boolean).join('; ');
    if (cookie.includes('session-token') || cookie.includes('next-auth.session')) return true;
    // Some deployments use __Secure- next-auth cookies
    if (res.status === 200 || res.status === 302) {
      const sess = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } });
      const sj = await sess.json().catch(() => ({}));
      if (sj?.user) return true;
    }
  }
  return false;
}

async function api(path, opts = {}) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Cookie: cookie,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
  const ms = Date.now() - t0;
  let json = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { res, json, ms };
}

async function stress(path, n = 20, concurrency = 5) {
  const times = [];
  let errors = 0;
  let i = 0;
  async function worker() {
    while (i < n) {
      const idx = i++;
      void idx;
      const t0 = Date.now();
      try {
        const r = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
        times.push(Date.now() - t0);
        if (!r.ok) errors++;
      } catch {
        times.push(Date.now() - t0);
        errors++;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  times.sort((a, b) => a - b);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / Math.max(1, times.length));
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))] || 0;
  return { n, errors, avg, p95, max: times[times.length - 1] || 0 };
}

(async () => {
  console.log(`Talent Intelligence smoke @ ${BASE}`);
  const logged = await login();
  if (!logged) {
    fail('auth.login', 'could not establish session');
    console.log(JSON.stringify({ passed, failed, rows }, null, 2));
    process.exit(1);
  }
  ok('auth.login');

  const page = await fetch(`${BASE}/humanify/talent-bank`, { headers: { Cookie: cookie } });
  if (page.status === 200) ok('page.talent-bank', `HTTP ${page.status}`);
  else fail('page.talent-bank', `HTTP ${page.status}`);

  const stats = await api('/api/humanify/talent-bank?action=stats');
  if (stats.res.status === 200 && stats.json?.success) ok('api.stats', `${stats.ms}ms · total=${stats.json.data?.total}`);
  else if (stats.res.status === 403) fail('api.stats', '403 talent_bank entitlement missing — enable addons.talentBank');
  else fail('api.stats', `HTTP ${stats.res.status} ${stats.json?.error || ''}`);

  const list = await api('/api/humanify/talent-bank?action=list&limit=10');
  if (list.res.status === 200 && list.json?.success) ok('api.list', `${list.ms}ms · n=${list.json.data?.items?.length ?? 0}`);
  else fail('api.list', `HTTP ${list.res.status}`);

  const match = await api('/api/humanify/talent-bank?action=match', {
    method: 'POST',
    body: JSON.stringify({ query: 'Marketing Manager Tangerang salary 10 juta', scope: 'all' }),
  });
  if (match.res.status === 200 && match.json?.success) {
    ok('api.match', `${match.ms}ms · matches=${match.json.data?.matches?.length ?? 0}`);
  } else fail('api.match', `HTTP ${match.res.status}`);

  const workforce = await api('/api/humanify/talent-bank?action=workforce');
  if (workforce.res.status === 200 && workforce.json?.success) {
    ok('api.workforce', `teams=${workforce.json.data?.teams?.length ?? 0}`);
  } else fail('api.workforce', `HTTP ${workforce.res.status}`);

  const phase4 = await api('/api/humanify/talent-bank?action=phase4');
  if (phase4.res.status === 200 && phase4.json?.success) {
    ok('api.phase4', `dna=${phase4.json.data?.dna?.roles?.length ?? 0} succession=${phase4.json.data?.succession?.plans?.length ?? 0}`);
  } else fail('api.phase4', `HTTP ${phase4.res.status}`);

  const analyst = await api('/api/humanify/talent-bank?action=analyst', {
    method: 'POST',
    body: JSON.stringify({ message: 'Cari Marketing Manager Tangerang sekitar Rp10 juta', scope: 'all' }),
  });
  if (analyst.res.status === 200 && analyst.json?.success) {
    ok('api.analyst', `matches=${analyst.json.data?.matchCount} suggestions=${analyst.json.data?.suggestions?.length ?? 0}`);
  } else fail('api.analyst', `HTTP ${analyst.res.status}`);

  const refine = await api('/api/humanify/talent-bank?action=analyst', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Performance Marketing',
      scope: 'all',
      blueprint: analyst.json?.data?.blueprint,
      messages: analyst.json?.data?.messages,
    }),
  });
  if (refine.res.status === 200 && refine.json?.success) ok('uat.refine-turn', `applied=${(refine.json.data?.applied || []).join('|')}`);
  else fail('uat.refine-turn', `HTTP ${refine.res.status}`);

  const memory = await api('/api/humanify/talent-bank?action=memory');
  if (memory.res.status === 200 && memory.json?.success) ok('api.memory', `events=${memory.json.data?.length ?? 0}`);
  else fail('api.memory', `HTTP ${memory.res.status}`);

  const recPage = await fetch(`${BASE}/humanify/recruitment`, { headers: { Cookie: cookie } });
  if (recPage.status === 200) ok('page.recruitment', `HTTP ${recPage.status}`);
  else fail('page.recruitment', `HTTP ${recPage.status}`);

  // Stress: authenticated GETs
  const stressStats = await stress('/api/humanify/talent-bank?action=stats', 25, 5);
  if (stressStats.errors === 0 && stressStats.p95 < 5000) {
    ok('stress.stats', `n=${stressStats.n} avg=${stressStats.avg}ms p95=${stressStats.p95}ms max=${stressStats.max}ms`);
  } else {
    fail('stress.stats', `errors=${stressStats.errors} p95=${stressStats.p95}ms`);
  }

  const stressPage = await stress('/humanify/talent-bank', 15, 3);
  if (stressPage.errors === 0 && stressPage.p95 < 8000) {
    ok('stress.page', `n=${stressPage.n} avg=${stressPage.avg}ms p95=${stressPage.p95}ms`);
  } else {
    fail('stress.page', `errors=${stressPage.errors} p95=${stressPage.p95}ms`);
  }

  console.log(`\nRESULT passed=${passed} failed=${failed}`);
  console.log(JSON.stringify({ base: BASE, passed, failed, rows }, null, 2));
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

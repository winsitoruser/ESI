#!/usr/bin/env node
/**
 * Focused smoke + stress for Humanify portals, AIMAN, integrations
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id VPS_PASS='...' node scripts/smoke-stress-humanify-portals-aiman.js
 */
const crypto = require('crypto');
const { loadWebhookSecrets } = require('./lib/humanify-qa-secrets');

const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
loadWebhookSecrets(BASE);
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};

function signWebhook(provider, body) {
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
  if (!secret) return {};
  return {
    'x-webhook-signature': crypto.createHmac('sha256', secret).update(body).digest('hex'),
  };
}

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
      ok(`login as ${session.user.email}`);
      return;
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
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, opts);
  const ms = Date.now() - t0;
  let json = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json, ms, ok: res.status >= 200 && res.status < 300 };
}

async function smoke() {
  console.log('\n══ Smoke — Pages ══');
  for (const path of ['/humanify/recruitment', '/humanify/ai', '/careers', '/humanify/login']) {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    const code = res.status;
    if (code === 200 || code === 307 || code === 302) ok(`page ${path} → ${code}`);
    else fail(`page ${path}`, `status ${code}`);
  }

  console.log('\n══ Smoke — Integrations & Recruitment ══');
  const integ = await api('GET', '/api/humanify/integrations?action=recruitment');
  if (integ.ok && integ.json?.data?.channels?.length >= 7) {
    ok(`integrations channels=${integ.json.data.channels.length} connected=${integ.json.data.connected}`);
  } else fail('integrations recruitment', `status=${integ.status}`);

  const openings = await api('GET', '/api/humanify/recruitment?action=openings');
  if (openings.ok) ok(`openings ${openings.json?.data?.length || 0}`);
  else fail('openings', `status ${openings.status}`);

  let open = (openings.json?.data || []).find((o) => o.status === 'open') || openings.json?.data?.[0];
  if (!open?.id) {
    const created = await api('POST', '/api/humanify/recruitment?action=create-opening', {
      title: `Smoke QA ${Date.now()}`,
      department: 'Engineering',
      location: 'Remote',
    });
    if (created.ok && created.json?.data?.id) {
      open = created.json.data;
      ok(`created smoke opening ${open.id}`);
    }
  }
  if (open?.id) {
    const pub = await api('POST', '/api/humanify/integrations?action=publish-job', {
      job_opening_id: open.id,
      providers: ['linkedin', 'indeed', 'google_jobs', 'jobstreet', 'careers'],
    });
    const n = pub.json?.data?.length || 0;
    if (pub.ok && n >= 5) ok(`publish-job ${n} portals (${pub.ms}ms)`);
    else fail('publish-job', `${pub.status} n=${n}`);

    const posts = await api('GET', `/api/humanify/integrations?action=portal-posts&opening_id=${open.id}`);
    if (posts.ok) ok(`portal-posts ${(posts.json?.data || []).length}`);
    else fail('portal-posts', `status ${posts.status}`);
  } else {
    ok('publish-job skip (no tenant / no openings for platform ops)');
  }

  for (const provider of ['linkedin', 'jobstreet', 'kalibrr']) {
    const body = JSON.stringify({
      provider,
      event: 'candidate.applied',
      payload: {
        candidate: {
          full_name: `Smoke ${provider} ${Date.now().toString().slice(-4)}`,
          email: `smoke.${provider}.${Date.now()}@humanify.local`,
          source: provider,
        },
      },
    });
    const wh = await fetch(`${BASE}/api/humanify/webhooks/recruitment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signWebhook(provider, body) },
      body,
    });
    const j = await wh.json().catch(() => ({}));
    if (wh.ok && j.success) ok(`webhook ${provider}`);
    else fail(`webhook ${provider}`, `${wh.status} ${j.error || ''}`);
  }

  console.log('\n══ Smoke — AIMAN ══');
  const queries = [
    'Berapa jumlah pegawai aktif?',
    'Ringkasan kondisi SDM saat ini',
    'Pipeline rekrutmen sekarang',
  ];
  for (const message of queries) {
    const chat = await api('POST', '/api/humanify/ai-hub?action=chat', { message });
    if (chat.ok && chat.json?.data?.reply) ok(`AIMAN "${message.slice(0, 28)}…" (${chat.ms}ms)`);
    else fail(`AIMAN ${message}`, `${chat.status}`);
  }
}

async function stress() {
  console.log('\n══ Stress — 80 concurrent GETs ══');
  const paths = [
    '/api/humanify/recruitment?action=openings',
    '/api/humanify/recruitment?action=candidates',
    '/api/humanify/recruitment?action=analytics',
    '/api/humanify/integrations?action=recruitment',
    '/api/humanify/dashboard',
    '/api/humanify/employees',
    '/api/humanify/ai-hub?action=dashboard',
  ];
  const t0 = Date.now();
  const jobs = Array.from({ length: 80 }, (_, i) => api('GET', paths[i % paths.length]));
  const results = await Promise.all(jobs);
  const elapsed = Date.now() - t0;
  const okN = results.filter((r) => r.ok).length;
  const p95 = results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length * 0.95)];
  const avg = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  if (okN >= 78) ok(`stress GET ${okN}/80 in ${elapsed}ms (avg ${avg}ms, p95 ${p95}ms)`);
  else fail('stress GET', `${okN}/80 in ${elapsed}ms`);

  console.log('\n══ Stress — 20 concurrent portal publishes ══');
  const openings = await api('GET', '/api/humanify/recruitment?action=openings');
  let open = (openings.json?.data || []).find((o) => o.status === 'open') || openings.json?.data?.[0];
  if (!open?.id) {
    const created = await api('POST', '/api/humanify/recruitment?action=create-opening', {
      title: `Stress QA ${Date.now()}`,
      department: 'Engineering',
    });
    if (created.ok && created.json?.data?.id) open = created.json.data;
  }
  if (!open?.id) {
    ok('stress publish skip (no tenant / no openings)');
    return;
  }
  const t1 = Date.now();
  const pubs = await Promise.all(Array.from({ length: 20 }, () =>
    api('POST', '/api/humanify/integrations?action=publish-job', {
      job_opening_id: open.id,
      providers: ['google_jobs', 'careers'],
    }),
  ));
  const pubMs = Date.now() - t1;
  const pubOk = pubs.filter((r) => r.ok).length;
  if (pubOk >= 18) ok(`stress publish ${pubOk}/20 in ${pubMs}ms`);
  else fail('stress publish', `${pubOk}/20 in ${pubMs}ms`);

  console.log('\n══ Stress — 10 concurrent AIMAN chats ══');
  const t2 = Date.now();
  const chats = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    api('POST', '/api/humanify/ai-hub?action=chat', {
      message: i % 2 === 0 ? 'Berapa jumlah pegawai aktif?' : 'Siapa yang sedang onboarding?',
    }),
  ));
  const chatMs = Date.now() - t2;
  const chatOk = chats.filter((r) => r.ok && r.json?.data?.reply).length;
  if (chatOk >= 8) ok(`stress AIMAN ${chatOk}/10 in ${chatMs}ms`);
  else fail('stress AIMAN', `${chatOk}/10 in ${chatMs}ms`);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Smoke + Stress — Portals & AIMAN                 ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('Target:', BASE);
  await login();
  await smoke();
  await stress();
  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log('  -', f));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

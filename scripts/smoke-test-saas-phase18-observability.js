#!/usr/bin/env node
/**
 * Phase 18 — observability endpoint smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase18-observability.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function login(email = EMAIL, passwords = PASSWORDS) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  for (const pass of passwords) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email, password: pass, json: 'true' }),
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

async function main() {
  console.log('SaaS Phase 18 — Observability smoke');
  console.log('Target:', BASE);

  // Unauthenticated → 401
  const anon = await fetch(`${BASE}/api/platform/observability`);
  if (anon.status === 401) ok('unauth → 401');
  else fail('unauth guard', String(anon.status));

  await login();
  const res = await fetch(`${BASE}/api/platform/observability`, { headers: { Cookie: COOKIE } });
  const j = await res.json().catch(() => ({}));
  if (res.status === 200 && j.success) ok('platform operator can read snapshot');
  else fail('snapshot', `${res.status} ${JSON.stringify(j).slice(0, 120)}`);

  const d = j.data || {};
  if (typeof d.uptimeSec === 'number' && d.memory && typeof d.memory.rssMb === 'number') ok(`metrics present (rss=${d.memory?.rssMb}MB, uptime=${d.uptimeSec}s)`);
  else fail('metrics shape', JSON.stringify(d).slice(0, 120));
  if (d.counters && typeof d.counters.requests === 'number') ok(`counters present (requests=${d.counters.requests})`);
  else fail('counters shape');
  if (Array.isArray(d.recent)) ok(`recent events array (${d.recent.length})`);
  else fail('recent events');
  if (d.redis && typeof d.redis.configured === 'boolean') ok(`redis probe (configured=${d.redis.configured}, ok=${d.redis.ok})`);
  else fail('redis probe shape');

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

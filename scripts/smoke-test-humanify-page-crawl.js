#!/usr/bin/env node
/**
 * Frontend page crawl — all Humanify sidebar routes (auth session).
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-page-crawl.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

const fs = require('fs');
const path = require('path');

let COOKIE = '';
let passed = 0;
let failed = 0;
const failList = [];
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { const x = d ? `${m} — ${d}` : m; console.log('  ✗', x); failList.push(x); failed++; };

function extractHrefs(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const hrefs = new Set();
  const re = /href:\s*'(\/humanify[^']*)'/g;
  let m;
  while ((m = re.exec(src))) {
    const h = m[1].split('?')[0];
    if (h && !h.includes(':')) hrefs.add(h);
  }
  return [...hrefs].sort();
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

async function main() {
  console.log('Humanify page crawl');
  console.log('Target:', BASE);
  await login();
  ok('login');

  const cfg = path.join(__dirname, '../config/humanify-sidebar.config.ts');
  const routes = extractHrefs(cfg);
  // Extra critical pages
  for (const extra of ['/platform', '/platform/observability', '/platform/email-preview', '/humanify/login', '/employee/login']) {
    if (!routes.includes(extra)) routes.push(extra);
  }

  console.log(`Routes: ${routes.length}`);
  for (const route of routes) {
    const res = await fetch(`${BASE}${route}`, {
      headers: { Cookie: COOKIE, Accept: 'text/html' },
      redirect: 'manual',
    });
    // 200 OK page, 307 auth/setup redirects still "reachable"
    if ([200, 302, 303, 307, 308].includes(res.status)) ok(`${route} → ${res.status}`);
    else if (res.status === 404) fail(route, '404');
    else if (res.status >= 500) fail(route, `HTTP ${res.status}`);
    else ok(`${route} → ${res.status} (soft)`);
  }

  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  if (failList.length) failList.forEach((f) => console.log('  •', f));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

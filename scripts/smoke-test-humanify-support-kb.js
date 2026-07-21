#!/usr/bin/env node
/**
 * Smoke: Humanify Support Tickets + Knowledge Center
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-support-kb.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASS = process.env.SMOKE_PASSWORD || 'superadmin123';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASS, json: 'true' }),
    redirect: 'manual',
  });
  const cookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
  if (csrfCookie) cookies.push(csrfCookie);
  COOKIE = cookies.join('; ');
  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
  if (!session?.user?.email) throw new Error('login failed');
}

async function main() {
  console.log('Support + KB smoke —', BASE);
  await login();
  ok('login');

  for (const path of ['/humanify/support', '/humanify/knowledge-base']) {
    const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE, Accept: 'text/html' } });
    if (res.status < 400) ok(`page ${path} → ${res.status}`);
    else fail(`page ${path}`, `HTTP ${res.status}`);
  }

  const kb = await (await fetch(`${BASE}/api/humanify/knowledge-base`, { headers: { Cookie: COOKIE } })).json();
  if (kb.success && Array.isArray(kb.data) && kb.data.length >= 1) ok(`kb list (${kb.data.length})`);
  else fail('kb list', JSON.stringify(kb).slice(0, 160));

  const sum = await (await fetch(`${BASE}/api/humanify/support?action=summary`, { headers: { Cookie: COOKIE } })).json();
  if (sum.success && sum.data) ok(`ticket summary total=${sum.data.total}`);
  else fail('ticket summary', JSON.stringify(sum).slice(0, 120));

  const stamp = Date.now().toString(36);
  const create = await fetch(`${BASE}/api/humanify/support`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: `Smoke support ${stamp}`,
      description: 'Automated smoke ticket — safe to resolve.',
      category: 'other',
      priority: 'low',
    }),
  });
  const created = await create.json();
  if (create.status === 201 && created.success && created.data?.id) {
    ok(`ticket create ${created.data.ticket_number}`);
    const comment = await fetch(`${BASE}/api/humanify/support?action=comment`, {
      method: 'POST',
      headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: created.data.id, body: 'Smoke comment' }),
    });
    const cj = await comment.json();
    if (comment.status === 201 && cj.success) ok('ticket comment');
    else fail('ticket comment', JSON.stringify(cj).slice(0, 120));

    const upd = await fetch(`${BASE}/api/humanify/support?id=${created.data.id}`, {
      method: 'PUT',
      headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', resolution_note: 'smoke done' }),
    });
    const uj = await upd.json();
    if (uj.success) ok('ticket resolve');
    else fail('ticket resolve', JSON.stringify(uj).slice(0, 120));
  } else {
    fail('ticket create', JSON.stringify(created).slice(0, 200));
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Smoke: AIMAN assisted agent workflows (v2)
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-aiman-agent.js
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

async function chat(message, pendingTools = []) {
  const res = await fetch(`${BASE}/api/humanify/ai-hub?action=chat`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: [], pendingTools }),
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  console.log('AIMAN agent smoke v2 —', BASE);
  await login();
  ok('login');

  const cases = [
    ['Persiapkan payroll bulan ini', 'payroll_prep'],
    ['Screening kandidat', 'recruitment_screen'],
    ['Cek kontrak hampir habis', 'contract_watch'],
    ['Cek onboarding', 'onboarding_check'],
    ['Meja cuti', 'leave_desk'],
  ];

  let pendingFromPayroll = [];
  for (const [msg, wf] of cases) {
    const r = await chat(msg);
    if (r.status === 403) {
      ok(`${wf} plan-gated`);
      continue;
    }
    if (r.status === 200 && r.json?.success && r.json.data?.agent?.workflowId === wf) {
      ok(`${wf} steps=${r.json.data.agent.steps?.length || 0}`);
      if (wf === 'payroll_prep') {
        pendingFromPayroll = (r.json.data.agent.pendingActions || []).map((p) => p.tool);
      }
    } else {
      fail(wf, JSON.stringify(r.json).slice(0, 200));
    }
  }

  if (pendingFromPayroll.length) {
    const conf = await chat('konfirmasi', pendingFromPayroll);
    if (conf.status === 200 && conf.json?.success && conf.json.data?.source === 'agent-confirm') {
      ok(`text-confirm ${pendingFromPayroll.join(',')}`);
    } else if (conf.status === 200 && conf.json?.success) {
      ok('text-confirm responded');
    } else {
      fail('text-confirm', JSON.stringify(conf.json).slice(0, 160));
    }
  } else {
    ok('text-confirm skipped (no pending)');
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

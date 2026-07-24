#!/usr/bin/env node
/**
 * Report employee claims with legacy (filename-only) receipt_url — Wave-70.
 *
 * Usage:
 *   node scripts/report-humanify-legacy-claims.js
 *   SMOKE_BASE_URL=https://staging.humanify.id node scripts/report-humanify-legacy-claims.js
 *   TENANT_ID=uuid node scripts/report-humanify-legacy-claims.js
 *
 * Static mode (no DB): validates parser helpers only.
 * Live mode: lists pending/active claims needing re-upload (auth as superadmin).
 */
require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || process.env.BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];
const TENANT_ID = process.env.TENANT_ID || '';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

/** Mirror of claimHasLegacyReceipt / parseClaimReceipts (filename-only string). */
function isLegacyReceipt(receiptUrl) {
  if (!receiptUrl || !String(receiptUrl).trim()) return false;
  const raw = String(receiptUrl).trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  for (const item of items) {
    if (typeof item === 'string') {
      const s = item.trim();
      if (!s) continue;
      if (s.startsWith('claim:') || s.includes('/api/humanify/claim-file') || s.startsWith('/uploads/claims/')) {
        continue;
      }
      return true;
    }
    if (item && typeof item === 'object') {
      const storageKey = String(item.storageKey || item.storage_key || '');
      const url = String(item.url || '');
      if (!storageKey && !url) continue;
      if (!storageKey && url && !url.includes('claim-file') && !url.startsWith('claim:') && !url.startsWith('/uploads/claims/') && !url.startsWith('http')) {
        return true;
      }
    }
  }
  return false;
}

function staticChecks() {
  console.log('── Static parser checks ──');
  if (isLegacyReceipt('kwitansi-lama.jpg')) ok('filename-only → legacy');
  else fail('filename-only not detected');
  if (!isLegacyReceipt('claim:tenant/abc.png')) ok('claim: key → not legacy');
  else fail('claim: key marked legacy');
  if (!isLegacyReceipt(JSON.stringify([{ storageKey: 'claim:t/x.pdf', filename: 'x.pdf' }]))) {
    ok('storageKey JSON → not legacy');
  } else fail('storageKey JSON marked legacy');
  if (!isLegacyReceipt('')) ok('empty → not legacy');
  else fail('empty marked legacy');
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
    const cookies = (csrfRes.headers.getSetCookie?.() || [])
      .concat(loginRes.headers.getSetCookie?.() || [])
      .filter((c) => c.includes('next-auth') || c.includes('csrf'))
      .map((c) => c.split(';')[0]);
    COOKIE = [...new Set(cookies)].join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error('login failed');
}

async function liveReport() {
  console.log('\n── Live reimbursement scan ──');
  console.log('Target:', BASE);
  try {
    await login();
    ok('login');
  } catch (e) {
    fail('login', e.message);
    return;
  }

  const qs = TENANT_ID ? `?action=claims&tenantId=${encodeURIComponent(TENANT_ID)}` : '?action=claims';
  const res = await fetch(`${BASE}/api/humanify/workflow${qs}`, {
    headers: { Cookie: COOKIE },
  });
  const j = await res.json().catch(() => ({}));
  let claims = j.data || j.claims || [];
  if (!Array.isArray(claims)) claims = [];

  const legacy = claims.filter((c) => isLegacyReceipt(c.receipt_url || c.receiptUrl));
  console.log(`\n  Scanned ${claims.length} claims · legacy=${legacy.length}`);
  for (const c of legacy.slice(0, 40)) {
    console.log(
      `  · ${c.id || c.claim_id} | ${c.status || '?'} | ${c.employee_name || c.employeeName || '-'} | ${(c.receipt_url || '').slice(0, 60)}`,
    );
  }
  if (legacy.length > 40) console.log(`  … +${legacy.length - 40} more`);
  ok(`legacy report printed (${legacy.length})`);
  console.log('\nHRD next: minta karyawan upload ulang di ESS → Klaim → Upload ulang bukti.');
}

(async () => {
  console.log('Humanify legacy claim report (Wave-70)');
  staticChecks();
  if (process.env.LEGACY_CLAIMS_STATIC_ONLY === '1') {
    console.log(`\nRESULT: ${passed} passed, ${failed} failed (static only)`);
    process.exit(failed ? 1 : 0);
  }
  await liveReport();
  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

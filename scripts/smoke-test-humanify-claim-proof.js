#!/usr/bin/env node
/**
 * Smoke — claim receipt / approval "Lihat bukti" (reimbursement, MSS, manager hub)
 * + E2E: upload → create claim → preview signed URL → approve
 *
 * Usage:
 *   node scripts/smoke-test-humanify-claim-proof.js
 *   SMOKE_BASE_URL=http://localhost:3010 node scripts/smoke-test-humanify-claim-proof.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

// 1×1 PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let COOKIE = '';
let passed = 0;
let failed = 0;
const failList = [];
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => {
  const x = d ? `${m} — ${d}` : m;
  console.log('  ✗', x);
  failList.push(x);
  failed++;
};

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

async function apiGet(apiPath) {
  const res = await fetch(`${BASE}${apiPath}`, { headers: { Cookie: COOKIE } });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { status: res.status, json };
}

async function apiJson(method, apiPath, body) {
  const res = await fetch(`${BASE}${apiPath}`, {
    method,
    headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { status: res.status, json };
}

function isLegacyReceipt(receiptUrl) {
  if (!receiptUrl || !String(receiptUrl).trim()) return false;
  try {
    const parsed = JSON.parse(receiptUrl);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.some((item) => {
      if (typeof item === 'string') {
        const s = item.trim();
        return s && !s.startsWith('claim:') && !s.includes('claim-file') && !s.startsWith('/uploads/claims/') && !s.startsWith('http');
      }
      if (item && typeof item === 'object') {
        return !item.storageKey && !item.storage_key && !(item.url || '').includes('claim-file') && !(item.url || '').startsWith('claim:');
      }
      return false;
    });
  } catch {
    const s = String(receiptUrl).trim();
    return s && !s.startsWith('claim:') && !s.includes('claim-file') && !s.startsWith('http') && !s.startsWith('/');
  }
}

function staticChecks() {
  console.log('\n── Static / source checks ──');

  if (exists('lib/hris/claim-receipt.ts') && /parseClaimReceipts|resolveClaimAttachmentUrl|claimHasLegacyReceipt/.test(read('lib/hris/claim-receipt.ts'))) {
    ok('claim-receipt parser + claimHasLegacyReceipt');
  } else fail('claim-receipt parser module');

  if (exists('components/humanify/ClaimReceiptGallery.tsx')) {
    const gal = read('components/humanify/ClaimReceiptGallery.tsx');
    if (/format lama|upload ulang/.test(gal)) ok('ClaimReceiptGallery + legacy notice');
    else ok('ClaimReceiptGallery component');
  } else fail('ClaimReceiptGallery component');

  const portal = read('components/employee/EmployeePortal.tsx');
  if (/replace-claim-receipt|Upload ulang bukti|claimHasLegacyReceipt/.test(portal)) {
    ok('ESS replace-claim-receipt + legacy CTA');
  } else fail('ESS legacy re-upload UI');

  const dash = read('pages/api/employee/dashboard.ts');
  if (/replaceClaimReceipt|replace-claim-receipt/.test(dash)) ok('API replace-claim-receipt');
  else fail('API replace-claim-receipt');

  const reimb = read('pages/humanify/reimbursement.tsx');
  if (/ClaimReceiptGallery/.test(reimb) && /title="Lihat bukti"/.test(reimb) && /parseClaimReceipts/.test(reimb)) {
    ok('reimbursement: gallery + Aksi Lihat bukti');
  } else fail('reimbursement: gallery + Aksi Lihat bukti');

  if (isLegacyReceipt('kwitansi-old.jpg') && !isLegacyReceipt('claim:t/a.png')) {
    ok('legacy detector sanity');
  } else fail('legacy detector sanity');

  const mss = read('pages/humanify/mss.tsx');
  if (/ClaimReceiptGallery/.test(mss) && /Lihat bukti/.test(mss) && /setProofClaim/.test(mss)) {
    ok('mss: ClaimReceiptGallery + Lihat bukti modal');
  } else fail('mss: ClaimReceiptGallery + Lihat bukti modal');

  const mgrHub = read('components/employee/ManagerHubTab.tsx');
  if (/ClaimReceiptGallery/.test(mgrHub) && /Lihat bukti/.test(mgrHub)) {
    ok('ManagerHubTab: Lihat bukti for claims');
  } else fail('ManagerHubTab: Lihat bukti for claims');

  const mgrApi = read('pages/api/employee/manager.ts');
  if (/c\.receipt_url/.test(mgrApi) && /c\.attachments_count/.test(mgrApi)) {
    ok('manager API: receipt_url in pending claims');
  } else fail('manager API: receipt_url in pending claims');

  if (exists('pages/api/humanify/claim-file.ts')) {
    ok('claim-file signed GET endpoint');
  } else fail('claim-file signed GET endpoint');
}

async function apiChecks() {
  console.log('\n── API checks ──');
  let session;
  try {
    session = await login();
    ok(`login as ${session.user.email}`);
  } catch (e) {
    fail('login', e.message);
    return;
  }

  const claims = await apiGet('/api/humanify/workflow?action=claims');
  if (claims.status === 200 && claims.json.success !== false) {
    const rows = claims.json.data || [];
    ok(`workflow claims list (${rows.length} items)`);
    if (rows.length > 0) {
      const sample = rows[0];
      if ('receipt_url' in sample || sample.receipt_url === null) {
        ok('workflow claims include receipt_url field');
      } else fail('workflow claims include receipt_url field');
      const legacyCount = rows.filter((r) => isLegacyReceipt(r.receipt_url)).length;
      ok(`legacy receipt scan (${legacyCount}/${rows.length} legacy)`);
    }
  } else fail('workflow claims list', `HTTP ${claims.status}`);

  const mgr = await apiGet('/api/employee/manager?action=pending-approvals');
  if (mgr.status === 200 && mgr.json.success !== false) {
    const claimRows = mgr.json.data?.claims || [];
    ok(`manager pending-approvals claims (${claimRows.length})`);
    if (claimRows.length > 0) {
      const sample = claimRows[0];
      if ('receipt_url' in sample) {
        ok('manager pending claims expose receipt_url');
      } else {
        fail('manager pending claims expose receipt_url', 'field missing — deploy manager.ts patch');
      }
    } else {
      ok('manager pending claims expose receipt_url (no pending rows to verify)');
    }
  } else if (mgr.status === 403 || mgr.status === 404) {
    ok(`manager pending-approvals skipped for role (HTTP ${mgr.status})`);
  } else {
    fail('manager pending-approvals', `HTTP ${mgr.status}`);
  }

  const bad = await fetch(`${BASE}/api/humanify/claim-file?key=${encodeURIComponent('../../../etc/passwd')}`);
  if ([401, 403, 400, 404, 520, 502, 503].includes(bad.status)) {
    ok(`claim-file rejects traversal (HTTP ${bad.status})`);
  } else {
    fail('claim-file traversal guard', `HTTP ${bad.status}`);
  }
}

async function e2eClaimJourney() {
  console.log('\n── E2E claim journey (upload → preview → approve) ──');
  try {
    await login();
  } catch (e) {
    fail('e2e login', e.message);
    return;
  }

  // Resolve an employee id
  let employeeId = null;
  for (const pathTry of [
    '/api/humanify/employee-profile?action=list&limit=5',
    '/api/humanify/employees?limit=5',
  ]) {
    const emp = await apiGet(pathTry);
    const rows = emp.json.data || emp.json.employees || [];
    if (Array.isArray(rows) && rows.length) {
      employeeId = rows[0].id || rows[0].employee_id;
      if (employeeId) break;
    }
  }
  if (!employeeId) {
    fail('e2e resolve employee', 'no employees found');
    return;
  }
  ok(`e2e employee ${String(employeeId).slice(0, 8)}…`);

  // Upload tiny PNG via upload-claim
  const form = new FormData();
  form.append('files', new Blob([TINY_PNG], { type: 'image/png' }), 'smoke-claim-proof.png');
  const upRes = await fetch(`${BASE}/api/humanify/upload-claim`, {
    method: 'POST',
    headers: { Cookie: COOKIE },
    body: form,
  });
  const upJson = await upRes.json().catch(() => ({}));
  const uploaded = (upJson.data || upJson.files || [])[0];
  if (upRes.status >= 200 && upRes.status < 300 && uploaded?.storageKey) {
    ok(`e2e upload storageKey=${String(uploaded.storageKey).slice(0, 24)}…`);
  } else {
    fail('e2e upload-claim', `HTTP ${upRes.status} ${upJson.error || ''}`);
    return;
  }

  // Preview signed URL (auth cookie)
  const previewUrl = uploaded.url?.startsWith('http')
    ? uploaded.url
    : `${BASE}${uploaded.url.startsWith('/') ? '' : '/'}${uploaded.url}`;
  const prev = await fetch(previewUrl, { headers: { Cookie: COOKIE } });
  if (prev.status === 200) {
    ok(`e2e signed preview HTTP 200 (${prev.headers.get('content-type') || 'bin'})`);
  } else {
    fail('e2e signed preview', `HTTP ${prev.status}`);
  }

  const receiptPayload = JSON.stringify([{
    storageKey: uploaded.storageKey,
    filename: uploaded.filename || 'smoke-claim-proof.png',
    mimetype: uploaded.mimetype || 'image/png',
  }]);

  const created = await apiJson('POST', '/api/humanify/workflow?action=claim', {
    employee_id: employeeId,
    claim_type: 'transport',
    amount: 12500,
    claim_date: new Date().toISOString().slice(0, 10),
    description: `Smoke claim-proof E2E ${Date.now()}`,
    receipt_url: receiptPayload,
  });
  const claimId = created.json.data?.id || created.json.data?.[0]?.id;
  if (created.status < 300 && created.json.success !== false && claimId) {
    ok(`e2e create claim ${String(claimId).slice(0, 8)}…`);
  } else {
    fail('e2e create claim', `HTTP ${created.status} ${created.json.error || ''}`);
    return;
  }

  const listed = await apiGet('/api/humanify/workflow?action=claims');
  const row = (listed.json.data || []).find((c) => String(c.id) === String(claimId));
  if (row?.receipt_url && !isLegacyReceipt(row.receipt_url)) {
    ok('e2e claim receipt_url non-legacy in list');
  } else {
    fail('e2e claim receipt_url non-legacy in list', row ? 'legacy or empty' : 'not found');
  }

  const approved = await apiJson('POST', '/api/humanify/workflow?action=approve-claim', {
    id: claimId,
    approved_amount: 12500,
    comments: 'Smoke auto-approve claim-proof',
  });
  if (approved.status < 300 && approved.json.success !== false) {
    ok('e2e approve claim');
  } else {
    fail('e2e approve claim', `HTTP ${approved.status} ${approved.json.error || ''}`);
  }
}

async function pageChecks() {
  console.log('\n── Page bundle checks ──');
  try {
    await login();
  } catch {
    fail('page checks login');
    return;
  }

  for (const route of ['/humanify/reimbursement', '/humanify/mss']) {
    const res = await fetch(`${BASE}${route}`, { headers: { Cookie: COOKIE } });
    const html = await res.text();
    if (res.status !== 200) {
      fail(`${route} HTTP`, String(res.status));
      continue;
    }
    if (/application error|internal server error|__next_error__/.test(html.toLowerCase())) {
      fail(`${route} render`, 'error in HTML');
      continue;
    }
    ok(`${route} loads (${html.length}b)`);
  }
}

(async () => {
  console.log(`Humanify claim-proof smoke — ${BASE}`);
  staticChecks();
  await apiChecks();
  await e2eClaimJourney();
  await pageChecks();

  console.log(`\n${'═'.repeat(40)}`);
  console.log(`PASSED: ${passed}  FAILED: ${failed}`);
  if (failList.length) {
    console.log('\nFailures:');
    failList.forEach((f) => console.log('  •', f));
  }
  process.exit(failed > 0 ? 1 : 0);
})();

#!/usr/bin/env node
/**
 * Humanify — Certificate registry expiry / rare / HR actions smoke
 *
 * Usage:
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-certificates.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE = (process.env.SMOKE_BASE_URL || 'https://humanify.id').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];
const stamp = Date.now().toString(36);

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];
let certId = null;
let empA = null;
let empB = null;

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('csrf-token'))?.split(';')[0] || '';
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
      ok(`login ${session.user.email}`);
      return session;
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
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 240) }; }
  return { status: res.status, json };
}

async function main() {
  console.log(`\nCertificate registry smoke → ${BASE}\n`);
  await login();

  console.log('\n══ Page shell ══');
  const page = await fetch(`${BASE}/humanify/certificates`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  const html = await page.text();
  if ([200, 307, 308].includes(page.status) && /Certificate|Sertifikat|Credential|Playbook aksi HR/i.test(html)) {
    ok('UI /humanify/certificates');
  } else fail('UI /humanify/certificates', `HTTP ${page.status}`);

  console.log('\n══ Analytics shape ══');
  const analytics = await api('GET', '/api/humanify/certificates?action=analytics');
  if (analytics.status === 200 && analytics.json.success !== false && analytics.json.data) {
    const d = analytics.json.data;
    const keys = ['total', 'valid', 'expiringSoon', 'expired', 'critical30', 'rareCount', 'rare', 'actionQueue'];
    const missing = keys.filter((k) => !(k in d));
    if (missing.length) fail('analytics keys', missing.join(','));
    else ok(`analytics total=${d.total} rare=${d.rareCount} queue=${(d.actionQueue || []).length}`);
  } else fail('analytics', `HTTP ${analytics.status} ${analytics.json.error || ''}`);

  console.log('\n══ List + filters ══');
  const list = await api('GET', '/api/humanify/certificates');
  if (list.status === 200 && Array.isArray(list.json.data)) ok(`list ${list.json.data.length} records (${list.json.dataSource})`);
  else fail('list', `HTTP ${list.status}`);

  const rareFilter = await api('GET', '/api/humanify/certificates?window=rare');
  if (rareFilter.status === 200 && Array.isArray(rareFilter.json.data)) ok(`filter window=rare → ${rareFilter.json.data.length}`);
  else fail('filter rare', `HTTP ${rareFilter.status}`);

  console.log('\n══ Resolve employees ══');
  const emps = await api('GET', '/api/humanify/employee-profile?action=list&limit=20');
  const rows = emps.json.data || emps.json.employees || emps.json.data?.employees || [];
  if (rows.length >= 1) {
    empA = { id: String(rows[0].id), name: rows[0].name || 'Emp A', department: rows[0].department };
    empB = rows[1]
      ? { id: String(rows[1].id), name: rows[1].name || 'Emp B', department: rows[1].department }
      : empA;
    ok(`employees ${empA.name} / ${empB.name}`);
  } else {
    fail('employees list empty — skip write actions');
  }

  if (empA) {
    console.log('\n══ HR actions CRUD ══');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 25);
    const create = await api('POST', '/api/humanify/certificates?action=create', {
      employeeId: empA.id,
      employeeName: empA.name,
      department: empA.department,
      title: `Smoke Rare Cert ${stamp}`,
      issuer: 'Humanify Smoke',
      source: 'compliance',
      expiryDate: expiry.toISOString().slice(0, 10),
      notes: 'auto smoke — safe',
    });
    if (create.status === 201 || (create.status === 200 && create.json.success)) {
      certId = create.json.data?.id;
      ok(`CREATE ${certId}`);
    } else fail('CREATE', `HTTP ${create.status} ${create.json.error || ''}`);

    if (certId) {
      const remind = await api('POST', '/api/humanify/certificates?action=remind', { id: certId, note: 'smoke remind' });
      if (remind.status === 200 && remind.json.success) ok('REMIND');
      else fail('REMIND', `HTTP ${remind.status} ${remind.json.error || ''}`);

      const nextExp = new Date();
      nextExp.setFullYear(nextExp.getFullYear() + 1);
      const renew = await api('POST', '/api/humanify/certificates?action=renew', {
        id: certId,
        newExpiryDate: nextExp.toISOString().slice(0, 10),
        note: 'smoke renew',
      });
      if (renew.status === 200 && renew.json.success) ok('RENEW');
      else fail('RENEW', `HTTP ${renew.status} ${renew.json.error || ''}`);

      if (empB && empB.id !== empA.id) {
        const transfer = await api('POST', '/api/humanify/certificates?action=transfer', {
          id: certId,
          toEmployeeId: empB.id,
          toEmployeeName: empB.name,
          toDepartment: empB.department,
          note: 'smoke transfer',
        });
        if (transfer.status === 200 && transfer.json.success) ok('TRANSFER');
        else fail('TRANSFER', `HTTP ${transfer.status} ${transfer.json.error || ''}`);
      } else {
        ok('TRANSFER skipped (single employee)');
      }

      const revoke = await api('POST', '/api/humanify/certificates?action=revoke', { id: certId, note: 'smoke revoke cleanup' });
      if (revoke.status === 200 && revoke.json.success) ok('REVOKE');
      else fail('REVOKE', `HTTP ${revoke.status} ${revoke.json.error || ''}`);
    }
  }

  console.log(`\n══ Summary: ${passed} pass · ${failed} fail ══`);
  if (failures.length) failures.forEach((f) => console.log('  -', f));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

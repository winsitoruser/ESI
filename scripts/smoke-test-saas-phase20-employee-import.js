#!/usr/bin/env node
/**
 * Phase 20 — mass employee import smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase20-employee-import.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  \u2713', m); passed++; };
const fail = (m, d) => { console.log('  \u2717', d ? `${m} \u2014 ${d}` : m); failed++; };

async function login(email, passwords) {
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

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('SaaS Phase 20 \u2014 Employee mass import smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `import-${stamp}@humanify.test`;
  const password = 'ImportTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Import Tester', email, password, companyName: `Import Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  ok(`signup ${regJ.data.slug}`);
  await login(email, [password]);

  const e1 = `budi.${stamp}@contoh.test`;
  const e2 = `siti.${stamp}@contoh.test`;
  const validCsv =
    'name,email,phone,position,department,employmentCategory\n' +
    `Budi ${stamp},${e1},08123456789,Staff Ops,OPERATIONS,permanent\n` +
    `Siti ${stamp},${e2},08129876543,HR Officer,HR,contract\n`;

  // 1. Dry-run preview — nothing persisted
  const dry = await api('POST', '/api/humanify/employees-import', { csv: validCsv, dryRun: true });
  if (dry.json?.success && dry.json.data?.dryRun === true && dry.json.data.total === 2) ok('dry-run parses 2 rows');
  else fail('dry-run', JSON.stringify(dry.json));
  const dryOk = (dry.json?.data?.results || []).filter((r) => r.status === 'ok').length;
  if (dryOk === 2 && dry.json.data.imported === 0) ok('dry-run marks 2 ready, imports 0');
  else fail('dry-run counts', `ready=${dryOk} imported=${dry.json?.data?.imported}`);

  // 2. Real import
  const imp = await api('POST', '/api/humanify/employees-import', { csv: validCsv, dryRun: false });
  if (imp.json?.success && imp.json.data?.imported === 2) ok('import inserts 2 employees');
  else fail('import', JSON.stringify(imp.json?.data));

  // 3. Re-import same file → already exists
  const dupe = await api('POST', '/api/humanify/employees-import', { csv: validCsv, dryRun: false });
  const existsCount = (dupe.json?.data?.results || []).filter((r) => r.status === 'exists').length;
  if (dupe.json?.data?.imported === 0 && existsCount === 2) ok('re-import skips existing emails');
  else fail('re-import dedupe', JSON.stringify(dupe.json?.data));

  // 4. In-file duplicate + invalid rows
  const messyCsv =
    'name,email,position\n' +
    `Andi ${stamp},andi.${stamp}@contoh.test,Manager\n` +
    `Andi Dup,andi.${stamp}@contoh.test,Manager\n` + // duplicate email in file
    `,noemail@contoh.test,Staff\n` +                  // missing name
    `Bad Email,not-an-email,Staff\n`;                 // invalid email
  const messy = await api('POST', '/api/humanify/employees-import', { csv: messyCsv, dryRun: true });
  const r = messy.json?.data?.results || [];
  const hasDupFile = r.some((x) => x.status === 'duplicate_file');
  const invalidCount = r.filter((x) => x.status === 'invalid').length;
  if (hasDupFile) ok('detects in-file duplicate email'); else fail('in-file dup', JSON.stringify(r));
  if (invalidCount >= 2) ok(`flags ${invalidCount} invalid rows`); else fail('invalid rows', JSON.stringify(r));

  // 5. Empty payload rejected
  const empty = await api('POST', '/api/humanify/employees-import', { csv: 'name,email,position\n' });
  if (empty.status === 400) ok('empty CSV rejected (400)'); else fail('empty CSV', `status=${empty.status}`);

  // 6. Imported employees are searchable (bridges Phase 22)
  const srch = await api('GET', `/api/humanify/search?q=${encodeURIComponent('Budi ' + stamp)}`);
  const found = (srch.json?.data?.employees || []).some((e) => e.email === e1);
  if (found) ok('imported employee is searchable'); else fail('search after import', JSON.stringify(srch.json?.data));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

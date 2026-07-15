#!/usr/bin/env node
/**
 * Phase 21 — in-app notification center smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase21-notifications.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const OP_EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const OP_PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

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
  console.log('SaaS Phase 21 \u2014 Notification center smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const email = `notif-${stamp}@humanify.test`;
  const password = 'NotifTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Notif Tester', email, password, companyName: `Notif Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  ok(`signup ${regJ.data.slug}`);
  await login(email, [password]);

  // 1. Fresh trial auto-derives alert notifications (email unverified, go-live)
  const l1 = await api('GET', '/api/humanify/notifications?action=list');
  if (l1.json?.success && Array.isArray(l1.json.data)) ok(`list returns ${l1.json.data.length} notifications`);
  else { fail('list endpoint', JSON.stringify(l1.json)); process.exit(1); }
  if (l1.json.unreadCount >= 1) ok(`unreadCount=${l1.json.unreadCount} (alerts derived)`);
  else fail('expected derived alert notifications', `unread=${l1.json.unreadCount}`);
  const hasAlertNotif = l1.json.data.some((n) => /verif|setup|trial|kuota|langganan|tangguh/i.test(`${n.title} ${n.message}`));
  if (hasAlertNotif) ok('alert-derived notification present'); else fail('alert notif content', JSON.stringify(l1.json.data.map((n) => n.title)));

  // 2. Idempotent sync — re-listing must not multiply notifications
  const l2 = await api('GET', '/api/humanify/notifications?action=list');
  if (l2.json.data.length === l1.json.data.length) ok('sync is idempotent (no duplicates)');
  else fail('sync duplicated', `before=${l1.json.data.length} after=${l2.json.data.length}`);

  // 3. Mark all read → unread drops to 0
  const mark = await api('POST', '/api/humanify/notifications?action=mark-read', {});
  if (mark.json?.success) ok(`mark-read updated ${mark.json.updated}`); else fail('mark-read', JSON.stringify(mark.json));
  const l3 = await api('GET', '/api/humanify/notifications?action=list');
  if (l3.json.unreadCount === 0) ok('unreadCount=0 after mark-all-read');
  else fail('still unread after mark-all', `unread=${l3.json.unreadCount}`);

  // 4. Custom event notification via employee import
  const impCsv = `name,email,position\nZaki ${stamp},zaki.${stamp}@contoh.test,Analyst\n`;
  const imp = await api('POST', '/api/humanify/employees-import', { csv: impCsv, dryRun: false });
  if (imp.json?.data?.imported === 1) ok('import created 1 employee'); else fail('import for notif', JSON.stringify(imp.json?.data));
  const l4 = await api('GET', '/api/humanify/notifications?action=list');
  const importNotif = l4.json.data.find((n) => /impor karyawan/i.test(n.title));
  if (importNotif && importNotif.isRead === false) ok('import produced an unread notification');
  else fail('import notification missing', JSON.stringify(l4.json.data.map((n) => n.title)));

  // 5. Platform operator has no tenant stream
  await login(OP_EMAIL, OP_PASSWORDS);
  const opL = await api('GET', '/api/humanify/notifications?action=list');
  if (opL.json?.success && Array.isArray(opL.json.data) && opL.json.data.length === 0 && opL.json.unreadCount === 0) {
    ok('platform operator gets empty stream');
  } else {
    fail('platform operator stream not empty', JSON.stringify(opL.json));
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

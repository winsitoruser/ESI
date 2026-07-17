#!/usr/bin/env node
/**
 * Phase 23 — team invitations & multi-user onboarding smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase23-invitations.js
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
  throw new Error(`login failed for ${email}`);
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

async function pub(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('SaaS Phase 23 \u2014 Team invitations smoke');
  console.log('Target:', BASE);

  const stamp = Date.now().toString(36);
  const ownerEmail = `inv-owner-${stamp}@humanify.test`;
  const ownerPass = 'InvTest1!';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Invite Owner', email: ownerEmail, password: ownerPass, companyName: `Invite Co ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  ok(`signup ${regJ.data.slug}`);
  await login(ownerEmail, [ownerPass]);

  // 1. Initial list — owner is a member, canManage, roles available
  const l1 = await api('GET', '/api/humanify/invitations');
  if (l1.json?.success && l1.json.data) ok('list endpoint responds');
  else { fail('list endpoint', JSON.stringify(l1.json)); process.exit(1); }
  if (l1.json.data.canManage === true) ok('owner canManage=true'); else fail('owner should manage', JSON.stringify(l1.json.data.canManage));
  if ((l1.json.data.members || []).some((m) => m.email === ownerEmail)) ok('owner present in members'); else fail('owner not in members');
  if ((l1.json.data.roles || []).length >= 3) ok(`roles offered (${l1.json.data.roles.length})`); else fail('roles missing', JSON.stringify(l1.json.data.roles));

  // 2. Create an invitation
  const memberEmail = `inv-member-${stamp}@humanify.test`;
  const c1 = await api('POST', '/api/humanify/invitations?action=create', { email: memberEmail, role: 'manager', name: 'New Teammate' });
  const prodEmailMode = c1.status === 201 && c1.json?.success && c1.json.data?.emailed && !c1.json.data?.token;
  let token = c1.json?.data?.token;
  if (c1.status === 201 && c1.json?.success && token) ok('invitation created with token');
  else if (prodEmailMode) ok('invitation created and emailed (prod SMTP — token not in response)');
  else { fail('create invitation', JSON.stringify(c1.json)); process.exit(1); }

  // 3. Appears as pending
  const l2 = await api('GET', '/api/humanify/invitations');
  const pending = (l2.json.data.invitations || []).filter((i) => i.status === 'pending' && !i.expired);
  if (pending.some((i) => i.email === memberEmail && i.role === 'manager')) ok('invitation shows as pending (manager)');
  else fail('pending invitation missing', JSON.stringify(l2.json.data.invitations));

  if (prodEmailMode) {
    ok('token preview/accept skipped (prod SMTP mode)');
    const cPriv = await api('POST', '/api/humanify/invitations?action=create', { email: `evil-${stamp}@humanify.test`, role: 'owner' });
    if (!cPriv.json?.success) ok('privileged role invite rejected'); else fail('owner role invite allowed', JSON.stringify(cPriv.json));
    const revEmail = `inv-rev-${stamp}@humanify.test`;
    const cRev = await api('POST', '/api/humanify/invitations?action=create', { email: revEmail, role: 'viewer' });
    const revId = cRev.json?.data?.id;
    if (revId) ok('created invitation to revoke'); else fail('create-to-revoke failed', JSON.stringify(cRev.json));
    const rev = await api('POST', '/api/humanify/invitations?action=revoke', { id: revId });
    if (rev.json?.success) ok('invitation revoked'); else fail('revoke failed', JSON.stringify(rev.json));
    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }

  // 4. Public preview of token
  const prev = await pub('GET', `/api/humanify/invitations-accept?token=${encodeURIComponent(token)}`);
  if (prev.json?.data?.valid && prev.json.data.email === memberEmail) ok('public preview valid, email matches');
  else fail('preview invalid', JSON.stringify(prev.json));

  // 5. Duplicate invite for a pending email refreshes (no error), still one pending
  const cDup = await api('POST', '/api/humanify/invitations?action=create', { email: memberEmail, role: 'staff' });
  if (cDup.status === 201 && cDup.json?.success) ok('re-invite pending email succeeds (refresh)');
  else fail('re-invite failed', JSON.stringify(cDup.json));
  const newToken = cDup.json.data.token;
  const oldPrev = await pub('GET', `/api/humanify/invitations-accept?token=${encodeURIComponent(token)}`);
  if (!oldPrev.json?.data?.valid) ok('old token invalidated after refresh'); else fail('old token still valid');

  // 6. Accept the (refreshed) invitation
  const memberPass = 'Member123!';
  const acc = await pub('POST', '/api/humanify/invitations-accept', { token: newToken, name: 'New Teammate', password: memberPass });
  if (acc.status === 201 && acc.json?.success) ok('invitation accepted, account created');
  else { fail('accept failed', JSON.stringify(acc.json)); process.exit(1); }

  // 7. Token cannot be reused
  const reAcc = await pub('POST', '/api/humanify/invitations-accept', { token: newToken, name: 'Dup', password: memberPass });
  if (!reAcc.json?.success) ok('accepted token cannot be reused'); else fail('token reused', JSON.stringify(reAcc.json));

  // 8. Member appears; pending cleared (owner view)
  await login(ownerEmail, [ownerPass]);
  const l3 = await api('GET', '/api/humanify/invitations');
  if ((l3.json.data.members || []).some((m) => m.email === memberEmail && m.role === 'staff')) ok('member added with assigned role');
  else fail('member not added', JSON.stringify((l3.json.data.members || []).map((m) => `${m.email}:${m.role}`)));
  const stillPending = (l3.json.data.invitations || []).filter((i) => i.status === 'pending' && !i.expired && i.email === memberEmail);
  if (stillPending.length === 0) ok('no lingering pending for accepted member'); else fail('pending remains', JSON.stringify(stillPending));

  // 9. New member can log in and is scoped to the same tenant
  const memberSession = await login(memberEmail, [memberPass]);
  if (memberSession?.user?.email === memberEmail) ok('new member can log in');
  else fail('member login failed', JSON.stringify(memberSession));
  if ((memberSession.user.tenantId || null) === (regJ.data.tenantId || 'x')) ok('member scoped to owner tenant');
  else fail('member tenant mismatch', `${memberSession.user.tenantId} vs ${regJ.data.tenantId}`);

  // 10. Cannot invite an existing user
  await login(ownerEmail, [ownerPass]);
  const cExist = await api('POST', '/api/humanify/invitations?action=create', { email: memberEmail, role: 'staff' });
  if (!cExist.json?.success && /pengguna/i.test(cExist.json?.error || '')) ok('cannot invite an existing user');
  else fail('existing-user invite not blocked', JSON.stringify(cExist.json));

  // 11. Privileged role is rejected
  const cPriv = await api('POST', '/api/humanify/invitations?action=create', { email: `evil-${stamp}@humanify.test`, role: 'owner' });
  if (!cPriv.json?.success) ok('privileged role invite rejected'); else fail('owner role invite allowed', JSON.stringify(cPriv.json));

  // 12. Revoke flow — create, revoke, accept must fail
  const revEmail = `inv-rev-${stamp}@humanify.test`;
  const cRev = await api('POST', '/api/humanify/invitations?action=create', { email: revEmail, role: 'viewer' });
  const revId = cRev.json?.data?.id;
  const revToken = cRev.json?.data?.token;
  if (revId && revToken) ok('created invitation to revoke'); else fail('create-to-revoke failed', JSON.stringify(cRev.json));
  const rev = await api('POST', '/api/humanify/invitations?action=revoke', { id: revId });
  if (rev.json?.success) ok('invitation revoked'); else fail('revoke failed', JSON.stringify(rev.json));
  const accRev = await pub('POST', '/api/humanify/invitations-accept', { token: revToken, name: 'Nope', password: 'Nope1234!' });
  if (!accRev.json?.success) ok('revoked invitation cannot be accepted'); else fail('revoked token accepted', JSON.stringify(accRev.json));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

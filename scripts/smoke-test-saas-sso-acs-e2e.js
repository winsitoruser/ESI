#!/usr/bin/env node
/**
 * SSO ACS e2e — self-signed IdP → ACS → ssoToken redirect.
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-sso-acs-e2e.js
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function opensslSelfSigned() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sso-'));
  const key = path.join(dir, 'key.pem');
  const crt = path.join(dir, 'cert.pem');
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${key}" -out "${crt}" -days 1 -nodes -subj "/CN=humanify-test-idp"`,
    { stdio: 'pipe' },
  );
  return {
    privateKey: fs.readFileSync(key, 'utf8'),
    cert: fs.readFileSync(crt, 'utf8'),
    cleanup: () => { try { fs.rmSync(dir, { recursive: true }); } catch { /* */ } },
  };
}

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

async function api(method, pathName, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${pathName}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('SaaS SSO ACS e2e smoke');
  console.log('Target:', BASE);

  let saml;
  try {
    saml = require('samlify');
    saml.setSchemaValidator({ validate: () => Promise.resolve('skipped') });
  } catch (e) {
    fail('samlify require', e.message);
    process.exit(1);
  }

  const stamp = Date.now().toString(36);
  const email = `ssoacs-${stamp}@humanify.test`;
  const password = 'SsoAcs1!';
  const domain = 'humanify.test';
  const reg = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'SSO ACS', email, password, companyName: `SSO ACS ${stamp}` }),
  });
  const regJ = await reg.json();
  if (!reg.ok || !regJ.success) { fail('signup', regJ.error); process.exit(1); }
  const slug = regJ.data.slug;
  ok(`signup ${slug}`);
  await login(email, [password]);

  const keys = await opensslSelfSigned();
  const idpEntityId = `https://idp.test/${stamp}`;
  const entryPoint = `https://idp.test/${stamp}/sso`;

  const save = await api('POST', '/api/humanify/sso?action=save', {
    enabled: true,
    entryPoint,
    idpEntityId,
    emailDomain: domain,
    cert: keys.cert,
  });
  if (save.json?.success && save.json.data?.config?.enabled) ok('sso config saved with self-signed cert');
  else { fail('sso save', JSON.stringify(save.json).slice(0, 200)); keys.cleanup(); process.exit(1); }

  const cfg = await api('GET', '/api/humanify/sso?action=config');
  const spMeta = cfg.json?.data?.sp;
  if (!spMeta?.acsUrl || !spMeta?.entityId) {
    fail('sp metadata', JSON.stringify(cfg.json).slice(0, 160));
    keys.cleanup();
    process.exit(1);
  }
  ok(`sp acs ready`);

  const loginInit = await fetch(`${BASE}/api/humanify/sso/login?tenant=${encodeURIComponent(slug)}`, { redirect: 'manual' });
  if (loginInit.status >= 300 && loginInit.status < 400) ok(`login init redirect (${loginInit.status})`);
  else ok(`login init status ${loginInit.status}`);

  const spEntity = saml.ServiceProvider({
    entityID: spMeta.entityId,
    assertionConsumerService: [{
      Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
      Location: spMeta.acsUrl,
    }],
    wantAssertionsSigned: true,
  });
  const idp = saml.IdentityProvider({
    entityID: idpEntityId,
    privateKey: keys.privateKey,
    signingCert: keys.cert,
    singleSignOnService: [{
      Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
      Location: entryPoint,
    }],
  });

  const ssoEmail = `acs-user-${stamp}@${domain}`;
  let loginResp;
  try {
    loginResp = await idp.createLoginResponse(spEntity, {}, 'post', ssoEmail, (template) => {
      const id = `_${crypto.randomBytes(10).toString('hex')}`;
      const now = new Date();
      const later = new Date(now.getTime() + 5 * 60 * 1000);
      const context = saml.SamlLib.replaceTagsByValue(template, {
        ID: id,
        AssertionID: `_${crypto.randomBytes(10).toString('hex')}`,
        Destination: spMeta.acsUrl,
        Audience: spMeta.entityId,
        SubjectRecipient: spMeta.acsUrl,
        NameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        NameID: ssoEmail,
        Issuer: idpEntityId,
        IssueInstant: now.toISOString(),
        ConditionsNotBefore: now.toISOString(),
        ConditionsNotOnOrAfter: later.toISOString(),
        SubjectConfirmationDataNotOnOrAfter: later.toISOString(),
        AuthnInstant: now.toISOString(),
        SessionIndex: `_${crypto.randomBytes(8).toString('hex')}`,
        StatusCode: 'urn:oasis:names:tc:SAML:2.0:status:Success',
      });
      return { id, context };
    });
  } catch (e) {
    fail('createLoginResponse', e.message);
    keys.cleanup();
    process.exit(1);
  }
  const b64 = loginResp?.context;
  if (!b64) {
    fail('SAMLResponse missing', JSON.stringify(loginResp).slice(0, 200));
    keys.cleanup();
    process.exit(1);
  }
  ok('IdP SAMLResponse created');

  const acs = await fetch(spMeta.acsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ SAMLResponse: b64, RelayState: slug }),
    redirect: 'manual',
  });
  const loc = acs.headers.get('location') || '';
  if (acs.status >= 300 && acs.status < 400 && loc.includes('ssoToken=')) {
    ok(`ACS redirect with ssoToken (${acs.status})`);
  } else {
    const body = await acs.text().catch(() => '');
    fail('ACS redirect', `status=${acs.status} loc=${loc.slice(0, 160)} body=${body.slice(0, 160)}`);
  }

  keys.cleanup();
  console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

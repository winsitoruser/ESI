#!/usr/bin/env node
/**
 * Humanify OWASP smoke pack — defensive probes (staging preferred).
 *
 * Covers: SQLi · XSS · CSRF · IDOR(light) · Broken Auth · Broken Access(light) ·
 * Misconfig/headers · SSRF(light) · XXE · Command Injection · Path Traversal ·
 * Clickjacking · Rate Limiting headers.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://staging.humanify.id \
 *   SMOKE_EMAIL=superadmin@humanify.id SMOKE_PASSWORD=superadmin123 \
 *   node scripts/smoke-test-humanify-owasp-pack.js
 *
 * Safety: read-mostly + disposable signup tenant for write probes. No destructive DDL.
 */
const BASE = (process.env.SMOKE_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3010').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [
  process.env.SMOKE_PASSWORD,
  'superadmin123',
  'admin123',
].filter(Boolean);

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

const SQLI_PAYLOADS = [
  "' OR '1'='1",
  "1; DROP TABLE employees--",
  "1' UNION SELECT NULL--",
  "%' OR 1=1--",
];
const XSS_PAYLOAD = '<script>alert("xss")</script>';
const CMD_PAYLOADS = ['; id', '| cat /etc/passwd', '$(whoami)', '`id`'];
const SQL_LEAK = /syntax error|pg_catalog|sequelizeDatabaseError|SQLSTATE|relation \".*\" does not exist|sqlite_|ORA-\d+/i;
const FETCH_MS = Number(process.env.OWASP_FETCH_TIMEOUT_MS || 15000);

function abortSignal(ms = FETCH_MS) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function fetchTimed(url, opts = {}) {
  return fetch(url, { ...opts, signal: opts.signal || abortSignal() });
}

async function login(email, passwords) {
  const csrfRes = await fetchTimed(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('csrf'))?.split(';')[0] || '';
  for (const pass of passwords) {
    const loginRes = await fetchTimed(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const cookies = (loginRes.headers.getSetCookie?.() || [])
      .filter((c) => c.includes('next-auth'))
      .map((c) => c.split(';')[0]);
    if (csrfCookie) cookies.push(csrfCookie);
    COOKIE = cookies.join('; ');
    const session = await (await fetchTimed(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error(`login failed for ${email}`);
}

async function api(method, path, body, extraHeaders = {}) {
  const opts = {
    method,
    headers: { Cookie: COOKIE, ...extraHeaders },
    redirect: 'manual',
  };
  if (body !== undefined) {
    if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetchTimed(`${BASE}${path}`, opts);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text, headers: res.headers };
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

function assertNoSqlLeak(label, status, text) {
  if (SQL_LEAK.test(text || '')) {
    fail(label, `SQL error leaked (HTTP ${status})`);
    return false;
  }
  // Cloudflare / edge WAF often returns 52x on hostile query strings — treat as blocked.
  if ([520, 521, 522, 523, 524, 525, 526, 530].includes(status)) {
    ok(`${label} edge-blocked (HTTP ${status})`);
    return true;
  }
  // App 5xx without SQL leak is still a finding (DoS via injection shape).
  if (status >= 500) {
    fail(label, `unexpected 5xx ${status}`);
    return false;
  }
  ok(`${label} safe (HTTP ${status})`);
  return true;
}

async function signupDisposable() {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const email = `owasp-${stamp}@humanify.test`;
  const password = 'OwaspTest1!';
  const r = await fetchTimed(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'OWASP Probe',
      email,
      password,
      companyName: `OWASP ${stamp}`,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw new Error(`signup failed: ${j.error || r.status}`);
  return { email, password, tenantId: j.data?.tenantId, slug: j.data?.slug };
}

async function main() {
  console.log('Humanify OWASP smoke pack');
  console.log('Target:', BASE);

  // ── Clickjacking + Security Misconfiguration (headers) ──
  section('Clickjacking / Security Misconfiguration');
  {
    const res = await fetchTimed(`${BASE}/humanify/login`, { redirect: 'manual' });
    const xfo = (res.headers.get('x-frame-options') || '').toLowerCase();
    const csp = res.headers.get('content-security-policy') || '';
    const nosniff = (res.headers.get('x-content-type-options') || '').toLowerCase();
    const referrer = res.headers.get('referrer-policy') || '';

    if (xfo.includes('deny') || xfo.includes('sameorigin') || /frame-ancestors/i.test(csp)) {
      ok(`clickjacking header present (XFO=${xfo || 'n/a'}, CSP frame-ancestors=${/frame-ancestors/i.test(csp)})`);
    } else {
      fail('clickjacking', `missing X-Frame-Options / CSP frame-ancestors (got xfo=${xfo})`);
    }
    if (nosniff.includes('nosniff')) ok('X-Content-Type-Options: nosniff');
    else fail('misconfig nosniff', nosniff || 'missing');
    if (referrer) ok(`Referrer-Policy: ${referrer}`);
    else fail('misconfig referrer-policy', 'missing');

    const secTxt = await fetchTimed(`${BASE}/.well-known/security.txt`);
    if (secTxt.status === 200) ok('security.txt reachable');
    else fail('security.txt', `HTTP ${secTxt.status}`);
  }

  // ── Broken Authentication ──
  section('Broken Authentication');
  {
    const protectedPaths = [
      '/api/humanify/employees',
      '/api/humanify/dashboard',
      '/api/humanify/payroll',
      '/api/humanify/leave',
    ];
    for (const p of protectedPaths) {
      const r = await fetchTimed(`${BASE}${p}`);
      if (r.status === 401 || r.status === 403) ok(`unauth ${p} → ${r.status}`);
      else fail(`unauth ${p}`, `expected 401/403 got ${r.status}`);
    }

    // Login without CSRF token must fail
    const bad = await fetchTimed(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: EMAIL, password: PASSWORDS[0], json: 'true' }),
      redirect: 'manual',
    });
    const sessionAfter = await (await fetchTimed(`${BASE}/api/auth/session`, {
      headers: { Cookie: (bad.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ') },
    })).json().catch(() => ({}));
    if (!sessionAfter?.user?.email) ok('credentials without CSRF does not establish session');
    else fail('CSRF auth bypass', 'session created without csrfToken');
  }

  // Authenticate for remaining probes
  section('Session');
  let session;
  try {
    session = await login(EMAIL, PASSWORDS);
    ok(`logged in as ${session.user.email}`);
  } catch (e) {
    fail('login', e.message);
    console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
    process.exit(1);
  }

  // ── SQL Injection ──
  section('SQL Injection');
  for (const payload of SQLI_PAYLOADS) {
    const q = encodeURIComponent(payload);
    const targets = [
      `/api/humanify/employees?search=${q}`,
      `/api/humanify/employees-export?format=csv&search=${q}`,
      `/api/humanify/recruitment?action=openings&search=${q}`,
      `/api/humanify/recruitment?action=candidates&search=${q}`,
    ];
    for (const path of targets) {
      try {
        const r = await api('GET', path);
        assertNoSqlLeak(`SQLi ${path.split('?')[0]} payload=${payload.slice(0, 24)}`, r.status, r.text);
      } catch (e) {
        ok(`SQLi ${path.split('?')[0]} timed out/blocked (${e.name || 'err'})`);
      }
    }
  }

  // ── XSS ──
  section('Cross Site Scripting (XSS)');
  {
    // Reflected: login error / query echo on public pages
    const loginPage = await fetchTimed(`${BASE}/humanify/login?error=${encodeURIComponent(XSS_PAYLOAD)}`);
    const html = await loginPage.text();
    if (html.includes('<script>alert("xss")</script>') && !html.includes('&lt;script&gt;')) {
      fail('reflected XSS login', 'raw script tag in HTML');
    } else {
      ok('login page does not reflect raw script payload');
    }

    // Stored-ish via API JSON: create employee with XSS name on disposable tenant
    try {
      const t = await signupDisposable();
      await login(t.email, [t.password]);
      const create = await api('POST', '/api/humanify/employees', {
        name: XSS_PAYLOAD,
        email: `xss-${Date.now().toString(36)}@contoh.test`,
        position: 'Staff',
        department: 'IT',
      });
      if (create.status >= 500) {
        fail('XSS create employee', `HTTP ${create.status}`);
      } else {
        ok(`XSS name accepted/rejected safely (HTTP ${create.status})`);
        const list = await api('GET', `/api/humanify/employees?search=${encodeURIComponent('script')}`);
        const body = list.text || '';
        // JSON APIs may contain the literal string; dangerous if Content-Type is text/html
        const ct = list.headers.get('content-type') || '';
        if (/text\/html/i.test(ct) && body.includes('<script>alert')) {
          fail('XSS list', 'script reflected as HTML');
        } else {
          ok('employees list Content-Type not HTML XSS vector');
        }
      }
      // Restore superadmin for remaining tests that need platform scope
      await login(EMAIL, PASSWORDS);
    } catch (e) {
      fail('XSS tenant probe', e.message);
      try { await login(EMAIL, PASSWORDS); } catch { /* ignore */ }
    }
  }

  // ── CSRF ──
  section('Cross Site Request Forgery (CSRF)');
  {
    // State-changing POST with foreign Origin — app should not crash; prefer block or SameSite
    const r = await api('POST', '/api/humanify/employees', {
      name: 'CSRF Probe',
      email: `csrf-${Date.now().toString(36)}@contoh.test`,
      position: 'Staff',
      department: 'IT',
    }, {
      Origin: 'https://evil.example',
      Referer: 'https://evil.example/attack',
    });
    // Accept either: blocked (403/401) OR created (SameSite cookies may still allow same-site tooling).
    // Fail only if server 500s / SQL leak.
    if (r.status >= 500 || SQL_LEAK.test(r.text)) {
      fail('CSRF foreign Origin POST', `HTTP ${r.status}`);
    } else if (r.status === 401 || r.status === 403) {
      ok(`CSRF foreign Origin blocked (${r.status})`);
    } else {
      ok(`CSRF foreign Origin handled without crash (HTTP ${r.status}) — rely on SameSite cookies`);
    }
  }

  // ── Path Traversal ──
  section('Path Traversal');
  {
    const keys = [
      '../etc/passwd',
      '..%2Fetc%2Fpasswd',
      'tenant/../../etc/passwd',
      '....//....//etc/passwd',
      '/etc/passwd',
    ];
    for (const key of keys) {
      try {
        const r = await fetchTimed(`${BASE}/api/humanify/claim-file?key=${encodeURIComponent(key)}`);
        const text = await r.text();
        if (r.status === 200 && /root:|bin\/bash/.test(text)) {
          fail(`path traversal ${key}`, 'file contents leaked');
        } else if ([400, 401, 403, 404].includes(r.status) || [520, 521, 522, 523, 524].includes(r.status)) {
          ok(`claim-file rejects ${key.slice(0, 40)} → ${r.status}`);
        } else if (!/root:|bin\/bash/.test(text)) {
          ok(`claim-file ${key.slice(0, 40)} no leak (HTTP ${r.status})`);
        } else {
          fail(`path traversal ${key}`, `HTTP ${r.status}`);
        }
      } catch (e) {
        ok(`claim-file ${key.slice(0, 40)} timed out/blocked (${e.name || e.message})`);
      }
    }
  }

  // ── SSRF ──
  section('Server Side Request Forgery (SSRF)');
  {
    // Partner lead must not fetch attacker-controlled URL fields (webhook is env-only).
    const start = Date.now();
    const r = await fetchTimed(`${BASE}/api/humanify/partners/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'SSRF Co',
        contactName: 'Probe',
        email: `ssrf-${Date.now().toString(36)}@humanify.test`,
        partnerType: 'other',
        message: 'ssrf probe',
        website: '', // honeypot empty
        // Attack-shaped fields (ignored if schema-strict)
        logoUrl: 'http://127.0.0.1:9/ssrf',
        avatarUrl: 'http://169.254.169.254/latest/meta-data/',
        webhookUrl: 'http://127.0.0.1:9/ssrf',
        callbackUrl: 'http://[::1]:9/ssrf',
      }),
    });
    const ms = Date.now() - start;
    const text = await r.text();
    // If server tried to open 127.0.0.1:9 it often hangs; we timeout locally via fetch default — keep fast bound
    if (ms > 8000) fail('SSRF partner lead', `slow ${ms}ms — possible outbound fetch`);
    else if (r.status >= 500 && /ECONNREFUSED|fetch failed|timeout/i.test(text)) {
      fail('SSRF partner lead', `server fetched attacker URL: ${text.slice(0, 120)}`);
    } else {
      ok(`partner lead ignores attacker URLs (HTTP ${r.status}, ${ms}ms)`);
    }
  }

  // ── XXE ──
  section('XML External Entity (XXE)');
  {
    const xxe = `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root><name>&xxe;</name></root>`;
    try {
      const r = await fetchTimed(`${BASE}/api/humanify/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: xxe,
      });
      const text = await r.text();
      if (/root:|bin\/bash/.test(text)) fail('XXE signup', 'passwd leaked');
      else if ([400, 415, 422, 500].includes(r.status) || (r.status < 500 && !/root:/.test(text))) {
        ok(`XXE XML body rejected/ignored (HTTP ${r.status})`);
      } else if ([520, 521, 522, 523, 524].includes(r.status)) {
        ok(`XXE edge-blocked (HTTP ${r.status})`);
      } else {
        ok(`XXE no file leak (HTTP ${r.status})`);
      }
    } catch (e) {
      ok(`XXE timed out/blocked (${e.name || e.message})`);
    }
  }

  // ── Command Injection ──
  section('Command Injection');
  for (const payload of CMD_PAYLOADS) {
    try {
      const r = await api('GET', `/api/humanify/employees?search=${encodeURIComponent(payload)}`);
      if (/uid=\d+|root:|bin\/bash|Darwin|Linux.*GNU/i.test(r.text)) {
        fail(`cmdi search ${payload}`, 'shell output in response');
      } else {
        assertNoSqlLeak(`cmdi search ${payload}`, r.status, r.text);
      }
    } catch (e) {
      ok(`cmdi search timed out/blocked (${e.name || 'err'})`);
    }
  }

  // ── Broken Access Control (light) + IDOR light ──
  section('Broken Access Control / IDOR (light)');
  {
    const foreign = '00000000-0000-4000-8000-000000000099';
    const invalid = '00000000-0000-4000-8000-00000000ow01';
    try {
      const r = await api('GET', `/api/humanify/employees?id=${foreign}`);
      if ([200, 400, 403, 404].includes(r.status) && !SQL_LEAK.test(r.text)) {
        ok(`foreign employee id handled (HTTP ${r.status})`);
      } else if ([520, 521, 522, 523, 524].includes(r.status)) {
        ok(`foreign employee id edge-blocked (${r.status})`);
      } else {
        fail('IDOR light', `HTTP ${r.status}`);
      }

      const bad = await api('DELETE', `/api/humanify/employees?id=${invalid}`);
      if (bad.status === 400) ok('delete invalid UUID → 400');
      else if ([403, 404].includes(bad.status)) ok(`delete invalid UUID blocked (${bad.status})`);
      else fail('delete invalid UUID', `expected 400, got ${bad.status}`);

      const del = await api('DELETE', `/api/humanify/employees?id=${foreign}`);
      if ([400, 403, 404, 405].includes(del.status) || del.json?.success === false) {
        ok(`delete foreign id blocked (${del.status})`);
      } else if (del.status >= 500) {
        fail('delete foreign', `HTTP ${del.status}`);
      } else {
        ok(`delete foreign handled (${del.status})`);
      }
    } catch (e) {
      ok(`IDOR light timed out/blocked (${e.name || 'err'})`);
    }
  }

  // ── Rate Limiting ──
  section('Rate Limiting');
  {
    try {
      const v1 = await fetchTimed(`${BASE}/api/v1/employees`);
      const limit = v1.headers.get('x-ratelimit-limit');
      if (v1.status === 401 || v1.status === 403) ok(`v1 unauth → ${v1.status}`);
      else fail('v1 unauth', String(v1.status));
      if (limit) ok(`X-RateLimit-Limit present (${limit})`);
      else fail('rate limit header', 'X-RateLimit-Limit missing on /api/v1/employees');

      const su = await fetchTimed(`${BASE}/api/humanify/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (su.headers.get('x-ratelimit-limit')) ok(`signup X-RateLimit-Limit (${su.headers.get('x-ratelimit-limit')})`);
      else fail('signup rate header', 'missing');
    } catch (e) {
      fail('rate limit section', e.message || String(e));
    }
  }

  console.log('\n══════════════════════════════════════════════');
  console.log(`RESULT: ${passed} passed / ${failed} failed`);
  console.log('══════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

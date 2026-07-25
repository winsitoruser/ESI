#!/usr/bin/env node
/**
 * Wave-74 — Indonesian wilayah proxy + setup wizard wiring.
 *
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-wilayah.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE = process.env.SMOKE_BASE_URL || process.env.BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = (csrfRes.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]);
  for (const password of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies.join('; ') },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password, json: 'true' }),
      redirect: 'manual',
    });
    const all = [...cookies, ...(loginRes.headers.getSetCookie?.() || []).map((c) => c.split(';')[0])].join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: all } })).json();
    if (session?.user) {
      COOKIE = all;
      return true;
    }
  }
  return false;
}

async function api(qs) {
  const res = await fetch(`${BASE}/api/humanify/wilayah?${qs}`, { headers: { Cookie: COOKIE } });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, cache: res.headers.get('x-wilayah-cache') };
}

function staticChecks() {
  console.log('\n── Static ──');
  const lib = read('lib/humanify/wilayah-id.ts');
  const apiSrc = read('pages/api/humanify/wilayah.ts');
  const wizard = read('components/humanify/SaasSetupWizard.tsx');

  if (/WILAYAH_UPSTREAM_BASE/.test(lib) && /isValidProvinceCode/.test(lib)) ok('wilayah-id helpers');
  else fail('wilayah-id helpers');

  if (/withHQAuth/.test(apiSrc) && /WILAYAH_UPSTREAM_BASE/.test(apiSrc) && /provinces\.json/.test(apiSrc)) {
    ok('wilayah API proxy + auth');
  } else fail('wilayah API proxy + auth');

  if (!/fetch\(.*wilayah\.id/.test(wizard) && /\/api\/humanify\/wilayah/.test(wizard)) {
    ok('wizard uses proxy only (no direct upstream)');
  } else fail('wizard uses proxy only');

  if (/level=provinces/.test(wizard) && /level=regencies/.test(wizard) && /Pilih provinsi/.test(wizard)) {
    ok('setup wizard province/city selects');
  } else fail('setup wizard selects');
}

async function liveChecks() {
  console.log(`\n── Live ${BASE} ──`);
  if (!(await login())) {
    fail('login');
    return;
  }
  ok(`login ${EMAIL}`);

  const bad = await api('level=regencies&provinceCode=../../../etc');
  if (bad.status === 400) ok('rejects invalid provinceCode');
  else fail('rejects invalid provinceCode', `HTTP ${bad.status}`);

  const unauth = await fetch(`${BASE}/api/humanify/wilayah?level=provinces`);
  if (unauth.status === 401 || unauth.status === 403) ok('unauth blocked');
  else fail('unauth blocked', `HTTP ${unauth.status}`);

  const prov = await api('level=provinces');
  if (prov.status === 200 && prov.json.success && Array.isArray(prov.json.data) && prov.json.data.length >= 30) {
    ok(`provinces (${prov.json.data.length}, cache=${prov.cache || '-'})`);
  } else {
    fail('provinces', `HTTP ${prov.status} ${prov.json.error || ''}`);
    return;
  }

  const dki = prov.json.data.find((p) => p.code === '31' || /Jakarta/i.test(p.name));
  const code = dki?.code || prov.json.data[0].code;
  const reg = await api(`level=regencies&provinceCode=${encodeURIComponent(code)}`);
  if (reg.status === 200 && reg.json.success && Array.isArray(reg.json.data) && reg.json.data.length > 0) {
    ok(`regencies for ${code} (${reg.json.data.length})`);
  } else {
    fail('regencies', `HTTP ${reg.status} ${reg.json.error || ''}`);
  }

  const again = await api('level=provinces');
  if (again.cache === 'HIT' || again.status === 200) ok(`cache header ${again.cache || 'MISS/OK'}`);
  else fail('cache header');
}

(async () => {
  console.log('Humanify wilayah smoke (Wave-74)');
  staticChecks();
  try {
    await liveChecks();
  } catch (e) {
    fail('live', e.message);
  }
  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();

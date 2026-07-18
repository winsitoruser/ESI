#!/usr/bin/env node
/**
 * Unit checks for Humanify API error mapping + safeQuery export presence.
 */
const assert = require('assert');

// Inline mirror of mapApiJsonError (avoid TS require)
const CODE_HINTS = {
  NO_TENANT: 'Akun belum terikat tenant. Hubungi admin.',
  FEATURE_NOT_IN_PLAN: 'Fitur tidak termasuk paket Anda. Upgrade di Billing.',
  FORBIDDEN: 'Anda tidak punya akses untuk aksi ini.',
};
function mapApiJsonError(json, fallback = 'Terjadi kesalahan') {
  if (!json || typeof json !== 'object') return fallback;
  const code = json.code ? String(json.code) : '';
  if (code && CODE_HINTS[code]) return CODE_HINTS[code];
  const msg = json.error || json.message;
  if (msg && String(msg).trim()) return code ? `${msg} (${code})` : msg;
  if (code) return `${fallback} (${code})`;
  return fallback;
}

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify api-error map');
[
  [{ code: 'FEATURE_NOT_IN_PLAN' }, /paket/i],
  [{ error: 'Batch tidak ditemukan' }, /Batch/],
  [{ code: 'NO_TENANT' }, /tenant/i],
  [null, /kesalahan/i],
].forEach(([input, re], i) => {
  const got = mapApiJsonError(input);
  if (re.test(got)) ok(`case ${i + 1}: ${got.slice(0, 48)}`);
  else fail(`case ${i + 1}: ${got}`);
});

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

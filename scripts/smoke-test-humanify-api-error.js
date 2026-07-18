#!/usr/bin/env node
/**
 * Unit checks for Humanify API error mapping + observability deep-link.
 */
const fs = require('fs');
const path = require('path');

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
function withSupportHint(message, requestId) {
  if (!requestId) return message;
  return `${message} · ref ${requestId}`;
}
function observabilityDeepLink(requestId) {
  const base = '/platform/observability';
  if (!requestId) return base;
  return `${base}?ref=${encodeURIComponent(String(requestId))}`;
}
function formatApiErrorToast(json, fallback = 'Terjadi kesalahan') {
  const requestId = json?.requestId ? String(json.requestId) : undefined;
  const base = mapApiJsonError(json, fallback);
  return { message: withSupportHint(base, requestId), obsUrl: observabilityDeepLink(requestId), requestId };
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

const toast = formatApiErrorToast({ code: 'FORBIDDEN', requestId: 'req-abc' });
if (/akses/i.test(toast.message) && /ref req-abc/.test(toast.message)) ok('toast with ref');
else fail(`toast: ${toast.message}`);
if (toast.obsUrl === '/platform/observability?ref=req-abc') ok('obs deep-link');
else fail(`obsUrl: ${toast.obsUrl}`);

const src = fs.readFileSync(path.join(__dirname, '../lib/humanify/api-error.ts'), 'utf8');
if (/formatApiErrorToast/.test(src) && /observabilityDeepLink/.test(src)) ok('api-error.ts helpers');
else fail('api-error helpers missing');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

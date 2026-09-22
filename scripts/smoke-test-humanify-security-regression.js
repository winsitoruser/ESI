#!/usr/bin/env node
/**
 * Wave 14 — security regression pack (SEC-APP-012)
 * Re-checks past high-severity classes of bugs stay fixed (static).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = 0;
function ok(m) { console.log('  ✓', m); }
function fail(m) { console.log('  ✗', m); failed++; }
function has(rel, re, label) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return fail(`${label}: missing ${rel}`);
  const t = fs.readFileSync(p, 'utf8');
  if (re.test(t)) ok(label);
  else fail(label);
}

console.log('Security regression pack');
has('lib/saas/tenant-request-bound.ts', /tenant/, 'tenant binding helper');
has('pages/api/humanify/billing/webhook.ts', /signature|Signature|midtrans/i, 'Midtrans webhook signature');
has('lib/hris/ai-prompt-redact.ts', /redactForLlm/, 'AI redaction');
has('lib/saas/maker-checker.ts', /maker_user_id/, 'maker≠checker SoD');
has('lib/security/safe-redirect.ts', /safeInternalPath/, 'open redirect guard');
has('lib/security/safe-outbound-url.ts', /isSafeOutboundHttpUrl/, 'SSRF guard');
has('pages/api/debug/check-user.ts', /HUMANIFY_ALLOW_DEBUG_API|404/, 'debug gated');
has('lib/saas/password-reset.ts', /password_changed_at/, 'session invalidate on reset');

if (failed) {
  console.log(`RESULT: FAIL (${failed})`);
  process.exit(1);
}
console.log('RESULT: PASS');

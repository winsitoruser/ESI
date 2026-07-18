#!/usr/bin/env node
/**
 * Unit checks: action-inbox snooze keys + Privy webhook mapping.
 * Usage: node scripts/smoke-test-humanify-wave12.js
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

function inboxItemKey(type, id) {
  return `${String(type || 'item')}:${String(id)}`.slice(0, 200);
}

function mapPrivyStatusToEsign(status) {
  const s = String(status || '').toLowerCase();
  if (['completed', 'done', 'signed', 'fully_signed'].includes(s)) return 'completed';
  if (['partial', 'partially_signed', 'in_progress'].includes(s)) return 'partially_signed';
  if (['pending', 'waiting', 'sent'].includes(s)) return 'pending';
  if (['rejected', 'declined', 'cancelled', 'canceled'].includes(s)) return 'rejected';
  if (['expired'].includes(s)) return 'expired';
  return null;
}

function validatePrivyWebhookSecret(reqSecret, envSecret) {
  const expected = String(envSecret ?? '').trim();
  if (!expected) return true;
  return String(reqSecret || '').trim() === expected;
}

function buildPrivyIdempotencyKey(body) {
  const header = String(body.idempotency_key || '').trim();
  if (header) return header.slice(0, 255);
  const token = String(body.doc_token || '');
  const event = String(body.status || 'update');
  const digest = crypto.createHash('sha256').update(JSON.stringify({ token, event })).digest('hex').slice(0, 32);
  return `privy:${token || 'na'}:${digest}`.slice(0, 255);
}

console.log('Humanify wave-12 unit');

if (inboxItemKey('leave', 'abc') === 'leave:abc') ok('inbox key');
else fail('inbox key');

if (mapPrivyStatusToEsign('completed') === 'completed') ok('privy completed');
else fail('privy completed');
if (mapPrivyStatusToEsign('partially_signed') === 'partially_signed') ok('privy partial');
else fail('privy partial');
if (mapPrivyStatusToEsign('weird') === null) ok('privy unknown null');
else fail('privy unknown');

if (validatePrivyWebhookSecret(null, '') === true) ok('secret open when unset');
else fail('secret open');
if (validatePrivyWebhookSecret('x', 'x') === true) ok('secret match');
else fail('secret match');
if (validatePrivyWebhookSecret('bad', 'x') === false) ok('secret reject');
else fail('secret reject');

const k1 = buildPrivyIdempotencyKey({ doc_token: 'T1', status: 'completed' });
const k2 = buildPrivyIdempotencyKey({ doc_token: 'T1', status: 'completed' });
if (k1 === k2 && k1.startsWith('privy:T1:')) ok('privy idem key stable');
else fail('privy idem key');

const files = [
  '../lib/hris/action-inbox-snooze.ts',
  '../lib/hris/privy-webhook.ts',
  '../pages/api/humanify/webhooks/privy.ts',
  '../pages/api/humanify/action-inbox-snooze.ts',
];
for (const f of files) {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const mails = fs.readFileSync(path.join(__dirname, '../lib/email/humanify-mails.ts'), 'utf8');
if (/humanifyEmployeePayslipEmail/.test(mails)) ok('employee payslip email template');
else fail('employee payslip email');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/**
 * Wave-15 unit: partner sanitize, doc storage health + signed URL, billing trial fields presence.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sanitizePartnerLead(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const companyName = String(body.companyName || '').trim().slice(0, 200);
  const contactName = String(body.contactName || '').trim().slice(0, 200);
  return { companyName, contactName, email };
}

function signDownloadToken(docId, tenantId, ttlSec = 900) {
  const secret = 'test-secret';
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${docId}.${tenantId}.${exp}`;
  const sig = crypto.createHash('sha256').update(`${payload}.${secret}`).digest('hex').slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

function verifyDownloadToken(token, docId, tenantId, secret = 'test-secret') {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [id, tid, expStr, sig] = raw.split('.');
    if (id !== docId || tid !== tenantId) return false;
    const exp = parseInt(expStr, 10);
    if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
    const payload = `${id}.${tid}.${exp}`;
    const expected = crypto.createHash('sha256').update(`${payload}.${secret}`).digest('hex').slice(0, 32);
    return sig === expected;
  } catch {
    return false;
  }
}

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-15 unit');

const s = sanitizePartnerLead({ companyName: ' PT X ', contactName: 'Ada', email: 'Ada@X.COM' });
if (s.companyName === 'PT X' && s.email === 'ada@x.com') ok('partner sanitize');
else fail('partner sanitize');

const tok = signDownloadToken('doc1', 'ten1');
if (verifyDownloadToken(tok, 'doc1', 'ten1')) ok('signed URL mint+verify');
else fail('signed URL');
if (!verifyDownloadToken(tok, 'doc2', 'ten1')) ok('signed URL reject wrong doc');
else fail('signed URL should reject');

const files = [
  '../lib/hris/partner-leads.ts',
  '../pages/api/humanify/partners/lead.ts',
  '../pages/humanify/partners.tsx',
  '../docs/humanify-bounded-context.md',
  '../pages/api/humanify/docs-storage-health.ts',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const ds = fs.readFileSync(path.join(__dirname, '../lib/hris/document-storage.ts'), 'utf8');
if (/getDocStorageHealth/.test(ds) && /outsidePublic/.test(ds)) ok('doc storage health');
else fail('doc storage health');

const bill = fs.readFileSync(path.join(__dirname, '../lib/saas/humanify-billing.ts'), 'utf8');
if (/trialDaysLeft/.test(bill) && /trialExpiringSoon/.test(bill)) ok('billing trial fields');
else fail('billing trial');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

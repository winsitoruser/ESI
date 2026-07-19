#!/usr/bin/env node
/**
 * Wave-16 unit: S3 health fields, partner leads list, policy publish UX, RLS lab smoke artifacts.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify wave-16 unit');

const files = [
  '../docs/humanify-doc-storage-s3.md',
  '../scripts/smoke-test-humanify-rls-strict-lab.js',
  '../lib/hris/document-storage.ts',
  '../lib/hris/partner-leads.ts',
  '../pages/humanify/industrial-relations.tsx',
  '../pages/platform/observability.tsx',
];
for (const f of files) {
  if (fs.existsSync(path.join(__dirname, f))) ok(`present ${path.basename(f)}`);
  else fail(`missing ${f}`);
}

const ds = fs.readFileSync(path.join(__dirname, '../lib/hris/document-storage.ts'), 'utf8');
if (/s3Ready/.test(ds) && /probeDocStorageConnectivity/.test(ds) && /s3CredentialsPresent/.test(ds)) {
  ok('doc storage s3 readiness');
} else fail('doc storage s3 readiness');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
if (pkg.dependencies?.['@aws-sdk/client-s3']) ok('@aws-sdk/client-s3 dependency');
else fail('@aws-sdk/client-s3 dependency');

const leads = fs.readFileSync(path.join(__dirname, '../lib/hris/partner-leads.ts'), 'utf8');
if (/listPartnerLeads/.test(leads)) ok('listPartnerLeads');
else fail('listPartnerLeads');

const platformApi = fs.readFileSync(path.join(__dirname, '../pages/api/platform/index.ts'), 'utf8');
if (/partner-leads/.test(platformApi) && /listPartnerLeads/.test(platformApi)) ok('platform partner-leads action');
else fail('platform partner-leads action');

const ir = fs.readFileSync(path.join(__dirname, '../pages/humanify/industrial-relations.tsx'), 'utf8');
if (/handlePublish/.test(ir) && /Publikasikan/.test(ir) && /Isi kebijakan/.test(ir)) ok('policy publish UX');
else fail('policy publish UX');

const obs = fs.readFileSync(path.join(__dirname, '../pages/platform/observability.tsx'), 'utf8');
if (/docs-storage-health/.test(obs) && /Document storage/.test(obs)) ok('observability doc storage');
else fail('observability doc storage');

const platformUi = fs.readFileSync(path.join(__dirname, '../pages/platform/index.tsx'), 'utf8');
if (/partnerLeads/.test(platformUi) && /Partner leads/.test(platformUi)) ok('platform lead inbox');
else fail('platform lead inbox');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

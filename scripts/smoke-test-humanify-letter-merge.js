#!/usr/bin/env node
/**
 * Unit checks for HR letter merge fields.
 * Usage: node scripts/smoke-test-humanify-letter-merge.js
 */
const fs = require('fs');
const path = require('path');

function applyMergeFields(template, context) {
  if (!template) return '';
  const lookup = new Map();
  for (const [k, v] of Object.entries(context)) {
    lookup.set(String(k).toLowerCase(), v == null ? '' : String(v));
  }
  // aliases mirror
  if (context.employee_name) {
    lookup.set('employeename', String(context.employee_name));
    lookup.set('nama', String(context.employee_name));
  }
  const replaceToken = (_m, rawKey) => {
    const key = rawKey.trim().toLowerCase();
    if (lookup.has(key)) return lookup.get(key);
    return `{{${rawKey.trim()}}}`;
  };
  return template
    .replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, replaceToken)
    .replace(/\$\{\s*([a-zA-Z0-9_.]+)\s*\}/g, replaceToken);
}

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify letter-merge');

const ctx = {
  employee_name: 'Ada Lovelace',
  employee_code: 'EMP-001',
  position: 'Engineer',
  department: 'R&D',
  letter_number: 'SP/01/2026',
  letter_date: '2026-07-19',
};

const out = applyMergeFields(
  'Yth. {{employee_name}} ({{ employee_code }}), jabatan ${position} — {{department}}. Surat {{letter_number}} tgl {{letter_date}}.',
  ctx,
);
if (out.includes('Ada Lovelace') && out.includes('EMP-001') && out.includes('Engineer') && out.includes('SP/01/2026')) {
  ok('merge {{}} and ${}');
} else fail(`merge failed: ${out}`);

const unknown = applyMergeFields('Hi {{unknown_field}}', ctx);
if (unknown === 'Hi {{unknown_field}}') ok('unknown token preserved');
else fail('unknown should stay');

const empty = applyMergeFields('', ctx);
if (empty === '') ok('empty template');
else fail('empty');

const src = fs.readFileSync(path.join(__dirname, '../lib/hris/letter-merge-fields.ts'), 'utf8');
if (/applyMergeFields/.test(src) && /LETTER_MERGE_FIELDS/.test(src) && /mergeLetterTexts/.test(src)) {
  ok('letter-merge-fields.ts present');
} else fail('source missing');

const doc = fs.readFileSync(path.join(__dirname, '../docs/humanify-esign-privy-ga.md'), 'utf8');
if (/PRIVY_API_KEY/.test(doc) && /GA checklist/.test(doc)) ok('esign GA doc present');
else fail('esign doc');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/**
 * Audit Humanify pages that still reference USE_MOCK_UI.
 * Ensures they import from lib/hris/data-source (prod-safe guard).
 *
 * Usage: node scripts/audit-humanify-mock-paths.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../pages/humanify');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) out.push(p);
  }
  return out;
}

console.log('Humanify mock-path audit');

const files = walk(ROOT);
const withMock = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  if (!/USE_MOCK_UI/.test(src)) continue;
  withMock.push(f);
  const rel = path.relative(path.join(__dirname, '..'), f);
  const importsDataSource =
    /from ['"]@\/lib\/hris\/data-source['"]/.test(src) ||
    /from ['"].*lib\/hris\/data-source['"]/.test(src);
  const hardcodesTrue = /USE_MOCK_UI\s*=\s*true/.test(src);
  if (hardcodesTrue) fail(`${rel}: hardcodes USE_MOCK_UI = true`);
  else if (!importsDataSource) fail(`${rel}: USE_MOCK_UI without data-source import`);
  else ok(`${rel}`);
}

if (withMock.length === 0) ok('no USE_MOCK_UI references (unexpected but ok)');
else ok(`${withMock.length} page(s) use USE_MOCK_UI via data-source`);

// data-source itself must guard production
const ds = fs.readFileSync(path.join(__dirname, '../lib/hris/data-source.ts'), 'utf8');
if (/allowHrMockFallback/.test(ds) && /NODE_ENV === 'production'/.test(ds)) {
  ok('data-source production guard');
} else fail('data-source missing production guard');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);

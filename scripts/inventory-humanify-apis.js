#!/usr/bin/env node
/**
 * SEC-API-007 — inventory Humanify API route files (static).
 * Usage: node scripts/inventory-humanify-apis.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'pages', 'api');
const PREFIXES = ['humanify', 'platform', 'public', 'auth', 'debug'];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|js)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) acc.push(p);
  }
  return acc;
}

const files = walk(ROOT)
  .map((f) => path.relative(ROOT, f).replace(/\\/g, '/'))
  .filter((f) => PREFIXES.some((p) => f === p || f.startsWith(p + '/') || f.startsWith(p + '.')))
  .sort();

const outDir = path.join(__dirname, '..', 'docs');
const outFile = path.join(outDir, 'humanify-api-inventory.md');
const lines = [
  '# Humanify API Inventory (SEC-API-007)',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Count: ${files.length} route files under \`pages/api/{humanify,platform,public,auth,debug}\``,
  '',
  '| Path | Notes |',
  '|---|---|',
  ...files.map((f) => `| \`/api/${f.replace(/\.(ts|js)$/, '').replace(/\/index$/, '')}\` | |`),
  '',
  'Re-run: `node scripts/inventory-humanify-apis.js`',
  '',
];
fs.writeFileSync(outFile, lines.join('\n'));
console.log(`Wrote ${outFile} (${files.length} routes)`);

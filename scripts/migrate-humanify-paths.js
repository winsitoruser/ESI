#!/usr/bin/env node
/** One-time path migration: HRIS → Humanify */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = [
  path.join(ROOT, 'pages/humanify'),
  path.join(ROOT, 'pages/api/humanify'),
  path.join(ROOT, 'components/humanify'),
];

const REPLACEMENTS = [
  ["@/components/hq/HQLayout", '@/components/humanify/HumanifyLayout'],
  ["from '@/components/hq/HQLayout'", "from '@/components/humanify/HumanifyLayout'"],
  ['@/components/hq/hris/', '@/components/humanify/'],
  ['/api/hq/hris', '/api/humanify'],
  ['/hq/hris', '/humanify'],
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.(tsx?|jsx?|md)$/.test(ent.name)) files.push(p);
  }
  return files;
}

let changed = 0;
for (const dir of DIRS) {
  for (const file of walk(dir)) {
    if (file.endsWith('migrate-humanify-paths.js')) continue;
    let src = fs.readFileSync(file, 'utf8');
    let next = src;
    for (const [from, to] of REPLACEMENTS) {
      next = next.split(from).join(to);
    }
    if (next !== src) {
      fs.writeFileSync(file, next);
      changed++;
    }
  }
}
console.log(`Updated ${changed} files under humanify/`);

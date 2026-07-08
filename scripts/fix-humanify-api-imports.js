#!/usr/bin/env node
/** Fix relative imports after api/hq/hris → api/humanify move (one less directory level) */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '../pages/api/humanify');

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.ts')) files.push(p);
  }
  return files;
}

function shortenRelative(specifier) {
  if (!specifier.startsWith('../')) return specifier;
  const idx = specifier.indexOf('/', 3);
  if (idx === -1) {
    if (specifier.startsWith('../../')) return specifier.slice(3);
    return specifier;
  }
  const prefix = specifier.slice(0, idx);
  const rest = specifier.slice(idx);
  if (prefix === '../..') return '..' + rest;
  if (prefix.startsWith('../')) return prefix.slice(3) + rest;
  return specifier;
}

let changed = 0;
for (const file of walk(API_DIR)) {
  let src = fs.readFileSync(file, 'utf8');
  const next = src.replace(/(?:from|require\()\s*['"]((\.\.\/)+[^'"]+)['"]/g, (m, spec) => {
    const shortened = shortenRelative(spec);
    if (shortened === spec) return m;
    return m.replace(spec, shortened);
  });
  if (next !== src) {
    fs.writeFileSync(file, next);
    changed++;
  }
}
console.log(`Fixed imports in ${changed} API files`);

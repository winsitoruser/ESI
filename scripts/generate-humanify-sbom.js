#!/usr/bin/env node
/**
 * Wave 13 — SBOM stub (SEC-SDL-011)
 * Writes a minimal CycloneDX-like JSON from package-lock / package.json.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const components = Object.entries(deps).map(([name, version]) => ({
  type: 'library',
  name,
  version: String(version).replace(/^[\^~]/, ''),
  purl: `pkg:npm/${name}@${String(version).replace(/^[\^~]/, '')}`,
}));

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: { type: 'application', name: pkg.name || 'humanify', version: pkg.version || '0.0.0' },
  },
  components,
};

const out = path.join(root, 'docs', 'humanify-sbom.json');
fs.writeFileSync(out, JSON.stringify(sbom, null, 2));
console.log(`Wrote ${out} (${components.length} components)`);

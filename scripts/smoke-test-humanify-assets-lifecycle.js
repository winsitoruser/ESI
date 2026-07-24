#!/usr/bin/env node
/**
 * Smoke: HR assets store + lifecycle wiring (static + optional live).
 * Live: HUMANIFY_SMOKE_BASE_URL + cookie session (optional).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let pass = 0;
let fail = 0;

function ok(msg) { pass++; console.log(`  ✓ ${msg}`); }
function bad(msg) { fail++; console.error(`  ✗ ${msg}`); }

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

console.log('smoke:assets-lifecycle');

const store = read('lib/hris/asset-store.ts');
if (/export async function createAsset/.test(store)) ok('createAsset');
else bad('createAsset missing');
if (/returnAllAssetsForEmployee/.test(store)) ok('returnAllAssetsForEmployee');
else bad('returnAllAssetsForEmployee missing');

const api = read('pages/api/humanify/assets.ts');
if (/action === 'create'|action === \"create\"|!action \|\| action === 'create'/.test(api)) ok('assets API create');
else bad('assets API create');
if (/action === 'assign'/.test(api)) ok('assets API assign');
else bad('assets API assign');

const life = read('pages/api/humanify/lifecycle.ts');
if (/asset_issue/.test(life) && /assignAsset/.test(life)) ok('onboarding asset_issue → assignAsset');
else bad('onboarding asset_issue wire');
if (/asset_return/.test(life) && /returnAllAssetsForEmployee/.test(life)) ok('offboarding asset_return → returnAll');
else bad('offboarding asset_return wire');

const onb = read('pages/humanify/onboarding.tsx');
if (/selectedAssetIds/.test(onb) && /assetIds/.test(onb)) ok('onboarding UI asset picker');
else bad('onboarding UI asset picker');

const off = read('pages/humanify/offboarding.tsx');
if (/asset_return/.test(off) && /assetIntegration/.test(off)) ok('offboarding UI return confirm');
else bad('offboarding UI return confirm');

const side = read('config/humanify-sidebar.config.ts');
if (/humanify-esign[\s\S]*hidden:\s*true/.test(side)) ok('e-sign hidden');
else bad('e-sign hidden');
if (/humanify-ai-hub[\s\S]*hidden:\s*true/.test(side)) ok('AI lab hidden');
else bad('AI lab hidden');

const devices = read('pages/humanify/devices.tsx');
if (/attendance\/devices/.test(devices)) ok('devices alias redirect page');
else bad('devices alias');

const nc = read('next.config.mjs');
if (/\/humanify\/devices/.test(nc) && /attendance\/devices/.test(nc)) ok('next.config devices redirect');
else bad('next.config devices redirect');

console.log(`\nResult: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
/**
 * Static smoke — HR automation notify + cron wiring (no DB).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let fails = 0;

function ok(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); fails++; }

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

console.log('smoke:hr-automation-notify');

const engine = read('lib/hris/hr-automation.ts');
if (engine.includes('hris_automation_alerts') && engine.includes('deliverNotification') && engine.includes('scanAllActiveTenants')) {
  ok('hr-automation has alerts + notify + scanAllActiveTenants');
} else fail('hr-automation missing notify/scanAllActiveTenants');

if (engine.includes('tenant_id = :tid') && engine.includes('JOIN employees e ON e.id = ea.employee_id')) {
  ok('evaluateRule queries are tenant-scoped');
} else fail('evaluateRule missing tenant scoping');

if (engine.includes('isInCooldown') && engine.includes('cooldown_minutes')) {
  ok('cooldown respected');
} else fail('cooldown missing');

const api = read('pages/api/platform/hr-automation-scan.ts');
if (api.includes('scanAllActiveTenants') && api.includes('cronAuthorized')) {
  ok('platform hr-automation-scan API');
} else fail('platform API missing');

const script = read('scripts/run-humanify-hr-automation-scan.js');
if (script.includes('/api/platform/hr-automation-scan') && script.includes('x-cron-secret')) {
  ok('cron runner script');
} else fail('cron runner missing');

const crons = read('scripts/ensure-humanify-crons.sh');
if (crons.includes('hr-automation-scan') && crons.includes('run-humanify-hr-automation-scan.js')) {
  ok('ensure-humanify-crons wires hr-automation-scan');
} else fail('cron ensure missing tag');

const hub = read('pages/api/humanify/ai-hub.ts');
if (hub.includes('automation-alerts') && hub.includes('mark-alerts-read')) {
  ok('ai-hub exposes alerts actions');
} else fail('ai-hub alerts actions missing');

const pkg = read('package.json');
if (pkg.includes('"scan:hr-automation"')) {
  ok('npm script scan:hr-automation');
} else fail('package.json script missing');

console.log(fails ? `\nFAIL ${fails}` : '\nPASS');
process.exit(fails ? 1 : 0);

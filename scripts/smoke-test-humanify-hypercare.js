#!/usr/bin/env node
/**
 * WQ-130 — daily hypercare (read-only). Safe on production.
 *   SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-hypercare.js
 */
const BASE = (process.env.SMOKE_BASE_URL || 'https://humanify.id').replace(/\/$/, '');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function probe(path, expectStatus) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  const ms = Date.now() - t0;
  const allow = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
  if (allow.includes(res.status)) ok(`${path} HTTP ${res.status} ${ms}ms`);
  else fail(path, `HTTP ${res.status} (${ms}ms)`);
  return { res, ms };
}

async function main() {
  console.log('Humanify hypercare (read-only)');
  console.log('Target:', BASE);

  const health = await probe('/api/health', 200);
  const json = await health.res.json().catch(() => ({}));
  if (json.status === 'ok' || json.status === 'degraded') ok(`health status=${json.status}`);
  else fail('health json', JSON.stringify(json).slice(0, 80));

  const deep = await fetch(`${BASE}/api/health?deep=1`);
  const dj = await deep.json().catch(() => ({}));
  if (deep.status === 200 && dj.db === true) ok(`deep health db=true ${dj.dbLatencyMs || '?'}ms`);
  else if (deep.status === 200) ok(`deep health HTTP 200 db=${dj.db}`);
  else fail('deep health', String(deep.status));

  await probe('/humanify/login', [200, 304]);
  await probe('/employee/login', [200, 304]);
  await probe('/api/humanify/dashboard', [401, 403]);
  await probe('/api/employee/dashboard', [401, 403]);

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

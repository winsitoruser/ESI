#!/usr/bin/env node
/**
 * Phase 16 — Health / readiness probe smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase16-health.js
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function main() {
  console.log('SaaS Phase 16 — Health probe smoke');
  console.log('Target:', BASE);

  // Shallow liveness
  const live = await fetch(`${BASE}/api/health`);
  const lj = await live.json().catch(() => ({}));
  if (live.status === 200 && lj.status === 'ok') ok(`liveness → ok (uptime=${lj.uptimeSec}s)`);
  else fail('liveness', `${live.status} ${JSON.stringify(lj)}`);
  if (live.headers.get('cache-control')?.includes('no-store')) ok('no-store cache header');
  else fail('cache-control header');

  // Deep readiness (DB ping)
  const deep = await fetch(`${BASE}/api/health?deep=1`);
  const dj = await deep.json().catch(() => ({}));
  if (deep.status === 200 && dj.db === true) ok(`readiness → db ok (${dj.dbLatencyMs}ms)`);
  else fail('readiness db', `${deep.status} ${JSON.stringify(dj)}`);
  if (dj.service === 'humanify') ok('service tag = humanify');
  else fail('service tag', String(dj.service));

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * Phase 14 — Rate limiting smoke
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-saas-phase14-ratelimit.js
 *
 * Verifies:
 *   - Public API /api/v1/employees emits X-RateLimit-* headers (even on 401)
 *   - Signup endpoint emits X-RateLimit-* headers
 *   - Bursting password-reset (5/min) trips a 429 (generic middleware works)
 *
 * NOTE: This bursts the dedicated password-reset request endpoint (5/min) and
 * therefore should run LAST in a regression loop — it deliberately exhausts that
 * endpoint's per-IP budget for the current minute.
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

async function main() {
  console.log('SaaS Phase 14 — Rate limiting smoke');
  console.log('Target:', BASE);

  // 1. Public API emits rate-limit headers (unauthenticated → 401 still carries headers)
  const v1 = await fetch(`${BASE}/api/v1/employees`);
  const v1Limit = v1.headers.get('x-ratelimit-limit');
  if (v1.status === 401) ok('v1 employees unauth → 401');
  else fail('v1 employees unauth', String(v1.status));
  if (v1Limit) ok(`v1 X-RateLimit-Limit present (${v1Limit})`);
  else fail('v1 X-RateLimit-Limit header missing');

  // 2. Signup emits rate-limit headers (invalid body → 400 after passing rate check)
  const su = await fetch(`${BASE}/api/humanify/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const suLimit = su.headers.get('x-ratelimit-limit');
  if (suLimit) ok(`signup X-RateLimit-Limit present (${suLimit})`);
  else fail('signup X-RateLimit-Limit header missing');

  // 3. Burst password-reset request (5/min) → expect at least one 429
  const bogus = `nobody-${Date.now().toString(36)}@humanify.test`;
  let got429 = false;
  let lastRetryAfter = null;
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`${BASE}/api/humanify/password-reset?action=request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: bogus }),
    });
    if (r.status === 429) {
      got429 = true;
      lastRetryAfter = r.headers.get('retry-after');
    }
  }
  if (got429) ok(`burst tripped 429 (retry-after=${lastRetryAfter})`);
  else fail('burst did not trip 429 (rate limit not enforced?)');

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

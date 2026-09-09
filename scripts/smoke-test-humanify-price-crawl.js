#!/usr/bin/env node
/**
 * WQ-103 — crawl public marketing HTML vs price-book 9 Sep (10k / 9.5k / 9k, LMS 1.5k, AIMAN 65k).
 * Usage: SMOKE_BASE_URL=https://humanify.id node scripts/smoke-test-humanify-price-crawl.js
 */
const BASE = (process.env.SMOKE_BASE_URL || 'https://humanify.id').replace(/\/$/, '');

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

const CLAIMS = ['Rp 10.000', 'Rp 9.500', 'Rp 9.000', 'Rp 1.500', 'Rp 65.000'];

function flatten(html) {
  return String(html || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

async function main() {
  console.log('Humanify public price crawl');
  console.log('Target:', BASE);

  const res = await fetch(`${BASE}/`, { redirect: 'follow' });
  const html = await res.text();
  if (res.status >= 400) fail(`landing HTTP ${res.status}`);
  else ok(`landing HTTP ${res.status}`);

  const flat = flatten(html);
  const missing = CLAIMS.filter((c) => !flat.includes(c));
  if (missing.length) fail(`missing ${missing.join(', ')}`);
  else ok('landing contains 10k / 9.5k / 9k / LMS 1.5k / AIMAN 65k');

  if (/LMS bundled|termasuk LMS/i.test(flat) && !/add-on/i.test(flat)) {
    fail('landing claims LMS bundled without add-on language');
  } else {
    ok('no bundled-LMS claim without add-on wording');
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

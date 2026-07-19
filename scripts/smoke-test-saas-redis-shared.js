#!/usr/bin/env node
/**
 * SEC-S3-2 — Redis shared counter proof.
 * With REDIS_URL: live INCR shared key. Without: assert source wiring only.
 */
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
let skipped = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const skip = (m) => { console.log('  ○', m); skipped++; };

console.log('Humanify redis-shared smoke');

const root = path.join(__dirname, '..');
const rl = fs.readFileSync(path.join(root, 'lib/middleware/rateLimit.ts'), 'utf8');
const lg = fs.readFileSync(path.join(root, 'lib/saas/login-guard.ts'), 'utf8');
const client = fs.readFileSync(path.join(root, 'lib/redis/client.ts'), 'utf8');

if (/checkRateLimitRedis/.test(rl) && /hfy:\$\{key\}|hfy:/.test(rl) && /getRedis/.test(rl)) {
  ok('rateLimit Redis path present');
} else fail('rateLimit Redis path');

if (/hfy:lg:/.test(lg) && /getRedis/.test(lg)) ok('login-guard Redis path present');
else fail('login-guard Redis path');

if (/probeRedis|REDIS_URL/.test(client)) ok('redis client probe present');
else fail('redis client probe');

async function liveProof() {
  if (!process.env.REDIS_URL) {
    skip('REDIS_URL unset — skip live shared-counter proof');
    return;
  }
  let Redis;
  try {
    Redis = require('ioredis');
  } catch {
    skip('ioredis not installed — skip live proof');
    return;
  }
  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
  });
  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong === 'PONG') ok('redis PONG');
    else fail('redis ping');

    const key = `hfy:rl:smoke:shared:${Date.now()}`;
    const a = await redis.incr(key);
    await redis.pexpire(key, 5000);
    const b = await redis.incr(key);
    if (a === 1 && b === 2) ok('shared INCR across calls');
    else fail(`shared INCR unexpected a=${a} b=${b}`);
    await redis.del(key);
  } catch (e) {
    fail(`live redis: ${e.message || e}`);
  } finally {
    try { await redis.quit(); } catch { /* */ }
  }
}

liveProof().then(() => {
  console.log(`\nRESULT: ${passed} passed / ${failed} failed / ${skipped} skipped`);
  process.exit(failed ? 1 : 0);
});

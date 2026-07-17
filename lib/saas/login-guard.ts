/**
 * Phase 17 — login rate-limit + lockout.
 * Memory by default; Redis when REDIS_URL is set. Always fail-open.
 */
import { getRedis } from '@/lib/redis/client';

interface Bucket {
  count: number;
  firstAt: number;
  lockedUntil: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_MAX = 8;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;
const IP_MAX = 100;
const IP_LOCK_MS = 15 * 60 * 1000;

const accountStore = new Map<string, Bucket>();
const ipStore = new Map<string, Bucket>();

let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [k, b] of accountStore) {
    if (b.lockedUntil < now && now - b.firstAt > WINDOW_MS) accountStore.delete(k);
  }
  for (const [k, b] of ipStore) {
    if (b.lockedUntil < now && now - b.firstAt > WINDOW_MS) ipStore.delete(k);
  }
}

export function normalizeIp(raw: unknown): string {
  if (!raw) return 'unknown';
  const s = Array.isArray(raw) ? raw[0] : String(raw);
  return s.split(',')[0]?.trim() || 'unknown';
}

function accountKey(email: string, ip: string) {
  return `${email.trim().toLowerCase()}|${ip}`;
}

export interface LoginGuardVerdict {
  allowed: boolean;
  retryAfterSec: number;
  reason?: 'account_locked' | 'ip_locked';
}

async function readBucket(redisKey: string, mem: Map<string, Bucket>, memKey: string): Promise<Bucket | undefined> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(redisKey);
      if (raw) return JSON.parse(raw) as Bucket;
    } catch { /* fall through */ }
  }
  return mem.get(memKey);
}

async function writeBucket(redisKey: string, mem: Map<string, Bucket>, memKey: string, b: Bucket, ttlMs: number) {
  mem.set(memKey, b);
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(redisKey, JSON.stringify(b), 'PX', Math.max(ttlMs, 1000));
  } catch { /* */ }
}

async function deleteBucket(redisKey: string, mem: Map<string, Bucket>, memKey: string) {
  mem.delete(memKey);
  const redis = getRedis();
  if (!redis) return;
  try { await redis.del(redisKey); } catch { /* */ }
}

/** Non-throwing; returns allowed:true on any internal error (fail-open). */
export async function evaluateLogin(email: string, ip: string): Promise<LoginGuardVerdict> {
  try {
    cleanup();
    const now = Date.now();

    const ipB = await readBucket(`hfy:lg:ip:${ip}`, ipStore, ip);
    if (ipB && ipB.lockedUntil > now) {
      return { allowed: false, retryAfterSec: Math.ceil((ipB.lockedUntil - now) / 1000), reason: 'ip_locked' };
    }

    const aKey = accountKey(email, ip);
    const aB = await readBucket(`hfy:lg:acct:${aKey}`, accountStore, aKey);
    if (aB && aB.lockedUntil > now) {
      return { allowed: false, retryAfterSec: Math.ceil((aB.lockedUntil - now) / 1000), reason: 'account_locked' };
    }

    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return { allowed: true, retryAfterSec: 0 };
  }
}

async function bump(
  redisKey: string,
  mem: Map<string, Bucket>,
  memKey: string,
  max: number,
  lockMs: number,
) {
  const now = Date.now();
  let b = (await readBucket(redisKey, mem, memKey)) || { count: 0, firstAt: now, lockedUntil: 0 };
  if (now - b.firstAt > WINDOW_MS) {
    b = { count: 0, firstAt: now, lockedUntil: 0 };
  }
  b.count += 1;
  if (b.count >= max) b.lockedUntil = now + lockMs;
  await writeBucket(redisKey, mem, memKey, b, Math.max(WINDOW_MS, lockMs));
}

export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  try {
    const aKey = accountKey(email, ip);
    await bump(`hfy:lg:acct:${aKey}`, accountStore, aKey, ACCOUNT_MAX, ACCOUNT_LOCK_MS);
    await bump(`hfy:lg:ip:${ip}`, ipStore, ip, IP_MAX, IP_LOCK_MS);
  } catch { /* fail-open */ }
}

export async function recordLoginSuccess(email: string, ip: string): Promise<void> {
  try {
    const aKey = accountKey(email, ip);
    await deleteBucket(`hfy:lg:acct:${aKey}`, accountStore, aKey);
  } catch { /* fail-open */ }
}

export function _resetLoginGuard() {
  accountStore.clear();
  ipStore.clear();
}

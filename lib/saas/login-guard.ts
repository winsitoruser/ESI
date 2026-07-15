/**
 * Phase 17 — login rate-limit + lockout (anti brute-force / credential-stuffing).
 *
 * In-memory, per-process (PM2 single instance). Two independent dimensions:
 *   1. account (email|ip): protects a specific account from targeted brute force
 *      WITHOUT letting an attacker from another IP lock the legit user out.
 *   2. ip: catches credential stuffing (many emails from one IP).
 *
 * Design principles:
 *   - FAIL-OPEN: any internal error must never block a legitimate login.
 *   - Successful login clears that account+ip counter immediately.
 *   - Counters auto-expire; no persistence needed (a restart simply resets).
 */

interface Bucket {
  count: number;
  firstAt: number;
  lockedUntil: number;
}

const WINDOW_MS = 15 * 60 * 1000;      // rolling window
const ACCOUNT_MAX = 8;                  // failures per (email|ip) before lock
const ACCOUNT_LOCK_MS = 15 * 60 * 1000; // lock duration for an account+ip
const IP_MAX = 100;                     // failures per IP (any account) before lock
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

/** Non-throwing; returns allowed:true on any internal error (fail-open). */
export function evaluateLogin(email: string, ip: string): LoginGuardVerdict {
  try {
    cleanup();
    const now = Date.now();

    const ipB = ipStore.get(ip);
    if (ipB && ipB.lockedUntil > now) {
      return { allowed: false, retryAfterSec: Math.ceil((ipB.lockedUntil - now) / 1000), reason: 'ip_locked' };
    }

    const aKey = accountKey(email, ip);
    const aB = accountStore.get(aKey);
    if (aB && aB.lockedUntil > now) {
      return { allowed: false, retryAfterSec: Math.ceil((aB.lockedUntil - now) / 1000), reason: 'account_locked' };
    }

    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return { allowed: true, retryAfterSec: 0 };
  }
}

function bump(store: Map<string, Bucket>, key: string, max: number, lockMs: number) {
  const now = Date.now();
  let b = store.get(key);
  if (!b || now - b.firstAt > WINDOW_MS) {
    b = { count: 0, firstAt: now, lockedUntil: 0 };
  }
  b.count += 1;
  if (b.count >= max) {
    b.lockedUntil = now + lockMs;
  }
  store.set(key, b);
}

/** Record a failed attempt across both dimensions. Never throws. */
export function recordLoginFailure(email: string, ip: string): void {
  try {
    bump(accountStore, accountKey(email, ip), ACCOUNT_MAX, ACCOUNT_LOCK_MS);
    bump(ipStore, ip, IP_MAX, IP_LOCK_MS);
  } catch { /* fail-open */ }
}

/** Clear the account+ip counter on a successful login. Never throws. */
export function recordLoginSuccess(email: string, ip: string): void {
  try {
    accountStore.delete(accountKey(email, ip));
  } catch { /* fail-open */ }
}

/** Testing/ops helper. */
export function _resetLoginGuard() {
  accountStore.clear();
  ipStore.clear();
}

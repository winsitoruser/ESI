/**
 * Rate Limiting Middleware for Next.js API Routes
 * Memory store by default; Redis when REDIS_URL is set (multi-instance safe).
 */
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { getRedis } from '@/lib/redis/client';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextApiRequest) => string;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupMemory() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt < now) memoryStore.delete(key);
  }
}

export const RateLimitTier = {
  STANDARD: { windowMs: 60 * 1000, maxRequests: 100 } as RateLimitConfig,
  SENSITIVE: { windowMs: 60 * 1000, maxRequests: 30 } as RateLimitConfig,
  AUTH: { windowMs: 60 * 1000, maxRequests: 10 } as RateLimitConfig,
  HEAVY: { windowMs: 60 * 1000, maxRequests: 5 } as RateLimitConfig,
  WEBHOOK: { windowMs: 60 * 1000, maxRequests: 200 } as RateLimitConfig,
};

function defaultKeyGenerator(req: NextApiRequest): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const userId = (req as any).session?.user?.id || 'anon';
  const path = req.url?.split('?')[0] || '/';
  return `rl:${ip}:${userId}:${path}`;
}

function checkRateLimitMemory(key: string, config: RateLimitConfig) {
  cleanupMemory();
  const now = Date.now();
  let entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
  }
  entry.count += 1;
  memoryStore.set(key, entry);
  const remaining = Math.max(0, config.maxRequests - entry.count);
  return { allowed: entry.count <= config.maxRequests, remaining, resetAt: entry.resetAt };
}

async function checkRateLimitRedis(key: string, config: RateLimitConfig) {
  const redis = getRedis();
  if (!redis) return checkRateLimitMemory(key, config);
  try {
    const rkey = `hfy:${key}`;
    const count = await redis.incr(rkey);
    if (count === 1) {
      await redis.pexpire(rkey, config.windowMs);
    }
    const ttl = await redis.pttl(rkey);
    const resetAt = Date.now() + (ttl > 0 ? ttl : config.windowMs);
    const remaining = Math.max(0, config.maxRequests - count);
    return { allowed: count <= config.maxRequests, remaining, resetAt };
  } catch {
    return checkRateLimitMemory(key, config);
  }
}

/** @deprecated sync — prefer checkRateLimitAsync; kept for tests */
export function checkRateLimit(key: string, config: RateLimitConfig) {
  return checkRateLimitMemory(key, config);
}

export async function checkRateLimitAsync(key: string, config: RateLimitConfig) {
  return checkRateLimitRedis(key, config);
}

export function withRateLimit(
  handler: NextApiHandler,
  config: RateLimitConfig = RateLimitTier.STANDARD,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const keyGen = config.keyGenerator || defaultKeyGenerator;
    const key = keyGen(req);
    const result = await checkRateLimitAsync(key, config);

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: config.message || 'Too many requests. Please try again later.',
        retryAfter,
      });
    }

    return handler(req, res);
  };
}

/**
 * Standalone rate limit check. Async — always await.
 * Usage: if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
 */
export async function checkLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  config: RateLimitConfig = RateLimitTier.STANDARD,
): Promise<boolean> {
  const keyGen = config.keyGenerator || defaultKeyGenerator;
  const key = keyGen(req);
  const result = await checkRateLimitAsync(key, config);

  res.setHeader('X-RateLimit-Limit', config.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: config.message || 'Too many requests. Please try again later.',
      retryAfter,
    });
    return false;
  }

  return true;
}

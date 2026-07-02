/**
 * Rate Limiting Middleware for Next.js API Routes
 * In-memory sliding window rate limiter.
 * Protects sensitive endpoints from brute force and abuse.
 *
 * Usage:
 *   import { withRateLimit, RateLimitTier } from '@/lib/middleware/rateLimit';
 *
 *   // Apply to handler
 *   export default withHQAuth(withRateLimit(handler, RateLimitTier.SENSITIVE));
 *
 *   // Or with custom config
 *   export default withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
 */

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Max requests per window per key
  keyGenerator?: (req: NextApiRequest) => string;  // Custom key generator
  message?: string;       // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per-process). Use Redis in production for multi-instance.
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * Pre-defined rate limit tiers
 */
export const RateLimitTier = {
  /** Standard API: 100 req/min */
  STANDARD: { windowMs: 60 * 1000, maxRequests: 100 } as RateLimitConfig,

  /** Sensitive endpoints (finance write, sync): 30 req/min */
  SENSITIVE: { windowMs: 60 * 1000, maxRequests: 30 } as RateLimitConfig,

  /** Auth endpoints (login, register): 10 req/min */
  AUTH: { windowMs: 60 * 1000, maxRequests: 10 } as RateLimitConfig,

  /** Export/heavy endpoints: 5 req/min */
  HEAVY: { windowMs: 60 * 1000, maxRequests: 5 } as RateLimitConfig,

  /** Webhook receivers: 200 req/min */
  WEBHOOK: { windowMs: 60 * 1000, maxRequests: 200 } as RateLimitConfig,
};

/**
 * Default key generator: uses IP + user ID (if authenticated)
 */
function defaultKeyGenerator(req: NextApiRequest): string {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const userId = (req as any).session?.user?.id || 'anon';
  const path = req.url?.split('?')[0] || '/';
  return `rl:${ip}:${userId}:${path}`;
}

/**
 * Check rate limit for a given key
 */
function checkRateLimit(key: string, config: RateLimitConfig): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;

  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  handler: NextApiHandler,
  config: RateLimitConfig = RateLimitTier.STANDARD
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const keyGen = config.keyGenerator || defaultKeyGenerator;
    const key = keyGen(req);
    const result = checkRateLimit(key, config);

    // Set rate limit headers
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
 * Standalone rate limit check (for use inside handlers without wrapping)
 *
 * Usage:
 *   if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
 */
export function checkLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  config: RateLimitConfig = RateLimitTier.STANDARD
): boolean {
  const keyGen = config.keyGenerator || defaultKeyGenerator;
  const key = keyGen(req);
  const result = checkRateLimit(key, config);

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

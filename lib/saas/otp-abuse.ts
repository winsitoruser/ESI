/**
 * Wave 11 — OTP / MFA abuse protection (SEC-ABU-002)
 */
import { checkRateLimitAsync, RateLimitTier } from '@/lib/middleware/rateLimit';

export async function assertOtpAttemptAllowed(opts: {
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
}): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const id = String(opts.userId || opts.email || 'anon').toLowerCase();
  const ip = String(opts.ip || 'unknown');
  const user = await checkRateLimitAsync(`otp:user:${id}`, {
    windowMs: 10 * 60_000,
    maxRequests: Number(process.env.HUMANIFY_OTP_MAX_PER_USER || 5),
    message: 'Terlalu banyak percobaan OTP',
  });
  if (!user.allowed) {
    return { allowed: false, retryAfterSec: Math.ceil((user.resetAt - Date.now()) / 1000) };
  }
  const ipLim = await checkRateLimitAsync(`otp:ip:${ip}`, {
    windowMs: 10 * 60_000,
    maxRequests: Number(process.env.HUMANIFY_OTP_MAX_PER_IP || 20),
    message: 'Terlalu banyak percobaan OTP dari IP ini',
  });
  if (!ipLim.allowed) {
    return { allowed: false, retryAfterSec: Math.ceil((ipLim.resetAt - Date.now()) / 1000) };
  }
  return { allowed: true };
}

export async function assertSearchScrapeLimit(opts: {
  tenantId: string;
  userId: string;
  surface: string;
}): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const key = `search:${opts.surface}:${opts.tenantId}:${opts.userId}`;
  const r = await checkRateLimitAsync(key, {
    ...RateLimitTier.HEAVY,
    maxRequests: Number(process.env.HUMANIFY_SEARCH_MAX_PER_MIN || 20),
    windowMs: 60_000,
    message: 'Terlalu banyak pencarian — coba lagi sebentar',
  });
  if (!r.allowed) {
    return { allowed: false, retryAfterSec: Math.ceil((r.resetAt - Date.now()) / 1000) };
  }
  return { allowed: true };
}

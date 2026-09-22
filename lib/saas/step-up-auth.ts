/**
 * SEC-IAM-008 — step-up / re-authentication for sensitive actions.
 * Client posts password to /api/humanify/step-up, receives a short-lived token,
 * then sends it as `x-step-up-token` (or body.stepUpToken) on sensitive APIs.
 */
import crypto from 'crypto';
import type { NextApiRequest } from 'next';

const DEFAULT_TTL_MIN = 10;

export function isStepUpRequired(): boolean {
  const v = String(process.env.HUMANIFY_STEP_UP_REQUIRED || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'on';
}

export function getStepUpTtlMs(): number {
  const n = Number(process.env.HUMANIFY_STEP_UP_TTL_MIN || DEFAULT_TTL_MIN);
  const mins = Number.isFinite(n) ? n : DEFAULT_TTL_MIN;
  return Math.max(3, Math.min(60, mins)) * 60_000;
}

function secret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.HUMANIFY_STEP_UP_SECRET || 'dev-step-up';
}

export function mintStepUpToken(opts: {
  userId: string;
  tenantId: string;
  purpose?: string;
  issuedAt?: number;
}): string {
  const iat = opts.issuedAt ?? Date.now();
  const exp = iat + getStepUpTtlMs();
  const purpose = String(opts.purpose || 'sensitive').slice(0, 40);
  const payload = `${opts.userId}:${opts.tenantId}:${purpose}:${iat}:${exp}`;
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyStepUpToken(
  token: string | null | undefined,
  opts: { userId: string; tenantId: string; purpose?: string },
): boolean {
  if (!token || !opts.userId || !opts.tenantId) return false;
  try {
    const raw = Buffer.from(String(token), 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 6) return false;
    const [userId, tenantId, purpose, iatStr, expStr, sig] = parts;
    if (userId !== String(opts.userId) || tenantId !== String(opts.tenantId)) return false;
    if (opts.purpose && purpose !== opts.purpose) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const payload = `${userId}:${tenantId}:${purpose}:${iatStr}:${expStr}`;
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function extractStepUpToken(req: NextApiRequest): string | null {
  const h = req.headers['x-step-up-token'];
  if (typeof h === 'string' && h.trim()) return h.trim();
  const body = (req as any).body;
  if (body?.stepUpToken) return String(body.stepUpToken);
  if (typeof req.query.stepUpToken === 'string') return req.query.stepUpToken;
  return null;
}

/** Returns null if OK; otherwise an error payload for 403. */
export function assertStepUp(
  req: NextApiRequest,
  opts: { userId: string; tenantId: string; purpose?: string },
): { code: string; error: string } | null {
  if (!isStepUpRequired()) return null;
  const token = extractStepUpToken(req);
  if (!verifyStepUpToken(token, opts)) {
    return {
      code: 'STEP_UP_REQUIRED',
      error: 'Konfirmasi password diperlukan. POST /api/humanify/step-up lalu kirim x-step-up-token.',
    };
  }
  return null;
}

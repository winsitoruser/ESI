/**
 * Optional re-auth gate before showing payslip amounts (HRS-3).
 * Enable with HUMANIFY_PAYSLIP_REQUIRE_PASSWORD=true
 * Unlock TTL: HUMANIFY_PAYSLIP_UNLOCK_TTL_MIN (default 15, clamp 5–120).
 */
import crypto from 'crypto';

export function isPayslipPasswordGateEnabled(): boolean {
  const v = String(process.env.HUMANIFY_PAYSLIP_REQUIRE_PASSWORD || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'on';
}

export function getPayslipUnlockTtlMs(): number {
  const n = Number(process.env.HUMANIFY_PAYSLIP_UNLOCK_TTL_MIN || 15);
  const mins = Number.isFinite(n) ? n : 15;
  return Math.max(5, Math.min(120, mins)) * 60_000;
}

function gateSecret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.HUMANIFY_PAYSLIP_GATE_SECRET || 'dev-payslip-gate';
}

/** Opaque unlock token bound to user + tenant. */
export function mintPayslipUnlockToken(opts: {
  userId: string;
  tenantId: string;
  issuedAt?: number;
}): string {
  const iat = opts.issuedAt ?? Date.now();
  const exp = iat + getPayslipUnlockTtlMs();
  const payload = `${opts.userId}:${opts.tenantId}:${iat}:${exp}`;
  const sig = crypto.createHmac('sha256', gateSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyPayslipUnlockToken(
  token: string | null | undefined,
  opts: { userId: string; tenantId: string },
): boolean {
  if (!token || !opts.userId || !opts.tenantId) return false;
  try {
    const raw = Buffer.from(String(token), 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 5) return false;
    const [userId, tenantId, iatStr, expStr, sig] = parts;
    if (userId !== String(opts.userId) || tenantId !== String(opts.tenantId)) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const payload = `${userId}:${tenantId}:${iatStr}:${expStr}`;
    const expected = crypto.createHmac('sha256', gateSecret()).update(payload).digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Strip salary figures for locked responses. */
export function maskPayslipRow<T extends Record<string, unknown>>(row: T): T & { masked: true } {
  return {
    ...row,
    base_salary: null,
    total_earnings: null,
    total_deductions: null,
    tax_amount: null,
    net_salary: null,
    earnings: [],
    deductions: [],
    bpjs_kes_employee: null,
    bpjs_tk_jht_employee: null,
    bpjs_tk_jp_employee: null,
    masked: true,
  };
}

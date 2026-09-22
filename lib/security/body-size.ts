/**
 * Wave 9 — request body size gate (SEC-API-006)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export function maxBodyBytes(): number {
  const n = Number(process.env.HUMANIFY_MAX_BODY_BYTES || 2 * 1024 * 1024);
  return Number.isFinite(n) && n > 0 ? n : 2 * 1024 * 1024;
}

export function assertBodySize(
  req: NextApiRequest,
  res: NextApiResponse,
  maxBytes?: number,
): boolean {
  const max = maxBytes ?? maxBodyBytes();
  const cl = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(cl) && cl > max) {
    res.status(413).json({
      success: false,
      error: `Payload terlalu besar (max ${Math.round(max / 1024)}KB)`,
      code: 'PAYLOAD_TOO_LARGE',
    });
    return false;
  }
  return true;
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOpsOrigin, isOpsHost } from '@/lib/humanify/ops-host';

function isLoopbackRequest(req: NextApiRequest): boolean {
  const ip = String(
    (req.socket as any)?.remoteAddress ||
      req.headers['x-real-ip'] ||
      '',
  );
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('127.')
  );
}

/**
 * Fail closed: Platform APIs must only be served from the ops host.
 * Apex `/api/platform` returns 403 so tenant cookies on humanify.id cannot hit ops APIs.
 * Loopback allowed for PM2/cron jobs on the VPS when `allowLoopbackCron` is set.
 */
export function assertOpsApiHost(
  req: NextApiRequest,
  res: NextApiResponse,
  opts?: { allowLoopbackCron?: boolean },
): boolean {
  const enforce =
    process.env.HUMANIFY_OPS_ENFORCE === 'true' ||
    process.env.HUMANIFY_OPS_ENFORCE === '1' ||
    process.env.NODE_ENV === 'production';

  if (!enforce) return true;

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  if (isOpsHost(host)) return true;

  if (opts?.allowLoopbackCron && isLoopbackRequest(req)) {
    return true;
  }

  res.status(403).json({
    success: false,
    error: 'OPS_HOST_REQUIRED',
    message: `Platform control plane API is only available at ${getOpsOrigin()}`,
    opsOrigin: getOpsOrigin(),
  });
  return false;
}

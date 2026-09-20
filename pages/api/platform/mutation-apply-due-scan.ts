/**
 * Platform cron — apply approved mutations whose effective_date is due.
 * POST — x-cron-secret / loopback OR platform operator
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { assertOpsApiHost } from '@/lib/humanify/assert-ops-host';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { scanAllTenantsDueMutations, scanDueMutations } from '@/lib/hris/mutation-apply-due';

function cronAuthorized(req: NextApiRequest): boolean {
  const secret = String(process.env.OBS_ALERT_CRON_SECRET || process.env.CRON_SECRET || '').trim();
  const header = String(req.headers['x-cron-secret'] || '').trim();
  if (secret && header === secret) return true;
  const ip = String(
    (req.socket as any)?.remoteAddress ||
    req.headers['x-real-ip'] ||
    '',
  );
  const loopback =
    ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (loopback && (!secret || !header || header === secret)) return true;
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!assertOpsApiHost(req, res, { allowLoopbackCron: true })) return;

  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!isPlatformOperator((session.user as any).role)) {
      return res.status(403).json({ success: false, error: 'Platform operator only' });
    }
    return res.json({
      success: true,
      data: {
        endpoint: 'POST /api/platform/mutation-apply-due-scan',
        method: 'POST',
        auth: 'x-cron-secret header or loopback; platform operator session also allowed',
        body: {
          dryRun: 'boolean optional — scan without applying',
          tenantId: 'uuid optional — limit to one tenant',
        },
        scheduleHint: 'daily via ensure-humanify-crons.sh tag mutation-apply-due',
        cronTag: 'mutation-apply-due',
        cronSchedule: '15 1 * * *',
        runner: 'scripts/run-humanify-mutation-apply-due-scan.js',
        behavior: 'Applies employee_mutations with status=approved and effective_date <= today; sets status=executed and stamps applied_at/notes',
        relatedUi: '/humanify/mutations',
      },
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  const viaCron = cronAuthorized(req);
  const viaOps = session?.user && isPlatformOperator((session.user as any).role);
  if (!viaCron && !viaOps) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const dryRun = String(req.body?.dryRun || req.query.dryRun || '').toLowerCase() === 'true';
  const tenantId = req.body?.tenantId || req.query.tenantId || null;

  try {
    const result = tenantId
      ? await scanDueMutations({ tenantId: String(tenantId), dryRun })
      : await scanAllTenantsDueMutations({ dryRun });
    // Flatten applied/scanned for cron log grepping / observability
    const applied = Number((result as any).applied || 0);
    const scanned = Number((result as any).scanned ?? (result as any).tenants ?? 0);
    return res.json({
      success: true,
      data: {
        ...result,
        applied,
        scanned,
        appliedCount: applied,
        scannedCount: scanned,
        dryRun: !!dryRun,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Scan failed' });
  }
}

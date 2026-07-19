/**
 * Phase 18 — platform observability snapshot (ops only).
 * GET /api/platform/observability → process metrics + recent error/slow events.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { getObservabilitySnapshotAsync } from '@/lib/observability';
import { getBackupFreshness } from '@/lib/saas/backup-freshness';
import { getScorecardLastRun } from '@/lib/saas/scorecard-last';
import { getPrivyWebhookHealth } from '@/lib/hris/privy-webhook';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = (session.user as any).role;
  if (!isPlatformOperator(role)) {
    return res.status(403).json({ success: false, error: 'Platform operator only' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const data = await getObservabilitySnapshotAsync();
  const backup = getBackupFreshness();
  const scorecard = getScorecardLastRun();
  const privy = await getPrivyWebhookHealth().catch(() => null);
  return res.json({
    success: true,
    data: {
      ...data,
      externalUptime: {
        uptimeRobotKey: Boolean(process.env.UPTIMEROBOT_API_KEY?.trim()),
        betterStackToken: Boolean(process.env.BETTERSTACK_TOKEN?.trim()),
        configured: Boolean(
          process.env.UPTIMEROBOT_API_KEY?.trim() || process.env.BETTERSTACK_TOKEN?.trim(),
        ),
        healthUrl: 'https://humanify.id/api/health?deep=1',
      },
      backup: {
        present: backup.present,
        skipped: backup.skipped,
        ok: backup.ok,
        ageHours: backup.ageHours,
        maxAgeHours: backup.maxAgeHours,
        sizeMb: backup.sizeMb,
        reason: backup.reason,
      },
      scorecard: {
        present: scorecard.present,
        ok: scorecard.ok,
        at: scorecard.at,
        ageHours: scorecard.ageHours,
        passedTotal: scorecard.passedTotal,
        failedTotal: scorecard.failedTotal,
        base: scorecard.base,
        reason: scorecard.reason,
      },
      privyWebhook: privy,
    },
  });
}

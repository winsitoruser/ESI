import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../models');

/**
 * POST /api/hq/billing/overdue-sweep
 *
 * Marks all `sent` invoices past due date as `overdue` for the caller's
 * tenant. Also flips the related subscription to `past_due` if present.
 *
 * This endpoint can be called:
 *   - From the billing-info page load (lazy sweep)
 *   - By a scheduler / cron (CRON_SECRET header with `?all=1` sweeps all tenants)
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;

  const cronHeader = req.headers['x-cron-secret'] as string | undefined;
  const sweepAll = req.query.all === '1' || req.query.all === 'true';
  const isCron = cronHeader && process.env.CRON_SECRET && cronHeader === process.env.CRON_SECRET;

  if (sweepAll && !isCron) {
    return res.status(403).json({ success: false, error: 'Forbidden: full sweep requires cron secret' });
  }
  if (!sweepAll && !tenantId) {
    return res.status(400).json({ success: false, error: 'Tenant not found' });
  }

  const db = getDb();
  const now = new Date();
  const gracePeriodDays = Number(process.env.BILLING_GRACE_PERIOD_DAYS || '0');
  const threshold = new Date(now.getTime() - gracePeriodDays * 24 * 60 * 60 * 1000);

  const where: any = {
    status: ['sent', 'draft'],
    dueDate: { [db.Sequelize.Op.lt]: threshold }
  };
  if (!sweepAll) where.tenantId = tenantId;

  let updated = 0;
  let subsUpdated = 0;
  try {
    const invoices = await db.Invoice.findAll({ where });
    for (const inv of invoices) {
      inv.status = 'overdue';
      inv.metadata = {
        ...(inv.metadata || {}),
        markedOverdueAt: new Date().toISOString(),
        daysOverdue: Math.ceil((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      };
      await inv.save();
      updated++;

      if (inv.subscriptionId) {
        try {
          const sub = await db.Subscription.findByPk(inv.subscriptionId);
          if (sub && sub.status === 'active') {
            sub.status = 'past_due';
            await sub.save();
            subsUpdated++;
          }
        } catch (_) { /* optional */ }
      }
    }
  } catch (error: any) {
    console.error('Overdue sweep error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(200).json({
    success: true,
    data: { invoicesMarkedOverdue: updated, subscriptionsFlipped: subsUpdated, sweptAt: now.toISOString() }
  });
}

export default withHQAuth(handler, { allowGuest: true });

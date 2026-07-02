import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../../models');

/**
 * GET /api/hq/billing/payment-methods
 *
 * Returns the list of provider adapters that can be used to pay subscription
 * invoices. Each entry is annotated with isActive based on whether the tenant
 * has configured credentials either in `integration_configs` or env vars.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const db = getDb();
  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;

  const providers = [
    { id: 'midtrans', envKey: 'MIDTRANS_SERVER_KEY', feePercent: 0, feeFixed: 4500, badge: 'Rekomendasi' },
    { id: 'xendit', envKey: 'XENDIT_SECRET_KEY', feePercent: 0, feeFixed: 4500 },
    { id: 'manual', envKey: null, feePercent: 0, feeFixed: 0 }
  ];

  const data = await Promise.all(
    providers.map(async (p) => {
      let isActive = p.id === 'manual';
      if (!isActive && p.envKey && process.env[p.envKey]) isActive = true;

      if (!isActive && tenantId) {
        try {
          const prov = await db.IntegrationProvider?.findOne?.({ where: { code: p.id } });
          if (prov) {
            const cfg = await db.IntegrationConfig.findOne({
              where: { providerId: prov.id }
            });
            if (cfg?.credentials) isActive = true;
          }
        } catch (_) { /* ignore */ }
      }

      return {
        id: p.id,
        isActive,
        feePercent: p.feePercent,
        feeFixed: p.feeFixed,
        badge: p.badge
      };
    })
  );

  return res.status(200).json({ success: true, data });
}

export default withHQAuth(handler);

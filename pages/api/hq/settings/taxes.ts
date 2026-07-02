import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../models');

const defaultTaxes = {
  ppn: { enabled: true, rate: 12, includeInPrice: false, applyToAllBranches: true },
  serviceCharge: { enabled: true, rate: 10, applyToAllBranches: true, excludedBranchTypes: ['kiosk'] },
  pb1: { enabled: false, rate: 10, applyToAllBranches: true },
  rounding: { enabled: true, method: 'nearest', precision: 100 }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  const StoreSetting = db.StoreSetting;

  if (req.method === 'GET') {
    let taxes = defaultTaxes;
    try {
      const row = await StoreSetting.findOne({ where: { key: 'tax_settings', scope: 'hq' } });
      if (row?.value) taxes = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    } catch (_) {}
    return res.status(200).json({ success: true, data: taxes });
  }

  if (req.method === 'PUT') {
    const payload = req.body || {};
    try {
      await StoreSetting.upsert({
        key: 'tax_settings',
        scope: 'hq',
        value: JSON.stringify(payload),
        updated_at: new Date()
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }

    // Propagate locked settings to branches
    try {
      const Branch = db.Branch;
      if (Branch && payload.ppn?.applyToAllBranches) {
        const branches = await Branch.findAll({ where: { isActive: true } });
        for (const b of branches) {
          await StoreSetting.upsert({
            key: 'tax_ppn',
            scope: 'branch',
            branch_id: b.id,
            value: JSON.stringify(payload.ppn),
            is_locked: true,
            locked_by_hq: true,
            updated_at: new Date()
          });
        }
      }
    } catch (_) {}

    return res.status(200).json({ success: true, data: payload });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withHQAuth(handler, { module: 'settings' });

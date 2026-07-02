import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../models');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;

  const db = getDb();

  let modules: any[] = [];
  let pricing: any[] = [];
  let enabled: any[] = [];

  try {
    modules = await db.Module.findAll({ where: { isActive: true } });
  } catch (_) {}

  try {
    pricing = await db.ModulePricing.findAll({ where: { isActive: true } });
  } catch (_) {}

  if (tenantId) {
    try {
      enabled = await db.TenantModule.findAll({ where: { tenantId } });
    } catch (_) {}
  }

  const pricingByModule: Record<string, any> = {};
  for (const p of pricing) {
    pricingByModule[p.moduleId] = {
      price: parseFloat(p.price || 0),
      currency: p.currency,
      billingInterval: p.billingInterval,
      perUser: p.perUser,
      perBranch: p.perBranch,
      includedInPlans: p.includedInPlans,
      trialDays: p.trialDays,
      yearlyDiscountPercent: parseFloat(p.yearlyDiscountPercent || 0)
    };
  }

  const enabledByModule: Record<string, any> = {};
  for (const e of enabled) {
    enabledByModule[e.moduleId] = {
      isEnabled: e.isEnabled,
      enabledAt: e.enabledAt
    };
  }

  return res.status(200).json({
    success: true,
    data: modules.map((m: any) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      category: m.category,
      pricingTier: m.pricingTier,
      description: m.description,
      icon: m.icon,
      pricing: pricingByModule[m.id] || null,
      enabled: enabledByModule[m.id] || null
    }))
  });
}

export default withHQAuth(handler);

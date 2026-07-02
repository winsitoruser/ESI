import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../models');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const db = getDb();

  let plans: any[] = [];
  let planLimits: any[] = [];
  let modulePricing: any[] = [];

  try {
    plans = await db.Plan.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['price', 'ASC']]
    });
  } catch (_) {}

  try {
    planLimits = await db.PlanLimit.findAll();
  } catch (_) {}

  try {
    modulePricing = await db.ModulePricing.findAll({
      where: { isActive: true },
      include: [{ model: db.Module, as: 'module' }]
    });
  } catch (_) {}

  const limitsByPlan: Record<string, any[]> = {};
  for (const l of planLimits) {
    const pid = l.planId || l.plan_id;
    if (!limitsByPlan[pid]) limitsByPlan[pid] = [];
    limitsByPlan[pid].push({
      metricName: l.metricName || l.metric_name,
      maxValue: l.maxValue || l.max_value,
      unit: l.unit,
      isSoftLimit: l.isSoftLimit ?? l.is_soft_limit,
      overageRate: l.overageRate || l.overage_rate ? parseFloat(l.overageRate || l.overage_rate) : null
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      plans: plans.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: parseFloat(p.price || 0),
        currency: p.currency,
        billingInterval: p.billingInterval,
        trialDays: p.trialDays,
        maxUsers: p.maxUsers,
        maxBranches: p.maxBranches,
        maxProducts: p.maxProducts,
        maxTransactions: p.maxTransactions,
        features: p.features,
        metadata: p.metadata,
        sortOrder: p.sortOrder,
        limits: limitsByPlan[p.id] || []
      })),
      modulePricing: modulePricing.map((m: any) => ({
        id: m.id,
        moduleId: m.moduleId,
        moduleCode: m.module?.code,
        moduleName: m.module?.name,
        moduleCategory: m.module?.category,
        price: parseFloat(m.price || 0),
        currency: m.currency,
        billingInterval: m.billingInterval,
        perUser: m.perUser,
        perBranch: m.perBranch,
        includedInPlans: m.includedInPlans || [],
        trialDays: m.trialDays,
        yearlyDiscountPercent: parseFloat(m.yearlyDiscountPercent || 0)
      }))
    }
  });
}

export default withHQAuth(handler);

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const getDb = () => require('../../../models');

/**
 * Billing Information API
 * Provides subscription details, service usage, invoices, and billing analytics
 * for the currently logged-in tenant.
 *
 * GET ?action=overview    - Full billing overview (subscription + usage + invoices)
 * GET ?action=subscription - Current subscription details
 * GET ?action=usage       - Service usage metrics & limits
 * GET ?action=invoices    - Invoice history
 * GET ?action=modules     - Enabled modules with cost breakdown
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tenantId = (session.user as any).tenantId;
    const action = (req.query.action as string) || 'overview';

    // Super admin / platform admin tanpa tenant dapat melihat demo data kosong
    // agar halaman billing-info tetap tampil tanpa 400.
    if (!tenantId) {
      return res.status(200).json({
        success: true,
        data: buildEmptyBillingPayload(session.user as any),
        _note: 'No tenantId in session; returning empty billing overview (demo mode)',
      });
    }

    switch (action) {
      case 'overview':
        return handleOverview(req, res, tenantId);
      case 'subscription':
        return handleSubscription(req, res, tenantId);
      case 'usage':
        return handleUsage(req, res, tenantId);
      case 'invoices':
        return handleInvoices(req, res, tenantId);
      case 'modules':
        return handleModules(req, res, tenantId);
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (error: any) {
    console.error('Billing Info API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

// ─── Empty payload builder (digunakan saat tenantId kosong) ─────────────────
function buildEmptyBillingPayload(user: any) {
  const now = new Date();
  return {
    tenant: {
      id: '',
      businessName: user?.businessName || user?.name || 'Platform Admin',
      businessCode: '',
      businessEmail: user?.email || '',
      status: 'inactive',
      kybStatus: 'not_applicable',
      businessStructure: 'single',
      isHq: false,
    },
    subscription: {
      status: 'inactive',
      plan: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      daysLeft: null,
    },
    usage: {
      current: { users: 0, branches: 0, products: 0, transactions: 0, employees: 0, warehouses: 0 },
      limits: { maxUsers: 0, maxBranches: 0, maxProducts: 0, maxTransactions: 0 },
      percentages: { users: 0, branches: 0, products: 0, transactions: 0 },
    },
    modules: [],
    recentInvoices: [],
    billingHistory: [],
    _emptyReason: 'no-tenant',
    _generatedAt: now.toISOString(),
  };
}

// ─── Overview ───────────────────────────────────────────────────────────────
async function handleOverview(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const db = getDb();
  const sequelize = db.sequelize;

  // 1. Tenant info
  const tenant = await db.Tenant.findByPk(tenantId, {
    attributes: ['id', 'businessName', 'businessCode', 'businessEmail', 'businessPhone',
      'status', 'subscriptionPlan', 'subscriptionStart', 'subscriptionEnd',
      'maxUsers', 'maxBranches', 'kybStatus', 'businessStructure', 'isHq']
  });

  if (!tenant) {
    return res.status(404).json({ success: false, error: 'Tenant not found' });
  }

  // 1a. Lazy overdue sweep (opportunistic, bounded, per-tenant)
  await sweepOverdueInvoices(db, tenantId);

  // 2. Subscription
  let subscription = null;
  try {
    subscription = await db.Subscription.findOne({
      where: { tenantId },
      include: [{ model: db.Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']]
    });
  } catch (e) { /* table may not exist yet */ }

  // 3. Active modules count
  let enabledModules: any[] = [];
  try {
    enabledModules = await db.TenantModule.findAll({
      where: { tenantId, isEnabled: true },
      include: [{ model: db.Module, as: 'module', attributes: ['id', 'name', 'code', 'category', 'pricingTier'] }]
    });
  } catch (e) { /* optional */ }

  // 4. Usage counts (real data from DB)
  const usageCounts = await getServiceUsageCounts(sequelize, tenantId);

  // 5. Recent invoices
  let recentInvoices: any[] = [];
  try {
    recentInvoices = await db.Invoice.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
  } catch (e) { /* optional */ }

  // 5a. Billing alerts — outstanding + next due
  const alerts = await buildBillingAlerts(db, tenantId);

  // 6. Billing cycles summary
  let billingCycles: any[] = [];
  try {
    if (subscription) {
      billingCycles = await db.BillingCycle.findAll({
        where: { subscriptionId: subscription.id },
        order: [['createdAt', 'DESC']],
        limit: 6
      });
    }
  } catch (e) { /* optional */ }

  // Build plan limits for usage meters
  const planLimits = {
    maxUsers: subscription?.plan?.maxUsers ?? tenant.maxUsers ?? 5,
    maxBranches: subscription?.plan?.maxBranches ?? tenant.maxBranches ?? 1,
    maxProducts: subscription?.plan?.maxProducts ?? 100,
    maxTransactions: subscription?.plan?.maxTransactions ?? 1000,
  };

  // Calculate days left
  const periodEnd = subscription?.currentPeriodEnd || tenant.subscriptionEnd;
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  return res.status(200).json({
    success: true,
    data: {
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        businessCode: tenant.businessCode,
        businessEmail: tenant.businessEmail,
        status: tenant.status,
        kybStatus: tenant.kybStatus,
        businessStructure: tenant.businessStructure,
        isHq: tenant.isHq,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        startedAt: subscription.startedAt,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        daysLeft,
        plan: subscription.plan ? {
          id: subscription.plan.id,
          name: subscription.plan.name,
          description: subscription.plan.description,
          price: parseFloat(subscription.plan.price || '0'),
          currency: subscription.plan.currency || 'IDR',
          billingInterval: subscription.plan.billingInterval,
          features: subscription.plan.features,
          maxUsers: subscription.plan.maxUsers,
          maxBranches: subscription.plan.maxBranches,
          maxProducts: subscription.plan.maxProducts,
          maxTransactions: subscription.plan.maxTransactions,
        } : null
      } : {
        status: tenant.status || 'trial',
        plan: {
          name: tenant.subscriptionPlan || 'Free Trial',
          price: 0,
          currency: 'IDR',
          billingInterval: 'monthly',
        },
        currentPeriodStart: tenant.subscriptionStart,
        currentPeriodEnd: tenant.subscriptionEnd,
        daysLeft,
      },
      usage: {
        current: usageCounts,
        limits: planLimits,
        percentages: {
          users: planLimits.maxUsers > 0 ? Math.round((usageCounts.users / planLimits.maxUsers) * 100) : 0,
          branches: planLimits.maxBranches > 0 ? Math.round((usageCounts.branches / planLimits.maxBranches) * 100) : 0,
          products: planLimits.maxProducts > 0 ? Math.round((usageCounts.products / planLimits.maxProducts) * 100) : 0,
          transactions: planLimits.maxTransactions > 0 ? Math.round((usageCounts.transactions / planLimits.maxTransactions) * 100) : 0,
        }
      },
      modules: enabledModules.map((tm: any) => ({
        id: tm.module?.id,
        name: tm.module?.name,
        code: tm.module?.code,
        category: tm.module?.category,
        pricingTier: tm.module?.pricingTier,
        enabledAt: tm.enabledAt,
      })),
      recentInvoices: recentInvoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalAmount: parseFloat(inv.totalAmount || '0'),
        currency: inv.currency || 'IDR',
        issuedDate: inv.issuedDate,
        dueDate: inv.dueDate,
        paidDate: inv.paidDate,
      })),
      billingHistory: billingCycles.map((bc: any) => ({
        id: bc.id,
        periodStart: bc.periodStart,
        periodEnd: bc.periodEnd,
        baseAmount: parseFloat(bc.baseAmount || '0'),
        overageAmount: parseFloat(bc.overageAmount || '0'),
        discountAmount: parseFloat(bc.discountAmount || '0'),
        taxAmount: parseFloat(bc.taxAmount || '0'),
        totalAmount: parseFloat(bc.totalAmount || '0'),
        currency: bc.currency || 'IDR',
        status: bc.status,
        dueDate: bc.dueDate,
      })),
      alerts,
    }
  });
}

// ─── Billing helpers ────────────────────────────────────────────────────────
async function sweepOverdueInvoices(db: any, tenantId: string) {
  try {
    const gracePeriodDays = Number(process.env.BILLING_GRACE_PERIOD_DAYS || '0');
    const threshold = new Date(Date.now() - gracePeriodDays * 24 * 60 * 60 * 1000);
    const candidates = await db.Invoice.findAll({
      where: {
        tenantId,
        status: ['sent', 'draft'],
        dueDate: { [db.Sequelize.Op.lt]: threshold }
      },
      limit: 25
    });
    for (const inv of candidates) {
      inv.status = 'overdue';
      inv.metadata = {
        ...(inv.metadata || {}),
        markedOverdueAt: new Date().toISOString()
      };
      await inv.save();
      if (inv.subscriptionId) {
        const sub = await db.Subscription.findByPk(inv.subscriptionId);
        if (sub && sub.status === 'active') {
          sub.status = 'past_due';
          await sub.save();
        }
      }
    }
  } catch (_) { /* best-effort, never fail overview */ }
}

async function buildBillingAlerts(db: any, tenantId: string) {
  try {
    const now = new Date();
    const upcomingThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const outstanding = await db.Invoice.findAll({
      where: {
        tenantId,
        status: ['sent', 'overdue', 'draft']
      },
      order: [['dueDate', 'ASC']],
      limit: 10
    });

    const overdue = outstanding.filter((i: any) =>
      i.status === 'overdue' ||
      (i.dueDate && new Date(i.dueDate).getTime() < now.getTime())
    );
    const upcoming = outstanding.filter((i: any) =>
      i.status !== 'overdue' &&
      i.dueDate && new Date(i.dueDate).getTime() <= upcomingThreshold.getTime() &&
      new Date(i.dueDate).getTime() >= now.getTime()
    );

    const outstandingTotal = outstanding.reduce(
      (s: number, i: any) => s + parseFloat(i.totalAmount || '0'),
      0
    );
    const overdueTotal = overdue.reduce(
      (s: number, i: any) => s + parseFloat(i.totalAmount || '0'),
      0
    );

    return {
      outstandingCount: outstanding.length,
      outstandingTotal,
      overdueCount: overdue.length,
      overdueTotal,
      upcomingCount: upcoming.length,
      nextDueInvoice: outstanding[0] ? {
        id: outstanding[0].id,
        invoiceNumber: outstanding[0].invoiceNumber,
        dueDate: outstanding[0].dueDate,
        totalAmount: parseFloat(outstanding[0].totalAmount || '0'),
        status: outstanding[0].status
      } : null,
      overdueInvoices: overdue.slice(0, 5).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        totalAmount: parseFloat(inv.totalAmount || '0'),
        daysOverdue: inv.dueDate
          ? Math.ceil((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        status: inv.status
      }))
    };
  } catch (_) {
    return {
      outstandingCount: 0,
      outstandingTotal: 0,
      overdueCount: 0,
      overdueTotal: 0,
      upcomingCount: 0,
      nextDueInvoice: null,
      overdueInvoices: []
    };
  }
}

// ─── Subscription Details ───────────────────────────────────────────────────
async function handleSubscription(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const db = getDb();

  const subscription = await db.Subscription.findOne({
    where: { tenantId },
    include: [{ model: db.Plan, as: 'plan' }],
    order: [['createdAt', 'DESC']]
  });

  if (!subscription) {
    const tenant = await db.Tenant.findByPk(tenantId, {
      attributes: ['status', 'subscriptionPlan', 'subscriptionStart', 'subscriptionEnd', 'maxUsers', 'maxBranches']
    });
    return res.status(200).json({
      success: true,
      data: {
        status: tenant?.status || 'trial',
        plan: { name: tenant?.subscriptionPlan || 'Free Trial', price: 0, currency: 'IDR' },
        currentPeriodStart: tenant?.subscriptionStart,
        currentPeriodEnd: tenant?.subscriptionEnd,
      }
    });
  }

  return res.status(200).json({ success: true, data: subscription });
}

// ─── Service Usage ──────────────────────────────────────────────────────────
async function handleUsage(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const db = getDb();
  const sequelize = db.sequelize;

  const usageCounts = await getServiceUsageCounts(sequelize, tenantId);

  // Get plan limits
  let planLimits = { maxUsers: 5, maxBranches: 1, maxProducts: 100, maxTransactions: 1000 };
  try {
    const subscription = await db.Subscription.findOne({
      where: { tenantId },
      include: [{ model: db.Plan, as: 'plan' }]
    });
    if (subscription?.plan) {
      planLimits = {
        maxUsers: subscription.plan.maxUsers ?? 5,
        maxBranches: subscription.plan.maxBranches ?? 1,
        maxProducts: subscription.plan.maxProducts ?? 100,
        maxTransactions: subscription.plan.maxTransactions ?? 1000,
      };
    }
  } catch (e) { /* fallback */ }

  // Get usage metrics if available
  let usageMetrics: any[] = [];
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    usageMetrics = await db.UsageMetric.findAll({
      where: {
        tenantId,
        periodStart: { [db.Sequelize.Op.gte]: monthStart }
      },
      order: [['periodStart', 'DESC']],
      limit: 20
    });
  } catch (e) { /* optional */ }

  return res.status(200).json({
    success: true,
    data: {
      current: usageCounts,
      limits: planLimits,
      percentages: {
        users: planLimits.maxUsers > 0 ? Math.round((usageCounts.users / planLimits.maxUsers) * 100) : 0,
        branches: planLimits.maxBranches > 0 ? Math.round((usageCounts.branches / planLimits.maxBranches) * 100) : 0,
        products: planLimits.maxProducts > 0 ? Math.round((usageCounts.products / planLimits.maxProducts) * 100) : 0,
        transactions: planLimits.maxTransactions > 0 ? Math.round((usageCounts.transactions / planLimits.maxTransactions) * 100) : 0,
      },
      metrics: usageMetrics.map((m: any) => ({
        metricName: m.metricName,
        value: parseFloat(m.metricValue || '0'),
        periodStart: m.periodStart,
        periodEnd: m.periodEnd,
      })),
    }
  });
}

// ─── Invoice History ────────────────────────────────────────────────────────
async function handleInvoices(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const db = getDb();

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  let invoices: any[] = [];
  let total = 0;

  try {
    const result = await db.Invoice.findAndCountAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    invoices = result.rows;
    total = result.count;
  } catch (e) { /* optional */ }

  return res.status(200).json({
    success: true,
    data: invoices.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      subtotal: parseFloat(inv.subtotal || '0'),
      taxAmount: parseFloat(inv.taxAmount || '0'),
      discountAmount: parseFloat(inv.discountAmount || '0'),
      totalAmount: parseFloat(inv.totalAmount || '0'),
      currency: inv.currency || 'IDR',
      issuedDate: inv.issuedDate,
      dueDate: inv.dueDate,
      paidDate: inv.paidDate,
      customerName: inv.customerName,
    })),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
  });
}

// ─── Enabled Modules ────────────────────────────────────────────────────────
async function handleModules(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const db = getDb();

  let modules: any[] = [];
  try {
    modules = await db.TenantModule.findAll({
      where: { tenantId, isEnabled: true },
      include: [{ model: db.Module, as: 'module' }]
    });
  } catch (e) { /* optional */ }

  const basicModules = modules.filter((m: any) => m.module?.pricingTier === 'basic' || !m.module?.pricingTier);
  const addOnModules = modules.filter((m: any) => m.module?.pricingTier === 'addon' || m.module?.pricingTier === 'pro');

  return res.status(200).json({
    success: true,
    data: {
      total: modules.length,
      basic: basicModules.map((m: any) => ({
        id: m.module?.id,
        name: m.module?.name,
        code: m.module?.code,
        category: m.module?.category,
        enabledAt: m.enabledAt,
      })),
      addOn: addOnModules.map((m: any) => ({
        id: m.module?.id,
        name: m.module?.name,
        code: m.module?.code,
        category: m.module?.category,
        pricingTier: m.module?.pricingTier,
        enabledAt: m.enabledAt,
      })),
    }
  });
}

// ─── Helper: Get Service Usage Counts from Real Tables ──────────────────────
async function getServiceUsageCounts(sequelize: any, tenantId: string) {
  const counts = { users: 0, branches: 0, products: 0, transactions: 0, employees: 0, warehouses: 0 };

  // Users count
  try {
    const [r]: any = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM users WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT }
    );
    counts.users = parseInt(r?.cnt || '0');
  } catch (e) { /* table may not exist */ }

  // Branches count
  try {
    const [r]: any = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM branches WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT }
    );
    counts.branches = parseInt(r?.cnt || '0');
  } catch (e) {}

  // Products count
  try {
    const [r]: any = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM products WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT }
    );
    counts.products = parseInt(r?.cnt || '0');
  } catch (e) {}

  // Transactions this month
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [r]: any = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM pos_transactions WHERE tenant_id = :tenantId AND created_at >= :monthStart`,
      { replacements: { tenantId, monthStart }, type: sequelize.QueryTypes.SELECT }
    );
    counts.transactions = parseInt(r?.cnt || '0');
  } catch (e) {}

  // Employees count
  try {
    const [r]: any = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM employees WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT }
    );
    counts.employees = parseInt(r?.cnt || '0');
  } catch (e) {}

  // Warehouses count
  try {
    const [r]: any = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM warehouses WHERE tenant_id = :tenantId`,
      { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT }
    );
    counts.warehouses = parseInt(r?.cnt || '0');
  } catch (e) {}

  return counts;
}

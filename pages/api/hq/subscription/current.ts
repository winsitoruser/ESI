import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../models');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Tenant not found in session' });
  }

  const db = getDb();

  let subscription: any = null;
  try {
    subscription = await db.Subscription.findOne({
      where: { tenantId },
      include: [{ model: db.Plan, as: 'plan' }]
    });
  } catch (_) {}

  let tenant: any = null;
  try {
    tenant = await db.Tenant.findByPk(tenantId, {
      attributes: ['id', 'businessName', 'businessCode', 'status', 'subscriptionPlan', 'subscriptionStart', 'subscriptionEnd']
    });
  } catch (_) {}

  let outstandingInvoices: any[] = [];
  try {
    outstandingInvoices = await db.Invoice.findAll({
      where: { tenantId, status: ['sent', 'overdue'] },
      order: [['createdAt', 'DESC']]
    });
  } catch (_) {}

  return res.status(200).json({
    success: true,
    data: {
      tenant,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        startedAt: subscription.startedAt,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        plan: subscription.plan ? {
          id: subscription.plan.id,
          name: subscription.plan.name,
          price: parseFloat(subscription.plan.price || 0),
          currency: subscription.plan.currency,
          billingInterval: subscription.plan.billingInterval,
          features: subscription.plan.features
        } : null
      } : null,
      outstandingInvoices: outstandingInvoices.map((i: any) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        totalAmount: parseFloat(i.totalAmount || 0),
        currency: i.currency,
        status: i.status,
        dueDate: i.dueDate,
        paymentProvider: i.paymentProvider
      }))
    }
  });
}

export default withHQAuth(handler);

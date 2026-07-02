import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { SubscriptionPackage, Subscription, BillingInvoice, PaymentTransaction, UsageRecord } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Packages (public)
router.get('/packages', async (_req: AuthRequest, res: Response) => {
  try {
    const packages = await SubscriptionPackage.findAll({ where: { is_active: true }, order: [['sort_order', 'ASC']] });
    sendSuccess(res, packages);
  } catch (error) { sendError(res, 'Failed to get packages', 500); }
});

// Subscriptions
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sub = await Subscription.findOne({
      where: { tenant_id: req.tenantId },
      include: [{ model: SubscriptionPackage }],
      order: [['created_at', 'DESC']],
    });
    sendSuccess(res, sub);
  } catch (error) { sendError(res, 'Failed to get subscription', 500); }
});
router.post('/subscribe', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const sub = await Subscription.create({ ...req.body, tenant_id: req.tenantId });
    sendSuccess(res, sub, 'Subscribed', 201);
  } catch (error) { sendError(res, 'Failed to subscribe', 500); }
});
router.put('/subscription/cancel', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const sub = await Subscription.findOne({ where: { tenant_id: req.tenantId, status: 'active' } });
    if (!sub) { sendError(res, 'No active subscription', 404); return; }
    await sub.update({ status: 'cancelled', cancelled_at: new Date(), cancel_reason: req.body.reason });
    sendSuccess(res, sub, 'Subscription cancelled');
  } catch (error) { sendError(res, 'Failed to cancel', 500); }
});

// Billing Invoices
const invCtrl = new CrudController(BillingInvoice, 'BillingInvoice', ['invoice_no']);
router.get('/invoices', authenticate, invCtrl.list);
router.get('/invoices/:id', authenticate, invCtrl.getById);

// Payments
const payCtrl = new CrudController(PaymentTransaction, 'PaymentTransaction', []);
router.get('/payments', authenticate, payCtrl.list);
router.get('/payments/:id', authenticate, payCtrl.getById);

// Payment webhook (for Midtrans/Stripe callbacks)
router.post('/webhook/payment', async (req: AuthRequest, res: Response) => {
  try {
    const { transaction_id, status, payment_method } = req.body;
    const tx = await PaymentTransaction.findOne({ where: { gateway_transaction_id: transaction_id } });
    if (!tx) { sendError(res, 'Transaction not found', 404); return; }

    const statusMap: Record<string, string> = { settlement: 'success', capture: 'success', pending: 'pending', deny: 'failed', expire: 'expired', cancel: 'failed' };
    const mappedStatus = statusMap[status] || status;

    await tx.update({ status: mappedStatus, payment_method, paid_at: mappedStatus === 'success' ? new Date() : null });

    if (mappedStatus === 'success' && (tx as any).billing_invoice_id) {
      await BillingInvoice.update({ status: 'paid', paid_at: new Date() }, { where: { id: (tx as any).billing_invoice_id } });
    }

    sendSuccess(res, null, 'Webhook processed');
  } catch (error) { sendError(res, 'Webhook processing failed', 500); }
});

// Usage
router.get('/usage', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const records = await UsageRecord.findAll({
      where: { tenant_id: req.tenantId },
      order: [['period_start', 'DESC']], limit: 30,
    });
    sendSuccess(res, records);
  } catch (error) { sendError(res, 'Failed to get usage', 500); }
});

export default router;

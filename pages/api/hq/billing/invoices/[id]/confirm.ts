import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../../../models');

/**
 * POST /api/hq/billing/invoices/[id]/confirm
 *
 * Manual payment confirmation by a finance/admin user.
 * Used for `paymentProvider = 'manual'` (bank transfer) or when an admin needs
 * to force-close an invoice after receiving an out-of-band confirmation.
 *
 * Body:
 *   {
 *     paymentMethod?: 'bank_transfer' | 'cash' | 'other',
 *     referenceNumber?: string,
 *     paidAt?: string (ISO),
 *     notes?: string,
 *     proofUrl?: string
 *   }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;
  const userId = session?.user?.id;
  if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant not found' });

  const { id } = req.query;
  const {
    paymentMethod = 'bank_transfer',
    referenceNumber,
    paidAt,
    notes,
    proofUrl
  } = req.body || {};

  const db = getDb();
  const sequelize = db.sequelize;

  const invoice = await db.Invoice.findOne({ where: { id, tenantId } });
  if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
  if (invoice.status === 'paid') {
    return res.status(400).json({ success: false, error: 'Invoice sudah lunas' });
  }
  if (invoice.status === 'cancelled') {
    return res.status(400).json({ success: false, error: 'Invoice sudah dibatalkan' });
  }

  const tx = await sequelize.transaction();
  try {
    const paidDate = paidAt ? new Date(paidAt) : new Date();

    invoice.status = 'paid';
    invoice.paidDate = paidDate;
    invoice.paymentProvider = invoice.paymentProvider || 'manual';
    invoice.paymentMethod = paymentMethod;
    invoice.metadata = {
      ...(invoice.metadata || {}),
      manualConfirmation: {
        confirmedBy: userId || null,
        confirmedAt: new Date().toISOString(),
        referenceNumber: referenceNumber || null,
        proofUrl: proofUrl || null,
        notes: notes || null
      }
    };
    await invoice.save({ transaction: tx });

    await db.PaymentTransaction.create({
      invoiceId: invoice.id,
      amount: invoice.totalAmount,
      currency: invoice.currency,
      status: 'completed',
      provider: 'manual',
      providerTransactionId: referenceNumber || `MANUAL-${Date.now()}`,
      paymentMethod,
      processedAt: paidDate,
      rawPayload: {
        manual: true,
        confirmedBy: userId || null,
        notes: notes || null,
        proofUrl: proofUrl || null
      }
    }, { transaction: tx });

    // Activate from invoice (enables plan/addons if this was a subscription inv)
    try {
      const SubscriptionService = require('../../../../../../lib/services/SubscriptionService').default;
      if (SubscriptionService?.activateFromInvoice) {
        await SubscriptionService.activateFromInvoice(invoice, tx);
      }
    } catch (_) { /* optional, do not fail manual confirmation */ }

    await tx.commit();

    return res.status(200).json({
      success: true,
      data: {
        invoiceId: invoice.id,
        status: invoice.status,
        paidDate: invoice.paidDate
      },
      message: 'Pembayaran manual dikonfirmasi. Langganan aktif.'
    });
  } catch (error: any) {
    try { await tx.rollback(); } catch (_) {}
    console.error('Manual confirm error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export default withHQAuth(handler);

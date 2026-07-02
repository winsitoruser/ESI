import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../../../models');

/**
 * POST /api/hq/billing/invoices/[id]/cancel
 *
 * Cancel an unpaid invoice. Moves the invoice to status `cancelled`,
 * marks any pending payment transaction as failed, and stores the
 * cancellation reason in metadata.
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
  const { reason } = req.body || {};

  const db = getDb();
  const invoice = await db.Invoice.findOne({ where: { id, tenantId } });
  if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
  if (invoice.status === 'paid') {
    return res.status(400).json({ success: false, error: 'Invoice yang sudah lunas tidak bisa dibatalkan' });
  }

  invoice.status = 'cancelled';
  invoice.metadata = {
    ...(invoice.metadata || {}),
    cancellation: {
      cancelledBy: userId || null,
      cancelledAt: new Date().toISOString(),
      reason: reason || null
    }
  };
  await invoice.save();

  try {
    await db.PaymentTransaction.update(
      { status: 'failed', failureReason: reason || 'Invoice cancelled by user' },
      { where: { invoiceId: invoice.id, status: 'pending' } }
    );
  } catch (_) { /* optional */ }

  return res.status(200).json({
    success: true,
    data: { invoiceId: invoice.id, status: invoice.status },
    message: 'Invoice berhasil dibatalkan'
  });
}

export default withHQAuth(handler);

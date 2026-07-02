import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../../../models');

/**
 * GET /api/hq/billing/invoices/[id]/status
 *
 * Lightweight poll endpoint. Returns the current status of the invoice and the
 * latest payment transaction. Used by the success page and detail page to
 * animate status transitions without forcing a full reload.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant not found' });

  const { id } = req.query;
  const db = getDb();

  try {
    const invoice = await db.Invoice.findOne({
      where: { id, tenantId },
      include: [{ model: db.PaymentTransaction, as: 'paymentTransactions' }]
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const transactions = (invoice.paymentTransactions || []).slice().sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const latest = transactions[0];

    const now = Date.now();
    const dueMs = invoice.dueDate ? new Date(invoice.dueDate).getTime() : null;
    const isOverdue = invoice.status !== 'paid' && dueMs !== null && dueMs < now;
    const daysOverdue = isOverdue && dueMs !== null ? Math.ceil((now - dueMs) / (1000 * 60 * 60 * 24)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmount: parseFloat(invoice.totalAmount || '0'),
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
        isOverdue,
        daysOverdue,
        latestTransaction: latest ? {
          id: latest.id,
          provider: latest.provider,
          status: latest.status,
          paymentMethod: latest.paymentMethod,
          providerTransactionId: latest.providerTransactionId,
          processedAt: latest.processedAt,
          createdAt: latest.createdAt
        } : null,
        transactions: transactions.map((t: any) => ({
          id: t.id,
          provider: t.provider,
          status: t.status,
          paymentMethod: t.paymentMethod,
          providerTransactionId: t.providerTransactionId,
          amount: parseFloat(t.amount || '0'),
          processedAt: t.processedAt,
          createdAt: t.createdAt
        }))
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export default withHQAuth(handler);

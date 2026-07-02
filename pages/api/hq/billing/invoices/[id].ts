import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../../models');

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
      include: [
        { model: db.InvoiceItem, as: 'items' },
        { model: db.PaymentTransaction, as: 'paymentTransactions' }
      ]
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    return res.status(200).json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        subtotal: parseFloat(invoice.subtotal || 0),
        taxAmount: parseFloat(invoice.taxAmount || 0),
        discountAmount: parseFloat(invoice.discountAmount || 0),
        totalAmount: parseFloat(invoice.totalAmount || 0),
        currency: invoice.currency,
        issuedDate: invoice.issuedDate,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
        paymentProvider: invoice.paymentProvider,
        paymentMethod: invoice.paymentMethod,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        notes: invoice.notes,
        metadata: invoice.metadata,
        items: (invoice.items || []).map((it: any) => ({
          id: it.id,
          description: it.description,
          type: it.type,
          quantity: parseFloat(it.quantity || 0),
          unitPrice: parseFloat(it.unitPrice || 0),
          amount: parseFloat(it.amount || 0)
        })),
        paymentTransactions: (invoice.paymentTransactions || []).map((pt: any) => ({
          id: pt.id,
          provider: pt.provider,
          providerTransactionId: pt.providerTransactionId,
          status: pt.status,
          amount: parseFloat(pt.amount || 0),
          paymentMethod: pt.paymentMethod,
          processedAt: pt.processedAt
        }))
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export default withHQAuth(handler);

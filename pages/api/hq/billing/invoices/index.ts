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

  const db = getDb();
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, parseInt((req.query.limit as string) || '20', 10));
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const where: any = { tenantId };
  if (status) where.status = status;

  let rows: any[] = [];
  let count = 0;
  try {
    const r = await db.Invoice.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{ model: db.InvoiceItem, as: 'items' }]
    });
    rows = r.rows;
    count = r.count;
  } catch (e) {}

  return res.status(200).json({
    success: true,
    data: rows.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      totalAmount: parseFloat(inv.totalAmount || 0),
      subtotal: parseFloat(inv.subtotal || 0),
      taxAmount: parseFloat(inv.taxAmount || 0),
      discountAmount: parseFloat(inv.discountAmount || 0),
      currency: inv.currency,
      issuedDate: inv.issuedDate,
      dueDate: inv.dueDate,
      paidDate: inv.paidDate,
      paymentProvider: inv.paymentProvider,
      items: (inv.items || []).map((it: any) => ({
        id: it.id,
        description: it.description,
        type: it.type,
        quantity: parseFloat(it.quantity || 0),
        unitPrice: parseFloat(it.unitPrice || 0),
        amount: parseFloat(it.amount || 0)
      }))
    })),
    meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
  });
}

export default withHQAuth(handler);

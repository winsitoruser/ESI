import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { HeldTransaction } = db;

    switch (req.method) {
      case 'GET':
        return await getHeldTransactions(req, res, HeldTransaction);
      case 'POST':
        return await createHeldTransaction(req, res, HeldTransaction, session);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Hold Transaction API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getHeldTransactions(req: NextApiRequest, res: NextApiResponse, HeldTransaction: any) {
  const { outletId } = req.query;

  const where: any = { status: 'held' };
  if (outletId) where.outletId = outletId;

  const transactions = await HeldTransaction.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });

  return res.status(200).json({
    success: true,
    data: transactions
  });
}

async function createHeldTransaction(req: NextApiRequest, res: NextApiResponse, HeldTransaction: any, session: any) {
  const { items, customerId, tableId, notes, outletId } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Items are required' });
  }

  const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

  const transaction = await HeldTransaction.create({
    outletId,
    customerId,
    tableId,
    items: JSON.stringify(items),
    total,
    tax: total * 0.11,
    grandTotal: total * 1.11,
    notes,
    status: 'held',
    heldBy: (session.user as any).id,
    heldAt: new Date()
  });

  return res.status(201).json({
    success: true,
    message: 'Transaction held successfully',
    data: transaction
  });
}

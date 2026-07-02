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

    const { id } = req.query;
    const { HeldTransaction } = db;

    const transaction = await HeldTransaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Held transaction not found' });
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({ success: true, data: transaction });
      
      case 'PUT':
        const { items, notes } = req.body;
        const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        
        await transaction.update({
          items: JSON.stringify(items),
          total,
          tax: total * 0.11,
          grandTotal: total * 1.11,
          notes,
          updatedAt: new Date()
        });
        
        return res.status(200).json({ success: true, data: transaction });
      
      case 'DELETE':
        await transaction.update({ status: 'cancelled' });
        return res.status(200).json({ success: true, message: 'Transaction cancelled' });
      
      case 'POST':
        // Resume held transaction
        const resumedData = {
          items: JSON.parse(transaction.items),
          customerId: transaction.customerId,
          tableId: transaction.tableId,
          total: transaction.total,
          tax: transaction.tax,
          grandTotal: transaction.grandTotal
        };
        
        await transaction.update({ status: 'resumed', resumedAt: new Date() });
        
        return res.status(200).json({
          success: true,
          message: 'Transaction resumed',
          data: resumedData
        });
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Hold Transaction API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

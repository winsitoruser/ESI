import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const PurchaseOrder = require('@/models/PurchaseOrder');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { id } = req.query;
      const { approvedBy } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Purchase Order ID is required' });
      }

      const purchaseOrder = await PurchaseOrder.findByPk(id);

      if (!purchaseOrder) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      if (purchaseOrder.status !== 'pending' && purchaseOrder.status !== 'draft') {
        return res.status(400).json({ error: `Cannot approve purchase order with status: ${purchaseOrder.status}` });
      }

      await purchaseOrder.update({
        status: 'approved',
        approvedBy,
        approvedAt: new Date()
      });

      return res.status(200).json({
        message: 'Purchase order approved successfully',
        purchaseOrder
      });
    } catch (error: any) {
      console.error('Error approving purchase order:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

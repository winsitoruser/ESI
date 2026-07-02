import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { Supplier, PurchaseOrder } = db;

    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    switch (req.method) {
      case 'GET':
        const purchaseOrders = await PurchaseOrder.findAll({
          where: { supplierId: id },
          order: [['createdAt', 'DESC']],
          limit: 10
        });

        return res.status(200).json({
          success: true,
          data: {
            ...supplier.toJSON(),
            recentOrders: purchaseOrders
          }
        });

      case 'PUT':
        const updateData = req.body;
        delete updateData.id;
        delete updateData.createdAt;

        await supplier.update({
          ...updateData,
          updatedBy: (session.user as any).id
        });

        return res.status(200).json({
          success: true,
          message: 'Supplier updated',
          data: supplier
        });

      case 'DELETE':
        await supplier.update({ isActive: false });
        return res.status(200).json({
          success: true,
          message: 'Supplier deactivated'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Supplier API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

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
    const { Warehouse, Stock, Product } = db;

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    switch (req.method) {
      case 'GET':
        const stocks = await Stock.findAll({
          where: { warehouseId: id },
          include: [{ model: Product, as: 'product' }],
          order: [['quantity', 'DESC']],
          limit: 100
        });

        return res.status(200).json({
          success: true,
          data: {
            ...warehouse.toJSON(),
            stocks
          }
        });

      case 'PUT':
        const updateData = req.body;
        delete updateData.id;

        if (updateData.isDefault) {
          await Warehouse.update({ isDefault: false }, { where: { isDefault: true } });
        }

        await warehouse.update(updateData);

        return res.status(200).json({
          success: true,
          message: 'Warehouse updated',
          data: warehouse
        });

      case 'DELETE':
        const stockCount = await Stock.count({ where: { warehouseId: id } });
        if (stockCount > 0) {
          return res.status(400).json({ error: 'Cannot delete warehouse with existing stock' });
        }

        await warehouse.update({ isActive: false });
        return res.status(200).json({
          success: true,
          message: 'Warehouse deactivated'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Warehouse API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

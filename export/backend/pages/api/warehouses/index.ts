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

    const { Warehouse, Stock } = db;

    switch (req.method) {
      case 'GET':
        const { isActive } = req.query;
        const where: any = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const warehouses = await Warehouse.findAll({
          where,
          order: [['name', 'ASC']]
        });

        // Get stock counts for each warehouse
        const warehousesWithStats = await Promise.all(
          warehouses.map(async (wh: any) => {
            const stockCount = await Stock.count({ where: { warehouseId: wh.id } });
            const totalValue = await Stock.sum('quantity', { where: { warehouseId: wh.id } }) || 0;
            return {
              ...wh.toJSON(),
              stats: { stockCount, totalValue }
            };
          })
        );

        return res.status(200).json({
          success: true,
          data: warehousesWithStats
        });

      case 'POST':
        const { name, code, address, city, phone, isDefault, notes } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Warehouse name is required' });
        }

        // If setting as default, unset other defaults
        if (isDefault) {
          await Warehouse.update({ isDefault: false }, { where: { isDefault: true } });
        }

        const warehouse = await Warehouse.create({
          name,
          code: code || `WH-${Date.now()}`,
          address,
          city,
          phone,
          isDefault: isDefault || false,
          isActive: true,
          notes,
          createdBy: (session.user as any).id
        });

        return res.status(201).json({
          success: true,
          message: 'Warehouse created',
          data: warehouse
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Warehouses API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ProductionWaste, Product } = db;

    switch (req.method) {
      case 'GET':
        const { startDate, endDate, reason, page = 1, limit = 20 } = req.query;
        const where: any = {};

        if (reason) where.reason = reason;
        if (startDate || endDate) {
          where.wasteDate = {};
          if (startDate) where.wasteDate[Op.gte] = new Date(startDate as string);
          if (endDate) where.wasteDate[Op.lte] = new Date(endDate as string);
        }

        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        const { count, rows } = await ProductionWaste.findAndCountAll({
          where,
          include: [{ model: Product, as: 'product' }],
          limit: parseInt(limit as string),
          offset,
          order: [['wasteDate', 'DESC']]
        });

        const totalWasteValue = await ProductionWaste.sum('totalCost', { where });

        return res.status(200).json({
          success: true,
          data: rows,
          summary: { totalWasteValue: totalWasteValue || 0, count },
          pagination: {
            total: count,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(count / parseInt(limit as string))
          }
        });

      case 'POST':
        const { productId, quantity, unit, reason: wasteReason, unitCost, notes, wasteDate } = req.body;

        if (!productId || !quantity || !wasteReason) {
          return res.status(400).json({ error: 'Product, quantity, and reason are required' });
        }

        const waste = await ProductionWaste.create({
          productId,
          quantity,
          unit: unit || 'pcs',
          reason: wasteReason,
          unitCost: unitCost || 0,
          totalCost: quantity * (unitCost || 0),
          notes,
          wasteDate: wasteDate || new Date(),
          reportedBy: (session.user as any).id
        });

        return res.status(201).json({
          success: true,
          message: 'Waste recorded',
          data: waste
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Waste API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

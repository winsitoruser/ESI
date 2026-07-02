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

    const { StockAdjustment, StockAdjustmentItem, Stock, Product } = db;

    switch (req.method) {
      case 'GET':
        const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
        const where: any = {};
        
        if (status) where.status = status;
        if (startDate || endDate) {
          where.createdAt = {};
          if (startDate) where.createdAt[db.Sequelize.Op.gte] = new Date(startDate as string);
          if (endDate) where.createdAt[db.Sequelize.Op.lte] = new Date(endDate as string);
        }

        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        const { count, rows } = await StockAdjustment.findAndCountAll({
          where,
          include: [{ model: StockAdjustmentItem, as: 'items' }],
          limit: parseInt(limit as string),
          offset,
          order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
          success: true,
          data: rows,
          pagination: {
            total: count,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(count / parseInt(limit as string))
          }
        });

      case 'POST':
        const { items, reason, notes, warehouseId } = req.body;

        if (!items || items.length === 0) {
          return res.status(400).json({ error: 'Items are required' });
        }

        // Create adjustment record
        const adjustment = await StockAdjustment.create({
          warehouseId,
          reason,
          notes,
          status: 'pending',
          createdBy: (session.user as any).id,
          totalItems: items.length
        });

        // Create adjustment items and update stock
        for (const item of items) {
          await StockAdjustmentItem.create({
            adjustmentId: adjustment.id,
            productId: item.productId,
            previousQty: item.previousQty,
            adjustedQty: item.adjustedQty,
            difference: item.adjustedQty - item.previousQty,
            reason: item.reason || reason
          });

          // Update stock
          await Stock.update(
            { quantity: item.adjustedQty },
            { where: { productId: item.productId, warehouseId } }
          );
        }

        await adjustment.update({ status: 'completed', completedAt: new Date() });

        return res.status(201).json({
          success: true,
          message: 'Stock adjustment created',
          data: adjustment
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Stock Adjustment API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

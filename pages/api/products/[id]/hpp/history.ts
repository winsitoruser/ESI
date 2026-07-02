import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
const db = require('../../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { ProductCostHistory, Product } = db;
    const { id } = req.query;
    const { limit, startDate, endDate } = req.query;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const where: any = { productId: id };

    if (startDate || endDate) {
      where.changedAt = {};
      if (startDate) where.changedAt[db.Sequelize.Op.gte] = new Date(startDate as string);
      if (endDate) where.changedAt[db.Sequelize.Op.lte] = new Date(endDate as string);
    }

    const history = await ProductCostHistory.findAll({
      where,
      order: [['changedAt', 'DESC']],
      limit: limit ? parseInt(limit as string) : 50
    });

    const summary = {
      totalChanges: history.length,
      totalIncrease: history.filter((h: any) => parseFloat(h.changeAmount || 0) > 0).length,
      totalDecrease: history.filter((h: any) => parseFloat(h.changeAmount || 0) < 0).length,
      averageChange: history.length > 0 
        ? history.reduce((sum: number, h: any) => sum + parseFloat(h.changeAmount || 0), 0) / history.length 
        : 0,
      currentHpp: parseFloat(product.hpp || 0),
      oldestHpp: history.length > 0 ? parseFloat(history[history.length - 1].oldHpp || 0) : parseFloat(product.hpp || 0)
    };

    return res.status(200).json({
      success: true,
      data: history.map((h: any) => ({
        id: h.id,
        date: h.changedAt,
        oldHpp: parseFloat(h.oldHpp || 0),
        newHpp: parseFloat(h.newHpp || 0),
        changeAmount: parseFloat(h.changeAmount || 0),
        changePercentage: parseFloat(h.changePercentage || 0),
        breakdown: {
          purchasePrice: parseFloat(h.purchasePrice || 0),
          packagingCost: parseFloat(h.packagingCost || 0),
          laborCost: parseFloat(h.laborCost || 0),
          overheadCost: parseFloat(h.overheadCost || 0)
        },
        reason: h.changeReason,
        sourceReference: h.sourceReference,
        notes: h.notes,
        changedBy: h.changedBy
      })),
      summary
    });
  } catch (error: any) {
    console.error('HPP history API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

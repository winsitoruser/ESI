import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { Product } = db;
    const { categoryId, minMargin, maxMargin, sortBy } = req.query;

    const where: any = {};
    
    if (categoryId) where.categoryId = categoryId;
    
    if (minMargin || maxMargin) {
      where.marginPercentage = {};
      if (minMargin) where.marginPercentage[db.Sequelize.Op.gte] = parseFloat(minMargin as string);
      if (maxMargin) where.marginPercentage[db.Sequelize.Op.lte] = parseFloat(maxMargin as string);
    }

    let order: any[] = [['name', 'ASC']];
    if (sortBy === 'margin') {
      order = [['marginPercentage', 'DESC']];
    } else if (sortBy === 'hpp') {
      order = [['hpp', 'DESC']];
    }

    const products = await Product.findAll({
      where,
      order
    });

    // Calculate summary statistics
    let totalProducts = products.length;
    let totalMargin = 0;
    let lowMarginCount = 0;
    let negativeMarginCount = 0;

    const analysisData = products.map((product: any) => {
      const hpp = parseFloat(product.hpp || 0);
      const sellingPrice = parseFloat(product.price || 0);
      const marginAmount = sellingPrice - hpp;
      const marginPercentage = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;
      const minMargin = parseFloat(product.minMarginPercentage || 20);

      totalMargin += marginPercentage;

      let status = 'healthy';
      if (marginPercentage < 0) {
        status = 'critical';
        negativeMarginCount++;
      } else if (marginPercentage < minMargin) {
        status = 'warning';
        lowMarginCount++;
      }

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        hpp,
        sellingPrice,
        marginAmount,
        marginPercentage: parseFloat(marginPercentage.toFixed(2)),
        minMarginPercentage: minMargin,
        status
      };
    });

    const averageMargin = totalProducts > 0 ? totalMargin / totalProducts : 0;

    return res.status(200).json({
      success: true,
      data: analysisData,
      summary: {
        totalProducts,
        averageMargin: parseFloat(averageMargin.toFixed(2)),
        lowMarginCount,
        negativeMarginCount,
        healthyCount: totalProducts - lowMarginCount - negativeMarginCount
      }
    });
  } catch (error: any) {
    console.error('HPP Analysis API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

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

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { Product, ProductCostHistory } = db;
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updates array is required and must not be empty'
      });
    }

    const results: {
      success: any[];
      failed: any[];
      totalProcessed: number;
    } = {
      success: [],
      failed: [],
      totalProcessed: 0
    };

    for (const update of updates) {
      const { productId, hpp, reason, notes } = update;

      try {
        const product = await Product.findByPk(productId);

        if (!product) {
          results.failed.push({
            productId,
            error: 'Product not found'
          });
          continue;
        }

        const oldHpp = parseFloat(product.hpp || 0);
        const newHpp = parseFloat(hpp);
        const changeAmount = newHpp - oldHpp;
        const changePercentage = oldHpp > 0 ? (changeAmount / oldHpp) * 100 : 0;

        // Update product HPP
        await product.update({ hpp: newHpp });

        // Recalculate margins
        const sellingPrice = parseFloat(product.price || 0);
        const marginAmount = sellingPrice - newHpp;
        const marginPercentage = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;
        const markupPercentage = newHpp > 0 ? (marginAmount / newHpp) * 100 : 0;

        await product.update({
          marginAmount,
          marginPercentage: parseFloat(marginPercentage.toFixed(2)),
          markupPercentage: parseFloat(markupPercentage.toFixed(2))
        });

        // Create history record
        if (changeAmount !== 0) {
          await ProductCostHistory.create({
            productId,
            oldHpp,
            newHpp,
            changeAmount,
            changePercentage: parseFloat(changePercentage.toFixed(2)),
            purchasePrice: product.lastPurchasePrice,
            packagingCost: product.packagingCost,
            laborCost: product.laborCost,
            overheadCost: product.overheadCost,
            changeReason: reason || 'bulk_update',
            notes,
            changedBy: session.user?.id
          });
        }

        results.success.push({
          productId,
          productName: product.name,
          oldHpp,
          newHpp,
          changeAmount,
          changePercentage: parseFloat(changePercentage.toFixed(2))
        });

        results.totalProcessed++;
      } catch (error: any) {
        results.failed.push({
          productId,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: results,
      message: `Bulk update completed: ${results.success.length} succeeded, ${results.failed.length} failed`
    });
  } catch (error: any) {
    console.error('Bulk update HPP API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

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

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { Product, ProductCostComponent, ProductCostHistory } = db;
    const { id } = req.query;
    const { method, includePurchaseOrders, includeRecipe } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    let calculatedHpp = 0;
    const breakdown: any = {
      purchasePrice: 0,
      packagingCost: parseFloat(product.packagingCost || 0),
      laborCost: parseFloat(product.laborCost || 0),
      overheadCost: parseFloat(product.overheadCost || 0)
    };

    const calculationMethod = method || product.hppMethod || 'average';

    // Calculate based on method
    switch (calculationMethod) {
      case 'average':
        breakdown.purchasePrice = parseFloat(product.averagePurchasePrice || product.lastPurchasePrice || 0);
        break;
      case 'fifo':
      case 'lifo':
        breakdown.purchasePrice = parseFloat(product.lastPurchasePrice || 0);
        break;
      case 'standard':
        breakdown.purchasePrice = parseFloat(product.standardCost || 0);
        break;
      default:
        breakdown.purchasePrice = parseFloat(product.averagePurchasePrice || 0);
    }

    // Add cost components
    const components = await ProductCostComponent.findAll({
      where: { productId: id, isActive: true }
    });

    let componentsCost = 0;
    components.forEach((component: any) => {
      const totalCost = component.getTotalCost();
      componentsCost += totalCost;
      
      // Add to appropriate breakdown category
      switch (component.componentType) {
        case 'material':
          breakdown.purchasePrice += totalCost;
          break;
        case 'packaging':
          breakdown.packagingCost += totalCost;
          break;
        case 'labor':
          breakdown.laborCost += totalCost;
          break;
        case 'overhead':
          breakdown.overheadCost += totalCost;
          break;
      }
    });

    // Calculate total HPP
    calculatedHpp = breakdown.purchasePrice + breakdown.packagingCost + breakdown.laborCost + breakdown.overheadCost;

    const oldHpp = parseFloat(product.hpp || 0);
    const changeAmount = calculatedHpp - oldHpp;
    const changePercentage = oldHpp > 0 ? (changeAmount / oldHpp) * 100 : 0;

    // Update product
    await product.update({
      hpp: calculatedHpp,
      hppMethod: calculationMethod,
      lastPurchasePrice: breakdown.purchasePrice,
      averagePurchasePrice: calculationMethod === 'average' ? breakdown.purchasePrice : product.averagePurchasePrice
    });

    // Recalculate margins
    const sellingPrice = parseFloat(product.price || 0);
    const marginAmount = sellingPrice - calculatedHpp;
    const marginPercentage = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;
    const markupPercentage = calculatedHpp > 0 ? (marginAmount / calculatedHpp) * 100 : 0;

    await product.update({
      marginAmount,
      marginPercentage: parseFloat(marginPercentage.toFixed(2)),
      markupPercentage: parseFloat(markupPercentage.toFixed(2))
    });

    // Create history record
    if (changeAmount !== 0) {
      await ProductCostHistory.create({
        productId: id,
        oldHpp,
        newHpp: calculatedHpp,
        changeAmount,
        changePercentage: parseFloat(changePercentage.toFixed(2)),
        purchasePrice: breakdown.purchasePrice,
        packagingCost: breakdown.packagingCost,
        laborCost: breakdown.laborCost,
        overheadCost: breakdown.overheadCost,
        changeReason: 'auto_calculate',
        sourceReference: `method:${calculationMethod}`,
        notes: `Auto-calculated using ${calculationMethod} method`,
        changedBy: session.user?.id
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        calculatedHpp,
        method: calculationMethod,
        breakdown,
        oldHpp,
        changeAmount,
        changePercentage: parseFloat(changePercentage.toFixed(2)),
        marginPercentage: parseFloat(marginPercentage.toFixed(2))
      },
      message: 'HPP calculated and updated successfully'
    });
  } catch (error: any) {
    console.error('Calculate HPP API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

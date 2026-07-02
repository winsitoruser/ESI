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

    const { Product, ProductCostHistory, ProductCostComponent } = db;
    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return await getHppDetails(req, res, Product, ProductCostHistory, ProductCostComponent, id as string);
      case 'PUT':
        return await updateHpp(req, res, Product, ProductCostHistory, id as string, session);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('HPP API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getHppDetails(
  req: NextApiRequest,
  res: NextApiResponse,
  Product: any,
  ProductCostHistory: any,
  ProductCostComponent: any,
  id: string
) {
  const product = await Product.findByPk(id);

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  // Get cost components
  const components = await ProductCostComponent.findAll({
    where: { productId: id, isActive: true }
  });

  // Get cost history
  const history = await ProductCostHistory.findAll({
    where: { productId: id },
    order: [['changedAt', 'DESC']],
    limit: 10
  });

  // Calculate cost breakdown
  const costBreakdown = {
    purchasePrice: parseFloat(product.lastPurchasePrice || 0),
    packagingCost: parseFloat(product.packagingCost || 0),
    laborCost: parseFloat(product.laborCost || 0),
    overheadCost: parseFloat(product.overheadCost || 0),
    total: parseFloat(product.hpp || 0)
  };

  // Calculate pricing info
  const sellingPrice = parseFloat(product.price || 0);
  const hpp = parseFloat(product.hpp || 0);
  const marginAmount = sellingPrice - hpp;
  const marginPercentage = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;
  const markupPercentage = hpp > 0 ? (marginAmount / hpp) * 100 : 0;

  const pricing = {
    sellingPrice,
    marginAmount,
    marginPercentage: parseFloat(marginPercentage.toFixed(2)),
    markupPercentage: parseFloat(markupPercentage.toFixed(2)),
    minMarginPercentage: parseFloat(product.minMarginPercentage || 20)
  };

  return res.status(200).json({
    success: true,
    data: {
      productId: product.id,
      productName: product.name,
      currentHpp: parseFloat(product.hpp || 0),
      hppMethod: product.hppMethod || 'average',
      costBreakdown,
      pricing,
      components: components.map((c: any) => ({
        id: c.id,
        type: c.componentType,
        name: c.componentName,
        description: c.componentDescription,
        cost: parseFloat(c.costAmount),
        quantity: parseFloat(c.quantity),
        unit: c.unit,
        totalCost: c.getTotalCost()
      })),
      history: history.map((h: any) => ({
        date: h.changedAt,
        oldHpp: parseFloat(h.oldHpp || 0),
        newHpp: parseFloat(h.newHpp || 0),
        changeAmount: parseFloat(h.changeAmount || 0),
        changePercentage: parseFloat(h.changePercentage || 0),
        reason: h.changeReason,
        sourceReference: h.sourceReference,
        notes: h.notes
      }))
    }
  });
}

async function updateHpp(
  req: NextApiRequest,
  res: NextApiResponse,
  Product: any,
  ProductCostHistory: any,
  id: string,
  session: any
) {
  const product = await Product.findByPk(id);

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const {
    hpp,
    hppMethod,
    packagingCost,
    laborCost,
    overheadCost,
    standardCost,
    minMarginPercentage,
    reason,
    notes
  } = req.body;

  const oldHpp = parseFloat(product.hpp || 0);
  const newHpp = hpp !== undefined ? parseFloat(hpp) : oldHpp;

  // Calculate change
  const changeAmount = newHpp - oldHpp;
  const changePercentage = oldHpp > 0 ? (changeAmount / oldHpp) * 100 : 0;

  // Update product
  await product.update({
    hpp: newHpp,
    hppMethod: hppMethod || product.hppMethod,
    packagingCost: packagingCost !== undefined ? packagingCost : product.packagingCost,
    laborCost: laborCost !== undefined ? laborCost : product.laborCost,
    overheadCost: overheadCost !== undefined ? overheadCost : product.overheadCost,
    standardCost: standardCost !== undefined ? standardCost : product.standardCost,
    minMarginPercentage: minMarginPercentage !== undefined ? minMarginPercentage : product.minMarginPercentage
  });

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

  // Create history record if HPP changed
  if (changeAmount !== 0) {
    await ProductCostHistory.create({
      productId: id,
      oldHpp,
      newHpp,
      changeAmount,
      changePercentage: parseFloat(changePercentage.toFixed(2)),
      purchasePrice: product.lastPurchasePrice,
      packagingCost: product.packagingCost,
      laborCost: product.laborCost,
      overheadCost: product.overheadCost,
      changeReason: reason || 'manual',
      notes,
      changedBy: session.user?.id
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      productId: product.id,
      oldHpp,
      newHpp,
      changeAmount,
      changePercentage: parseFloat(changePercentage.toFixed(2)),
      marginPercentage: parseFloat(marginPercentage.toFixed(2))
    },
    message: 'HPP updated successfully'
  });
}

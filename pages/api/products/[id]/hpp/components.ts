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

    const { ProductCostComponent, Product } = db;
    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return await getComponents(req, res, ProductCostComponent, id as string);
      case 'POST':
        return await addComponent(req, res, ProductCostComponent, Product, id as string);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Cost components API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getComponents(req: NextApiRequest, res: NextApiResponse, ProductCostComponent: any, productId: string) {
  const { isActive } = req.query;

  const where: any = { productId };
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const components = await ProductCostComponent.findAll({
    where,
    order: [['componentType', 'ASC'], ['componentName', 'ASC']]
  });

  const summary = {
    total: components.length,
    active: components.filter((c: any) => c.isActive).length,
    totalCost: components.reduce((sum: number, c: any) => sum + c.getTotalCost(), 0),
    byType: {
      material: components.filter((c: any) => c.componentType === 'material').length,
      packaging: components.filter((c: any) => c.componentType === 'packaging').length,
      labor: components.filter((c: any) => c.componentType === 'labor').length,
      overhead: components.filter((c: any) => c.componentType === 'overhead').length,
      other: components.filter((c: any) => c.componentType === 'other').length
    }
  };

  return res.status(200).json({
    success: true,
    data: components.map((c: any) => ({
      id: c.id,
      type: c.componentType,
      name: c.componentName,
      description: c.componentDescription,
      cost: parseFloat(c.costAmount),
      quantity: parseFloat(c.quantity),
      unit: c.unit,
      totalCost: c.getTotalCost(),
      isActive: c.isActive
    })),
    summary
  });
}

async function addComponent(req: NextApiRequest, res: NextApiResponse, ProductCostComponent: any, Product: any, productId: string) {
  const product = await Product.findByPk(productId);

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const {
    componentType,
    componentName,
    componentDescription,
    costAmount,
    quantity,
    unit
  } = req.body;

  if (!componentType || !componentName || !costAmount) {
    return res.status(400).json({
      success: false,
      error: 'Component type, name, and cost amount are required'
    });
  }

  const validTypes = ['material', 'packaging', 'labor', 'overhead', 'other'];
  if (!validTypes.includes(componentType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid component type. Must be one of: ${validTypes.join(', ')}`
    });
  }

  const component = await ProductCostComponent.create({
    productId,
    componentType,
    componentName,
    componentDescription,
    costAmount,
    quantity: quantity || 1,
    unit,
    isActive: true
  });

  return res.status(201).json({
    success: true,
    data: {
      id: component.id,
      type: component.componentType,
      name: component.componentName,
      description: component.componentDescription,
      cost: parseFloat(component.costAmount),
      quantity: parseFloat(component.quantity),
      unit: component.unit,
      totalCost: component.getTotalCost(),
      isActive: component.isActive
    },
    message: 'Cost component added successfully'
  });
}

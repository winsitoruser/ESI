import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import KitchenInventoryService from '../../../../lib/services/KitchenInventoryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session || !session.user?.tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    switch (req.method) {
      case 'GET':
        return await getInventory(req, res, tenantId);
      case 'POST':
        return await createInventoryItem(req, res, tenantId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Kitchen inventory API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function getInventory(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const {
    status,
    category,
    search,
    limit = '50',
    offset = '0'
  } = req.query;

  const result = await KitchenInventoryService.getInventoryItems(tenantId, {
    status: status as string,
    category: category as string,
    search: search as string,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });

  return res.status(200).json({
    success: true,
    data: result.items,
    total: result.total,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });
}

async function createInventoryItem(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const {
    id,
    productId,
    name,
    category,
    currentStock,
    unit,
    minStock,
    maxStock,
    reorderPoint,
    unitCost,
    warehouseId,
    locationId
  } = req.body;

  if (!name || !unit) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'Name and unit are required'
    });
  }

  try {
    const item = await KitchenInventoryService.upsertInventoryItem(tenantId, {
      id,
      productId,
      name,
      category,
      currentStock,
      unit,
      minStock,
    maxStock,
    reorderPoint,
    unitCost,
    warehouseId,
    locationId
  });

    return res.status(201).json({
      success: true,
      data: item,
      message: 'Inventory item saved successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to save inventory item',
      message: error.message
    });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import KitchenInventoryService from '../../../../../../../lib/services/KitchenInventoryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session || !session.user?.tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    switch (req.method) {
      case 'GET':
        return await getTransactions(req, res, tenantId);
      case 'POST':
        return await createTransaction(req, res, tenantId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Kitchen inventory transactions API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

async function getTransactions(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const {
    inventoryItemId,
    transactionType,
    limit = '50',
    offset = '0'
  } = req.query;

  const db = require('../../../../../models');
  const whereClause: any = {
    tenantId
  };

  if (inventoryItemId) {
    whereClause.inventoryItemId = inventoryItemId;
  }

  if (transactionType && transactionType !== 'all') {
    whereClause.transactionType = transactionType;
  }

  const transactions = await db.KitchenInventoryTransaction.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: db.KitchenInventoryItem,
        as: 'inventoryItem',
        attributes: ['id', 'name', 'unit', 'category']
      },
      {
        model: db.User,
        as: 'performedByUser',
        attributes: ['id', 'name'],
        required: false
      }
    ],
    order: [['transactionDate', 'DESC']],
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });

  return res.status(200).json({
    success: true,
    data: transactions.rows,
    total: transactions.count,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });
}

async function createTransaction(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const {
    inventoryItemId,
    transactionType,
    quantity,
    unit,
    referenceType,
    referenceId,
    notes
  } = req.body;

  if (!inventoryItemId || !transactionType || !quantity || !unit) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'inventoryItemId, transactionType, quantity, and unit are required'
    });
  }

  try {
    const transaction = await KitchenInventoryService.createTransaction(tenantId, {
      inventoryItemId,
      transactionType,
      quantity,
      unit,
      referenceType,
      referenceId,
      notes,
      performedBy: req.session?.user?.id
    });

    return res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to create transaction',
      message: error.message
    });
  }
}

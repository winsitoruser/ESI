import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const PosTransaction = require('../../../../models/PosTransaction');
const PosTransactionItem = require('../../../../models/PosTransactionItem');
const Employee = require('../../../../models/Employee');
const Customer = require('../../../../models/Customer');
const Product = require('../../../../models/Product');
const KitchenOrder = require('../../../../models/KitchenOrder');
const KitchenOrderItem = require('../../../../models/KitchenOrderItem');
const Table = require('../../../../models/Table');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getTransactions(req, res);
      case 'POST':
        return await createTransaction(req, res, session);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Transaction API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// GET /api/pos/transactions
async function getTransactions(req: NextApiRequest, res: NextApiResponse) {
  const { 
    shiftId, 
    cashierId, 
    status, 
    startDate, 
    endDate, 
    limit = '50', 
    offset = '0',
    search
  } = req.query;

  const { Op } = require('sequelize');
  const whereClause: any = {};

  if (shiftId) {
    whereClause.shiftId = shiftId;
  }

  if (cashierId) {
    whereClause.cashierId = cashierId;
  }

  if (status) {
    whereClause.status = status;
  }

  if (startDate && endDate) {
    whereClause.transactionDate = {
      [Op.between]: [startDate, endDate]
    };
  } else if (startDate) {
    whereClause.transactionDate = {
      [Op.gte]: startDate
    };
  } else if (endDate) {
    whereClause.transactionDate = {
      [Op.lte]: endDate
    };
  }

  if (search) {
    whereClause[Op.or] = [
      { transactionNumber: { [Op.like]: `%${search}%` } },
      { customerName: { [Op.like]: `%${search}%` } }
    ];
  }

  const transactions = await PosTransaction.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Employee,
        as: 'cashier',
        attributes: ['id', 'name', 'position']
      },
      {
        model: Customer,
        as: 'customer',
        attributes: ['id', 'name', 'phone', 'email'],
        required: false
      },
      {
        model: PosTransactionItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku', 'category']
          }
        ]
      }
    ],
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
    order: [['transactionDate', 'DESC']]
  });

  return res.status(200).json({
    transactions: transactions.rows,
    total: transactions.count,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });
}

// POST /api/pos/transactions
async function createTransaction(req: NextApiRequest, res: NextApiResponse, session: any) {
  const {
    shiftId,
    customerId,
    customerName,
    cashierId,
    items,
    paymentMethod,
    paidAmount,
    discount = 0,
    tax = 0,
    notes,
    tableNumber,
    orderType = 'dine-in',
    sendToKitchen = true
  } = req.body;

  if (!cashierId || !items || items.length === 0 || !paymentMethod || !paidAmount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Start transaction
  const { sequelize } = require('../../../../lib/sequelize');
  const t = await sequelize.transaction();

  try {

  // Generate transaction number
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const count = await PosTransaction.count({
    where: {
      transactionDate: {
        [require('sequelize').Op.gte]: new Date().setHours(0, 0, 0, 0)
      }
    },
    transaction: t
  });
  const transactionNumber = `TRX${today}${String(count + 1).padStart(4, '0')}`;

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);

  const total = subtotal - discount + tax;
  const changeAmount = paidAmount - total;

  if (changeAmount < 0) {
    await t.rollback();
    return res.status(400).json({ error: 'Insufficient payment amount' });
  }

  // Create transaction
  const transaction = await PosTransaction.create({
    transactionNumber,
    shiftId,
    customerId,
    customerName,
    cashierId,
    transactionDate: new Date(),
    subtotal,
    discount,
    tax,
    total,
    paymentMethod,
    paidAmount,
    changeAmount,
    status: 'completed',
    notes,
    tableNumber,
    orderType
  }, { transaction: t });

  // Create transaction items
  const transactionItems = await Promise.all(
    items.map((item: any) => {
      const itemSubtotal = (item.quantity * item.unitPrice) - (item.discount || 0);
      return PosTransactionItem.create({
        transactionId: transaction.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        subtotal: itemSubtotal,
        notes: item.notes
      }, { transaction: t });
    })
  );

  // Send to kitchen if needed
  let kitchenOrder = null;
  if (sendToKitchen && orderType !== 'takeaway') {
    const kitchenOrderNumber = `KIT-${Date.now()}`;
    
    // Create kitchen order
    kitchenOrder = await KitchenOrder.create({
      tenantId: session.user.tenantId,
      orderNumber: kitchenOrderNumber,
      posTransactionId: transaction.id,
      tableNumber,
      orderType,
      customerName,
      status: 'new',
      priority: 'normal',
      totalAmount: total,
      receivedAt: new Date(),
      estimatedTime: calculateEstimatedTime(items)
    }, { transaction: t });

    // Create kitchen order items
    for (const item of items) {
      await KitchenOrderItem.create({
        kitchenOrderId: kitchenOrder.id,
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        notes: item.notes
      }, { transaction: t });
    }

    // Update POS transaction with kitchen order ID
    await transaction.update({ 
      kitchenOrderId: kitchenOrder.id 
    }, { transaction: t });

    // Update table status if dine-in
    if (orderType === 'dine-in' && tableNumber) {
      const table = await Table.findOne({
        where: { tableNumber },
        transaction: t
      });
      
      if (table) {
        await table.update({ status: 'occupied' }, { transaction: t });
      }
    }
  }

  await t.commit();

  // Fetch created transaction with all details
  const createdTransaction = await PosTransaction.findByPk(transaction.id, {
    include: [
      {
        model: Employee,
        as: 'cashier',
        attributes: ['id', 'name', 'position']
      },
      {
        model: PosTransactionItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku', 'category']
          }
        ]
      }
    ]
  });

  return res.status(201).json({
    success: true,
    message: sendToKitchen ? 'Transaction created and sent to kitchen' : 'Transaction created successfully',
    data: createdTransaction,
    kitchenOrder
  });

  } catch (error: any) {
    await t.rollback();
    console.error('Create transaction error:', error);
    return res.status(500).json({ 
      error: 'Failed to create transaction',
      message: error.message 
    });
  }
}

// Helper function to calculate estimated time
function calculateEstimatedTime(items: any[]): number {
  if (!items || items.length === 0) return 15;
  
  // Base time per item type (in minutes)
  const baseTimes: Record<string, number> = {
    'appetizer': 5,
    'main': 15,
    'dessert': 8,
    'beverage': 3,
    'default': 10
  };

  // Calculate total time
  let totalTime = 0;
  items.forEach(item => {
    const category = item.category || 'default';
    const itemTime = baseTimes[category] || baseTimes.default;
    totalTime += itemTime;
  });

  // Parallel preparation - divide by 2 for multiple items
  return Math.ceil(totalTime / 2) || 15;
}

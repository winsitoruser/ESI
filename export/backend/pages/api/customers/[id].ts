import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const Customer = require('../../../models/Customer');
const PosTransaction = require('../../../models/PosTransaction');
const PosTransactionItem = require('../../../models/PosTransactionItem');
const Product = require('../../../models/Product');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  try {
    if (req.method === 'GET') {
      return await getCustomerDetail(id as string, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Customer Detail API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function getCustomerDetail(id: string, res: NextApiResponse) {
  // Get customer with full details
  const customer = await Customer.findByPk(id, {
    attributes: {
      exclude: ['partnerId']
    }
  });

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Get purchase history
  const transactions = await PosTransaction.findAll({
    where: { customerId: id },
    include: [
      {
        model: PosTransactionItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku']
          }
        ]
      }
    ],
    order: [['transactionDate', 'DESC']],
    limit: 20
  });

  // Calculate purchase statistics
  const purchaseStats = {
    totalTransactions: transactions.length,
    totalSpent: customer.totalSpent,
    averageOrderValue: transactions.length > 0 ? customer.totalSpent / transactions.length : 0,
    lastPurchaseDate: transactions.length > 0 ? transactions[0].transactionDate : null
  };

  // Get most purchased products
  const productPurchases = await PosTransactionItem.findAll({
    attributes: [
      'productId',
      'productName',
      [PosTransactionItem.sequelize.fn('SUM', PosTransactionItem.sequelize.col('quantity')), 'totalQuantity'],
      [PosTransactionItem.sequelize.fn('COUNT', PosTransactionItem.sequelize.col('id')), 'purchaseCount']
    ],
    include: [
      {
        model: PosTransaction,
        as: 'transaction',
        where: { customerId: id },
        attributes: []
      }
    ],
    group: ['productId', 'productName'],
    order: [[PosTransactionItem.sequelize.fn('SUM', PosTransactionItem.sequelize.col('quantity')), 'DESC']],
    limit: 10,
    raw: true
  });

  // Get monthly spending trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlySpending = await PosTransaction.findAll({
    attributes: [
      [PosTransaction.sequelize.fn('DATE_FORMAT', PosTransaction.sequelize.col('transactionDate'), '%Y-%m'), 'month'],
      [PosTransaction.sequelize.fn('SUM', PosTransaction.sequelize.col('total')), 'totalSpent'],
      [PosTransaction.sequelize.fn('COUNT', PosTransaction.sequelize.col('id')), 'transactionCount']
    ],
    where: {
      customerId: id,
      transactionDate: {
        [require('sequelize').Op.gte]: sixMonthsAgo
      }
    },
    group: [PosTransaction.sequelize.fn('DATE_FORMAT', PosTransaction.sequelize.col('transactionDate'), '%Y-%m')],
    order: [[PosTransaction.sequelize.fn('DATE_FORMAT', PosTransaction.sequelize.col('transactionDate'), '%Y-%m'), 'ASC']],
    raw: true
  });

  return res.status(200).json({
    success: true,
    data: {
      customer,
      purchaseStats,
      recentTransactions: transactions,
      topProducts: productPurchases,
      monthlySpending
    }
  });
}

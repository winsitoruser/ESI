import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import sequelize from '@/lib/sequelize';
import { Op } from 'sequelize';

const PosTransaction = require('@/models/PosTransaction');
const PosTransactionItem = require('@/models/PosTransactionItem');
const Customer = require('@/models/Customer');
const Employee = require('@/models/Employee');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      page = '1',
      limit = '20',
      search = '',
      status = '',
      paymentMethod = '',
      startDate = '',
      endDate = '',
      customerId = ''
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause: any = {};

    // Search by transaction number or customer name
    if (search) {
      whereClause[Op.or] = [
        { transactionNumber: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Filter by payment method
    if (paymentMethod && paymentMethod !== 'all') {
      whereClause.paymentMethod = paymentMethod;
    }

    // Filter by customer
    if (customerId) {
      whereClause.customerId = customerId;
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.transactionDate = {};
      if (startDate) {
        whereClause.transactionDate[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.transactionDate[Op.lte] = endDateTime;
      }
    }

    // Fetch transactions with associations
    const { rows: transactions, count: totalTransactions } = await PosTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: PosTransactionItem,
          as: 'items',
          attributes: ['id', 'productName', 'quantity', 'unitPrice', 'discount', 'subtotal']
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email', 'membershipLevel'],
          required: false
        },
        {
          model: Employee,
          as: 'cashier',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['transactionDate', 'DESC']],
      limit: limitNum,
      offset: offset,
      distinct: true
    });

    // Calculate statistics
    const stats = await PosTransaction.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalSales'],
        [sequelize.fn('AVG', sequelize.col('total')), 'averageTransaction'],
        [sequelize.fn('SUM', sequelize.col('discount')), 'totalDiscount']
      ],
      raw: true
    });

    // Get total items sold
    const itemsStats = await PosTransactionItem.findOne({
      include: [{
        model: PosTransaction,
        as: 'transaction',
        where: whereClause,
        attributes: []
      }],
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalItemsSold']
      ],
      raw: true
    });

    // Format response
    const formattedTransactions = transactions.map((transaction: any) => ({
      id: transaction.id,
      transactionNumber: transaction.transactionNumber,
      date: transaction.transactionDate,
      customer: {
        id: transaction.customerId,
        name: transaction.customerName || 'Walk-in Customer',
        phone: transaction.customer?.phone || null,
        membershipLevel: transaction.customer?.membershipLevel || null
      },
      cashier: {
        id: transaction.cashierId,
        name: transaction.cashier?.name || 'Unknown'
      },
      items: transaction.items?.length || 0,
      itemsList: transaction.items || [],
      subtotal: parseFloat(transaction.subtotal),
      discount: parseFloat(transaction.discount),
      tax: parseFloat(transaction.tax),
      total: parseFloat(transaction.total),
      paymentMethod: transaction.paymentMethod,
      paidAmount: parseFloat(transaction.paidAmount),
      changeAmount: parseFloat(transaction.changeAmount),
      status: transaction.status,
      notes: transaction.notes,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    }));

    return res.status(200).json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalTransactions,
          totalPages: Math.ceil(totalTransactions / limitNum)
        },
        stats: {
          totalTransactions: parseInt(stats?.totalCount || '0'),
          totalSales: parseFloat(stats?.totalSales || '0'),
          averageTransaction: parseFloat(stats?.averageTransaction || '0'),
          totalDiscount: parseFloat(stats?.totalDiscount || '0'),
          totalItemsSold: parseFloat(itemsStats?.totalItemsSold || '0')
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      details: error.message
    });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import sequelize from '@/lib/sequelize';
import { Op } from 'sequelize';

const PosTransaction = require('@/models/PosTransaction');
const PosTransactionItem = require('@/models/PosTransactionItem');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { period = 'today', startDate = '', endDate = '' } = req.query;

    // Calculate date range based on period
    let dateRange: any = {};
    const now = new Date();
    
    if (period === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const endOfDay = new Date(now.setHours(23, 59, 59, 999));
      dateRange = {
        transactionDate: {
          [Op.between]: [startOfDay, endOfDay]
        }
      };
    } else if (period === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0));
      const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999));
      dateRange = {
        transactionDate: {
          [Op.between]: [startOfDay, endOfDay]
        }
      };
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      dateRange = {
        transactionDate: {
          [Op.gte]: startOfWeek
        }
      };
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateRange = {
        transactionDate: {
          [Op.gte]: startOfMonth
        }
      };
    } else if (period === 'custom' && startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateRange = {
        transactionDate: {
          [Op.between]: [start, end]
        }
      };
    }

    // Get overall statistics
    const overallStats = await PosTransaction.findOne({
      where: {
        ...dateRange,
        status: { [Op.ne]: 'cancelled' }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalSales'],
        [sequelize.fn('AVG', sequelize.col('total')), 'averageTransaction'],
        [sequelize.fn('SUM', sequelize.col('discount')), 'totalDiscount'],
        [sequelize.fn('SUM', sequelize.col('tax')), 'totalTax']
      ],
      raw: true
    });

    // Get items statistics
    const itemsStats = await PosTransactionItem.findOne({
      include: [{
        model: PosTransaction,
        as: 'transaction',
        where: {
          ...dateRange,
          status: { [Op.ne]: 'cancelled' }
        },
        attributes: []
      }],
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalItemsSold'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('productId'))), 'uniqueProducts']
      ],
      raw: true
    });

    // Get payment method breakdown
    const paymentMethodStats = await PosTransaction.findAll({
      where: {
        ...dateRange,
        status: { [Op.ne]: 'cancelled' }
      },
      attributes: [
        'paymentMethod',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total']
      ],
      group: ['paymentMethod'],
      raw: true
    });

    // Get status breakdown
    const statusStats = await PosTransaction.findAll({
      where: dateRange,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get hourly sales (for today)
    let hourlySales = [];
    if (period === 'today') {
      hourlySales = await PosTransaction.findAll({
        where: {
          ...dateRange,
          status: { [Op.ne]: 'cancelled' }
        },
        attributes: [
          [sequelize.fn('DATE_PART', 'hour', sequelize.col('transactionDate')), 'hour'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('total')), 'total']
        ],
        group: [sequelize.fn('DATE_PART', 'hour', sequelize.col('transactionDate'))],
        order: [[sequelize.fn('DATE_PART', 'hour', sequelize.col('transactionDate')), 'ASC']],
        raw: true
      });
    }

    // Get top products
    const topProducts = await PosTransactionItem.findAll({
      include: [{
        model: PosTransaction,
        as: 'transaction',
        where: {
          ...dateRange,
          status: { [Op.ne]: 'cancelled' }
        },
        attributes: []
      }],
      attributes: [
        'productId',
        'productName',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('subtotal')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('PosTransactionItem.id')), 'transactionCount']
      ],
      group: ['productId', 'productName'],
      order: [[sequelize.fn('SUM', sequelize.col('subtotal')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Compare with previous period
    let comparisonStats = null;
    if (period === 'today') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
      const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));
      
      comparisonStats = await PosTransaction.findOne({
        where: {
          transactionDate: {
            [Op.between]: [startOfYesterday, endOfYesterday]
          },
          status: { [Op.ne]: 'cancelled' }
        },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
          [sequelize.fn('SUM', sequelize.col('total')), 'totalSales']
        ],
        raw: true
      });
    }

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    const currentSales = parseFloat(overallStats?.totalSales || '0');
    const currentTransactions = parseInt(overallStats?.totalTransactions || '0');
    const previousSales = parseFloat(comparisonStats?.totalSales || '0');
    const previousTransactions = parseInt(comparisonStats?.totalTransactions || '0');

    return res.status(200).json({
      success: true,
      data: {
        period,
        dateRange: dateRange.transactionDate || null,
        overall: {
          totalTransactions: currentTransactions,
          totalSales: currentSales,
          averageTransaction: parseFloat(overallStats?.averageTransaction || '0'),
          totalDiscount: parseFloat(overallStats?.totalDiscount || '0'),
          totalTax: parseFloat(overallStats?.totalTax || '0'),
          totalItemsSold: parseFloat(itemsStats?.totalItemsSold || '0'),
          uniqueProducts: parseInt(itemsStats?.uniqueProducts || '0')
        },
        growth: comparisonStats ? {
          salesGrowth: calculateGrowth(currentSales, previousSales),
          transactionsGrowth: calculateGrowth(currentTransactions, previousTransactions)
        } : null,
        paymentMethods: paymentMethodStats.map((pm: any) => ({
          method: pm.paymentMethod,
          count: parseInt(pm.count),
          total: parseFloat(pm.total)
        })),
        statusBreakdown: statusStats.map((s: any) => ({
          status: s.status,
          count: parseInt(s.count)
        })),
        hourlySales: hourlySales.map((h: any) => ({
          hour: parseInt(h.hour),
          count: parseInt(h.count),
          total: parseFloat(h.total)
        })),
        topProducts: topProducts.map((p: any) => ({
          productId: p.productId,
          productName: p.productName,
          quantity: parseFloat(p.totalQuantity),
          revenue: parseFloat(p.totalRevenue),
          transactionCount: parseInt(p.transactionCount)
        }))
      }
    });

  } catch (error: any) {
    console.error('Error fetching transaction stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction statistics',
      details: error.message
    });
  }
}

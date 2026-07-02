import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { period = '7d' } = req.query;

    // Dynamic imports
    const PosTransaction = require('@/models/PosTransaction');
    const PosTransactionItem = require('@/models/PosTransactionItem');
    const Product = require('@/models/Product');

    // Calculate date range based on period
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let periodStartDate = new Date();
    let days = 7;
    
    switch (period) {
      case '30d':
        days = 30;
        periodStartDate.setDate(today.getDate() - 30);
        break;
      case '3m':
        days = 90;
        periodStartDate.setDate(today.getDate() - 90);
        break;
      case '6m':
        days = 180;
        periodStartDate.setDate(today.getDate() - 180);
        break;
      case '1y':
        days = 365;
        periodStartDate.setDate(today.getDate() - 365);
        break;
      default:
        days = 7;
        periodStartDate.setDate(today.getDate() - 7);
    }
    periodStartDate.setHours(0, 0, 0, 0);

    // Yesterday for comparison
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    try {
      // 1. TODAY'S STATS
      const todayTransactions = await PosTransaction.findAll({
        where: {
          transactionDate: {
            [Op.between]: [startOfToday, today]
          },
          status: 'completed'
        },
        attributes: ['id', 'total', 'paymentMethod']
      });

      const todayStats = {
        transactions: todayTransactions.length,
        sales: todayTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.total || 0), 0),
        items: 0,
        avgTransaction: 0
      };

      // Get items count for today
      const todayItems = await PosTransactionItem.findAll({
        include: [{
          model: PosTransaction,
          where: {
            transactionDate: {
              [Op.between]: [startOfToday, today]
            },
            status: 'completed'
          },
          attributes: []
        }],
        attributes: ['quantity']
      });

      todayStats.items = todayItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      todayStats.avgTransaction = todayStats.transactions > 0 
        ? todayStats.sales / todayStats.transactions 
        : 0;

      // 2. YESTERDAY'S STATS FOR COMPARISON
      const yesterdayTransactions = await PosTransaction.findAll({
        where: {
          transactionDate: {
            [Op.between]: [yesterday, endOfYesterday]
          },
          status: 'completed'
        },
        attributes: ['id', 'total']
      });

      const yesterdayStats = {
        transactions: yesterdayTransactions.length,
        sales: yesterdayTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.total || 0), 0)
      };

      // Calculate percentage changes
      const changes = {
        transactions: yesterdayStats.transactions > 0
          ? Math.round(((todayStats.transactions - yesterdayStats.transactions) / yesterdayStats.transactions) * 100)
          : 0,
        sales: yesterdayStats.sales > 0
          ? Math.round(((todayStats.sales - yesterdayStats.sales) / yesterdayStats.sales) * 100)
          : 0
      };

      // 3. SALES TREND DATA
      const salesTrend = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(0, 0, 0, 0);

        const dayTransactions = await PosTransaction.findAll({
          where: {
            transactionDate: {
              [Op.between]: [date, nextDate]
            },
            status: 'completed'
          },
          attributes: ['id', 'total']
        });

        salesTrend.push({
          date: date.toISOString().split('T')[0],
          transactions: dayTransactions.length,
          sales: dayTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.total || 0), 0)
        });
      }

      // 4. PAYMENT METHODS DISTRIBUTION (Last 30 days)
      const last30Days = new Date();
      last30Days.setDate(today.getDate() - 30);
      last30Days.setHours(0, 0, 0, 0);

      const paymentMethodsData = await PosTransaction.findAll({
        where: {
          transactionDate: {
            [Op.between]: [last30Days, today]
          },
          status: 'completed'
        },
        attributes: ['paymentMethod', 'total']
      });

      // Group by payment method
      const paymentMethodsMap = new Map();
      paymentMethodsData.forEach((t: any) => {
        const method = t.paymentMethod || 'Cash';
        if (!paymentMethodsMap.has(method)) {
          paymentMethodsMap.set(method, { count: 0, total: 0 });
        }
        const current = paymentMethodsMap.get(method);
        current.count += 1;
        current.total += parseFloat(t.total || 0);
      });

      const paymentMethods = Array.from(paymentMethodsMap.entries()).map(([method, data]) => ({
        method,
        count: data.count,
        total: data.total
      }));

      // 5. TOP PRODUCTS (Last 7 days)
      const last7Days = new Date();
      last7Days.setDate(today.getDate() - 7);
      last7Days.setHours(0, 0, 0, 0);

      const topProductsData = await PosTransactionItem.findAll({
        include: [
          {
            model: PosTransaction,
            as: 'transaction',
            where: {
              transactionDate: {
                [Op.between]: [last7Days, today]
              },
              status: 'completed'
            },
            attributes: []
          },
          {
            model: Product,
            as: 'product',
            attributes: ['name']
          }
        ],
        attributes: [
          'productId',
          [require('sequelize').fn('SUM', require('sequelize').col('quantity')), 'totalQuantity'],
          [require('sequelize').fn('SUM', require('sequelize').literal('quantity * unitPrice')), 'totalSales']
        ],
        group: ['PosTransactionItem.productId', 'product.id', 'product.name'],
        order: [[require('sequelize').literal('totalSales'), 'DESC']],
        limit: 5,
        raw: false,
        subQuery: false
      });

      const topProducts = topProductsData.map((item: any) => ({
        name: item.product?.name || item.productName || 'Unknown Product',
        quantity: parseInt(item.get('totalQuantity') || 0),
        sales: parseFloat(item.get('totalSales') || 0)
      }));

      return res.status(200).json({
        success: true,
        data: {
          today: todayStats,
          changes,
          salesTrend,
          paymentMethods,
          topProducts
        }
      });

    } catch (dbError: any) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database error - failed to fetch dashboard stats',
        details: dbError.message
      });
    }

  } catch (error: any) {
    console.error('POS Dashboard Stats API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      details: error.message
    });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { Op, fn, col, literal, Sequelize, QueryTypes } from 'sequelize';
import { Session } from 'next-auth';

// Import models
const models = require('../../../../models');
const db = models.default || models;

// Extended session user type
interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  tenantId?: string;
}

// Extended session type
interface ExtendedSession extends Session {
  user: ExtendedUser;
}

// Type definitions for analytics data
interface SalesPerformanceData {
  salesSummary: {
    totalSales: number;
    totalTransactions: number;
    averageTicketSize: number;
    comparedToLastMonth: number;
  };
  salesByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
    growth: number;
  }>;
  salesByTime: {
    hourly: Array<{
      hour: string;
      sales: number;
    }>;
    daily: Array<{
      day: string;
      sales: number;
    }>;
  };
  paymentMethods: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
  topSellingProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    growth: number;
  }>;
  salesTrend: {
    labels: string[];
    data: number[];
  };
  cashierPerformance: Array<{
    cashierId: string;
    name: string;
    transactions: number;
    totalSales: number;
    avgTicketSize: number;
  }>;
  isLive: boolean;
}

async function getSalesPerformanceFromDatabase(): Promise<SalesPerformanceData> {
  // Ambil data bulan saat ini
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
  const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfPreviousMonth = new Date(currentYear, currentMonth, 0);

  try {
    // Mendapatkan summary bulan ini dengan Sequelize
    const currentMonthSales = await db.Transaction.findOne({
      attributes: [
        [fn('sum', col('totalAmount')), 'totalAmount'],
        [fn('count', col('id')), 'count']
      ],
      where: {
        transactionDate: { [Op.gte]: startOfCurrentMonth }
      },
      raw: true
    });

    // Mendapatkan summary bulan sebelumnya dengan Sequelize
    const previousMonthSales = await db.Transaction.findOne({
      attributes: [
        [fn('sum', col('totalAmount')), 'totalAmount']
      ],
      where: {
        transactionDate: { 
          [Op.gte]: startOfPreviousMonth,
          [Op.lt]: startOfCurrentMonth 
        }
      },
      raw: true
    });

    // Hitung nilai untuk sales summary
    const totalSales = parseFloat(currentMonthSales.totalAmount) || 0;
    const totalTransactions = parseInt(currentMonthSales.count) || 0;
    const averageTicketSize = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    const previousTotalSales = parseFloat(previousMonthSales.totalAmount) || 0;
    const growthPercentage = previousTotalSales > 0 
      ? ((totalSales - previousTotalSales) / previousTotalSales) * 100 
      : 0;

    // Mendapatkan sales by category
    const salesByCategory = await db.TransactionItem.findAll({
      attributes: [
        'productCategory',
        [fn('sum', col('totalPrice')), 'totalAmount']
      ],
      where: {
        '$Transaction.transactionDate$': { [Op.gte]: startOfCurrentMonth }
      },
      include: [{
        model: db.Transaction,
        as: 'Transaction',
        attributes: [],
        required: true
      }],
      group: ['productCategory'],
      order: [[fn('sum', col('totalPrice')), 'DESC']],
      raw: true
    });

    const previousMonthSalesByCategory = await db.TransactionItem.findAll({
      attributes: [
        'productCategory',
        [fn('sum', col('totalPrice')), 'totalAmount']
      ],
      where: {
        '$Transaction.transactionDate$': { 
          [Op.gte]: startOfPreviousMonth,
          [Op.lt]: startOfCurrentMonth 
        }
      },
      include: [{
        model: db.Transaction,
        as: 'Transaction',
        attributes: [],
        required: true
      }],
      group: ['productCategory'],
      raw: true
    });

    // Format data kategori
    const formattedSalesByCategory = salesByCategory.map((category: any) => {
      const categoryAmount = parseFloat(category.totalAmount) || 0;
      const percentage = totalSales > 0 ? (categoryAmount / totalSales) * 100 : 0;
      
      // Cari data bulan lalu untuk kategori yang sama
      const previousData = previousMonthSalesByCategory.find(
        (prev: any) => prev.productCategory === category.productCategory
      );
      
      const previousAmount = parseFloat(previousData?.totalAmount) || 0;
      const growth = previousAmount > 0 
        ? ((categoryAmount - previousAmount) / previousAmount) * 100 
        : 0;
      
      return {
        category: category.productCategory,
        amount: categoryAmount,
        percentage,
        growth
      };
    }).sort((a: any, b: any) => b.amount - a.amount);

    // Mendapatkan sales by time (hourly)
    const hourlySales = await db.sequelize.query(
      `SELECT DATE_FORMAT(transactionDate, '%H:00') as hour, SUM(totalAmount) as sales
      FROM Transactions
      WHERE transactionDate >= :startDate
      GROUP BY DATE_FORMAT(transactionDate, '%H:00')
      ORDER BY hour ASC`,
      {
        replacements: { startDate: startOfCurrentMonth },
        type: QueryTypes.SELECT
      }
    );

    // Mendapatkan sales by day of week
    const dailySales = await db.sequelize.query(
      `SELECT 
        CASE DAYOFWEEK(transactionDate)
          WHEN 1 THEN 'Minggu'
          WHEN 2 THEN 'Senin'
          WHEN 3 THEN 'Selasa'
          WHEN 4 THEN 'Rabu'
          WHEN 5 THEN 'Kamis'
          WHEN 6 THEN 'Jumat'
          WHEN 7 THEN 'Sabtu'
        END as day,
        SUM(totalAmount) as sales
      FROM Transactions
      WHERE transactionDate >= :startDate
      GROUP BY DAYOFWEEK(transactionDate)
      ORDER BY DAYOFWEEK(transactionDate)`,
      {
        replacements: { startDate: startOfCurrentMonth },
        type: QueryTypes.SELECT
      }
    );

    // Mendapatkan payment methods
    const paymentMethods = await db.Transaction.findAll({
      attributes: [
        'paymentMethod',
        [fn('sum', col('totalAmount')), 'totalAmount']
      ],
      where: {
        transactionDate: { [Op.gte]: startOfCurrentMonth }
      },
      group: ['paymentMethod'],
      raw: true
    });

    const formattedPaymentMethods = paymentMethods.map((method: any) => {
      const methodAmount = parseFloat(method.totalAmount) || 0;
      const percentage = totalSales > 0 ? (methodAmount / totalSales) * 100 : 0;
      
      return {
        method: method.paymentMethod,
        amount: methodAmount,
        percentage
      };
    }).sort((a: any, b: any) => b.amount - a.amount);

    // Mendapatkan top selling products dari bulan ini
    const topSellingProducts = await db.TransactionItem.findAll({
      attributes: [
        'productId',
        'productName',
        [fn('sum', col('quantity')), 'quantity'],
        [fn('sum', col('totalPrice')), 'totalPrice']
      ],
      where: {
        '$Transaction.transactionDate$': { [Op.gte]: startOfCurrentMonth }
      },
      include: [{
        model: db.Transaction,
        as: 'Transaction',
        attributes: [],
        required: true
      }],
      group: ['productId', 'productName'],
      order: [[fn('sum', col('totalPrice')), 'DESC']],
      limit: 5,
      raw: true
    });

    const previousMonthTopProducts = await db.TransactionItem.findAll({
      attributes: [
        'productId',
        [fn('sum', col('totalPrice')), 'totalPrice']
      ],
      where: {
        '$Transaction.transactionDate$': { 
          [Op.gte]: startOfPreviousMonth,
          [Op.lt]: startOfCurrentMonth 
        }
      },
      include: [{
        model: db.Transaction,
        as: 'Transaction',
        attributes: [],
        required: true
      }],
      group: ['productId'],
      raw: true
    });
    
    // Format data produk teratas
    const formattedTopProducts = topSellingProducts.map((product: any) => {
      const previousData = previousMonthTopProducts.find(
        (prev: any) => prev.productId === product.productId
      );
      
      const previousRevenue = parseFloat(previousData?.totalPrice) || 0;
      const currentRevenue = parseFloat(product.totalPrice) || 0;
      
      const growth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;
      
      return {
        id: product.productId,
        name: product.productName,
        quantity: parseInt(product.quantity) || 0,
        revenue: currentRevenue,
        growth
      };
    });

    // Mendapatkan sales trend untuk 5 bulan terakhir
    const months = Array.from({ length: 5 }, (_, i) => {
      const monthIndex = currentDate.getMonth() - 4 + i;
      // Mengatasi month index negative (tahun sebelumnya)
      return monthIndex < 0 ? { month: monthIndex + 12, year: currentYear - 1 } : { month: monthIndex, year: currentYear };
    });
    
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const salesTrend = {
      labels: [] as string[],
      data: [] as number[]
    };
    
    for (const { month, year } of months) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const monthlySales = await db.Transaction.findOne({
        attributes: [
          [fn('sum', col('totalAmount')), 'totalAmount']
        ],
        where: {
          transactionDate: {
            [Op.gte]: startDate,
            [Op.lte]: endDate
          }
        },
        raw: true
      });
      
      salesTrend.labels.push(monthLabels[month]);
      const amount = monthlySales?.totalAmount ? parseFloat(monthlySales.totalAmount) : 0;
      salesTrend.data.push(amount);
    }

    // Mendapatkan cashier performance
    const cashierPerformance = await db.Transaction.findAll({
      attributes: [
        'cashierId',
        'cashierName',
        [fn('sum', col('totalAmount')), 'totalAmount'],
        [fn('count', col('id')), 'count']
      ],
      where: {
        transactionDate: { [Op.gte]: startOfCurrentMonth }
      },
      group: ['cashierId', 'cashierName'],
      order: [[fn('sum', col('totalAmount')), 'DESC']],
      limit: 3,
      raw: true
    });

    const formattedCashierPerformance = cashierPerformance.map((cashier: any) => {
      const cashierTotalSales = parseFloat(cashier.totalAmount) || 0;
      const transactions = parseInt(cashier.count) || 0;
      const avgTicketSize = transactions > 0 ? cashierTotalSales / transactions : 0;
      
      return {
        cashierId: cashier.cashierId,
        name: cashier.cashierName,
        transactions,
        totalSales: cashierTotalSales,
        avgTicketSize
      };
    });

    return {
      salesSummary: {
        totalSales,
        totalTransactions,
        averageTicketSize,
        comparedToLastMonth: growthPercentage
      },
      salesByCategory: formattedSalesByCategory,
      salesByTime: {
        hourly: hourlySales,
        daily: dailySales
      },
      paymentMethods: formattedPaymentMethods,
      topSellingProducts: formattedTopProducts,
      salesTrend,
      cashierPerformance: formattedCashierPerformance,
      isLive: true
    };
  } catch (error) {
    console.error('Error fetching sales performance analytics:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verifikasi autentikasi
  const session = await getServerSession(req, res, authOptions) as ExtendedSession | null;
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Coba ambil data dari database dengan timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      );
      
      const dataPromise = getSalesPerformanceFromDatabase();
      
      // Gunakan Promise.race untuk menerapkan timeout
      const salesData = await Promise.race([dataPromise, timeoutPromise]);
      
      return res.status(200).json(salesData);
    } catch (error) {
      console.error('Error in POS sales performance analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sales performance data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}

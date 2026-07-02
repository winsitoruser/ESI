import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import POSReportsQueries from '../../../lib/database/pos-reports-queries';
import { createLogger } from '../../../lib/logger-factory';

const logger = createLogger('pos-reports-api');

// Mock data generator for fallback
const generateMockPOSReportsData = () => {
  const currentDate = new Date();
  
  return {
    salesSummary: {
      summary: {
        totalTransactions: 126,
        totalSales: 15700000,
        netSales: 15200000,
        averageTransaction: 124603,
        totalItemsSold: 534,
        totalProfit: 4710000
      },
      timeBreakdown: [
        { period: "00:00 - 06:00", transactions: 8, sales: 1200000 },
        { period: "06:00 - 12:00", transactions: 32, sales: 4500000 },
        { period: "12:00 - 18:00", transactions: 58, sales: 6800000 },
        { period: "18:00 - 24:00", transactions: 28, sales: 3200000 }
      ],
      paymentBreakdown: [
        { paymentMethod: "Cash", transactions: 78, totalAmount: 9800000 },
        { paymentMethod: "Debit Card", transactions: 32, totalAmount: 4200000 },
        { paymentMethod: "QRIS", transactions: 16, totalAmount: 1700000 }
      ]
    },
    topProducts: [
      { rank: 1, id: "1", productName: "Paracetamol 500mg", sku: "MED-PCT-500", categoryName: "Obat Bebas", totalSold: 145, revenue: 2900000, profit: 725000, profitMargin: 25, transactionCount: 89 },
      { rank: 2, id: "2", productName: "Amoxicillin 500mg", sku: "MED-AMX-500", categoryName: "Obat Keras", totalSold: 128, revenue: 2560000, profit: 640000, profitMargin: 25, transactionCount: 76 },
      { rank: 3, id: "3", productName: "Vitamin C 1000mg", sku: "SUP-VTC-1000", categoryName: "Vitamin", totalSold: 98, revenue: 1960000, profit: 490000, profitMargin: 25, transactionCount: 65 },
      { rank: 4, id: "4", productName: "Antasida Tablet", sku: "MED-ANT-001", categoryName: "Obat Bebas", totalSold: 87, revenue: 1740000, profit: 435000, profitMargin: 25, transactionCount: 54 },
      { rank: 5, id: "5", productName: "Minyak Kayu Putih 60ml", sku: "OTC-MKP-60", categoryName: "Obat Luar", totalSold: 76, revenue: 1520000, profit: 380000, profitMargin: 25, transactionCount: 48 }
    ],
    cashierPerformance: [
      { cashierId: "1", cashierName: "Ahmad Kasir", totalTransactions: 45, totalSales: 5625000, averageTransaction: 125000, totalItemsSold: 189, firstTransaction: new Date(currentDate.getTime() - 86400000 * 7), lastTransaction: currentDate },
      { cashierId: "2", cashierName: "Siti Kasir", totalTransactions: 52, totalSales: 6500000, averageTransaction: 125000, totalItemsSold: 218, firstTransaction: new Date(currentDate.getTime() - 86400000 * 7), lastTransaction: currentDate },
      { cashierId: "3", cashierName: "Budi Kasir", totalTransactions: 29, totalSales: 3625000, averageTransaction: 125000, totalItemsSold: 127, firstTransaction: new Date(currentDate.getTime() - 86400000 * 7), lastTransaction: currentDate }
    ],
    dailySalesTrend: [
      { date: new Date(currentDate.getTime() - 86400000 * 6), transactions: 18, sales: 2250000, itemsSold: 76, averageTransaction: 125000 },
      { date: new Date(currentDate.getTime() - 86400000 * 5), transactions: 22, sales: 2750000, itemsSold: 92, averageTransaction: 125000 },
      { date: new Date(currentDate.getTime() - 86400000 * 4), transactions: 16, sales: 2000000, itemsSold: 67, averageTransaction: 125000 },
      { date: new Date(currentDate.getTime() - 86400000 * 3), transactions: 19, sales: 2375000, itemsSold: 80, averageTransaction: 125000 },
      { date: new Date(currentDate.getTime() - 86400000 * 2), transactions: 21, sales: 2625000, itemsSold: 88, averageTransaction: 125000 },
      { date: new Date(currentDate.getTime() - 86400000 * 1), transactions: 17, sales: 2125000, itemsSold: 71, averageTransaction: 125000 },
      { date: currentDate, transactions: 13, sales: 1625000, itemsSold: 60, averageTransaction: 125000 }
    ],
    categorySales: [
      { id: "1", categoryName: "Obat Bebas", productCount: 12, totalSold: 245, revenue: 4900000, percentage: 31.2, transactionCount: 156 },
      { id: "2", categoryName: "Obat Keras", productCount: 8, totalSold: 178, revenue: 3560000, percentage: 22.7, transactionCount: 112 },
      { id: "3", categoryName: "Vitamin", productCount: 10, totalSold: 198, revenue: 3960000, percentage: 25.2, transactionCount: 128 },
      { id: "4", categoryName: "Obat Luar", productCount: 6, totalSold: 123, revenue: 2460000, percentage: 15.7, transactionCount: 78 },
      { id: "5", categoryName: "Alat Kesehatan", productCount: 4, totalSold: 56, revenue: 820000, percentage: 5.2, transactionCount: 34 }
    ]
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const operationLogger = logger.child({ method: req.method, url: req.url });
  
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login.'
      });
    }

    if (req.method === 'GET' || req.method === 'POST') {
      const isPost = req.method === 'POST';
      const { reportType, dateFrom, dateTo, period, cashierId, limit, format } = isPost 
        ? req.body 
        : req.query;

      operationLogger.info('Processing POS report request', { reportType, period, format, method: req.method });

      // Initialize database connection
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      const reportsQueries = new POSReportsQueries(pool);
      let responseData;
      let isFromMock = false;

      try {
        switch (reportType) {
          case 'sales-summary':
            responseData = await reportsQueries.getSalesSummaryReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string,
              cashierId: cashierId as string
            });
            break;

          case 'top-products':
            responseData = await reportsQueries.getTopProductsReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string,
              limit: limit ? parseInt(limit as string) : 10
            });
            break;

          case 'cashier-performance':
            responseData = await reportsQueries.getCashierPerformanceReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string
            });
            break;

          case 'daily-sales-trend':
            responseData = await reportsQueries.getDailySalesTrendReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string
            });
            break;

          case 'category-sales':
            responseData = await reportsQueries.getCategorySalesReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string
            });
            break;

          default:
            await pool.end();
            return res.status(400).json({
              success: false,
              message: 'Invalid report type. Valid types: sales-summary, top-products, cashier-performance, daily-sales-trend, category-sales'
            });
        }

        await pool.end();
        operationLogger.info('Database report generated successfully', { reportType });

      } catch (dbError) {
        await pool.end();
        operationLogger.warn('Database operation failed, falling back to mock data', { 
          error: (dbError as Error).message 
        });

        // Fallback to mock data
        const mockData = generateMockPOSReportsData();
        isFromMock = true;

        switch (reportType) {
          case 'sales-summary':
            responseData = mockData.salesSummary;
            break;
          case 'top-products':
            responseData = mockData.topProducts;
            break;
          case 'cashier-performance':
            responseData = mockData.cashierPerformance;
            break;
          case 'daily-sales-trend':
            responseData = mockData.dailySalesTrend;
            break;
          case 'category-sales':
            responseData = mockData.categorySales;
            break;
        }
      }

      // For POST requests with format parameter, return export-ready response
      if (isPost && format) {
        operationLogger.info('Export request processed', { format, reportType });
        return res.status(200).json({
          success: true,
          data: {
            reportId: `POS-RPT-${Date.now()}`,
            reportType,
            format,
            generatedAt: new Date().toISOString(),
            ...responseData
          },
          isFromMock,
          message: `POS report generated successfully in ${format} format`
        });
      }

      return res.status(200).json({
        success: true,
        data: responseData,
        isFromMock,
        reportType,
        generatedAt: new Date().toISOString()
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use GET or POST.'
    });

  } catch (error) {
    operationLogger.error('Error in POS reports API', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message
    });
  }
}

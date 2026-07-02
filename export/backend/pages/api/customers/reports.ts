import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import CustomerReportsQueries from '../../../lib/database/customer-reports-queries';
import { createLogger } from '../../../lib/logger-factory';

const logger = createLogger('customer-reports-api');

// Mock data generator for fallback
const generateMockCustomerReportsData = () => {
  return {
    overview: {
      summary: {
        totalCustomers: 1250,
        newCustomers: 85,
        activeCustomers: 420,
        inactiveCustomers: 830,
        totalRevenue: 125000000,
        averageTransaction: 297619,
        totalTransactions: 420
      }
    },
    topCustomers: [
      { rank: 1, id: "1", customerName: "PT Maju Jaya", email: "maju@example.com", phone: "081234567890", customerType: "corporate", totalTransactions: 45, totalSpent: 15200000, averageTransaction: 337778, lastPurchaseDate: new Date('2025-03-15'), totalItemsPurchased: 234 },
      { rank: 2, id: "2", customerName: "Toko Berkah", email: "berkah@example.com", phone: "081234567891", customerType: "retail", totalTransactions: 38, totalSpent: 12500000, averageTransaction: 328947, lastPurchaseDate: new Date('2025-03-14'), totalItemsPurchased: 198 },
      { rank: 3, id: "3", customerName: "CV Sejahtera", email: "sejahtera@example.com", phone: "081234567892", customerType: "corporate", totalTransactions: 32, totalSpent: 10800000, averageTransaction: 337500, lastPurchaseDate: new Date('2025-03-13'), totalItemsPurchased: 176 }
    ],
    segmentation: {
      byType: [
        { customerType: "corporate", customerCount: 125, totalRevenue: 45000000, averageTransaction: 360000, transactionCount: 125, revenuePercentage: 36.0 },
        { customerType: "retail", customerCount: 850, totalRevenue: 65000000, averageTransaction: 250000, transactionCount: 260, revenuePercentage: 52.0 },
        { customerType: "individual", customerCount: 275, totalRevenue: 15000000, averageTransaction: 150000, transactionCount: 100, revenuePercentage: 12.0 }
      ],
      bySpending: [
        { segment: "VIP", customerCount: 25, totalRevenue: 35000000, averageSpent: 1400000, revenuePercentage: 28.0 },
        { segment: "Premium", customerCount: 85, totalRevenue: 42000000, averageSpent: 494118, revenuePercentage: 33.6 },
        { segment: "Regular", customerCount: 310, totalRevenue: 38000000, averageSpent: 122581, revenuePercentage: 30.4 },
        { segment: "New", customerCount: 830, totalRevenue: 10000000, averageSpent: 12048, revenuePercentage: 8.0 }
      ]
    },
    retention: {
      monthlyRetention: [
        { month: "2024-10", monthLabel: "Oct 2024", activeCustomers: 380, newCustomers: 65, returningCustomers: 315, retentionRate: 82.89 },
        { month: "2024-11", monthLabel: "Nov 2024", activeCustomers: 395, newCustomers: 72, returningCustomers: 323, retentionRate: 81.77 },
        { month: "2024-12", monthLabel: "Dec 2024", activeCustomers: 410, newCustomers: 78, returningCustomers: 332, retentionRate: 80.98 },
        { month: "2025-01", monthLabel: "Jan 2025", activeCustomers: 405, newCustomers: 68, returningCustomers: 337, retentionRate: 83.21 },
        { month: "2025-02", monthLabel: "Feb 2025", activeCustomers: 415, newCustomers: 75, returningCustomers: 340, retentionRate: 81.93 },
        { month: "2025-03", monthLabel: "Mar 2025", activeCustomers: 420, newCustomers: 85, returningCustomers: 335, retentionRate: 79.76 }
      ],
      churnAnalysis: {
        atRiskCustomers: 145
      }
    },
    purchaseBehavior: {
      purchaseFrequency: [
        { frequencyRange: "More than 10", customerCount: 45 },
        { frequencyRange: "6-10 times", customerCount: 125 },
        { frequencyRange: "2-5 times", customerCount: 350 },
        { frequencyRange: "Once", customerCount: 420 },
        { frequencyRange: "Never", customerCount: 310 }
      ],
      basketAnalysis: {
        avgItemsPerTransaction: 5.2,
        avgTransactionValue: 297619,
        maxTransactionValue: 2500000,
        minTransactionValue: 15000
      },
      purchaseTimeDistribution: [
        { hour: 8, transactionCount: 12, uniqueCustomers: 10 },
        { hour: 9, transactionCount: 25, uniqueCustomers: 22 },
        { hour: 10, transactionCount: 45, uniqueCustomers: 38 },
        { hour: 11, transactionCount: 52, uniqueCustomers: 45 },
        { hour: 12, transactionCount: 38, uniqueCustomers: 32 },
        { hour: 13, transactionCount: 42, uniqueCustomers: 36 },
        { hour: 14, transactionCount: 48, uniqueCustomers: 41 },
        { hour: 15, transactionCount: 55, uniqueCustomers: 47 },
        { hour: 16, transactionCount: 50, uniqueCustomers: 43 },
        { hour: 17, transactionCount: 35, uniqueCustomers: 30 },
        { hour: 18, transactionCount: 18, uniqueCustomers: 16 }
      ]
    }
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
      const { reportType, dateFrom, dateTo, period, limit, months, format } = isPost 
        ? req.body 
        : req.query;

      operationLogger.info('Processing Customer report request', { reportType, period, format, method: req.method });

      // Initialize database connection
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      const reportsQueries = new CustomerReportsQueries(pool);
      let responseData;
      let isFromMock = false;

      try {
        switch (reportType) {
          case 'overview':
            responseData = await reportsQueries.getCustomerOverviewReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string
            });
            break;

          case 'top-customers':
            responseData = await reportsQueries.getTopCustomersReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string,
              limit: limit ? parseInt(limit as string) : 10
            });
            break;

          case 'segmentation':
            responseData = await reportsQueries.getCustomerSegmentationReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string
            });
            break;

          case 'retention':
            responseData = await reportsQueries.getCustomerRetentionReport({
              months: months ? parseInt(months as string) : 6
            });
            break;

          case 'purchase-behavior':
            responseData = await reportsQueries.getCustomerPurchaseBehaviorReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string
            });
            break;

          default:
            await pool.end();
            return res.status(400).json({
              success: false,
              message: 'Invalid report type. Valid types: overview, top-customers, segmentation, retention, purchase-behavior'
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
        const mockData = generateMockCustomerReportsData();
        isFromMock = true;

        switch (reportType) {
          case 'overview':
            responseData = mockData.overview;
            break;
          case 'top-customers':
            responseData = mockData.topCustomers;
            break;
          case 'segmentation':
            responseData = mockData.segmentation;
            break;
          case 'retention':
            responseData = mockData.retention;
            break;
          case 'purchase-behavior':
            responseData = mockData.purchaseBehavior;
            break;
        }
      }

      // For POST requests with format parameter, return export-ready response
      if (isPost && format) {
        operationLogger.info('Export request processed', { format, reportType });
        return res.status(200).json({
          success: true,
          data: {
            reportId: `CUST-RPT-${Date.now()}`,
            reportType,
            format,
            generatedAt: new Date().toISOString(),
            ...responseData
          },
          isFromMock,
          message: `Customer report generated successfully in ${format} format`
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
    operationLogger.error('Error in Customer reports API', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message
    });
  }
}

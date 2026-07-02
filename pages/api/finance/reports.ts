import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import FinanceReportsQueries from '../../../lib/database/finance-reports-queries';
import { createLogger } from '../../../lib/logger-factory';

const logger = createLogger('finance-reports-api');

// Mock data generator for fallback
const generateMockFinanceReportsData = () => {
  return {
    incomeStatement: {
      summary: {
        totalIncome: 40200000,
        totalExpense: 24500000,
        netProfit: 15700000,
        profitMargin: 39.05
      },
      incomeByCategory: [
        { id: "1", categoryName: "Penjualan Produk", categoryCode: "INC-001", amount: 32500000, transactionCount: 245, percentage: 80.85 },
        { id: "2", categoryName: "Jasa Konsultasi", categoryCode: "INC-002", amount: 5200000, transactionCount: 42, percentage: 12.94 },
        { id: "3", categoryName: "Pendapatan Lain", categoryCode: "INC-003", amount: 2500000, transactionCount: 18, percentage: 6.22 }
      ],
      expenseByCategory: [
        { id: "4", categoryName: "Pembelian Stok", categoryCode: "EXP-001", amount: 12300000, transactionCount: 156, percentage: 50.20 },
        { id: "5", categoryName: "Gaji Karyawan", categoryCode: "EXP-002", amount: 8500000, transactionCount: 12, percentage: 34.69 },
        { id: "6", categoryName: "Operasional", categoryCode: "EXP-003", amount: 3700000, transactionCount: 87, percentage: 15.10 }
      ]
    },
    cashFlow: {
      cashFlowByDate: [
        { date: new Date('2025-03-01'), cashIn: 1250000, cashOut: 850000, netCashFlow: 400000, cumulativeCashFlow: 400000 },
        { date: new Date('2025-03-02'), cashIn: 1450000, cashOut: 920000, netCashFlow: 530000, cumulativeCashFlow: 930000 },
        { date: new Date('2025-03-03'), cashIn: 1320000, cashOut: 780000, netCashFlow: 540000, cumulativeCashFlow: 1470000 }
      ],
      cashFlowByMethod: [
        { paymentMethod: "Cash", cashIn: 15200000, cashOut: 8500000, netFlow: 6700000 },
        { paymentMethod: "Transfer Bank", cashIn: 18500000, cashOut: 12300000, netFlow: 6200000 },
        { paymentMethod: "QRIS", cashIn: 6500000, cashOut: 3700000, netFlow: 2800000 }
      ],
      summary: {
        totalCashIn: 40200000,
        totalCashOut: 24500000,
        netCashFlow: 15700000,
        endingBalance: 15700000
      }
    },
    expenseBreakdown: {
      expenseByCategory: [
        { id: "4", categoryName: "Pembelian Stok", categoryCode: "EXP-001", icon: "FaShoppingCart", color: "#3b82f6", totalAmount: 12300000, transactionCount: 156, averageAmount: 78846, maxAmount: 2500000, minAmount: 15000, percentage: 50.20 },
        { id: "5", categoryName: "Gaji Karyawan", categoryCode: "EXP-002", icon: "FaUsers", color: "#10b981", totalAmount: 8500000, transactionCount: 12, averageAmount: 708333, maxAmount: 750000, minAmount: 650000, percentage: 34.69 },
        { id: "6", categoryName: "Operasional", categoryCode: "EXP-003", icon: "FaCog", color: "#f59e0b", totalAmount: 3700000, transactionCount: 87, averageAmount: 42529, maxAmount: 350000, minAmount: 5000, percentage: 15.10 }
      ],
      topExpenses: [
        { id: "1", description: "Pembelian Stok Bulanan", amount: 2500000, transactionDate: new Date('2025-03-15'), categoryName: "Pembelian Stok", paymentMethod: "Transfer Bank" },
        { id: "2", description: "Gaji Maret 2025", amount: 750000, transactionDate: new Date('2025-03-01'), categoryName: "Gaji Karyawan", paymentMethod: "Cash" }
      ],
      summary: {
        totalExpenses: 24500000,
        totalTransactions: 255,
        averageExpense: 96078
      }
    },
    monthlyTrend: [
      { month: "2025-01", monthLabel: "Jan 2025", income: 32500000, expense: 22300000, profit: 10200000, profitMargin: 31.38 },
      { month: "2025-02", monthLabel: "Feb 2025", income: 36700000, expense: 25100000, profit: 11600000, profitMargin: 31.61 },
      { month: "2025-03", monthLabel: "Mar 2025", income: 40200000, expense: 24500000, profit: 15700000, profitMargin: 39.05 }
    ],
    budgetVsActual: [
      { id: "1", categoryName: "Penjualan Produk", type: "income", budgetAmount: 30000000, actualAmount: 32500000, variance: -2500000, variancePercentage: 8.33 },
      { id: "4", categoryName: "Pembelian Stok", type: "expense", budgetAmount: 15000000, actualAmount: 12300000, variance: 2700000, variancePercentage: -18.00 }
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
      const { reportType, dateFrom, dateTo, period, months, format } = isPost 
        ? req.body 
        : req.query;

      operationLogger.info('Processing Finance report request', { reportType, period, format, method: req.method });

      // Initialize database connection
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      const reportsQueries = new FinanceReportsQueries(pool);
      let responseData;
      let isFromMock = false;

      try {
        switch (reportType) {
          case 'income-statement':
            responseData = await reportsQueries.getIncomeStatementReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string
            });
            break;

          case 'cash-flow':
            responseData = await reportsQueries.getCashFlowReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string
            });
            break;

          case 'expense-breakdown':
            responseData = await reportsQueries.getExpenseBreakdownReport({
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              period: period as string
            });
            break;

          case 'monthly-trend':
            responseData = await reportsQueries.getMonthlyTrendReport({
              months: months ? parseInt(months as string) : 12
            });
            break;

          case 'budget-vs-actual':
            responseData = await reportsQueries.getBudgetVsActualReport({
              period: period as string
            });
            break;

          default:
            await pool.end();
            return res.status(400).json({
              success: false,
              message: 'Invalid report type. Valid types: income-statement, cash-flow, expense-breakdown, monthly-trend, budget-vs-actual'
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
        const mockData = generateMockFinanceReportsData();
        isFromMock = true;

        switch (reportType) {
          case 'income-statement':
            responseData = mockData.incomeStatement;
            break;
          case 'cash-flow':
            responseData = mockData.cashFlow;
            break;
          case 'expense-breakdown':
            responseData = mockData.expenseBreakdown;
            break;
          case 'monthly-trend':
            responseData = mockData.monthlyTrend;
            break;
          case 'budget-vs-actual':
            responseData = mockData.budgetVsActual;
            break;
        }
      }

      // For POST requests with format parameter, return export-ready response
      if (isPost && format) {
        operationLogger.info('Export request processed', { format, reportType });
        return res.status(200).json({
          success: true,
          data: {
            reportId: `FIN-RPT-${Date.now()}`,
            reportType,
            format,
            generatedAt: new Date().toISOString(),
            ...responseData
          },
          isFromMock,
          message: `Finance report generated successfully in ${format} format`
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
    operationLogger.error('Error in Finance reports API', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message
    });
  }
}

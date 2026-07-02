import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import InventoryReportsQueries from '../../../lib/database/inventory-reports-queries';
import { createLogger } from '../../../lib/logger-factory';

const logger = createLogger('inventory-reports-api');

// Helper function to map branch string to location_id
const mapBranchToLocationId = (branch?: string): string | undefined => {
  if (!branch || branch === 'all') {
    return 'all';
  }
  
  // Map frontend branch IDs to database location IDs
  const branchMapping: { [key: string]: string } = {
    'branch-001': '2', // Toko Cabang A
    'branch-002': '3', // Toko Cabang B
    'branch-003': '5', // Toko Cabang C
    'branch-004': '6', // Toko Cabang D
    'warehouse-001': '1', // Gudang Pusat
    'warehouse-002': '4', // Gudang Regional Jakarta
  };
  
  return branchMapping[branch] || branch;
};

// Mock data untuk laporan inventori
const generateMockReportsData = () => {
  const currentDate = new Date();
  
  // Stock Value Summary
  const stockValueSummary = {
    totalValue: 2847500000,
    previousTotalValue: 2650000000,
    categories: [
      {
        id: 'cat-1',
        name: 'Obat Keras',
        itemCount: 45,
        value: 1250000000,
        percentage: 43.9,
        trend: 'up',
        trendPercentage: 8.5
      },
      {
        id: 'cat-2', 
        name: 'Obat Bebas',
        itemCount: 32,
        value: 850000000,
        percentage: 29.9,
        trend: 'up',
        trendPercentage: 5.2
      },
      {
        id: 'cat-3',
        name: 'Vitamin & Suplemen',
        itemCount: 28,
        value: 425000000,
        percentage: 14.9,
        trend: 'stable',
        trendPercentage: 0
      },
      {
        id: 'cat-4',
        name: 'Obat Luar',
        itemCount: 18,
        value: 322500000,
        percentage: 11.3,
        trend: 'down',
        trendPercentage: -2.1
      }
    ]
  };

  // Stock Movement Data
  const stockMovements = [
    {
      id: 'mov-1',
      date: new Date(currentDate.getTime() - 86400000),
      type: 'in',
      reference: 'PO-2025-001',
      productName: 'Paracetamol 500mg',
      quantity: 100,
      fromTo: 'PT Kimia Farma',
      notes: 'Pesanan reguler bulanan'
    },
    {
      id: 'mov-2',
      date: new Date(currentDate.getTime() - 172800000),
      type: 'out',
      reference: 'SO-2025-045',
      productName: 'Amoxicillin 500mg',
      quantity: 25,
      fromTo: 'Klinik Sehat Sentosa',
      notes: 'Penjualan grosir'
    }
  ];

  // Low Stock Products
  const lowStockProducts = [
    {
      id: 'low-1',
      productName: 'Paracetamol 500mg',
      sku: 'MED-PCT-500',
      categoryName: 'Obat Bebas',
      currentStock: 8,
      minStock: 20,
      status: 'critical'
    }
  ];

  // Product Analysis
  const productAnalysis = {
    topSellingProducts: [
      {
        id: 'top-1',
        productName: 'Paracetamol 500mg',
        totalSold: 450,
        revenue: 5400000,
        profit: 1350000,
        profitMargin: 25
      }
    ],
    slowMovingProducts: []
  };

  return {
    stockValueSummary,
    stockMovements,
    lowStockProducts,
    productAnalysis
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const operationLogger = logger.child({ method: req.method, url: req.url });
  
  try {
    if (req.method === 'GET' || req.method === 'POST') {
      // Support both GET and POST methods
      const isPost = req.method === 'POST';
      const { reportType, branch, period, dateFrom, dateTo, page, limit, format } = isPost 
        ? req.body 
        : req.query;

      operationLogger.info('Processing report request', { reportType, period, branch, format, method: req.method });

      // Map branch to location_id
      const locationId = mapBranchToLocationId(branch as string);

      // Initialize database connection
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      const reportsQueries = new InventoryReportsQueries(pool);
      let responseData;
      let isFromMock = false;

      try {
        switch (reportType) {
          case 'stock-value':
            responseData = await reportsQueries.getStockValueReport({
              branch: locationId,
              period: period as string,
              dateFrom: dateFrom as string,
              dateTo: dateTo as string
            });
            break;

          case 'stock-movement':
            responseData = await reportsQueries.getStockMovementReport({
              branch: locationId,
              period: period as string,
              dateFrom: dateFrom as string,
              dateTo: dateTo as string,
              page: page ? parseInt(page as string) : 1,
              limit: limit ? parseInt(limit as string) : 50
            });
            break;

          case 'low-stock':
            responseData = await reportsQueries.getLowStockReport({
              branch: locationId
            });
            break;

          case 'product-analysis':
            responseData = await reportsQueries.getProductAnalysisReport({
              branch: locationId,
              period: period as string
            });
            break;

          default:
            await pool.end();
            return res.status(400).json({
              success: false,
              message: 'Invalid report type'
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
        const mockData = generateMockReportsData();
        isFromMock = true;

        switch (reportType) {
          case 'stock-value':
            responseData = {
              summary: mockData.stockValueSummary,
              period: period,
              branch: branch,
              generatedAt: new Date().toISOString()
            };
            break;

          case 'stock-movement':
            responseData = {
              movements: mockData.stockMovements,
              total: mockData.stockMovements.length,
              page: 1,
              limit: 50
            };
            break;

          case 'low-stock':
            responseData = {
              products: mockData.lowStockProducts
            };
            break;

          case 'product-analysis':
            responseData = mockData.productAnalysis;
            break;
        }
      }

      // For POST requests with format parameter, return export-ready response
      if (isPost && format) {
        operationLogger.info('Export request processed', { format, reportType });
        return res.status(200).json({
          success: true,
          data: {
            reportId: `RPT-${Date.now()}`,
            reportType,
            format,
            generatedAt: new Date().toISOString(),
            ...responseData
          },
          isFromMock,
          message: `Report generated successfully in ${format} format`
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
    operationLogger.error('Error in reports API', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message
    });
  }
}

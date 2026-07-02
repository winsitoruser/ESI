import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { getLogger } from '@/lib/logging';
import { timeout } from '@/lib/database-utils';

const logger = getLogger('api-stock-performance');

// Mock data untuk stock performance analytics
const mockStockPerformance = {
  stockTurnoverRate: {
    overall: 2.5,
    byCategory: [
      { categoryName: 'Obat Keras', turnoverRate: 3.2 },
      { categoryName: 'Obat Bebas', turnoverRate: 2.8 },
      { categoryName: 'Vitamin', turnoverRate: 1.9 },
      { categoryName: 'Alat Kesehatan', turnoverRate: 1.2 }
    ]
  },
  stockLevels: {
    optimal: 85,
    lowStock: 12,
    outOfStock: 3,
    overstocked: 8
  },
  expiryAnalysis: {
    expiringSoon: 15,
    expired: 2
  },
  topPerformingProducts: [
    { id: 'PROD001', name: 'Paracetamol 500mg', turnoverRate: 4.2, profitMargin: 25, stockLevel: 'Optimal' },
    { id: 'PROD002', name: 'Amoxicillin 500mg', turnoverRate: 3.8, profitMargin: 30, stockLevel: 'Low' },
    { id: 'PROD003', name: 'Vitamin C 1000mg', turnoverRate: 3.5, profitMargin: 35, stockLevel: 'Optimal' }
  ],
  poorPerformingProducts: [
    { id: 'PROD020', name: 'Obat Jarang', turnoverRate: 0.2, profitMargin: 15, stockLevel: 'Overstocked' },
    { id: 'PROD021', name: 'Suplemen Khusus', turnoverRate: 0.5, profitMargin: 20, stockLevel: 'Optimal' }
  ],
  stockMovementTrend: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    inflow: [1200, 1350, 1100, 1450, 1300, 1250],
    outflow: [1100, 1200, 1050, 1300, 1150, 1100]
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const childLogger = logger.child({ 
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    if (req.method === 'GET') {
      try {
        // Attempt to get real data from InventoryAdapter
        // For now, fallback to mock data with timeout protection
        const performanceData = await timeout(
          Promise.resolve(mockStockPerformance),
          10000
        );

        childLogger.info('Stock performance data retrieved successfully', {
          dataSource: 'mock_fallback',
          recordCount: performanceData.topPerformingProducts.length
        });

        return res.status(200).json({
          success: true,
          data: performanceData,
          isFromMock: true,
          message: 'Stock performance analytics retrieved successfully'
        });

      } catch (error) {
        childLogger.error('Error retrieving stock performance data', { error });
        
        return res.status(200).json({
          success: true,
          data: mockStockPerformance,
          isFromMock: true,
          message: 'Stock performance analytics retrieved from fallback data'
        });
      }
    }

    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });

  } catch (error) {
    childLogger.error('Stock performance API error', { error });
    
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
      message: 'Failed to retrieve stock performance analytics'
    });
  }
}

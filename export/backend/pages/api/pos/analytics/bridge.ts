import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

/**
 * Bridge handler untuk Analytics di modul POS
 * Implementasi dengan Sequelize
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Autentikasi
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const tenantId = (session?.user as any)?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Gunakan adapter POS untuk analytics
    const { getTransactionStats, getSalesByCategory, getSalesByProduct } = require('../../../../server/sequelize/adapters/pos-adapter');
    
    if (req.method === 'GET') {
      // Parse query parameters
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Dapatkan semua analytics secara paralel
      const [stats, salesByCategory, salesByProduct] = await Promise.all([
        getTransactionStats(tenantId, { startDate, endDate }),
        getSalesByCategory(tenantId, { startDate, endDate }),
        getSalesByProduct(tenantId, { startDate, endDate, limit: 10 })
      ]);
      
      // Gabungkan data dan berikan response
      return res.status(200).json({
        stats,
        salesByCategory,
        salesByProduct,
        success: true,
        adapter: 'sequelize'
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err: any) {
    console.error('Error handling POS analytics request:', err);
    
    // Gunakan warna merah-oranye untuk fallback data sesuai preferensi user
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      success: false,
      fallback: {
        stats: {
          totalSales: 0,
          totalTransactions: 0,
          averageTransactionAmount: 0,
          totalCustomers: 0
        },
        salesByCategory: [
          { name: 'Obat Bebas', value: 0, percentage: 0, color: '#ef4444' },
          { name: 'Obat Keras', value: 0, percentage: 0, color: '#f97316' },
          { name: 'Suplemen', value: 0, percentage: 0, color: '#fb923c' }
        ],
        salesByProduct: []
      }
    });
  }
}

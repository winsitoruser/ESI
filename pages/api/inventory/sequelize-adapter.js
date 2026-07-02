import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getProducts, getInventoryStatistics } from '../../../server/sequelize/adapters/inventory-adapter';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // Check authentication
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = session.user.tenantId;
  
  if (req.method === 'GET') {
    try {
      // Get query parameters
      const { limit = 100, offset = 0, category, search } = req.query;
      
      // Parse parameters
      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);
      const filters = {
        category,
        search
      };
      
      // Get products
      const products = await getProducts(tenantId, parsedLimit, parsedOffset, filters);
      
      // Get inventory statistics
      const statistics = await getInventoryStatistics(tenantId);
      
      // Return combined response
      return res.status(200).json({
        products,
        statistics,
        success: true
      });
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      return res.status(500).json({
        error: 'Error fetching inventory data',
        message: error.message,
        success: false
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { getInventoryBatches } from '../../../../server/sequelize/adapters/inventory-adapter';

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
      const { limit = 100, offset = 0, expiryDays = 30, productId } = req.query;
      
      // Parse parameters
      const parsedLimit = parseInt(limit);
      const parsedOffset = parseInt(offset);
      const filters = {
        expiryDays: parseInt(expiryDays),
        productId
      };
      
      // Get expired/expiring products
      const expiringProducts = await getInventoryBatches(tenantId, parsedLimit, parsedOffset, filters);
      
      // Return response
      return res.status(200).json({
        expiringProducts,
        success: true
      });
    } catch (error) {
      console.error('Error fetching expiring products data:', error);
      return res.status(500).json({
        error: 'Error fetching expiring products data',
        message: error.message,
        success: false
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

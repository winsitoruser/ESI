import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import KitchenInventoryService from '../../../../../../lib/services/KitchenInventoryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session || !session.user?.tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    if (req.method === 'GET') {
      const stats = await KitchenInventoryService.getInventoryStats(tenantId);
      
      return res.status(200).json({
        success: true,
        data: stats
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Kitchen inventory stats API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import KitchenOrderService from '../../../../services/kitchen/KitchenOrderService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session || !session.user?.tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    if (req.method === 'GET') {
      const { status, orderType, search, limit = '50', offset = '0' } = req.query;
      
      const result = await KitchenOrderService.getOrders(tenantId, {
        status: status as string,
        orderType: orderType as string,
        search: search as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      return res.status(200).json({
        success: true,
        data: result.orders,
        total: result.total,
        hasMore: result.hasMore
      });
    }

    if (req.method === 'POST') {
      const orderData = req.body;
      
      const order = await KitchenOrderService.createOrder(tenantId, orderData);
      
      return res.status(201).json({
        success: true,
        data: order
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Kitchen orders API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import KitchenOrderService from '../../../../../src/services/kitchen/KitchenOrderService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    const { id } = req.query;
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    if (req.method === 'PATCH') {
      const { status } = req.body;
      const chefId = session.user?.id;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const order = await KitchenOrderService.updateOrderStatus(id, status, chefId);
      
      return res.status(200).json({ 
        success: true, 
        data: order,
        message: `Order ${id} updated to ${status}` 
      });
    }

    if (req.method === 'GET') {
      const order = await KitchenOrderService.getOrderById(id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      return res.status(200).json({
        success: true,
        data: order
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Kitchen order API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

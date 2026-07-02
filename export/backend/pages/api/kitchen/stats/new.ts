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
    const { period = 'today' } = req.query;

    if (req.method === 'GET') {
      const stats = await KitchenOrderService.getCookingStats(
        tenantId, 
        period as 'today' | 'week' | 'month'
      );
      
      // Calculate additional metrics
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Get orders per hour
      const ordersPerHour = await KitchenOrderService.getOrders(tenantId, {
        status: 'all',
        limit: 1000
      });
      
      const todayOrders = ordersPerHour.orders.filter((o: any) => 
        new Date(o.receivedAt) >= startOfDay
      );
      
      const hoursElapsed = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
      const ordersPerHourAvg = Math.round(todayOrders.length / Math.max(1, hoursElapsed));
      
      return res.status(200).json({
        success: true,
        data: {
          ...stats,
          ordersPerHour: ordersPerHourAvg,
          todayOrders: todayOrders.length
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Kitchen stats API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

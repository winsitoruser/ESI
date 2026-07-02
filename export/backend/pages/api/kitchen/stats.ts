import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get kitchen statistics
      // TODO: Implement actual database query
      const stats = {
        totalOrdersToday: 45,
        averagePrepTime: 18.5,
        fastestOrder: 8,
        slowestOrder: 35,
        ordersPerHour: 12,
        efficiencyRate: 85
      };
      
      return res.status(200).json(stats);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Kitchen stats API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

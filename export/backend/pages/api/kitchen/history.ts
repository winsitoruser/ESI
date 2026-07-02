import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get cooking history
      // TODO: Implement actual database query
      const history = [
        {
          id: '1',
          orderNumber: 'ORD-005',
          itemName: 'Nasi Goreng Spesial',
          quantity: 2,
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 2700000),
          duration: 900,
          chefName: 'Chef Joko',
          actualTime: 15,
          estimatedTime: 15
        },
        {
          id: '2',
          orderNumber: 'ORD-006',
          itemName: 'Ayam Bakar',
          quantity: 1,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 5400000),
          duration: 1800,
          chefName: 'Chef Siti',
          actualTime: 30,
          estimatedTime: 25
        }
      ];
      
      return res.status(200).json(history);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Kitchen history API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    const { id } = req.query;
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'PATCH') {
      // Update order status
      const { status } = req.body;
      
      // TODO: Update in database
      console.log(`Updating order ${id} to status: ${status}`);
      
      return res.status(200).json({ 
        success: true, 
        message: `Order ${id} updated to ${status}` 
      });
    }

    if (req.method === 'GET') {
      // Get single order
      // TODO: Fetch from database
      return res.status(200).json({ id, status: 'preparing' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Kitchen order API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

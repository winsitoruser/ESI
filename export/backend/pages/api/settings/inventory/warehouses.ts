import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const Warehouse = require('@/models/Warehouse');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const warehouses = await Warehouse.findAll({
        order: [['name', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: warehouses
      });

    } else if (req.method === 'POST') {
      const { name, location, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Warehouse name is required' });
      }

      const warehouse = await Warehouse.create({
        name,
        location: location || null,
        description: description || null
      });

      return res.status(201).json({
        success: true,
        message: 'Warehouse created successfully',
        data: warehouse
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in warehouses API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process warehouses',
      details: error.message
    });
  }
}

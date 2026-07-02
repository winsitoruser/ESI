import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const Unit = require('@/models/Unit');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const units = await Unit.findAll({
        order: [['name', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: units
      });

    } else if (req.method === 'POST') {
      const { name, symbol } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Unit name is required' });
      }

      const unit = await Unit.create({
        name,
        symbol: symbol || null
      });

      return res.status(201).json({
        success: true,
        message: 'Unit created successfully',
        data: unit
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in units API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process units',
      details: error.message
    });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { Table } = db;
    const { floor } = req.query;

    const floorNumber = parseInt(floor as string);

    if (isNaN(floorNumber)) {
      return res.status(400).json({ success: false, error: 'Invalid floor number' });
    }

    const tables = await Table.findAll({
      where: {
        floor: floorNumber,
        isActive: true
      },
      include: [
        {
          association: 'currentSession',
          required: false
        },
        {
          association: 'currentReservation',
          required: false
        }
      ],
      order: [['positionX', 'ASC'], ['positionY', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        floor: floorNumber,
        tables,
        totalTables: tables.length,
        availableCount: tables.filter((t: any) => t.status === 'available').length,
        occupiedCount: tables.filter((t: any) => t.status === 'occupied').length,
        reservedCount: tables.filter((t: any) => t.status === 'reserved').length
      }
    });
  } catch (error: any) {
    console.error('Table layout API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

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

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { Reservation } = db;
    const { id } = req.query;
    const { tableId } = req.body;

    if (!tableId) {
      return res.status(400).json({ success: false, error: 'Table ID is required' });
    }

    const reservation = await Reservation.findByPk(id);

    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    await reservation.assignTable(tableId);

    return res.status(200).json({
      success: true,
      data: reservation,
      message: `Table ${reservation.tableNumber} assigned successfully`
    });
  } catch (error: any) {
    console.error('Assign table API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

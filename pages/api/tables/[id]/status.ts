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

    if (req.method !== 'PATCH') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { Table } = db;
    const { id } = req.query;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const validStatuses = ['available', 'occupied', 'reserved', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const table = await Table.findByPk(id);

    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    await table.updateStatus(status);

    return res.status(200).json({
      success: true,
      data: table,
      message: `Table status updated to ${status}`
    });
  } catch (error: any) {
    console.error('Update table status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

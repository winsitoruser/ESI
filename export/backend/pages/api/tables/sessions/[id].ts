import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { TableSession, Table } = db;

    const tableSession = await TableSession.findByPk(id, {
      include: [{ model: Table, as: 'table' }]
    });

    if (!tableSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({ success: true, data: tableSession });

      case 'PUT':
        const { guestCount, customerName, notes, status } = req.body;
        
        await tableSession.update({
          ...(guestCount && { guestCount }),
          ...(customerName && { customerName }),
          ...(notes !== undefined && { notes }),
          ...(status && { status })
        });

        if (guestCount && tableSession.table) {
          await tableSession.table.update({ currentGuestCount: guestCount });
        }

        return res.status(200).json({ success: true, data: tableSession });

      case 'DELETE':
        // End session
        await tableSession.update({
          status: 'completed',
          endedAt: new Date(),
          endedBy: (session.user as any).id
        });

        // Free up the table
        if (tableSession.table) {
          await tableSession.table.update({ 
            status: 'available', 
            currentGuestCount: 0 
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Session ended, table is now available'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Table Session API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

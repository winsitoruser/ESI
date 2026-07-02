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

    const { TableSession, Table } = db;

    switch (req.method) {
      case 'GET':
        const { tableId, status } = req.query;
        const where: any = {};
        if (tableId) where.tableId = tableId;
        if (status) where.status = status;

        const sessions = await TableSession.findAll({
          where,
          include: [{ model: Table, as: 'table' }],
          order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({ success: true, data: sessions });

      case 'POST':
        const { tableId: tId, guestCount, customerName, notes } = req.body;

        if (!tId) {
          return res.status(400).json({ error: 'Table ID is required' });
        }

        // Check if table is available
        const table = await Table.findByPk(tId);
        if (!table) {
          return res.status(404).json({ error: 'Table not found' });
        }

        if (table.status === 'occupied') {
          return res.status(400).json({ error: 'Table is already occupied' });
        }

        // Create session and update table status
        const newSession = await TableSession.create({
          tableId: tId,
          guestCount: guestCount || 1,
          customerName,
          notes,
          status: 'active',
          startedAt: new Date(),
          startedBy: (session.user as any).id
        });

        await table.update({ status: 'occupied', currentGuestCount: guestCount || 1 });

        return res.status(201).json({
          success: true,
          message: 'Table session started',
          data: newSession
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Table Sessions API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

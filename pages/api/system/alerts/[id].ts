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
    const { SystemAlert } = db;

    const alert = await SystemAlert.findByPk(id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({ success: true, data: alert });

      case 'PUT':
        const { status, notes } = req.body;
        
        await alert.update({
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
          ...(status === 'read' && { readAt: new Date(), readBy: (session.user as any).id }),
          ...(status === 'resolved' && { resolvedAt: new Date(), resolvedBy: (session.user as any).id })
        });

        return res.status(200).json({
          success: true,
          message: 'Alert updated',
          data: alert
        });

      case 'DELETE':
        await alert.destroy();
        return res.status(200).json({
          success: true,
          message: 'Alert deleted'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('System Alert API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

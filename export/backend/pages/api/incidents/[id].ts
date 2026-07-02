import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { IncidentReport } = db;

    const incident = await IncidentReport.findByPk(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({ success: true, data: incident });

      case 'PUT':
        const { status, resolution, severity, notes } = req.body;
        
        await incident.update({
          ...(status && { status }),
          ...(resolution && { resolution }),
          ...(severity && { severity }),
          ...(notes !== undefined && { notes }),
          ...(status === 'resolved' && { 
            resolvedAt: new Date(), 
            resolvedBy: (session.user as any).id 
          })
        });

        return res.status(200).json({
          success: true,
          message: 'Incident updated',
          data: incident
        });

      case 'DELETE':
        await incident.destroy();
        return res.status(200).json({
          success: true,
          message: 'Incident deleted'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Incident API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

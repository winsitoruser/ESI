import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { AuditLog, User } = getDb();
    const { entityType, entityId } = req.query;

    if (!entityType) {
      return res.status(400).json({ error: 'Entity type is required' });
    }

    if (req.method === 'GET') {
      const where: any = { entityType };
      if (entityId) {
        where.entityId = entityId;
      }

      const logs = await AuditLog.findAll({
        where,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }],
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      const formattedLogs = logs.map((log: any) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        description: log.description,
        timestamp: log.createdAt,
        user: log.user ? {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email
        } : null
      }));

      return res.status(200).json({
        success: true,
        data: formattedLogs
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error fetching audit history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch audit history',
      details: error.message
    });
  }
}

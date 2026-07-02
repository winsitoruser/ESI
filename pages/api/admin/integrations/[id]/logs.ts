import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../../models');
const { IntegrationLog, PartnerIntegration } = db;
const { Op } = require('sequelize');

/**
 * GET /api/admin/integrations/:id/logs - Get integration logs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const userRole = (session?.user?.role as string)?.toLowerCase();
    
    if (!session || !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const {
      page = 1,
      limit = 50,
      action,
      status,
      startDate,
      endDate
    } = req.query;

    // Verify integration exists
    const integration = await PartnerIntegration.findByPk(id);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Build where clause
    const where: any = { integrationId: id };
    
    if (action) {
      where.action = action;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate as string);
      }
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const { count, rows: logs } = await IntegrationLog.findAndCountAll({
      where,
      limit: parseInt(limit as string),
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Get statistics
    const stats = await IntegrationLog.findAll({
      where: { integrationId: id },
      attributes: [
        'action',
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['action', 'status'],
      raw: true
    });

    return res.status(200).json({
      success: true,
      data: logs,
      stats,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(count / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Integration Logs API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

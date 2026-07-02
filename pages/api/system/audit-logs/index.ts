import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = (session?.user as any)?.role?.toLowerCase();
    if (!['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { AuditLog, User } = db;

    switch (req.method) {
      case 'GET':
        const { action, userId, entityType, startDate, endDate, page = 1, limit = 50 } = req.query;
        const where: any = {};

        if (action) where.action = action;
        if (userId) where.userId = userId;
        if (entityType) where.entityType = entityType;
        if (startDate || endDate) {
          where.createdAt = {};
          if (startDate) where.createdAt[Op.gte] = new Date(startDate as string);
          if (endDate) where.createdAt[Op.lte] = new Date(endDate as string);
        }

        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        const { count, rows } = await AuditLog.findAndCountAll({
          where,
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
          limit: parseInt(limit as string),
          offset,
          order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
          success: true,
          data: rows,
          pagination: {
            total: count,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(count / parseInt(limit as string))
          }
        });

      case 'POST':
        // Internal use - create audit log entry
        const { action: logAction, entityType: logEntityType, entityId, oldValues, newValues, metadata } = req.body;

        const log = await AuditLog.create({
          userId: (session.user as any).id,
          action: logAction,
          entityType: logEntityType,
          entityId,
          oldValues,
          newValues,
          metadata,
          ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        });

        return res.status(201).json({
          success: true,
          data: log
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Audit Logs API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

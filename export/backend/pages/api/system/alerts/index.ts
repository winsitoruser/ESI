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

    const { SystemAlert } = db;

    switch (req.method) {
      case 'GET':
        const { status, type, priority, page = 1, limit = 20 } = req.query;
        const where: any = {};

        if (status) where.status = status;
        if (type) where.type = type;
        if (priority) where.priority = priority;

        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        const { count, rows } = await SystemAlert.findAndCountAll({
          where,
          limit: parseInt(limit as string),
          offset,
          order: [['createdAt', 'DESC']]
        });

        const unreadCount = await SystemAlert.count({ where: { status: 'unread' } });

        return res.status(200).json({
          success: true,
          data: rows,
          unreadCount,
          pagination: {
            total: count,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(count / parseInt(limit as string))
          }
        });

      case 'POST':
        const { title, message, type: alertType, priority: alertPriority, metadata } = req.body;

        if (!title || !message) {
          return res.status(400).json({ error: 'Title and message are required' });
        }

        const alert = await SystemAlert.create({
          title,
          message,
          type: alertType || 'info',
          priority: alertPriority || 'normal',
          status: 'unread',
          metadata,
          createdBy: (session.user as any).id
        });

        return res.status(201).json({
          success: true,
          message: 'Alert created',
          data: alert
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('System Alerts API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

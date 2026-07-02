import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { PartnerSubscription, Partner, SubscriptionPackage } = db;
const { Op } = require('sequelize');

/**
 * GET /api/admin/subscriptions
 * List all subscriptions with filters and pagination
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

    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build include with search
    const include: any = [
      {
        model: Partner,
        as: 'partner',
        attributes: ['id', 'businessName', 'ownerName', 'email', 'phone'],
        ...(search && {
          where: {
            [Op.or]: [
              { businessName: { [Op.iLike]: `%${search}%` } },
              { ownerName: { [Op.iLike]: `%${search}%` } },
              { email: { [Op.iLike]: `%${search}%` } }
            ]
          }
        })
      },
      {
        model: SubscriptionPackage,
        as: 'package',
        attributes: ['id', 'name', 'price', 'duration', 'features']
      }
    ];

    const { count, rows: subscriptions } = await PartnerSubscription.findAndCountAll({
      where,
      include,
      limit: parseInt(limit as string),
      offset,
      order: [[sort_by as string, sort_order as string]],
      distinct: true
    });

    return res.status(200).json({
      success: true,
      data: subscriptions,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(count / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Admin Subscriptions API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

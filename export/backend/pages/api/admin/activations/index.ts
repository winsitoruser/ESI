import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { ActivationRequest, Partner, SubscriptionPackage } = db;
const { Op } = require('sequelize');

/**
 * GET /api/admin/activations
 * List all activation requests
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      page = 1,
      limit = 20,
      status = 'pending',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const { count, rows: requests } = await ActivationRequest.findAndCountAll({
      where,
      include: [
        {
          model: Partner,
          as: 'partner',
          attributes: ['id', 'business_name', 'owner_name', 'email', 'phone', 'city']
        },
        {
          model: SubscriptionPackage,
          as: 'package',
          attributes: ['id', 'name', 'price_monthly', 'max_outlets', 'max_users']
        }
      ],
      order: [[sort_by as string, sort_order as string]],
      limit: parseInt(limit as string),
      offset
    });

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total_pages: Math.ceil(count / parseInt(limit as string))
      }
    });

  } catch (error: any) {
    console.error('Get Activation Requests Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch activation requests',
      details: error.message
    });
  }
}

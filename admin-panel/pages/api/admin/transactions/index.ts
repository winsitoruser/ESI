import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { Op } = require('sequelize');

/**
 * GET /api/admin/transactions
 * Get transactions overview across all partners/outlets
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      page = 1,
      limit = 50,
      partner_id,
      outlet_id,
      start_date,
      end_date,
      status = 'completed'
    } = req.query;

    // Check if PosTransaction model exists
    if (!db.PosTransaction || !db.PartnerOutlet || !db.Partner) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, total_pages: 0 },
        message: 'Transaction models not available'
      });
    }

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (outlet_id) {
      where.outlet_id = outlet_id;
    }
    
    if (start_date || end_date) {
      where.transaction_date = {};
      if (start_date) {
        where.transaction_date[Op.gte] = new Date(start_date as string);
      }
      if (end_date) {
        where.transaction_date[Op.lte] = new Date(end_date as string);
      }
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // If partner_id filter, need to join through outlet
    let includeClause: any = [
      {
        model: db.PartnerOutlet,
        as: 'outlet',
        attributes: ['id', 'outlet_name', 'outlet_code', 'partner_id'],
        include: [{
          model: db.Partner,
          as: 'partner',
          attributes: ['id', 'business_name'],
          ...(partner_id ? { where: { id: partner_id } } : {})
        }]
      }
    ];

    const { count, rows: transactions } = await db.PosTransaction.findAndCountAll({
      where,
      include: includeClause,
      order: [['transaction_date', 'DESC']],
      limit: parseInt(limit as string),
      offset
    });

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total_pages: Math.ceil(count / parseInt(limit as string))
      }
    });

  } catch (error: any) {
    console.error('Get Transactions Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      details: error.message
    });
  }
}

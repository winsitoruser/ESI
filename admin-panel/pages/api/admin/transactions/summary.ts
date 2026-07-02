import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { Op } = require('sequelize');

/**
 * GET /api/admin/transactions/summary
 * Get transaction summary statistics by partner or outlet
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
      group_by = 'partner', // 'partner' or 'outlet'
      start_date,
      end_date,
      limit = 20
    } = req.query;

    // Check if models exist
    if (!db.PosTransaction || !db.PartnerOutlet || !db.Partner) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Transaction models not available'
      });
    }

    // Build date filter
    const dateWhere: any = { status: 'completed' };
    if (start_date || end_date) {
      dateWhere.transaction_date = {};
      if (start_date) {
        dateWhere.transaction_date[Op.gte] = new Date(start_date as string);
      }
      if (end_date) {
        dateWhere.transaction_date[Op.lte] = new Date(end_date as string);
      }
    }

    let summary;

    if (group_by === 'partner') {
      // Group by partner
      summary = await db.PosTransaction.findAll({
        where: dateWhere,
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('PosTransaction.id')), 'transaction_count'],
          [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total_revenue'],
          [db.sequelize.fn('AVG', db.sequelize.col('total_amount')), 'avg_transaction_value'],
          [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('outlet.id'))), 'outlet_count']
        ],
        include: [{
          model: db.PartnerOutlet,
          as: 'outlet',
          attributes: [],
          include: [{
            model: db.Partner,
            as: 'partner',
            attributes: ['id', 'business_name', 'city']
          }]
        }],
        group: ['outlet->partner.id', 'outlet->partner.business_name', 'outlet->partner.city'],
        order: [[db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'DESC']],
        limit: parseInt(limit as string),
        raw: false,
        subQuery: false
      });

    } else {
      // Group by outlet
      summary = await db.PosTransaction.findAll({
        where: dateWhere,
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('PosTransaction.id')), 'transaction_count'],
          [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total_revenue'],
          [db.sequelize.fn('AVG', db.sequelize.col('total_amount')), 'avg_transaction_value']
        ],
        include: [{
          model: db.PartnerOutlet,
          as: 'outlet',
          attributes: ['id', 'outlet_name', 'outlet_code', 'city'],
          include: [{
            model: db.Partner,
            as: 'partner',
            attributes: ['id', 'business_name']
          }]
        }],
        group: ['outlet.id', 'outlet.outlet_name', 'outlet.outlet_code', 'outlet.city', 'outlet->partner.id', 'outlet->partner.business_name'],
        order: [[db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'DESC']],
        limit: parseInt(limit as string),
        raw: false,
        subQuery: false
      });
    }

    // Transform data
    const transformedSummary = summary.map((item: any) => {
      const data = item.get({ plain: true });
      return {
        ...(group_by === 'partner' ? {
          partner_id: data.outlet?.partner?.id,
          partner_name: data.outlet?.partner?.business_name,
          city: data.outlet?.partner?.city,
          outlet_count: parseInt(data.outlet_count || 0)
        } : {
          outlet_id: data.outlet?.id,
          outlet_name: data.outlet?.outlet_name,
          outlet_code: data.outlet?.outlet_code,
          city: data.outlet?.city,
          partner_id: data.outlet?.partner?.id,
          partner_name: data.outlet?.partner?.business_name
        }),
        transaction_count: parseInt(data.transaction_count || 0),
        total_revenue: parseFloat(data.total_revenue || 0),
        avg_transaction_value: parseFloat(data.avg_transaction_value || 0)
      };
    });

    // Get overall totals
    const overallStats = await db.PosTransaction.findAll({
      where: dateWhere,
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_transactions'],
        [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total_revenue'],
        [db.sequelize.fn('AVG', db.sequelize.col('total_amount')), 'avg_transaction_value']
      ],
      raw: true
    });

    return res.status(200).json({
      success: true,
      data: transformedSummary,
      overall: {
        total_transactions: parseInt(overallStats[0]?.total_transactions || 0),
        total_revenue: parseFloat(overallStats[0]?.total_revenue || 0),
        avg_transaction_value: parseFloat(overallStats[0]?.avg_transaction_value || 0)
      }
    });

  } catch (error: any) {
    console.error('Get Transaction Summary Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction summary',
      details: error.message
    });
  }
}

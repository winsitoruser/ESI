import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { PartnerOutlet, Partner, PartnerUser } = db;
const { Op } = require('sequelize');

/**
 * GET /api/admin/outlets/:id
 * Get outlet details with transaction statistics
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

    const { id } = req.query;

    const outlet = await PartnerOutlet.findByPk(id as string, {
      include: [
        {
          model: Partner,
          as: 'partner',
          attributes: ['id', 'business_name', 'owner_name', 'email', 'phone', 'status']
        },
        {
          model: PartnerUser,
          as: 'users',
          attributes: ['id', 'name', 'email', 'role', 'is_active', 'last_login_at']
        }
      ]
    });

    if (!outlet) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    // Get transaction statistics
    let transactionStats = {
      today: { count: 0, total: 0 },
      week: { count: 0, total: 0 },
      month: { count: 0, total: 0 },
      year: { count: 0, total: 0 }
    };

    try {
      if (db.PosTransaction) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        // Today's transactions
        const todayTxs = await db.PosTransaction.findAll({
          where: {
            outlet_id: id,
            transaction_date: { [Op.gte]: today },
            status: 'completed'
          },
          attributes: [
            [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
            [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total']
          ],
          raw: true
        });

        // Week's transactions
        const weekTxs = await db.PosTransaction.findAll({
          where: {
            outlet_id: id,
            transaction_date: { [Op.gte]: weekAgo },
            status: 'completed'
          },
          attributes: [
            [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
            [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total']
          ],
          raw: true
        });

        // Month's transactions
        const monthTxs = await db.PosTransaction.findAll({
          where: {
            outlet_id: id,
            transaction_date: { [Op.gte]: monthStart },
            status: 'completed'
          },
          attributes: [
            [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
            [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total']
          ],
          raw: true
        });

        // Year's transactions
        const yearTxs = await db.PosTransaction.findAll({
          where: {
            outlet_id: id,
            transaction_date: { [Op.gte]: yearStart },
            status: 'completed'
          },
          attributes: [
            [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
            [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'total']
          ],
          raw: true
        });

        transactionStats = {
          today: {
            count: parseInt(todayTxs[0]?.count || 0),
            total: parseFloat(todayTxs[0]?.total || 0)
          },
          week: {
            count: parseInt(weekTxs[0]?.count || 0),
            total: parseFloat(weekTxs[0]?.total || 0)
          },
          month: {
            count: parseInt(monthTxs[0]?.count || 0),
            total: parseFloat(monthTxs[0]?.total || 0)
          },
          year: {
            count: parseInt(yearTxs[0]?.count || 0),
            total: parseFloat(yearTxs[0]?.total || 0)
          }
        };
      }
    } catch (error) {
      console.warn('Could not fetch transaction statistics:', error);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...outlet.toJSON(),
        transaction_stats: transactionStats
      }
    });

  } catch (error: any) {
    console.error('Get Outlet Detail Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch outlet details',
      details: error.message
    });
  }
}

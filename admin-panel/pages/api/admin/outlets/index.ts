import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { PartnerOutlet, Partner } = db;
const { Op } = require('sequelize');

/**
 * GET /api/admin/outlets
 * List all outlets across all partners
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
      limit = 20,
      partner_id,
      city,
      is_active,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    // Build where clause
    const where: any = {};
    
    if (partner_id) {
      where.partner_id = partner_id;
    }
    
    if (city) {
      where.city = city;
    }
    
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { outlet_name: { [Op.iLike]: `%${search}%` } },
        { outlet_code: { [Op.iLike]: `%${search}%` } },
        { manager_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const { count, rows: outlets } = await PartnerOutlet.findAndCountAll({
      where,
      include: [{
        model: Partner,
        as: 'partner',
        attributes: ['id', 'business_name', 'status']
      }],
      order: [[sort_by as string, sort_order as string]],
      limit: parseInt(limit as string),
      offset
    });

    // Get transaction counts for each outlet (if PosTransaction exists)
    const outletsWithStats = await Promise.all(outlets.map(async (outlet: any) => {
      let todayTransactions = 0;
      let monthlyTransactions = 0;
      
      try {
        // Check if PosTransaction model exists
        if (db.PosTransaction) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          
          todayTransactions = await db.PosTransaction.count({
            where: {
              outlet_id: outlet.id,
              transaction_date: { [Op.gte]: today }
            }
          });
          
          monthlyTransactions = await db.PosTransaction.count({
            where: {
              outlet_id: outlet.id,
              transaction_date: { [Op.gte]: startOfMonth }
            }
          });
        }
      } catch (error) {
        console.warn('Could not fetch transaction stats:', error);
      }

      return {
        id: outlet.id,
        outlet_name: outlet.outletName,
        outlet_code: outlet.outletCode,
        partner: {
          id: outlet.partner?.id,
          business_name: outlet.partner?.businessName,
          status: outlet.partner?.status
        },
        address: outlet.address,
        city: outlet.city,
        province: outlet.province,
        phone: outlet.phone,
        manager_name: outlet.managerName,
        is_active: outlet.isActive,
        pos_device_id: outlet.posDeviceId,
        last_sync_at: outlet.lastSyncAt,
        today_transactions: todayTransactions,
        monthly_transactions: monthlyTransactions,
        created_at: outlet.createdAt,
        updated_at: outlet.updatedAt
      };
    }));

    return res.status(200).json({
      success: true,
      data: outletsWithStats,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total_pages: Math.ceil(count / parseInt(limit as string))
      }
    });

  } catch (error: any) {
    console.error('Get Outlets Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch outlets',
      details: error.message
    });
  }
}

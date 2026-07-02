import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const Promo = require('../../../models/Promo');
const Voucher = require('../../../models/Voucher');
const sequelize = require('../../../models').sequelize;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current month start and end
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Count active promos
    const totalActivePromos = await Promo.count({
      where: {
        status: 'active',
        isActive: true,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      }
    });

    // Count active vouchers
    const totalActiveVouchers = await Voucher.count({
      where: {
        status: 'active',
        isActive: true,
        validFrom: { [Op.lte]: now },
        validUntil: { [Op.gte]: now }
      }
    });

    // Total usage this month (promos + vouchers)
    const promoUsageThisMonth = await Promo.sum('usageCount', {
      where: {
        isActive: true,
        updatedAt: { [Op.between]: [monthStart, monthEnd] }
      }
    }) || 0;

    const voucherUsageThisMonth = await Voucher.sum('usageCount', {
      where: {
        isActive: true,
        updatedAt: { [Op.between]: [monthStart, monthEnd] }
      }
    }) || 0;

    const totalUsageThisMonth = promoUsageThisMonth + voucherUsageThisMonth;

    // Calculate total discount given (mock calculation)
    // In real scenario, this should come from transaction records
    const totalDiscountGiven = 45000000; // Mock value

    // Get top performing promos
    const topPromos = await Promo.findAll({
      where: { isActive: true },
      order: [['usageCount', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'code', 'usageCount', 'usageLimit', 'type', 'value']
    });

    // Get top performing vouchers
    const topVouchers = await Voucher.findAll({
      where: { isActive: true },
      order: [['usageCount', 'DESC']],
      limit: 5,
      attributes: ['id', 'code', 'category', 'usageCount', 'usageLimit', 'type', 'value']
    });

    // Get expiring soon (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringPromos = await Promo.count({
      where: {
        status: 'active',
        isActive: true,
        endDate: {
          [Op.between]: [now, sevenDaysFromNow]
        }
      }
    });

    const expiringVouchers = await Voucher.count({
      where: {
        status: 'active',
        isActive: true,
        validUntil: {
          [Op.between]: [now, sevenDaysFromNow]
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalActivePromos,
          totalActiveVouchers,
          totalUsageThisMonth,
          totalDiscountGiven
        },
        topPerformers: {
          promos: topPromos,
          vouchers: topVouchers
        },
        alerts: {
          expiringPromos,
          expiringVouchers
        }
      }
    });

  } catch (error: any) {
    console.error('Stats API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

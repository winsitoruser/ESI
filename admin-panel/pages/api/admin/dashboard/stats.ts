import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { Partner, PartnerOutlet, PartnerSubscription, ActivationRequest, SubscriptionPackage } = db;
const { Op } = require('sequelize');

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics for admin panel
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

    // Get date ranges
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // 1. Total Partners Statistics
    const [totalPartners, activePartners, pendingPartners, suspendedPartners] = await Promise.all([
      Partner.count(),
      Partner.count({ where: { status: 'active' } }),
      Partner.count({ where: { status: 'pending' } }),
      Partner.count({ where: { status: 'suspended' } })
    ]);

    // 2. Total Active POS Outlets
    const totalOutlets = await PartnerOutlet.count({ where: { is_active: true } });

    // 3. Pending Activation Requests
    const pendingActivations = await ActivationRequest.count({ 
      where: { status: 'pending' } 
    });

    // 4. Revenue Statistics
    const [monthlyRevenue, yearlyRevenue] = await Promise.all([
      PartnerSubscription.sum('total_paid', {
        where: {
          last_payment_date: { [Op.gte]: startOfMonth }
        }
      }),
      PartnerSubscription.sum('total_paid', {
        where: {
          last_payment_date: { [Op.gte]: startOfYear }
        }
      })
    ]);

    // 5. Active Subscriptions
    const activeSubscriptions = await PartnerSubscription.count({
      where: { status: 'active' }
    });

    // 6. Partner Growth (last 6 months)
    const partnerGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      
      const count = await Partner.count({
        where: {
          created_at: {
            [Op.gte]: monthDate,
            [Op.lt]: nextMonth
          }
        }
      });

      partnerGrowth.push({
        month: monthDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        count
      });
    }

    // 7. Package Distribution
    const packageDistribution = await PartnerSubscription.findAll({
      attributes: [
        'package_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('PartnerSubscription.id')), 'count']
      ],
      include: [{
        model: SubscriptionPackage,
        as: 'package',
        attributes: ['name']
      }],
      where: { status: 'active' },
      group: ['package_id', 'package.id', 'package.name'],
      raw: false
    });

    // 8. Recent Activations (last 7 days)
    const recentActivations = await ActivationRequest.count({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // 9. Expiring Subscriptions (next 30 days)
    const expiringSubscriptions = await PartnerSubscription.count({
      where: {
        end_date: {
          [Op.between]: [today, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
        },
        status: 'active'
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        partners: {
          total: totalPartners,
          active: activePartners,
          pending: pendingPartners,
          suspended: suspendedPartners
        },
        outlets: {
          total: totalOutlets
        },
        activations: {
          pending: pendingActivations,
          recent: recentActivations
        },
        revenue: {
          monthly: parseFloat(monthlyRevenue || 0),
          yearly: parseFloat(yearlyRevenue || 0)
        },
        subscriptions: {
          active: activeSubscriptions,
          expiring: expiringSubscriptions
        },
        charts: {
          partnerGrowth,
          packageDistribution: packageDistribution.map((item: any) => ({
            package: item.package?.name || 'Unknown',
            count: parseInt(item.dataValues.count)
          }))
        }
      }
    });

  } catch (error: any) {
    console.error('Admin Dashboard Stats Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    });
  }
}

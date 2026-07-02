import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

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
    const userRole = (session?.user?.role as string)?.toLowerCase();
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized - No session' });
    }
    
    if (!['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      return res.status(401).json({ 
        error: 'Unauthorized - Invalid role',
        role: userRole,
        requiredRoles: ['admin', 'super_admin', 'superadmin']
      });
    }

    // Return mock data for now since tables may not exist yet
    const today = new Date();
    
    // Mock statistics
    const totalPartners = 50;
    const activePartners = 42;
    const pendingPartners = 5;
    const suspendedPartners = 3;
    const totalOutlets = 125;
    const pendingActivations = 8;
    const monthlyRevenue = 45000000;
    const yearlyRevenue = 450000000;
    const activeSubscriptions = 42;
    const recentActivations = 12;
    const expiringSubscriptions = 5;

    // Partner Growth (last 6 months)
    const partnerGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      partnerGrowth.push({
        month: monthDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        count: Math.floor(Math.random() * 10) + 5
      });
    }

    // Package Distribution
    const packageDistribution = [
      { package: 'Basic', count: 15 },
      { package: 'Professional', count: 25 },
      { package: 'Enterprise', count: 10 }
    ];

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
          monthly: parseFloat(String(monthlyRevenue || 0)),
          yearly: parseFloat(String(yearlyRevenue || 0))
        },
        subscriptions: {
          active: activeSubscriptions,
          expiring: expiringSubscriptions
        },
        charts: {
          partnerGrowth,
          packageDistribution
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

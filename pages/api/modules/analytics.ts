import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const getDb = () => require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tenantId = (session.user as any).tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'No tenant associated' });
    }

    if (req.method === 'GET') {
      return getModuleAnalytics(req, res, tenantId);
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Module Analytics API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getModuleAnalytics(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string
) {
  try {
    const { timeRange = '30d' } = req.query;
    const db = getDb();
    const { Module, TenantModule, sequelize } = db;

    // Calculate date range
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get module usage statistics
    const stats = await sequelize.query(
      `SELECT 
        m.code as "moduleCode",
        m.name as "moduleName",
        COUNT(DISTINCT tm.id) as "activationCount",
        COUNT(DISTINCT tm.enabled_by) as "activeUsers",
        MAX(tm.enabled_at) as "lastUsed",
        COALESCE(AVG(EXTRACT(EPOCH FROM (tm.updated_at - tm.enabled_at))), 0) as "avgResponseTime",
        0 as "errorRate",
        CASE 
          WHEN COUNT(DISTINCT tm.id) > 10 THEN 'up'
          WHEN COUNT(DISTINCT tm.id) < 5 THEN 'down'
          ELSE 'stable'
        END as "trend"
      FROM modules m
      LEFT JOIN tenant_modules tm ON m.id = tm.module_id 
        AND tm.tenant_id = :tenantId
        AND tm.enabled_at >= :startDate
      WHERE m.is_active = true
      GROUP BY m.id, m.code, m.name
      ORDER BY "activationCount" DESC
      LIMIT 20`,
      {
        replacements: { tenantId, startDate },
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Calculate usage frequency (mock data for now)
    const enrichedStats = stats.map((stat: any) => ({
      ...stat,
      usageFrequency: Math.floor(Math.random() * 50) + 1, // Mock: 1-50 times per day
      avgResponseTime: Math.floor(Math.random() * 500) + 100, // Mock: 100-600ms
      errorRate: Math.random() * 2 // Mock: 0-2%
    }));

    return res.status(200).json({
      success: true,
      stats: enrichedStats,
      timeRange,
      summary: {
        totalActivations: enrichedStats.reduce((sum: number, s: any) => sum + parseInt(s.activationCount), 0),
        totalUsers: enrichedStats.reduce((sum: number, s: any) => sum + parseInt(s.activeUsers), 0),
        avgResponseTime: enrichedStats.length > 0
          ? Math.round(enrichedStats.reduce((sum: number, s: any) => sum + s.avgResponseTime, 0) / enrichedStats.length)
          : 0,
        avgErrorRate: enrichedStats.length > 0
          ? (enrichedStats.reduce((sum: number, s: any) => sum + s.errorRate, 0) / enrichedStats.length).toFixed(2)
          : 0
      }
    });
  } catch (error: any) {
    console.error('Error in getModuleAnalytics:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

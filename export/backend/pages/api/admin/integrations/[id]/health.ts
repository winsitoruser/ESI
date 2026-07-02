import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../../models');
const { PartnerIntegration, IntegrationLog } = db;
const { Op } = require('sequelize');

/**
 * GET /api/admin/integrations/:id/health - Get integration health status
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

    const { id } = req.query;

    const integration = await PartnerIntegration.findByPk(id);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Get logs from last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentLogs = await IntegrationLog.findAll({
      where: {
        integrationId: id,
        createdAt: { [Op.gte]: last24Hours }
      },
      order: [['createdAt', 'DESC']]
    });

    // Calculate health metrics
    const totalRequests = recentLogs.length;
    const successCount = recentLogs.filter((log: any) => log.status === 'success').length;
    const failedCount = recentLogs.filter((log: any) => log.status === 'failed').length;
    const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;

    // Calculate average response time
    const logsWithDuration = recentLogs.filter((log: any) => log.duration);
    const avgResponseTime = logsWithDuration.length > 0
      ? logsWithDuration.reduce((sum: number, log: any) => sum + log.duration, 0) / logsWithDuration.length
      : 0;

    // Get error distribution
    const errorLogs = recentLogs.filter((log: any) => log.status === 'failed');
    const errorTypes: any = {};
    errorLogs.forEach((log: any) => {
      const errorType = log.message || 'Unknown error';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });

    // Determine health status
    let healthStatus = 'healthy';
    let healthScore = 100;

    if (successRate < 50) {
      healthStatus = 'critical';
      healthScore = successRate;
    } else if (successRate < 80) {
      healthStatus = 'degraded';
      healthScore = successRate;
    } else if (successRate < 95) {
      healthStatus = 'warning';
      healthScore = successRate;
    }

    // Check if integration was tested recently
    const daysSinceLastTest = integration.lastTestedAt
      ? Math.floor((Date.now() - new Date(integration.lastTestedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLastTest && daysSinceLastTest > 30) {
      healthStatus = 'warning';
      healthScore = Math.min(healthScore, 80);
    }

    // Get uptime (percentage of time integration was active)
    const uptime = integration.isActive ? 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        integrationId: id,
        healthStatus,
        healthScore: Math.round(healthScore),
        metrics: {
          totalRequests,
          successCount,
          failedCount,
          successRate: Math.round(successRate * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime),
          uptime
        },
        lastTest: {
          testedAt: integration.lastTestedAt,
          status: integration.lastTestStatus,
          message: integration.lastTestMessage,
          daysSinceLastTest
        },
        errorDistribution: Object.entries(errorTypes).map(([type, count]) => ({
          type,
          count
        })),
        recommendations: generateRecommendations(
          healthStatus,
          successRate,
          daysSinceLastTest,
          failedCount
        ),
        checkedAt: new Date()
      }
    });
  } catch (error: any) {
    console.error('Integration Health API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

function generateRecommendations(
  healthStatus: string,
  successRate: number,
  daysSinceLastTest: number | null,
  failedCount: number
): string[] {
  const recommendations: string[] = [];

  if (healthStatus === 'critical') {
    recommendations.push('⚠️ Critical: Integration is experiencing severe issues. Immediate action required.');
    recommendations.push('Check API credentials and configuration');
    recommendations.push('Review recent error logs for patterns');
  }

  if (healthStatus === 'degraded') {
    recommendations.push('⚠️ Performance degraded. Review integration configuration.');
  }

  if (successRate < 90) {
    recommendations.push('Success rate is below 90%. Consider reviewing error logs.');
  }

  if (daysSinceLastTest && daysSinceLastTest > 30) {
    recommendations.push('Integration has not been tested in over 30 days. Run a connection test.');
  }

  if (daysSinceLastTest && daysSinceLastTest > 7) {
    recommendations.push('Consider running a connection test to verify integration health.');
  }

  if (failedCount > 10) {
    recommendations.push('High number of failures detected. Check API status and credentials.');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Integration is healthy. No action required.');
  }

  return recommendations;
}

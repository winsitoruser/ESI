import { NextApiRequest, NextApiResponse } from 'next';

const db = require('@/models');

/**
 * Health Check Endpoint
 * Verifies system status, database connectivity, and critical services
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'operational',
      database: 'unknown',
      models: 'unknown'
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // Test database connection
    await db.sequelize.authenticate();
    health.services.database = 'operational';

    // Test models loaded
    const moduleCount = await db.Module.count();
    const businessTypeCount = await db.BusinessType.count();
    
    health.services.models = 'operational';
    health.stats = {
      modules: moduleCount,
      businessTypes: businessTypeCount
    };

    return res.status(200).json(health);
  } catch (error: any) {
    health.status = 'degraded';
    health.services.database = 'error';
    health.error = error.message;

    return res.status(503).json(health);
  }
}

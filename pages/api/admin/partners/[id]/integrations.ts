import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../../models');
const { PartnerIntegration, Partner } = db;

/**
 * GET /api/admin/partners/:id/integrations - Get partner integrations
 * POST /api/admin/partners/:id/integrations - Create integration
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const userRole = (session?.user?.role as string)?.toLowerCase();
    
    if (!session || !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: partnerId } = req.query;

    // Verify partner exists
    const partner = await Partner.findByPk(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (req.method === 'GET') {
      return await getIntegrations(partnerId as string, res);
    } else if (req.method === 'POST') {
      return await createIntegration(partnerId as string, req, res, session);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Partner Integrations API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function getIntegrations(partnerId: string, res: NextApiResponse) {
  const integrations = await PartnerIntegration.findAll({
    where: { partnerId },
    order: [['createdAt', 'DESC']]
  });

  return res.status(200).json({
    success: true,
    data: integrations
  });
}

async function createIntegration(
  partnerId: string,
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  const {
    integrationType,
    provider,
    configuration,
    testMode = true,
    isActive = true
  } = req.body;

  // Validate required fields
  if (!integrationType || !provider || !configuration) {
    return res.status(400).json({
      error: 'Missing required fields: integrationType, provider, configuration'
    });
  }

  // Check if integration already exists
  const existing = await PartnerIntegration.findOne({
    where: {
      partnerId,
      integrationType,
      provider
    }
  });

  if (existing) {
    return res.status(400).json({
      error: 'Integration with this type and provider already exists'
    });
  }

  // Create integration
  const integration = await PartnerIntegration.create({
    partnerId,
    integrationType,
    provider,
    configuration,
    testMode,
    isActive,
    createdBy: session.user.id
  });

  return res.status(201).json({
    success: true,
    data: integration,
    message: 'Integration created successfully'
  });
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { PartnerIntegration } = db;

/**
 * GET /api/admin/integrations/:id - Get integration details
 * PUT /api/admin/integrations/:id - Update integration
 * DELETE /api/admin/integrations/:id - Delete integration
 * POST /api/admin/integrations/:id/test - Test integration
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        data: integration
      });
    } else if (req.method === 'PUT') {
      return await updateIntegration(integration, req, res, session);
    } else if (req.method === 'DELETE') {
      await integration.destroy();
      return res.status(200).json({
        success: true,
        message: 'Integration deleted successfully'
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Integration API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function updateIntegration(
  integration: any,
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  const {
    provider,
    configuration,
    testMode,
    isActive
  } = req.body;

  await integration.update({
    ...(provider && { provider }),
    ...(configuration && { configuration }),
    ...(testMode !== undefined && { testMode }),
    ...(isActive !== undefined && { isActive }),
    updatedBy: session.user.id
  });

  return res.status(200).json({
    success: true,
    data: integration,
    message: 'Integration updated successfully'
  });
}

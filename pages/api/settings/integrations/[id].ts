import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { PartnerIntegration, OutletIntegration } = db;
    const user = session.user as any;
    const partnerId = user.partnerId;
    const outletId = user.outletId;

    // Try to find in outlet integrations first, then partner
    let integration: any = null;
    let isOutletIntegration = false;

    if (outletId) {
      integration = await OutletIntegration.findOne({ where: { id, outletId } });
      if (integration) isOutletIntegration = true;
    }

    if (!integration && partnerId) {
      integration = await PartnerIntegration.findOne({ where: { id, partnerId } });
    }

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({
          success: true,
          data: integration,
          type: isOutletIntegration ? 'outlet' : 'partner'
        });

      case 'PUT':
        const { configuration, name, isActive, provider } = req.body;

        await integration.update({
          ...(name && { name }),
          ...(provider && { provider }),
          ...(configuration && { configuration }),
          ...(isActive !== undefined && { isActive }),
          status: 'pending', // Reset to pending after config change
          updatedBy: user.id
        });

        return res.status(200).json({
          success: true,
          message: 'Integration updated',
          data: integration
        });

      case 'DELETE':
        await integration.update({ isActive: false });
        return res.status(200).json({
          success: true,
          message: 'Integration disabled'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Integration API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

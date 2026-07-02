import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../../models');
const { IntegrationWebhook, PartnerIntegration } = db;

/**
 * GET /api/admin/integrations/:id/webhooks - Get webhooks for integration
 * POST /api/admin/integrations/:id/webhooks - Create webhook
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const userRole = (session?.user?.role as string)?.toLowerCase();
    
    if (!session || !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: integrationId } = req.query;

    // Verify integration exists
    const integration = await PartnerIntegration.findByPk(integrationId);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (req.method === 'GET') {
      const webhooks = await IntegrationWebhook.findAll({
        where: { integrationId },
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: webhooks
      });
    } else if (req.method === 'POST') {
      const {
        webhookUrl,
        webhookSecret,
        events = [],
        isActive = true,
        retryAttempts = 3,
        retryDelay = 60
      } = req.body;

      if (!webhookUrl) {
        return res.status(400).json({ error: 'Webhook URL is required' });
      }

      const webhook = await IntegrationWebhook.create({
        integrationId,
        webhookUrl,
        webhookSecret,
        events,
        isActive,
        retryAttempts,
        retryDelay,
        createdBy: session.user.id
      });

      return res.status(201).json({
        success: true,
        data: webhook,
        message: 'Webhook created successfully'
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Webhook API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

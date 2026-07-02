import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import crypto from 'crypto';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { Webhook, AuditLog } = getDb();

    if (req.method === 'GET') {
      const webhooks = await Webhook.findAll({
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: webhooks
      });

    } else if (req.method === 'POST') {
      const { name, url, events, isActive, secret } = req.body;

      // Validate input
      if (!name || !url || !events || events.length === 0) {
        return res.status(400).json({ error: 'Name, URL, and at least one event are required' });
      }

      // Generate secret if not provided
      const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

      // Create webhook
      const webhook = await Webhook.create({
        name,
        url,
        events,
        isActive: isActive !== false,
        secret: webhookSecret,
        successCount: 0,
        failureCount: 0
      });

      // Log the action
      await AuditLog.create({
        userId: session.user?.id || '',
        action: 'CREATE',
        entityType: 'Webhook',
        entityId: webhook.id,
        oldValues: {},
        newValues: { name, url, events, isActive },
        ipAddress: (req as any).ip || '',
        userAgent: req.headers['user-agent'],
        description: `Created webhook: ${name}`
      });

      return res.status(201).json({
        success: true,
        message: 'Webhook created successfully',
        data: webhook
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in webhooks API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    });
  }
}

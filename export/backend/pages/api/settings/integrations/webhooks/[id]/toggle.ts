import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { Webhook, AuditLog } = getDb();
    const webhookId = req.query.id as string;

    if (req.method === 'POST') {
      const webhook = await Webhook.findByPk(webhookId);
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      const oldStatus = webhook.isActive;
      webhook.isActive = !webhook.isActive;
      await webhook.save();

      // Log the action
      await AuditLog.create({
        userId: session.user?.id || '',
        action: 'UPDATE',
        entityType: 'Webhook',
        entityId: webhookId,
        oldValues: { isActive: oldStatus },
        newValues: { isActive: webhook.isActive },
        ipAddress: (req as any).ip || '',
        userAgent: req.headers['user-agent'],
        description: `${webhook.isActive ? 'Activated' : 'Deactivated'} webhook: ${webhook.name}`
      });

      return res.status(200).json({
        success: true,
        message: `Webhook ${webhook.isActive ? 'activated' : 'deactivated'} successfully`,
        data: webhook
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error toggling webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle webhook',
      details: error.message
    });
  }
}

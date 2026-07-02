import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Activity } = require('../../../../models/CRM');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Activity ID is required' });
    }

    switch (req.method) {
      case 'PUT':
        return await handleUpdateActivity(id, req, res, tenantId, userId);
      case 'DELETE':
        return await handleDeleteActivity(id, res, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Activity detail API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleUpdateActivity(id: string, req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { type, subject, description, scheduledAt, isCompleted, completedAt, outcome } = req.body;

  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const activity = await Activity.findOne({ where });
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (subject !== undefined) updateData.subject = subject;
    if (description !== undefined) updateData.description = description;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt;
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      if (isCompleted && !completedAt) {
        updateData.completedAt = new Date();
      } else if (!isCompleted) {
        updateData.completedAt = null;
      }
    }
    if (completedAt !== undefined) updateData.completedAt = completedAt;
    if (outcome !== undefined) updateData.outcome = outcome;

    await activity.update(updateData);

    return res.status(200).json({ success: true, data: activity, message: 'Activity updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to update activity' });
  }
}

async function handleDeleteActivity(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const activity = await Activity.findOne({ where });
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    await activity.destroy();

    return res.status(200).json({ success: true, message: 'Activity deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete activity' });
  }
}

export default withHQAuth(handler);

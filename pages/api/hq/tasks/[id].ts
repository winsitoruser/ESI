import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Task } = require('../../../../models/HR');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Task ID is required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetTask(id, res, tenantId);
      case 'PUT':
        return await handleUpdateTask(id, req, res, tenantId, userId);
      case 'DELETE':
        return await handleDeleteTask(id, res, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Task detail API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetTask(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const task = await Task.findOne({ where });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch task' });
  }
}

async function handleUpdateTask(id: string, req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { title, description, priority, status, assigneeId, dueDate, relatedTo, relatedId } = req.body;

  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const task = await Task.findOne({ where });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const updateData: any = { updatedBy: userId };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'done') {
        updateData.completedAt = new Date();
      }
    }
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (relatedTo !== undefined) updateData.relatedTo = relatedTo;
    if (relatedId !== undefined) updateData.relatedId = relatedId;

    await task.update(updateData);

    return res.status(200).json({ success: true, data: task, message: 'Task updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to update task' });
  }
}

async function handleDeleteTask(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const task = await Task.findOne({ where });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await task.destroy();

    return res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
}

export default withHQAuth(handler);

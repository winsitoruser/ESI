import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Op } = require('sequelize');
const { Activity } = require('../../../../models/CRM');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;

    switch (req.method) {
      case 'GET':
        return await handleGetActivities(req, res, tenantId);
      case 'POST':
        return await handleCreateActivity(req, res, tenantId, userId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Activities API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetActivities(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { relatedTo, relatedId, assignee, isCompleted, type, page = '1', limit = '50', sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (relatedTo) where.relatedTo = relatedTo;
  if (relatedId) where.relatedId = relatedId;
  if (assignee) where.assignedTo = assignee;
  if (isCompleted !== undefined) where.isCompleted = isCompleted === 'true';
  if (type) where.type = type;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

  try {
    const { count, rows } = await Activity.findAndCountAll({
      where,
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (dbError) {
    // Fallback mock data
    const mockActivities = generateMockActivities(tenantId, relatedTo as string, relatedId as string);
    const filtered = mockActivities.filter(a => {
      if (isCompleted !== undefined && a.isCompleted !== (isCompleted === 'true')) return false;
      if (type && a.type !== type) return false;
      return true;
    });

    const totalFiltered = filtered.length;
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: { total: totalFiltered, page: pageNum, limit: limitNum, totalPages: Math.ceil(totalFiltered / limitNum) },
      meta: { isMock: true },
    });
  }
}

async function handleCreateActivity(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { type, subject, description, relatedTo, relatedId, scheduledAt, assignedTo, outcome } = req.body;

  if (!type || !subject) {
    return res.status(400).json({ success: false, error: 'Type and subject are required' });
  }

  const validTypes = ['call', 'email', 'meeting', 'follow_up', 'note', 'demo', 'site_visit'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const activity = await Activity.create({
      type,
      subject,
      description,
      relatedTo: relatedTo || 'lead',
      relatedId,
      scheduledAt: scheduledAt || new Date(),
      assignedTo: assignedTo || userId,
      outcome,
      tenantId,
      createdBy: userId,
    });

    return res.status(201).json({ success: true, data: activity, message: 'Activity created successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to create activity' });
  }
}

function generateMockActivities(tenantId: string, relatedTo?: string, relatedId?: string) {
  const actTypes = ['call', 'email', 'meeting', 'follow_up', 'note', 'demo', 'site_visit'] as const;
  const subjects: Record<string, string[]> = {
    call: ['Initial call', 'Follow up call', 'Discovery call', 'Check-in call'],
    email: ['Sent introduction', 'Sent proposal', 'Follow up email', 'Thank you note'],
    meeting: ['Discovery meeting', 'Product demo meeting', 'Negotiation session', 'Final review'],
    follow_up: ['Weekly follow up', 'After demo follow up', 'Proposal follow up'],
    note: ['Added notes', 'Internal notes', 'Meeting notes'],
    demo: ['Product demo', 'Live demo session', 'Feature walkthrough'],
    site_visit: ['Site visit', 'Location survey', 'Facility check'],
  };

  const activities: any[] = [];
  const count = 5;

  for (let i = 0; i < count; i++) {
    const type = actTypes[i % actTypes.length];
    const typeSubjects = subjects[type] || ['General activity'];

    activities.push({
      id: `mock-activity-${i + 1}`,
      type,
      subject: typeSubjects[i % typeSubjects.length],
      description: `Activity description for item #${i + 1}`,
      relatedTo: relatedTo || 'lead',
      relatedId: relatedId || 'mock-lead-1',
      scheduledAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: Math.random() > 0.3 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString() : null,
      isCompleted: Math.random() > 0.3,
      assignedTo: null,
      outcome: Math.random() > 0.5 ? 'Positive - interested in next steps' : null,
      tenantId,
      createdBy: null,
      createdAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return activities;
}

export default withHQAuth(handler);

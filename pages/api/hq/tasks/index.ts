import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Op } = require('sequelize');
const { Task } = require('../../../../models/HR');

type HandlerResult = { success: boolean; data?: any; error?: string; message?: string; pagination?: any };

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;

    switch (req.method) {
      case 'GET':
        return await handleGetTasks(req, res, tenantId);
      case 'POST':
        return await handleCreateTask(req, res, tenantId, userId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Tasks API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetTasks(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { page = '1', limit = '20', status, priority, assigneeId, relatedTo, search, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (relatedTo) where.relatedTo = relatedTo;
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

  try {
    const { count, rows } = await Task.findAndCountAll({
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
    const mockTasks = generateMockTasks(tenantId);
    const filtered = mockTasks.filter(t => {
      if (status && t.status !== status) return false;
      if (priority && t.priority !== priority) return false;
      if (assigneeId && t.assigneeId !== assigneeId) return false;
      if (relatedTo && t.relatedTo !== relatedTo) return false;
      if (search) {
        const s = (search as string).toLowerCase();
        return t.title.toLowerCase().includes(s);
      }
      return true;
    });

    return res.status(200).json({
      success: true,
      data: filtered.slice(0, limitNum),
      pagination: { total: filtered.length, page: pageNum, limit: limitNum, totalPages: Math.ceil(filtered.length / limitNum) },
      meta: { isMock: true },
    });
  }
}

async function handleCreateTask(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { title, description, priority, status, assigneeId, dueDate, relatedTo, relatedId } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }

  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  const validStatuses = ['todo', 'in_progress', 'done', 'cancelled'];

  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ success: false, error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
  }
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      status: status || 'todo',
      assigneeId,
      dueDate,
      relatedTo,
      relatedId,
      tenantId,
      createdBy: userId,
    });

    return res.status(201).json({ success: true, data: task, message: 'Task created successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to create task' });
  }
}

function generateMockTasks(tenantId: string) {
  const statuses = ['todo', 'todo', 'todo', 'in_progress', 'in_progress', 'done', 'done', 'cancelled'] as const;
  const priorities = ['low', 'medium', 'medium', 'high', 'high', 'urgent'] as const;
  const assigneeIds = [
    'mock-tm-sales-1', 'mock-tm-sales-2', 'mock-tm-marketing-1',
    'mock-tm-ops-1', 'mock-tm-finance-1', 'mock-tm-admin-1',
    'mock-tm-manager-1', 'mock-tm-executive-1',
  ];
  const relatedTos = ['partner', 'lead', 'deal', 'project', 'invoice', ''];

  const titles = [
    'Follow up with new partner',
    'Prepare monthly sales report',
    'Review marketing campaign Q2',
    'Update inventory system',
    'Schedule team meeting',
    'Process payroll for March',
    'Design new product catalog',
    'Audit financial records',
    'Setup email automation',
    'Client onboarding call',
    'Optimize supply chain',
    'Create SOP documents',
    'Review partnership proposal',
    'Budget planning session',
    'System migration preparation',
    'Customer feedback analysis',
  ];

  const descriptions = [
    'Contact the partner to discuss collaboration terms and finalize agreement.',
    'Compile all sales data from this month and create presentation for management.',
    'Review performance metrics of ongoing campaigns and adjust strategy accordingly.',
    'Verify and update stock levels in the inventory management system.',
    'Organize a cross-department meeting to align on Q3 objectives.',
    'Calculate salaries, deductions, and generate payslips for all employees.',
    'Design and layout for the upcoming seasonal product catalog.',
    'Cross-check all transactions and reconcile with bank statements.',
    'Configure automated email responses for customer inquiries.',
    'Schedule and conduct onboarding session for new corporate client.',
  ];

  const mockData: any[] = [];
  const startDate = new Date('2026-06-01');

  titles.forEach((title, idx) => {
    const status = statuses[idx % statuses.length];
    const priority = priorities[idx % priorities.length];
    const assigneeId = assigneeIds[idx % assigneeIds.length];
    const relatedTo = relatedTos[idx % relatedTos.length];

    const createdDate = new Date(startDate);
    createdDate.setDate(createdDate.getDate() + idx);

    const dueDate = new Date(createdDate);
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) + 3);

    mockData.push({
      id: `mock-task-${idx + 1}`,
      title,
      description: descriptions[idx % descriptions.length],
      priority,
      status,
      assigneeId,
      dueDate: dueDate.toISOString().split('T')[0],
      completedAt: status === 'done' ? new Date().toISOString() : null,
      relatedTo: relatedTo || null,
      relatedId: relatedTo ? `mock-${relatedTo}-${idx + 1}` : null,
      tenantId,
      createdBy: assigneeId,
      createdAt: createdDate.toISOString(),
      updatedAt: createdDate.toISOString(),
    });
  });

  return mockData;
}

export default withHQAuth(handler);

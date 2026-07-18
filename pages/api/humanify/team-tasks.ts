import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
const { Op } = require('sequelize');
const { Task } = require('../../../models/HR');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    const actorId = isUuid(userId) ? String(userId) : null;
    const { id } = req.query;

    if (!tenantId) {
      if (req.method === 'GET') {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        });
      }
      return res.status(403).json({ success: false, error: 'NO_TENANT' });
    }

    if (id && typeof id === 'string' && req.method !== 'GET') {
      return await handleSingleTask(id, req, res, tenantId, actorId);
    }

    switch (req.method) {
      case 'GET':
        return await handleGetTasks(req, res, tenantId);
      case 'POST':
        return await handleCreateTask(req, res, tenantId, actorId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Tasks API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleSingleTask(id: string, req: NextApiRequest, res: NextApiResponse, tenantId: string, actorId: string | null) {
  switch (req.method) {
    case 'PUT':
      return await handleUpdateTask(id, req, res, tenantId, actorId);
    case 'DELETE':
      return await handleDeleteTask(id, res, tenantId);
    default:
      return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function handleGetTasks(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { page = '1', limit = '50', status, priority, assigneeId, taskType, category, relatedTo, relatedId, search, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (taskType) where.taskType = taskType;
  if (category) where.category = category;
  if (relatedTo) where.relatedTo = relatedTo;
  if (relatedId) where.relatedId = relatedId;
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit as string)));

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
      pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) },
    });
  } catch (dbError) {
    const mockTasks = generateMockTasks(tenantId, assigneeId as string, relatedTo as string, relatedId as string);
    const filtered = mockTasks.filter(t => {
      if (status && t.status !== status) return false;
      if (priority && t.priority !== priority) return false;
      return true;
    });

    return res.status(200).json({
      success: true,
      data: filtered.slice(0, limitNum),
      pagination: { total: filtered.length, page: 1, limit: limitNum, totalPages: 1 },
      meta: { isMock: true },
    });
  }
}

async function handleCreateTask(req: NextApiRequest, res: NextApiResponse, tenantId: string, actorId: string | null) {
  const { title, description, priority, assigneeId, dueDate, taskType, targetValue, targetUnit, category, relatedTo, relatedId } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }

  try {
    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      status: 'todo',
      assigneeId,
      dueDate,
      taskType: taskType || 'routine',
      targetValue,
      targetUnit,
      category,
      relatedTo,
      relatedId,
      tenantId,
      createdBy: actorId,
      updatedBy: actorId,
    });

    return res.status(201).json({ success: true, data: task, message: 'Task created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to create task' });
  }
}

async function handleUpdateTask(id: string, req: NextApiRequest, res: NextApiResponse, tenantId: string, actorId: string | null) {
  const { title, description, priority, status, assigneeId, dueDate, completedAt, taskType, targetValue, targetUnit, category } = req.body;

  try {
    const task = await Task.findOne({ where: { id, tenantId } });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    const updateData: any = {};
    if (actorId) updateData.updatedBy = actorId;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'done' && !task.completedAt) updateData.completedAt = new Date();
      if (status !== 'done') updateData.completedAt = null;
    }
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (completedAt !== undefined) updateData.completedAt = completedAt;
    if (taskType !== undefined) updateData.taskType = taskType;
    if (targetValue !== undefined) updateData.targetValue = targetValue;
    if (targetUnit !== undefined) updateData.targetUnit = targetUnit;
    if (category !== undefined) updateData.category = category;

    await task.update(updateData);
    return res.status(200).json({ success: true, data: task, message: 'Task updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to update task' });
  }
}

async function handleDeleteTask(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const task = await Task.findOne({ where: { id, tenantId } });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    await task.destroy();
    return res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
}

function isUuid(value: unknown): boolean {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generateMockTasks(tenantId: string, assigneeId?: string, relatedTo?: string, relatedId?: string) {
  const priorities = ['low', 'medium', 'high', 'urgent'] as const;
  const statuses = ['todo', 'in_progress', 'done'] as const;
  const taskTypes = ['target', 'routine', 'sop', 'project'] as const;
  const categories = ['Sales', 'Marketing', 'Operational', 'Finance', 'Admin', 'HR', 'Pengembangan'];
  const titles = [
    'Follow up dengan calon partner VET',
    'Kirim proposal kerjasama petshop',
    'Survey lokasi pet hotel baru',
    'Update database kontak partner',
    'Persiapan presentasi product demo',
    'Rekap penjualan bulanan',
    'Negosiasi kontrak dengan supplier',
    'Laporan aktivitas tim sales',
    'Onboarding partner baru',
    'Cek ketersediaan stok produk',
  ];

  return titles.map((title, i) => ({
    id: `mock-task-${i + 1}`,
    title,
    description: `Deskripsi untuk task: ${title}`,
    priority: priorities[i % priorities.length],
    status: statuses[i % statuses.length],
    assigneeId: assigneeId || `mock-tm-${(i % 5) + 1}`,
    dueDate: new Date(Date.now() + (i % 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    completedAt: statuses[i % statuses.length] === 'done' ? new Date().toISOString() : null,
    taskType: taskTypes[i % taskTypes.length],
    targetValue: taskTypes[i % taskTypes.length] === 'target' ? `${(i + 1) * 10}` : null,
    targetUnit: taskTypes[i % taskTypes.length] === 'target' ? 'unit' : null,
    category: categories[i % categories.length],
    relatedTo: relatedTo || null,
    relatedId: relatedId || null,
    tenantId,
    createdAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export default withHQAuth(handler);

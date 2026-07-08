import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const db = require('../../../../models');
const { Op } = require('sequelize');

// Import ESI demo data for fallback
import { 
  ESI_DEMO_PROJECTS, 
  ESI_DEMO_MILESTONES, 
  buildEsiDemoDashboard,
  filterEsiDemoProjects 
} from '../../../../lib/projectManagement/esi-demo-data';

type HandlerResult = { success: boolean; data?: any; error?: string; message?: string };

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    
    const action = (req.query.action as string) || 'dashboard';
    const method = req.method;

    // Route based on action
    switch (action) {
      // ===== DASHBOARD =====
      case 'dashboard':
        return await handleDashboard(req, res, tenantId);
      
      // ===== PROJECTS =====
      case 'projects':
        if (method === 'GET') return await handleGetProjects(req, res, tenantId);
        if (method === 'POST') return await handleCreateProject(req, res, tenantId, userId);
        return methodNotAllowed(res, ['GET', 'POST']);
      
      case 'project-detail':
        return await handleGetProjectDetail(req, res, tenantId);
      
      // ===== TASKS =====
      case 'tasks':
        if (method === 'GET') return await handleGetTasks(req, res, tenantId);
        if (method === 'POST') return await handleCreateTask(req, res, tenantId, userId);
        if (method === 'PUT') return await handleUpdateTask(req, res, tenantId, userId);
        if (method === 'DELETE') return await handleDeleteTask(req, res, tenantId);
        return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
      
      case 'task-detail':
        return await handleGetTaskDetail(req, res, tenantId);
      
      // ===== MILESTONES =====
      case 'milestones':
        if (method === 'GET') return await handleGetMilestones(req, res, tenantId);
        if (method === 'POST') return await handleCreateMilestone(req, res, tenantId);
        if (method === 'PUT') return await handleUpdateMilestone(req, res, tenantId);
        if (method === 'DELETE') return await handleDeleteMilestone(req, res, tenantId);
        return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
      
      // ===== TIMESHEETS =====
      case 'timesheets':
        if (method === 'GET') return await handleGetTimesheets(req, res, tenantId);
        if (method === 'POST') return await handleCreateTimesheet(req, res, tenantId, userId);
        if (method === 'PUT') return await handleUpdateTimesheet(req, res, tenantId);
        return methodNotAllowed(res, ['GET', 'POST', 'PUT']);
      
      case 'submit-timesheet':
        return await handleSubmitTimesheet(req, res, tenantId);
      
      case 'approve-timesheet':
        return await handleApproveTimesheet(req, res, tenantId, userId);
      
      case 'reject-timesheet':
        return await handleRejectTimesheet(req, res, tenantId, userId);
      
      // ===== RESOURCES =====
      case 'resources':
        if (method === 'GET') return await handleGetResources(req, res, tenantId);
        if (method === 'POST') return await handleCreateResource(req, res, tenantId);
        if (method === 'PUT') return await handleUpdateResource(req, res, tenantId);
        if (method === 'DELETE') return await handleDeleteResource(req, res, tenantId);
        return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
      
      // ===== RISKS =====
      case 'risks':
        if (method === 'GET') return await handleGetRisks(req, res, tenantId);
        if (method === 'POST') return await handleCreateRisk(req, res, tenantId);
        if (method === 'PUT') return await handleUpdateRisk(req, res, tenantId);
        if (method === 'DELETE') return await handleDeleteRisk(req, res, tenantId);
        return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
      
      // ===== BUDGETS =====
      case 'budgets':
        if (method === 'GET') return await handleGetBudgets(req, res, tenantId);
        if (method === 'POST') return await handleCreateBudget(req, res, tenantId);
        if (method === 'PUT') return await handleUpdateBudget(req, res, tenantId);
        if (method === 'DELETE') return await handleDeleteBudget(req, res, tenantId);
        return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
      
      // ===== DOCUMENTS =====
      case 'documents':
        if (method === 'GET') return await handleGetDocuments(req, res, tenantId);
        if (method === 'POST') return await handleCreateDocument(req, res, tenantId);
        if (method === 'DELETE') return await handleDeleteDocument(req, res, tenantId);
        return methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
      
      // ===== GANTT =====
      case 'gantt':
      case 'gantt-full':
        return await handleGetGantt(req, res, tenantId);
      
      case 'update-schedule':
        return await handleUpdateSchedule(req, res, tenantId);
      
      // ===== CALENDAR =====
      case 'calendar':
        return await handleGetCalendar(req, res, tenantId);
      
      // ===== WORKLOAD =====
      case 'workload':
        return await handleGetWorkload(req, res, tenantId);
      
      // ===== SPRINTS =====
      case 'sprints':
        if (method === 'GET') return await handleGetSprints(req, res, tenantId);
        if (method === 'POST') return await handleCreateSprint(req, res, tenantId);
        if (method === 'PUT') return await handleUpdateSprint(req, res, tenantId);
        return methodNotAllowed(res, ['GET', 'POST', 'PUT']);
      
      // ===== EVM (Earned Value Management) =====
      case 'evm':
        return await handleGetEVM(req, res, tenantId);
      
      case 'critical-path':
        return await handleGetCriticalPath(req, res, tenantId);
      
      case 'burndown':
        return await handleGetBurndown(req, res, tenantId);
      
      // ===== COLLABORATION =====
      case 'comments':
        if (method === 'GET') return await handleGetComments(req, res, tenantId);
        if (method === 'POST') return await handleCreateComment(req, res, tenantId, userId);
        return methodNotAllowed(res, ['GET', 'POST']);
      
      case 'activity-log':
        return await handleGetActivityLog(req, res, tenantId);
      
      case 'approvals':
        if (method === 'GET') return await handleGetApprovals(req, res, tenantId);
        if (method === 'POST') return await handleCreateApproval(req, res, tenantId, userId);
        if (method === 'PUT') return await handleUpdateApproval(req, res, tenantId, userId);
        return methodNotAllowed(res, ['GET', 'POST', 'PUT']);
      
      case 'dependencies':
        return await handleGetDependencies(req, res, tenantId);
      
      case 'watchers':
        if (method === 'GET') return await handleGetWatchers(req, res, tenantId);
        if (method === 'POST') return await handleToggleWatcher(req, res, tenantId, userId);
        return methodNotAllowed(res, ['GET', 'POST']);
      
      case 'baselines':
        return await handleGetBaselines(req, res, tenantId);
      
      // ===== LOOKUPS / INTEGRATIONS =====
      case 'employees':
        return await handleGetEmployees(req, res, tenantId);
      
      case 'team-directory':
        return await handleGetTeamDirectory(req, res, tenantId);
      
      case 'customers':
        return await handleGetCustomers(req, res, tenantId);
      
      case 'branches':
        return await handleGetBranches(req, res, tenantId);
      
      case 'fleet-vehicles':
        return await handleGetFleetVehicles(req, res, tenantId);
      
      case 'inventory-items':
        return await handleGetInventoryItems(req, res, tenantId);
      
      case 'purchase-orders':
        return await handleGetPurchaseOrders(req, res, tenantId);
      
      case 'assign-task':
        return await handleAssignTask(req, res, tenantId, userId);
      
      // ===== DEFAULT =====
      default:
        return res.status(400).json({ success: false, error: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` });
    }
  } catch (error: any) {
    console.warn('Project Management API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ 
      success: false, 
      error: 'SERVER_ERROR', 
      message: error.message 
    });
  }
}

// ==================== DASHBOARD ====================
async function handleDashboard(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    // Try to get real data first
    const projectCount = await db.PjmProject.count({ where: buildTenantWhere(tenantId) });
    
    if (projectCount === 0) {
      // Return ESI demo data for conservation projects
      return res.status(200).json({ success: true, data: buildEsiDemoDashboard() });
    }
    
    // Calculate real dashboard stats
    const [projects, tasks, risks, timesheets] = await Promise.all([
      db.PjmProject.findAndCountAll({ where: buildTenantWhere(tenantId), limit: 5, order: [['created_at', 'DESC']] }),
      db.PjmTask.findAndCountAll({ where: buildTenantWhere(tenantId) }),
      db.PjmRisk.findAndCountAll({ where: buildTenantWhere(tenantId) }),
      db.PjmTimesheet.sum('hoursWorked', { where: buildTenantWhere(tenantId) }),
    ]);
    
    // Get stats by status
    const statusCounts = await getStatusCounts(tenantId);
    const taskStatusCounts = await getTaskStatusCounts(tenantId);
    
    // Get upcoming milestones
    const upcomingMilestones = await db.PjmMilestone.findAll({
      where: { 
        ...buildTenantWhere(tenantId),
        status: { [Op.ne]: 'completed' },
        dueDate: { [Op.gte]: new Date() }
      },
      include: [{ model: db.PjmProject, as: 'project', attributes: ['id', 'name', 'projectCode'] }],
      limit: 10,
      order: [['dueDate', 'ASC']]
    });
    
    // Calculate budget stats
    const budgetStats = await db.PjmProject.findAll({
      where: buildTenantWhere(tenantId),
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('budget_amount')), 'totalBudget'],
        [db.sequelize.fn('SUM', db.sequelize.col('actual_cost')), 'totalActual'],
      ]
    });
    
    const totalBudget = parseFloat(budgetStats[0]?.dataValues?.totalBudget || 0);
    const totalActual = parseFloat(budgetStats[0]?.dataValues?.totalActual || 0);
    const avgProgress = projects.count > 0 
      ? await db.PjmProject.aggregate('progressPercent', 'avg', { where: buildTenantWhere(tenantId) })
      : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        projectStats: {
          total: String(projects.count),
          planning: String(statusCounts.planning || 0),
          active: String(statusCounts.active || 0),
          on_hold: String(statusCounts.on_hold || 0),
          completed: String(statusCounts.completed || 0),
          cancelled: String(statusCounts.cancelled || 0),
          total_budget: String(totalBudget),
          total_actual_cost: String(totalActual),
          avg_progress: String((avgProgress || 0).toFixed(1)),
          overdue: '0',
        },
        taskStats: {
          total: String(tasks.count),
          todo: String(taskStatusCounts.todo || 0),
          in_progress: String(taskStatusCounts.in_progress || 0),
          review: String(taskStatusCounts.review || 0),
          done: String(taskStatusCounts.done || 0),
          blocked: String(taskStatusCounts.blocked || 0),
          overdue: '0',
          completed_this_week: '0',
        },
        riskStats: {
          total: String(risks.count),
          identified: '0',
          mitigating: '0',
          resolved: '0',
          high_risks: '0',
        },
        timesheetStats: {
          total_hours_month: String(timesheets || 0),
          pending_approval: '0',
          approved_cost: '0',
        },
        recentProjects: projects.rows,
        upcomingMilestones: upcomingMilestones.map((m: any) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          due_date: m.dueDate,
          project_name: m.project?.name,
          project_code: m.project?.projectCode,
        })),
        budgetTrend: generateBudgetTrend(),
        taskDistribution: generateTaskDistribution(taskStatusCounts),
        weeklyHours: generateWeeklyHours(),
        riskMatrix: generateRiskMatrix(),
      }
    });
  } catch (e) {
    console.warn('Dashboard error: (table may not exist):', (e as any)?.message || e);
    // Fallback to demo data
    return res.status(200).json({ success: true, data: buildEsiDemoDashboard() });
  }
}

// ==================== PROJECTS ====================
async function handleGetProjects(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { page = '1', limit = '20', status, priority, search, projectId } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;
  
  try {
    const where: any = buildTenantWhere(tenantId);
    
    if (status && status !== 'all') where.status = status;
    if (priority && priority !== 'all') where.priority = priority;
    if (projectId) where.id = projectId;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { projectCode: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await db.PjmProject.findAndCountAll({
      where,
      include: [
        { model: db.PjmTask, as: 'tasks', limit: 100 },
        { model: db.PjmMilestone, as: 'milestones' },
        { model: db.PjmRisk, as: 'risks' },
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset
    });
    
    // If no projects in DB, return ESI demo
    if (count === 0) {
      const filtered = filterEsiDemoProjects({ 
        status: status as string, 
        priority: priority as string, 
        search: search as string,
        page: pageNum,
        limit: limitNum
      });
      return res.status(200).json({
        success: true,
        data: { rows: filtered.rows, total: filtered.total, page: pageNum, limit: limitNum }
      });
    }
    
    // Calculate rollups for each project
    const enrichedRows = await Promise.all(rows.map(async (project: any) => {
      const tasks = await db.PjmTask.findAll({ where: { projectId: project.id } });
      const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
      const openRisks = await db.PjmRisk.count({ 
        where: { projectId: project.id, status: { [Op.notIn]: ['resolved', 'accepted'] } } 
      });
      
      return {
        ...project.toJSON(),
        task_count: tasks.length,
        completed_task_count: completedTasks,
        open_risks: openRisks,
        milestone_count: project.milestones?.length || 0,
      };
    }));
    
    return res.status(200).json({
      success: true,
      data: { rows: enrichedRows, total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) }
    });
  } catch (e: any) {
    console.warn('Get projects error (table may not exist):', (e as any)?.message || e);
    // Fallback to demo
    const filtered = filterEsiDemoProjects({ 
      status: status as string, 
      search: search as string,
      page: pageNum,
      limit: limitNum
    });
    return res.status(200).json({
      success: true,
      data: { rows: filtered.rows, total: filtered.total, page: pageNum, limit: limitNum }
    });
  }
}

async function handleGetProjectDetail(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    const project = await db.PjmProject.findOne({
      where: { ...buildTenantWhere(tenantId), id },
      include: [
        { model: db.PjmTask, as: 'tasks' },
        { model: db.PjmMilestone, as: 'milestones' },
        { model: db.PjmResource, as: 'resources' },
        { model: db.PjmRisk, as: 'risks' },
        { model: db.PjmBudget, as: 'budgetItems' },
        { model: db.PjmDocument, as: 'documents' },
      ]
    });
    
    if (!project) {
      // Check demo data
      const demoProject = ESI_DEMO_PROJECTS.find(p => p.id === id);
      if (demoProject) {
        return res.status(200).json({ success: true, data: demoProject });
      }
      return res.status(404).json({ success: false, error: 'PROJECT_NOT_FOUND' });
    }
    
    return res.status(200).json({ success: true, data: project });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleCreateProject(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  try {
    const { 
      name, description, category, status = 'planning', priority = 'normal',
      managerName, managerEmployeeId, branchId, branchName, customerId, clientName,
      budgetAmount, startDate, endDate, progressPercent = 0
    } = req.body;
    
    if (!name) return res.status(400).json({ success: false, error: 'NAME_REQUIRED' });
    
    // Generate project code
    const projectCode = `PJM-${Date.now().toString(36).toUpperCase()}`;
    
    const project = await db.PjmProject.create({
      tenantId,
      projectCode,
      name,
      description,
      category,
      status,
      priority,
      managerName,
      managerId: managerEmployeeId,
      branchId,
      branchName,
      clientName,
      customerId,
      budgetAmount: budgetAmount || 0,
      startDate,
      endDate,
      progressPercent,
      createdBy: userId,
      totalTasks: 0,
      completedTasks: 0,
      actualCost: 0,
    });
    
    // Log activity
    await logActivity(tenantId, project.id, 'project', 'created', userId, `Project "${name}" created`);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Project created successfully', 
      data: project 
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== TASKS ====================
async function handleGetTasks(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { page = '1', limit = '50', status, projectId, search } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;
  
  try {
    const where: any = buildTenantWhere(tenantId);
    if (status && status !== 'all') where.status = status;
    if (projectId) where.projectId = projectId;
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    
    const { count, rows } = await db.PjmTask.findAndCountAll({
      where,
      include: [{ model: db.PjmProject, as: 'project', attributes: ['id', 'name', 'projectCode'] }],
      order: [['sortOrder', 'ASC'], ['created_at', 'DESC']],
      limit: limitNum,
      offset
    });
    
    return res.status(200).json({
      success: true,
      data: { rows, total: count, page: pageNum, limit: limitNum }
    });
  } catch (e: any) {
    // Return demo tasks if error
    const demoTasks = generateDemoTasks();
    return res.status(200).json({
      success: true,
      data: { rows: demoTasks, total: demoTasks.length, page: 1, limit: 50 }
    });
  }
}

async function handleGetTaskDetail(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    const task = await db.PjmTask.findOne({
      where: { ...buildTenantWhere(tenantId), id },
      include: [
        { model: db.PjmProject, as: 'project' },
        { model: db.PjmMilestone, as: 'milestone' },
        { model: db.PjmTimesheet, as: 'timesheets' },
      ]
    });
    
    if (!task) return res.status(404).json({ success: false, error: 'TASK_NOT_FOUND' });
    return res.status(200).json({ success: true, data: task });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleCreateTask(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  try {
    const { 
      projectId, name, description, status = 'todo', priority = 'normal',
      assigneeName, assigneeEmployeeId, startDate, dueDate, estimatedHours,
      progressPercent = 0, storyPoints, milestoneId, taskType = 'task'
    } = req.body;
    
    if (!projectId || !name) {
      return res.status(400).json({ success: false, error: 'PROJECT_AND_NAME_REQUIRED' });
    }
    
    const task = await db.PjmTask.create({
      tenantId,
      projectId,
      milestoneId,
      name,
      description,
      status,
      priority,
      taskType,
      assigneeName,
      assigneeId: assigneeEmployeeId,
      reporterId: userId,
      startDate,
      dueDate,
      estimatedHours: estimatedHours || 0,
      actualHours: 0,
      progressPercent,
      storyPoints,
      createdBy: userId,
      sortOrder: 0,
    });
    
    // Update project task count
    await refreshProjectRollups(projectId);
    
    // Log activity
    await logActivity(tenantId, projectId, 'task', 'created', userId, `Task "${name}" created`);
    
    return res.status(201).json({ success: true, message: 'Task created', data: task });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleUpdateTask(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    const task = await db.PjmTask.findOne({ where: { ...buildTenantWhere(tenantId), id } });
    if (!task) return res.status(404).json({ success: false, error: 'TASK_NOT_FOUND' });
    
    const oldStatus = task.status;
    await task.update(req.body);
    
    // If status changed, log and update rollups
    if (req.body.status && req.body.status !== oldStatus) {
      await refreshProjectRollups(task.projectId);
      await logActivity(tenantId, task.projectId, 'task', 'status_changed', userId, 
        `Task "${task.name}" status changed from ${oldStatus} to ${req.body.status}`);
    }
    
    return res.status(200).json({ success: true, message: 'Task updated', data: task });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleDeleteTask(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    const task = await db.PjmTask.findOne({ where: { ...buildTenantWhere(tenantId), id } });
    if (!task) return res.status(404).json({ success: false, error: 'TASK_NOT_FOUND' });
    
    const projectId = task.projectId;
    await task.destroy();
    await refreshProjectRollups(projectId);
    
    return res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== MILESTONES ====================
async function handleGetMilestones(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId, status } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    if (status && status !== 'all') where.status = status;
    
    const milestones = await db.PjmMilestone.findAll({
      where,
      include: [{ model: db.PjmProject, as: 'project', attributes: ['id', 'name', 'projectCode'] }],
      order: [['dueDate', 'ASC']]
    });
    
    // If no milestones, return demo
    if (milestones.length === 0) {
      return res.status(200).json({ success: true, data: ESI_DEMO_MILESTONES });
    }
    
    return res.status(200).json({ success: true, data: milestones });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: ESI_DEMO_MILESTONES });
  }
}

async function handleCreateMilestone(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    const { projectId, name, description, dueDate, status = 'pending' } = req.body;
    if (!projectId || !name) {
      return res.status(400).json({ success: false, error: 'PROJECT_AND_NAME_REQUIRED' });
    }
    
    const milestone = await db.PjmMilestone.create({
      tenantId,
      projectId,
      name,
      description,
      dueDate,
      status,
    });
    
    return res.status(201).json({ success: true, data: milestone });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleUpdateMilestone(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    const [updated] = await db.PjmMilestone.update(req.body, {
      where: { ...buildTenantWhere(tenantId), id }
    });
    
    if (!updated) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    const milestone = await db.PjmMilestone.findOne({ where: { id } });
    return res.status(200).json({ success: true, data: milestone });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleDeleteMilestone(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    await db.PjmMilestone.destroy({ where: { ...buildTenantWhere(tenantId), id } });
    return res.status(200).json({ success: true, message: 'Milestone deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== TIMESHEETS ====================
async function handleGetTimesheets(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId, status, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    if (status && status !== 'all') where.status = status;
    
    const { count, rows } = await db.PjmTimesheet.findAndCountAll({
      where,
      include: [
        { model: db.PjmProject, as: 'project' },
        { model: db.PjmTask, as: 'task' },
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum
    });
    
    const totalHours = rows.reduce((sum: number, ts: any) => sum + parseFloat(ts.hoursWorked || 0), 0);
    
    return res.status(200).json({
      success: true,
      data: { rows, total: count, totalHours, page: pageNum, limit: limitNum }
    });
  } catch (e: any) {
    // Demo timesheets
    return res.status(200).json({
      success: true,
      data: { rows: generateDemoTimesheets(), total: 5, totalHours: 120, page: 1, limit: 20 }
    });
  }
}

async function handleCreateTimesheet(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  try {
    const { projectId, taskId, hoursWorked, description, date, status = 'draft', billable = true } = req.body;
    
    if (!projectId || !hoursWorked) {
      return res.status(400).json({ success: false, error: 'REQUIRED_FIELDS_MISSING' });
    }
    
    const timesheet = await db.PjmTimesheet.create({
      tenantId,
      projectId,
      taskId,
      hoursWorked,
      description,
      date: date || new Date(),
      status,
      billable,
      submittedBy: userId,
    });
    
    return res.status(201).json({ success: true, data: timesheet });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleUpdateTimesheet(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    await db.PjmTimesheet.update(req.body, { where: { ...buildTenantWhere(tenantId), id } });
    const timesheet = await db.PjmTimesheet.findOne({ where: { id } });
    return res.status(200).json({ success: true, data: timesheet });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleSubmitTimesheet(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.body;
  try {
    await db.PjmTimesheet.update({ status: 'submitted', submittedAt: new Date() }, {
      where: { ...buildTenantWhere(tenantId), id }
    });
    return res.status(200).json({ success: true, message: 'Timesheet submitted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleApproveTimesheet(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  const { id } = req.body;
  try {
    await db.PjmTimesheet.update({ status: 'approved', approvedBy: userId, approvedAt: new Date() }, {
      where: { ...buildTenantWhere(tenantId), id }
    });
    return res.status(200).json({ success: true, message: 'Timesheet approved' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleRejectTimesheet(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  const { id, reason } = req.body;
  try {
    await db.PjmTimesheet.update({ status: 'rejected', rejectedBy: userId, rejectionReason: reason, rejectedAt: new Date() }, {
      where: { ...buildTenantWhere(tenantId), id }
    });
    return res.status(200).json({ success: true, message: 'Timesheet rejected' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== RESOURCES ====================
async function handleGetResources(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    
    const resources = await db.PjmResource.findAll({
      where,
      include: [{ model: db.PjmProject, as: 'project' }],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({ success: true, data: resources });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: generateDemoResources() });
  }
}

async function handleCreateResource(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    const resource = await db.PjmResource.create({
      tenantId,
      ...req.body
    });
    return res.status(201).json({ success: true, data: resource });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleUpdateResource(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    await db.PjmResource.update(req.body, { where: { ...buildTenantWhere(tenantId), id } });
    const resource = await db.PjmResource.findOne({ where: { id } });
    return res.status(200).json({ success: true, data: resource });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleDeleteResource(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    await db.PjmResource.destroy({ where: { ...buildTenantWhere(tenantId), id } });
    return res.status(200).json({ success: true, message: 'Resource deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== RISKS ====================
async function handleGetRisks(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId, status } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    if (status && status !== 'all') where.status = status;
    
    const risks = await db.PjmRisk.findAll({
      where,
      include: [{ model: db.PjmProject, as: 'project' }],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({ success: true, data: risks });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: generateDemoRisks() });
  }
}

async function handleCreateRisk(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    const { probability = 'low', impact = 'low' } = req.body;
    const score = calculateRiskScore(probability, impact);
    
    const risk = await db.PjmRisk.create({
      tenantId,
      ...req.body,
      score,
      riskLevel: score >= 9 ? 'critical' : score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low'
    });
    
    return res.status(201).json({ success: true, data: risk });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleUpdateRisk(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    const updates: any = { ...req.body };
    if (req.body.probability || req.body.impact) {
      const risk = await db.PjmRisk.findOne({ where: { id } });
      const prob = req.body.probability || risk?.probability;
      const imp = req.body.impact || risk?.impact;
      updates.score = calculateRiskScore(prob, imp);
      updates.riskLevel = updates.score >= 9 ? 'critical' : updates.score >= 6 ? 'high' : updates.score >= 3 ? 'medium' : 'low';
    }
    
    await db.PjmRisk.update(updates, { where: { ...buildTenantWhere(tenantId), id } });
    const updated = await db.PjmRisk.findOne({ where: { id } });
    return res.status(200).json({ success: true, data: updated });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleDeleteRisk(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    await db.PjmRisk.destroy({ where: { ...buildTenantWhere(tenantId), id } });
    return res.status(200).json({ success: true, message: 'Risk deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== BUDGETS ====================
async function handleGetBudgets(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    
    const budgetItems = await db.PjmBudget.findAll({
      where,
      include: [{ model: db.PjmProject, as: 'project' }],
      order: [['created_at', 'DESC']]
    });
    
    // Calculate summary
    const plannedTotal = budgetItems.reduce((sum: number, b: any) => sum + parseFloat(b.plannedAmount || 0), 0);
    const actualTotal = budgetItems.reduce((sum: number, b: any) => sum + parseFloat(b.actualAmount || 0), 0);
    const committedTotal = budgetItems.reduce((sum: number, b: any) => sum + parseFloat(b.committedAmount || 0), 0);
    
    return res.status(200).json({
      success: true,
      data: {
        items: budgetItems,
        summary: { plannedTotal, actualTotal, committedTotal }
      }
    });
  } catch (e: any) {
    return res.status(200).json({
      success: true,
      data: generateDemoBudgetData()
    });
  }
}

async function handleCreateBudget(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    const budget = await db.PjmBudget.create({
      tenantId,
      ...req.body,
      actualAmount: 0,
      committedAmount: 0
    });
    return res.status(201).json({ success: true, data: budget });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleUpdateBudget(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    await db.PjmBudget.update(req.body, { where: { ...buildTenantWhere(tenantId), id } });
    const budget = await db.PjmBudget.findOne({ where: { id } });
    return res.status(200).json({ success: true, data: budget });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleDeleteBudget(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    await db.PjmBudget.destroy({ where: { ...buildTenantWhere(tenantId), id } });
    return res.status(200).json({ success: true, message: 'Budget item deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== DOCUMENTS ====================
async function handleGetDocuments(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    
    const documents = await db.PjmDocument.findAll({
      where,
      include: [{ model: db.PjmProject, as: 'project' }],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({ success: true, data: documents });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: generateDemoDocuments() });
  }
}

async function handleCreateDocument(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    const doc = await db.PjmDocument.create({
      tenantId,
      ...req.body,
      version: req.body.version || '1.0'
    });
    return res.status(201).json({ success: true, data: doc });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleDeleteDocument(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    await db.PjmDocument.destroy({ where: { ...buildTenantWhere(tenantId), id } });
    return res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== GANTT ====================
async function handleGetGantt(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId, action } = req.query;
  
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    
    // Get projects and tasks for Gantt
    const projects = await db.PjmProject.findAll({
      where: buildTenantWhere(tenantId),
      include: [{ model: db.PjmTask, as: 'tasks' }],
      order: [['startDate', 'ASC']]
    });
    
    // If no data, return demo Gantt data
    if (projects.length === 0) {
      return res.status(200).json({ success: true, data: generateDemoGanttData() });
    }
    
    // Build Gantt items
    const items: any[] = [];
    
    for (const project of projects) {
      items.push({
        id: `project-${project.id}`,
        type: 'project',
        text: project.name,
        start_date: project.startDate,
        end_date: project.endDate,
        progress: parseFloat(project.progressPercent || 0),
        priority: project.priority,
        status: project.status,
        projectId: project.id,
      });
      
      // Add tasks
      for (const task of (project.tasks || [])) {
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          text: task.name,
          start_date: task.startDate,
          end_date: task.dueDate,
          progress: parseFloat(task.progressPercent || 0),
          priority: task.priority,
          status: task.status,
          projectId: project.id,
          assignee: task.assigneeName,
          parent: `project-${project.id}`,
        });
      }
    }
    
    return res.status(200).json({ success: true, data: { items, total: items.length } });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: { items: generateDemoGanttData(), total: 20 } });
  }
}

async function handleUpdateSchedule(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    const { itemId, startDate, endDate, parentId } = req.body;
    
    // Parse item type and ID
    if (itemId?.startsWith('task-')) {
      const taskId = itemId.replace('task-', '');
      await db.PjmTask.update(
        { startDate, dueDate: endDate },
        { where: { ...buildTenantWhere(tenantId), id: taskId } }
      );
    }
    
    return res.status(200).json({ success: true, message: 'Schedule updated' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== CALENDAR ====================
async function handleGetCalendar(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    const [tasks, milestones] = await Promise.all([
      db.PjmTask.findAll({ where: buildTenantWhere(tenantId), include: [{ model: db.PjmProject, as: 'project' }] }),
      db.PjmMilestone.findAll({ where: buildTenantWhere(tenantId), include: [{ model: db.PjmProject, as: 'project' }] }),
    ]);
    
    const events: any[] = [];
    
    // Task events
    for (const task of tasks) {
      if (task.dueDate) {
        events.push({
          id: `task-${task.id}`,
          title: task.name,
          start: task.startDate || task.dueDate,
          end: task.dueDate,
          type: 'task',
          status: task.status,
          priority: task.priority,
          projectName: task.project?.name,
          assignee: task.assigneeName,
        });
      }
    }
    
    // Milestone events
    for (const ms of milestones) {
      if (ms.dueDate) {
        events.push({
          id: `milestone-${ms.id}`,
          title: `🏁 ${ms.name}`,
          start: ms.dueDate,
          allDay: true,
          type: 'milestone',
          status: ms.status,
          projectName: ms.project?.name,
        });
      }
    }
    
    if (events.length === 0) {
      return res.status(200).json({ success: true, data: { events: generateDemoCalendarEvents() } });
    }
    
    return res.status(200).json({ success: true, data: { events } });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: { events: generateDemoCalendarEvents() } });
  }
}

// ==================== WORKLOAD ====================
async function handleGetWorkload(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    // Get assignees from tasks
    const tasks = await db.PjmTask.findAll({
      where: { ...buildTenantWhere(tenantId), status: { [Op.notIn]: ['done', 'cancelled'] } },
      attributes: ['assigneeName', 'status', 'estimatedHours', 'actualHours'],
    });
    
    // Calculate workload by assignee
    const workloadMap: Record<string, any> = {};
    for (const task of tasks) {
      const name = task.assigneeName || 'Unassigned';
      if (!workloadMap[name]) {
        workloadMap[name] = { name, tasks: 0, estimatedHours: 0, actualHours: 0, byStatus: {} };
      }
      workloadMap[name].tasks++;
      workloadMap[name].estimatedHours += parseFloat(task.estimatedHours || 0);
      workloadMap[name].actualHours += parseFloat(task.actualHours || 0);
      workloadMap[name].byStatus[task.status] = (workloadMap[name].byStatus[task.status] || 0) + 1;
    }
    
    const workloadData = Object.values(workloadMap);
    
    if (workloadData.length === 0) {
      return res.status(200).json({ success: true, data: { rows: generateDemoWorkloadData() } });
    }
    
    return res.status(200).json({ success: true, data: { rows: workloadData } });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: { rows: generateDemoWorkloadData() } });
  }
}

// ==================== SPRINTS ====================
async function handleGetSprints(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    
    const sprints = await db.PjmSprint.findAll({
      where,
      order: [['startDate', 'DESC']]
    });
    
    return res.status(200).json({ success: true, data: { rows: sprints } });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: { rows: generateDemoSprints() } });
  }
}

async function handleCreateSprint(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    const sprint = await db.PjmSprint.create({
      tenantId,
      ...req.body,
      status: req.body.status || 'planning'
    });
    return res.status(201).json({ success: true, data: sprint });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleUpdateSprint(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    await db.PjmSprint.update(req.body, { where: { ...buildTenantWhere(tenantId), id } });
    const sprint = await db.PjmSprint.findOne({ where: { id } });
    return res.status(200).json({ success: true, data: sprint });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== EVM ====================
async function handleGetEVM(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId } = req.query;
  
  try {
    let projects;
    if (projectId) {
      const p = await db.PjmProject.findOne({
        where: { ...buildTenantWhere(tenantId), id: projectId },
        include: [{ model: db.PjmTask, as: 'tasks' }]
      });
      projects = p ? [p] : [];
    } else {
      projects = await db.PjmProject.findAll({
        where: buildTenantWhere(tenantId),
        include: [{ model: db.PjmTask, as: 'tasks' }]
      });
    }
    
    if (projects.length === 0) {
      return res.status(200).json({ success: true, data: generateDemoEVMData() });
    }
    
    const evmData = projects.map((p: any) => calculateEVM(p));
    
    return res.status(200).json({ success: true, data: evmData });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: generateDemoEVMData() });
  }
}

async function handleGetCriticalPath(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  // Return demo critical path for now
  return res.status(200).json({
    success: true,
    data: {
      criticalPath: [
        { id: '1', name: 'Site Survey', duration: 5, float: 0 },
        { id: '2', name: 'Permit Process', duration: 10, float: 0 },
        { id: '3', name: 'Preparation Phase', duration: 7, float: 0 },
        { id: '4', name: 'Release Animals', duration: 3, float: 0 },
      ],
      totalDuration: 25,
    }
  });
}

async function handleGetBurndown(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  return res.status(200).json({
    success: true,
    data: {
      ideal: [
        { day: 1, points: 100 }, { day: 2, points: 90 }, { day: 3, points: 80 },
        { day: 4, points: 70 }, { day: 5, points: 60 }, { day: 6, points: 50 },
        { day: 7, points: 40 }, { day: 8, points: 30 }, { day: 9, points: 20 },
        { day: 10, points: 10 }, { day: 11, points: 0 },
      ],
      actual: [
        { day: 1, points: 100 }, { day: 2, points: 92 }, { day: 3, points: 85 },
        { day: 4, points: 78 }, { day: 5, points: 65 }, { day: 6, points: 58 },
        { day: 7, points: 45 }, { day: 8, points: 35 }, { day: 9, points: 25 },
        { day: 10, points: 15 }, { day: 11, points: 5 },
      ]
    }
  });
}

// ==================== COLLABORATION ====================
async function handleGetComments(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId, entityType, entityId } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    
    const comments = await db.PjmComment.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({ success: true, data: comments });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: generateDemoComments() });
  }
}

async function handleCreateComment(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  try {
    const comment = await db.PjmComment.create({
      tenantId,
      ...req.body,
      createdBy: userId,
    });
    return res.status(201).json({ success: true, data: comment });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleGetActivityLog(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId, limit = '50' } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    
    const logs = await db.PjmActivityLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit as string)
    });
    
    return res.status(200).json({ success: true, data: logs });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: generateDemoActivityLog() });
  }
}

async function handleGetApprovals(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId, status } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    if (status && status !== 'all') where.status = status;
    
    const approvals = await db.PjmApproval.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({ success: true, data: approvals });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: generateDemoApprovals() });
  }
}

async function handleCreateApproval(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  try {
    const approval = await db.PjmApproval.create({
      tenantId,
      ...req.body,
      requestedBy: userId,
      status: 'pending'
    });
    return res.status(201).json({ success: true, data: approval });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleUpdateApproval(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'ID_REQUIRED' });
  
  try {
    const { decision, notes } = req.body;
    await db.PjmApproval.update(
      { status: decision, respondedBy: userId, respondedAt: new Date(), responseNotes: notes },
      { where: { ...buildTenantWhere(tenantId), id } }
    );
    const approval = await db.PjmApproval.findOne({ where: { id } });
    return res.status(200).json({ success: true, data: approval });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleGetDependencies(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  return res.status(200).json({ success: true, data: [] });
}

async function handleGetWatchers(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  const { projectId } = req.query;
  try {
    const where: any = buildTenantWhere(tenantId);
    if (projectId) where.projectId = projectId;
    
    const watchers = await db.PjmWatcher.findAll({ where, order: [['created_at', 'DESC']] });
    return res.status(200).json({ success: true, data: watchers });
  } catch (e: any) {
    return res.status(200).json({ success: true, data: [] });
  }
}

async function handleToggleWatcher(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  try {
    const { projectId, userId: watcherUserId, isWatching } = req.body;
    
    if (isWatching === false) {
      await db.PjmWatcher.destroy({
        where: { ...buildTenantWhere(tenantId), projectId, userId: watcherUserId || userId }
      });
      return res.status(200).json({ success: true, isWatching: false });
    } else {
      const [watcher, created] = await db.PjmWatcher.findOrCreate({
        where: { ...buildTenantWhere(tenantId), projectId, userId: watcherUserId || userId }
      });
      return res.status(200).json({ success: true, isWatching: true, data: watcher });
    }
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function handleGetBaselines(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  return res.status(200).json({ success: true, data: [] });
}

// ==================== LOOKUPS / INTEGRATIONS ====================
async function handleGetEmployees(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    // Try to get from Employee model
    if (db.Employee) {
      const employees = await db.Employee.findAll({
        where: { isActive: true },
        attributes: ['id', 'employeeNumber', 'firstName', 'lastName', 'email', 'department', 'position'],
        order: [['firstName', 'ASC']]
      });
      
      const formatted = employees.map((e: any) => ({
        id: e.id,
        employeeNumber: e.employeeNumber,
        name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        department: e.department,
        position: e.position,
      }));
      
      return res.status(200).json({ success: true, data: { rows: formatted } });
    }
  } catch (e) {
    console.log('Employee model not available, using demo data');
  }
  
  // Demo employees
  return res.status(200).json({
    success: true,
    data: {
      rows: [
        { id: 1, employeeNumber: 'EMP-001', name: 'Dr. Rina Wijaya', department: 'Konservasi', position: 'Senior Konservasionis' },
        { id: 2, employeeNumber: 'EMP-002', name: 'Budi Santoso', department: 'Rehabilitasi', position: 'Veteriner' },
        { id: 3, employeeNumber: 'EMP-003', name: 'Siti Rahmawati', department: 'Monitoring', position: 'Field Coordinator' },
        { id: 4, employeeNumber: 'EMP-004', name: 'Maya Kusuma', department: 'Edukasi', position: 'Education Officer' },
        { id: 5, employeeNumber: 'EMP-005', name: 'Andi Pratama', department: 'Patroli', position: 'Ranger Leader' },
      ]
    }
  });
}

async function handleGetTeamDirectory(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  return handleGetEmployees(req, res, tenantId);
}

async function handleGetCustomers(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    if (db.Customer) {
      const customers = await db.Customer.findAll({
        limit: 50,
        order: [['name', 'ASC']]
      });
      return res.status(200).json({ success: true, data: { rows: customers } });
    }
  } catch (e) {}
  
  return res.status(200).json({
    success: true,
    data: {
      rows: [
        { id: '1', name: 'KLHK', customerType: 'government' },
        { id: '2', name: 'WWF Indonesia', customerType: 'ngo' },
        { id: '3', name: 'Taman Nasional Ujung Kulon', customerType: 'government' },
      ]
    }
  });
}

async function handleGetBranches(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    if (db.Branch) {
      const branches = await db.Branch.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']]
      });
      return res.status(200).json({ success: true, data: branches });
    }
  } catch (e) {}
  
  return res.status(200).json({
    success: true,
    data: [
      { id: '1', code: 'HQ', name: 'Kantor Pusat ESI', city: 'Jakarta' },
      { id: '2', code: 'TN-UK', name: 'Taman Nasional Ujung Kulon', city: 'Banten' },
      { id: '3', code: 'TN-GH', name: 'Gunung Halimun Salak', city: 'Jawa Barat' },
    ]
  });
}

async function handleGetFleetVehicles(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  try {
    if (db.FleetVehicle) {
      const vehicles = await db.FleetVehicle.findAll({
        where: { isActive: true },
        limit: 50
      });
      return res.status(200).json({ success: true, data: { rows: vehicles } });
    }
  } catch (e) {}
  
  return res.status(200).json({
    success: true,
    data: {
      rows: [
        { id: '1', vehicleCode: 'F-001', name: 'Toyota Hilux Patrol 1', type: 'patrol', status: 'available' },
        { id: '2', vehicleCode: 'F-002', name: 'Mitsubishi Triton', type: 'transport', status: 'in_use' },
      ]
    }
  });
}

async function handleGetInventoryItems(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  return res.status(200).json({ success: true, data: { rows: [] } });
}

async function handleGetPurchaseOrders(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined): Promise<void> {
  return res.status(200).json({ success: true, data: { rows: [] } });
}

async function handleAssignTask(req: NextApiRequest, res: NextApiResponse, tenantId: string | undefined, userId: number | undefined): Promise<void> {
  try {
    const { taskId, assigneeEmployeeId, assigneeName } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, error: 'TASK_ID_REQUIRED' });
    }
    
    await db.PjmTask.update(
      { assigneeId: assigneeEmployeeId, assigneeName },
      { where: { ...buildTenantWhere(tenantId), id: taskId } }
    );
    
    await logActivity(tenantId, null, 'task', 'assigned', userId, 
      `Task assigned to ${assigneeName || 'user'}`);
    
    return res.status(200).json({ success: true, message: 'Task assigned' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ==================== UTILITY FUNCTIONS ====================
function buildTenantWhere(tenantId: string | undefined): any {
  if (!tenantId) return {};
  return { tenantId };
}

function methodNotAllowed(res: NextApiResponse, allowed: string[]): void {
  res.setHeader('Allow', allowed);
  res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED', allowed });
}

function calculateRiskScore(probability: string, impact: string): number {
  const pMap: Record<string, number> = { very_high: 4, high: 3, medium: 2, low: 1 };
  const iMap: Record<string, number> = { very_high: 4, high: 3, medium: 2, low: 1 };
  return (pMap[probability.toLowerCase()] || 1) * (iMap[impact.toLowerCase()] || 1);
}

async function refreshProjectRollups(projectId: string): Promise<void> {
  try {
    const tasks = await db.PjmTask.findAll({ where: { projectId } });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
    
    const progressPercent = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100 * 100) / 100 
      : 0;
    
    await db.PjmProject.update(
      { totalTasks, completedTasks, progressPercent },
      { where: { id: projectId } }
    );
  } catch (e) {
    console.warn('Error refreshing project rollups (table may not exist):', (e as any)?.message || e);
  }
}

async function logActivity(
  tenantId: string | undefined,
  projectId: string | null,
  entityType: string,
  action: string,
  userId: number | undefined,
  details: string
): Promise<void> {
  try {
    if (db.PjmActivityLog) {
      await db.PjmActivityLog.create({
        tenantId,
        projectId,
        entityType,
        action,
        userId,
        details,
      });
    }
  } catch (e) {
    console.warn('Error logging activity: (table may not exist):', (e as any)?.message || e);
  }
}

function getStatusCounts(tenantId: string | undefined): Promise<Record<string, number>> {
  return db.PjmProject.findAll({
    where: buildTenantWhere(tenantId),
    attributes: ['status', [db.sequelize.fn('COUNT', '*'), 'count']],
    group: ['status']
  }).then((results: any[]) => {
    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.status] = parseInt(r.dataValues.count);
    }
    return counts;
  }).catch(() => ({}));
}

function getTaskStatusCounts(tenantId: string | undefined): Promise<Record<string, number>> {
  return db.PjmTask.findAll({
    where: buildTenantWhere(tenantId),
    attributes: ['status', [db.sequelize.fn('COUNT', '*'), 'count']],
    group: ['status']
  }).then((results: any[]) => {
    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.status] = parseInt(r.dataValues.count);
    }
    return counts;
  }).catch(() => ({}));
}

function calculateEVM(project: any): any {
  const BAC = parseFloat(project.budgetAmount || 0);
  const progress = parseFloat(project.progressPercent || 0) / 100;
  const AC = parseFloat(project.actualCost || 0);
  
  // Calculate planned % based on dates
  const today = new Date();
  let plannedPercent = 0;
  if (project.startDate && project.endDate) {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    if (totalDuration > 0 && elapsed > 0) {
      plannedPercent = Math.min(1, Math.max(0, elapsed / totalDuration));
    }
  } else {
    plannedPercent = progress; // Fallback to actual if no dates
  }
  
  const PV = BAC * plannedPercent;
  const EV = BAC * progress;
  
  const SV = EV - PV;
  const CV = EV - AC;
  const SPI = PV > 0 ? EV / PV : 1;
  const CPI = AC > 0 ? EV / AC : 1;
  
  const EAC = CPI > 0 ? AC + (BAC - EV) / CPI : BAC;
  const ETC = EAC - AC;
  const VAC = BAC - EAC;
  
  return {
    projectId: project.id,
    projectName: project.name,
    projectCode: project.projectCode,
    
    // Core EVM metrics
    BAC,
    PV,
    EV,
    AC,
    
    // Variances
    SV,
    CV,
    
    // Indices
    SPI,
    CPI,
    
    // Forecasts
    EAC,
    ETC,
    VAC,
    
    // Status
    status: project.status,
    progressPercent: project.progressPercent,
    plannedPercent: Math.round(plannedPercent * 10000) / 100,
    
    // Health indicators
    scheduleHealth: SPI >= 0.95 ? 'on_track' : SPI >= 0.8 ? 'at_risk' : 'behind',
    budgetHealth: CPI >= 0.95 ? 'on_track' : CPI >= 0.8 ? 'at_risk' : 'over_budget',
  };
}

// ==================== DEMO DATA GENERATORS ====================
function generateBudgetTrend() {
  return [
    { month: 'Jan', planned: 120, actual: 95, committed: 110 },
    { month: 'Feb', planned: 280, actual: 210, committed: 250 },
    { month: 'Mar', planned: 420, actual: 340, committed: 390 },
    { month: 'Apr', planned: 580, actual: 480, committed: 520 },
    { month: 'Mei', planned: 720, actual: 610, committed: 680 },
    { month: 'Jun', planned: 850, actual: 720, committed: 800 },
  ];
}

function generateTaskDistribution(counts: Record<string, number>) {
  const distribution = [
    { name: 'To Do', value: counts.todo || 28, color: '#6B7280' },
    { name: 'In Progress', value: counts.in_progress || 34, color: '#F59E0B' },
    { name: 'Review', value: counts.review || 12, color: '#8B5CF6' },
    { name: 'Done', value: counts.done || 42, color: '#10B981' },
    { name: 'Blocked', value: counts.blocked || 4, color: '#EF4444' },
  ];
  return distribution;
}

function generateWeeklyHours() {
  return [
    { week: 'W10', hours: 280, target: 400 },
    { week: 'W11', hours: 310, target: 400 },
    { week: 'W12', hours: 295, target: 400 },
    { week: 'W13', hours: 340, target: 400 },
    { week: 'W14', hours: 315, target: 400 },
    { week: 'W15', hours: 360, target: 400 },
  ];
}

function generateRiskMatrix() {
  return [
    { prob: 'High', impact: 'High', count: 1, level: 'critical' },
    { prob: 'Medium', impact: 'High', count: 2, level: 'high' },
    { prob: 'Medium', impact: 'Medium', count: 3, level: 'medium' },
  ];
}

function generateDemoTasks() {
  return ESI_DEMO_PROJECTS.flatMap((p, pi) => [
    { id: `task-${pi}-1`, projectId: p.id, project_name: p.name, name: 'Site Assessment & Survey', status: 'done', priority: 'high', assigneeName: 'Dr. Rina Wijaya', progressPercent: 100 },
    { id: `task-${pi}-2`, projectId: p.id, project_name: p.name, name: 'Prepare Permit Documentation', status: 'in_progress', priority: 'high', assigneeName: 'Budi Santoso', progressPercent: 60 },
    { id: `task-${pi}-3`, projectId: p.id, project_name: p.name, name: 'Community Engagement Meeting', status: 'todo', priority: 'normal', assigneeName: 'Maya Kusuma', progressPercent: 0 },
    { id: `task-${pi}-4`, projectId: p.id, project_name: p.name, name: 'Logistics & Equipment Prep', status: 'review', priority: 'normal', assigneeName: 'Andi Pratama', progressPercent: 85 },
    { id: `task-${pi}-5`, projectId: p.id, project_name: p.name, name: 'Health Screening (Animals)', status: 'blocked', priority: 'urgent', assigneeName: 'Dr. Rina Wijaya', progressPercent: 0 },
  ]);
}

function generateDemoTimesheets() {
  return [
    { id: 'ts1', projectName: 'Reintroduksi Elang Jawa', taskName: 'Site Survey', hoursWorked: 8, date: '2026-06-15', status: 'approved', submittedBy: 'Dr. Rina Wijaya' },
    { id: 'ts2', projectName: 'Rehabilitasi Orangutan', taskName: 'Medical Checkup', hoursWorked: 4, date: '2026-06-15', status: 'submitted', submittedBy: 'Budi Santoso' },
    { id: 'ts3', projectName: 'Edukasi Konservasi', taskName: 'School Visit', hoursWorked: 6, date: '2026-06-14', status: 'approved', submittedBy: 'Maya Kusuma' },
    { id: 'ts4', projectName: 'Monitoring Badak Jawa', taskName: 'Patroli Malam', hoursWorked: 12, date: '2026-06-13', status: 'draft', submittedBy: 'Andi Pratama' },
  ];
}

function generateDemoResources() {
  return [
    { id: 'r1', resourceName: 'Dr. Rina Wijaya', resourceType: 'employee', role: 'Senior Konservasionis', allocationPercent: 100, costPerHour: 250000 },
    { id: 'r2', resourceName: 'Budi Santoso', resourceType: 'employee', role: 'Veteriner', allocationPercent: 75, costPerHour: 200000 },
    { id: 'r3', resourceName: 'Toyota Hilux (Patrol 1)', resourceType: 'vehicle', role: 'Transport Lapangan', allocationPercent: 60, costPerHour: 50000 },
    { id: 'r4', resourceName: 'Camera Trap (Set A)', resourceType: 'equipment', role: 'Monitoring', allocationPercent: 100, costPerHour: 0 },
  ];
}

function generateDemoRisks() {
  return [
    { id: 'risk1', title: 'Cuaca Buruk Selama Release', description: 'Resiko hujan deras atau badai selama pelepasan satwa', probability: 'medium', impact: 'high', score: 6, riskLevel: 'high', status: 'identified', mitigationPlan: 'Monitor BMKG 1 minggu sebelum; buat jadwal cadangan', ownerName: 'Dr. Rina Wijaya' },
    { id: 'risk2', title: 'Gangguan Manusia di Habitat', description: 'Aktivitas ilegal (perburuan, penebangan) di area rilis', probability: 'high', impact: 'high', score: 9, riskLevel: 'critical', status: 'mitigating', mitigationPlan: 'Tambah patroli; koordinasi dengan TN dan Polhut', ownerName: 'Andi Pratama' },
    { id: 'risk3', title: 'Keterlambatan Perizinan', description: 'Proses perizinan dari KLHK lebih lama dari rencana', probability: 'medium', impact: 'medium', score: 4, riskLevel: 'medium', status: 'identified', mitigationPlan: 'Follow up mingguan; siapkan surat pendukung', ownerName: 'Siti Rahmawati' },
  ];
}

function generateDemoBudgetData() {
  return {
    items: [
      { id: 'b1', category: 'Personil', description: 'Gaji Tim Konservasi (6 bulan)', plannedAmount: 600000000, actualAmount: 320000000 },
      { id: 'b2', category: 'Transportasi', description: 'Bahan bakar dan akomodasi patroli', plannedAmount: 150000000, actualAmount: 85000000 },
      { id: 'b3', category: 'Peralatan', description: 'Camera trap, GPS, perlengkapan lapangan', plannedAmount: 80000000, actualAmount: 75000000 },
      { id: 'b4', category: 'Kesehatan Satwa', description: 'Vaksin, obat-obatan, pemeriksaan kesehatan', plannedAmount: 120000000, actualAmount: 60000000 },
      { id: 'b5', category: 'Konsumsi & Makan', description: 'Makan tim selama operasi lapangan', plannedAmount: 50000000, actualAmount: 40000000 },
    ],
    summary: {
      plannedTotal: 1000000000,
      actualTotal: 580000000,
      committedTotal: 620000000
    }
  };
}

function generateDemoDocuments() {
  return [
    { id: 'd1', title: 'Proposal Reintroduksi Elang Jawa v2.1', documentType: 'proposal', description: 'Proposal resmi untuk program reintroduksi', version: '2.1', fileUrl: '#', createdAt: '2026-01-10' },
    { id: 'd2', title: 'Laporan Pre-Release Survey', documentType: 'report', description: 'Hasil survei habitat sebelum pelepasan', version: '1.0', fileUrl: '#', createdAt: '2026-02-15' },
    { id: 'd3', title: 'SOP Pelepasan Satwa', documentType: 'sop', description: 'Standar Operasional Prosedur pelepasan', version: '3.0', fileUrl: '#', createdAt: '2025-11-20' },
    { id: 'd4', title: 'Izin KLHK No. SK.123/2026', documentType: 'permit', description: 'Surat izin dari Kementerian LHK', version: '1.0', fileUrl: '#', createdAt: '2026-03-01' },
  ];
}

function generateDemoGanttData() {
  return ESI_DEMO_PROJECTS.slice(0, 3).flatMap((p, pi) => [
    {
      id: `p${pi}`,
      type: 'project',
      text: p.name,
      start_date: p.start_date,
      end_date: p.end_date,
      progress: p.progress_percent,
      priority: p.priority,
      status: p.status,
    },
    ...[
      { name: 'Planning & Survey', duration: 15, progress: 100, status: 'done' },
      { name: 'Permit & Documentation', duration: 20, progress: 75, status: 'in_progress' },
      { name: 'Site Preparation', duration: 10, progress: 30, status: 'in_progress' },
      { name: 'Animal Health Check', duration: 5, progress: 0, status: 'todo' },
      { name: 'Release & Monitoring', duration: 30, progress: 0, status: 'todo' },
    ].map((t, ti) => {
      const start = new Date(p.start_date);
      start.setDate(start.getDate() + (ti * 15));
      const end = new Date(start);
      end.setDate(end.getDate() + t.duration);
      return {
        id: `p${pi}-t${ti}`,
        type: 'task',
        text: t.name,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        progress: t.progress,
        status: t.status,
        priority: p.priority,
        parent: `p${pi}`,
      };
    })
  ]);
}

function generateDemoCalendarEvents() {
  const today = new Date();
  const events = [];
  
  // Tasks due this week
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i - 1);
    events.push({
      id: `event-${i}`,
      title: [
        'Task: Site Survey Gunung Halimun',
        'Task: Medical Checkup Orangutan #12',
        'Milestone: Laporan Q2 Due',
        'Meeting: Koordinasi dengan TN',
        'Task: Instalasi Camera Trap'
      ][i],
      start: d.toISOString().split('T')[0],
      type: i === 2 ? 'milestone' : 'task',
      status: i === 0 ? 'done' : i === 1 ? 'in_progress' : 'todo',
      priority: i === 1 ? 'high' : 'normal',
    });
  }
  
  return events;
}

function generateDemoWorkloadData() {
  return [
    { name: 'Dr. Rina Wijaya', tasks: 8, estimatedHours: 160, actualHours: 120, capacity: 160, byStatus: { done: 3, in_progress: 3, todo: 2 } },
    { name: 'Budi Santoso', tasks: 12, estimatedHours: 200, actualHours: 150, capacity: 160, byStatus: { done: 5, in_progress: 4, todo: 3 } },
    { name: 'Siti Rahmawati', tasks: 6, estimatedHours: 100, actualHours: 85, capacity: 160, byStatus: { done: 3, in_progress: 2, todo: 1 } },
    { name: 'Maya Kusuma', tasks: 5, estimatedHours: 80, actualHours: 70, capacity: 160, byStatus: { done: 2, in_progress: 2, todo: 1 } },
    { name: 'Andi Pratama', tasks: 15, estimatedHours: 240, actualHours: 190, capacity: 160, byStatus: { done: 6, in_progress: 5, todo: 4 } },
  ];
}

function generateDemoSprints() {
  return [
    { id: 'sp1', name: 'Sprint 1 - Planning', startDate: '2026-06-01', endDate: '2026-06-14', status: 'completed', totalPoints: 42, completedPoints: 42 },
    { id: 'sp2', name: 'Sprint 2 - Execution', startDate: '2026-06-15', endDate: '2026-06-28', status: 'active', totalPoints: 38, completedPoints: 15 },
    { id: 'sp3', name: 'Sprint 3 - Monitoring', startDate: '2026-06-29', endDate: '2026-07-12', status: 'planning', totalPoints: 30, completedPoints: 0 },
  ];
}

function generateDemoEVMData() {
  return ESI_DEMO_PROJECTS.slice(0, 3).map((p, i) => ({
    projectId: p.id,
    projectName: p.name,
    projectCode: p.project_code,
    BAC: p.budget_amount,
    PV: p.budget_amount * (0.3 + i * 0.1),
    EV: p.budget_amount * (p.progress_percent / 100),
    AC: p.actual_cost,
    SV: (p.budget_amount * (p.progress_percent / 100)) - (p.budget_amount * (0.3 + i * 0.1)),
    CV: (p.budget_amount * (p.progress_percent / 100)) - p.actual_cost,
    SPI: (p.progress_percent / 100) / (0.3 + i * 0.1),
    CPI: (p.budget_amount * (p.progress_percent / 100)) / p.actual_cost,
    status: p.status,
    progressPercent: p.progress_percent,
    scheduleHealth: p.progress_percent >= 50 ? 'on_track' : 'at_risk',
    budgetHealth: p.actual_cost <= p.budget_amount * (p.progress_percent / 100) ? 'on_track' : 'over_budget',
  }));
}

function generateDemoComments() {
  return [
    { id: 'c1', entityType: 'project', entityId: 'esi-p1', text: 'Saya sudah mengirimkan surat ke TN. Menunggu balasan.', createdBy: 'Dr. Rina Wijaya', createdAt: '2026-06-15 10:30' },
    { id: 'c2', entityType: 'task', entityId: 'task-1', text: 'Hasil survei menunjukkan kondisi habitat sangat mendukung. Lampiran di email.', createdBy: 'Siti Rahmawati', createdAt: '2026-06-14 16:45' },
    { id: 'c3', entityType: 'project', entityId: 'esi-p2', text: 'Perlu koordinasi dengan tim rescue untuk jadwal kedatangan individu baru.', createdBy: 'Budi Santoso', createdAt: '2026-06-13 09:15' },
  ];
}

function generateDemoActivityLog() {
  return [
    { id: 'a1', entityType: 'project', action: 'status_changed', details: 'Project "Reintroduksi Elang Jawa" status changed from planning to active', createdBy: 'Dr. Rina Wijaya', createdAt: '2026-06-15 08:00' },
    { id: 'a2', entityType: 'task', action: 'created', details: 'Task "Instalasi Camera Trap" created', createdBy: 'Andi Pratama', createdAt: '2026-06-14 14:30' },
    { id: 'a3', entityType: 'task', action: 'status_changed', details: 'Task "Medical Checkup #12" status changed from in_progress to done', createdBy: 'Budi Santoso', createdAt: '2026-06-14 11:20' },
    { id: 'a4', entityType: 'risk', action: 'identified', details: 'Risk "Gangguan Manusia" identified as CRITICAL', createdBy: 'Siti Rahmawati', createdAt: '2026-06-13 17:45' },
  ];
}

function generateDemoApprovals() {
  return [
    { id: 'ap1', entityType: 'timesheet', title: 'Timesheet Minggu ke-24 - Dr. Rina', status: 'pending', requestedBy: 'Dr. Rina Wijaya', requestedAt: '2026-06-14' },
    { id: 'ap2', entityType: 'budget', title: 'Budget Request - Equipment Patrol', status: 'approved', requestedBy: 'Andi Pratama', respondedBy: 'Manager', respondedAt: '2026-06-12' },
    { id: 'ap3', entityType: 'leave', title: 'Cuti Tahunan - Maya Kusuma', status: 'rejected', requestedBy: 'Maya Kusuma', rejectionReason: 'Periode peak season, tidak dapat di-approve', respondedAt: '2026-06-10' },
  ];
}

export default withHQAuth(handler, { module: 'project_management' });

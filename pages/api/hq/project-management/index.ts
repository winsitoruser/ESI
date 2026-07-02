import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import {
  listEmployees, getEmployeeById, syncTimesheetToPayroll,
  listCustomers, listBranches, listFleetVehicles, listInventoryItems,
  listRecentPurchaseOrders,
  sendNotification, notifyWatchers,
  logActivity,
  calculateEVM, analyzeCriticalPath, getTeamWorkload, getBurndown,
  refreshProjectRollups, recomputeProjectActualCost,
} from '../../../../lib/projectManagement/integrations';
import { buildEsiDemoDashboard, filterEsiDemoProjects } from '../../../../lib/projectManagement/esi-demo-data';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sequelize = require('../../../../lib/sequelize');

// ──────────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────────
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const action = (req.query.action as string) || 'dashboard';

  // Extract actor info (set by withHQAuth)
  const actor = (req as any).user || {};
  const actorId: number | null = actor?.id ? Number(actor.id) : null;
  const actorName: string | null = actor?.name || actor?.username || null;

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action);
      case 'POST': return handlePost(req, res, action, actorId, actorName);
      case 'PUT': return handlePut(req, res, action, actorId, actorName);
      case 'DELETE': return handleDelete(req, res, action, actorId, actorName);
      default:
        return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'Method not allowed'));
    }
  } catch (error: any) {
    console.error(`[PJM API] Error (${action}):`, error.message);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
}

export default withHQAuth(handler);

// ──────────────────────────────────────────────────────────────────
// GET HANDLERS
// ──────────────────────────────────────────────────────────────────
async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    // core resources
    case 'dashboard': return getDashboard(req, res);
    case 'projects': return getProjects(req, res);
    case 'project-detail': return getProjectDetail(req, res);
    case 'tasks': return getTasks(req, res);
    case 'task-detail': return getTaskDetail(req, res);
    case 'milestones': return getMilestones(req, res);
    case 'timesheets': return getTimesheets(req, res);
    case 'resources': return getResources(req, res);
    case 'risks': return getRisks(req, res);
    case 'budgets': return getBudgets(req, res);
    case 'documents': return getDocuments(req, res);
    case 'gantt': return getGanttData(req, res);
    case 'gantt-full': return getGanttFullData(req, res);
    case 'settings': return getSettings(req, res);

    // new advanced resources
    case 'sprints': return getSprints(req, res);
    case 'comments': return getComments(req, res);
    case 'activity-log': return getActivityLog(req, res);
    case 'approvals': return getApprovals(req, res);
    case 'dependencies': return getDependencies(req, res);
    case 'watchers': return getWatchers(req, res);
    case 'baselines': return getBaselines(req, res);

    // analytics
    case 'evm': return getEVM(req, res);
    case 'critical-path': return getCriticalPath(req, res);
    case 'workload': return getWorkload(req, res);
    case 'burndown': return getBurndown_(req, res);
    case 'calendar': return getCalendar(req, res);
    case 'team-directory': return getTeamDirectory(req, res);

    // integration look-ups
    case 'employees': return sendList(res, await listEmployees({
      search: req.query.search as string, branchId: req.query.branchId as string,
      department: req.query.department as string,
    }));
    case 'customers': return sendList(res, await listCustomers({ search: req.query.search as string }));
    case 'branches': return sendList(res, await listBranches());
    case 'fleet-vehicles': return sendList(res, await listFleetVehicles());
    case 'inventory-items': return sendList(res, await listInventoryItems({ search: req.query.search as string }));
    case 'purchase-orders': return sendList(res, await listRecentPurchaseOrders({ search: req.query.search as string }));

    default:
      return res.status(400).json(errorResponse('INVALID_ACTION', `Unknown GET action: ${action}`));
  }
}

const sendList = (res: NextApiResponse, data: any) => res.status(200).json(successResponse(data));

// ──────────────────────────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────────────────────────
async function getDashboard(_req: NextApiRequest, res: NextApiResponse) {
  try {
  const [projectStats] = await sequelize.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'planning') as planning,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COALESCE(SUM(budget_amount), 0) as total_budget,
      COALESCE(SUM(actual_cost), 0) as total_actual_cost,
      COALESCE(AVG(progress_percent), 0) as avg_progress,
      COUNT(*) FILTER (WHERE end_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) as overdue
    FROM pjm_projects
  `);

  const [taskStats] = await sequelize.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'todo') as todo,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'review') as review,
      COUNT(*) FILTER (WHERE status = 'done') as done,
      COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('done', 'cancelled')) as overdue,
      COUNT(*) FILTER (WHERE completed_date >= CURRENT_DATE - INTERVAL '7 days') as completed_this_week
    FROM pjm_tasks
  `);

  const [riskStats] = await sequelize.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'identified') as identified,
      COUNT(*) FILTER (WHERE status = 'mitigating') as mitigating,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
      COUNT(*) FILTER (WHERE probability IN ('high','very_high')) as high_risks
    FROM pjm_risks
  `);

  const [timesheetStats] = await sequelize.query(`
    SELECT
      COALESCE(SUM(hours_worked), 0) as total_hours_month,
      COUNT(*) FILTER (WHERE status = 'submitted') as pending_approval,
      COALESCE(SUM(total_cost) FILTER (WHERE status = 'approved'), 0) as approved_cost
    FROM pjm_timesheets
    WHERE work_date >= DATE_TRUNC('month', CURRENT_DATE)
  `);

  const [recentProjects] = await sequelize.query(`
    SELECT id, project_code, name, status, priority, progress_percent, start_date, end_date,
           budget_amount, actual_cost, manager_name,
           COALESCE(total_tasks, (SELECT COUNT(*) FROM pjm_tasks WHERE project_id = pjm_projects.id)) as total_tasks,
           COALESCE(completed_tasks, (SELECT COUNT(*) FROM pjm_tasks WHERE project_id = pjm_projects.id AND status = 'done')) as completed_tasks
    FROM pjm_projects ORDER BY updated_at DESC LIMIT 10
  `);

  const [upcomingMilestones] = await sequelize.query(`
    SELECT m.id, m.name, m.status, m.due_date, p.name as project_name, p.project_code
    FROM pjm_milestones m JOIN pjm_projects p ON m.project_id = p.id
    WHERE m.status != 'completed' ORDER BY m.due_date ASC LIMIT 10
  `);

  // Monthly budget trend (last 6 months)
  const [budgetTrend] = await sequelize.query(`
    SELECT TO_CHAR(mon, 'Mon') as month,
           COALESCE(SUM(planned_amount) FILTER (WHERE period_date IS NOT NULL AND DATE_TRUNC('month', period_date) = mon), 0)/1000000 as planned,
           COALESCE(SUM(actual_amount) FILTER (WHERE period_date IS NOT NULL AND DATE_TRUNC('month', period_date) = mon), 0)/1000000 as actual,
           COALESCE(SUM(committed_amount) FILTER (WHERE period_date IS NOT NULL AND DATE_TRUNC('month', period_date) = mon), 0)/1000000 as committed
    FROM (SELECT DATE_TRUNC('month', generate_series(CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE, INTERVAL '1 month')) as mon) months
    LEFT JOIN pjm_budgets ON TRUE
    GROUP BY mon ORDER BY mon
  `);

  // Task distribution pie
  const [taskDistribution] = await sequelize.query(`
    SELECT
      CASE status
        WHEN 'todo' THEN 'To Do'
        WHEN 'in_progress' THEN 'In Progress'
        WHEN 'review' THEN 'Review'
        WHEN 'done' THEN 'Done'
        WHEN 'blocked' THEN 'Blocked'
      END as name,
      COUNT(*)::int as value,
      CASE status
        WHEN 'todo' THEN '#6B7280'
        WHEN 'in_progress' THEN '#F59E0B'
        WHEN 'review' THEN '#8B5CF6'
        WHEN 'done' THEN '#10B981'
        WHEN 'blocked' THEN '#EF4444'
      END as color
    FROM pjm_tasks
    WHERE status IN ('todo','in_progress','review','done','blocked')
    GROUP BY status
    ORDER BY CASE status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'review' THEN 3 WHEN 'done' THEN 4 ELSE 5 END
  `);

  // Weekly hours (last 6 weeks)
  const [weeklyHours] = await sequelize.query(`
    SELECT TO_CHAR(DATE_TRUNC('week', work_date), 'W"W"IW') as week,
           COALESCE(SUM(hours_worked), 0)::float as hours,
           400 as target
    FROM pjm_timesheets
    WHERE work_date >= CURRENT_DATE - INTERVAL '6 weeks'
    GROUP BY DATE_TRUNC('week', work_date)
    ORDER BY DATE_TRUNC('week', work_date)
  `);

  // Risk matrix
  const [riskMatrix] = await sequelize.query(`
    SELECT
      INITCAP(REPLACE(probability, '_', ' ')) as prob,
      INITCAP(REPLACE(impact, '_', ' ')) as impact,
      COUNT(*)::int as count,
      CASE
        WHEN risk_score >= 9 THEN 'critical'
        WHEN risk_score >= 6 THEN 'high'
        WHEN risk_score >= 3 THEN 'medium'
        ELSE 'low'
      END as level
    FROM pjm_risks
    WHERE status != 'resolved'
    GROUP BY probability, impact, risk_score
  `);

  const totalProjects = Number((projectStats[0] as any)?.total || 0);
  if (totalProjects === 0) {
    return res.status(200).json(successResponse(buildEsiDemoDashboard()));
  }

  return res.status(200).json(successResponse({
    projectStats: projectStats[0] || {},
    taskStats: taskStats[0] || {},
    riskStats: riskStats[0] || {},
    timesheetStats: timesheetStats[0] || {},
    recentProjects,
    upcomingMilestones,
    budgetTrend,
    taskDistribution,
    weeklyHours,
    riskMatrix,
  }));
  } catch (error: any) {
    console.warn('[PJM] dashboard fallback to ESI demo:', error.message?.slice(0, 120));
    return res.status(200).json(successResponse(buildEsiDemoDashboard()));
  }
}

// ──────────────────────────────────────────────────────────────────
// Projects
// ──────────────────────────────────────────────────────────────────
async function getProjects(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, priority, search, branchId, customerId, managerId } = req.query;
  const pageN = parseInt(page as string);
  const limitN = parseInt(limit as string);
  const offset = (pageN - 1) * limitN;

  const where: string[] = ['1=1'];
  const rep: any = {};
  if (status && status !== 'all') { where.push('p.status = :status'); rep.status = status; }
  if (priority && priority !== 'all') { where.push('p.priority = :priority'); rep.priority = priority; }
  if (search) { where.push('(p.name ILIKE :search OR p.project_code ILIKE :search OR p.description ILIKE :search)'); rep.search = `%${search}%`; }
  if (branchId) { where.push('p.branch_id = :branchId'); rep.branchId = branchId; }
  if (customerId) { where.push('p.customer_id = :customerId'); rep.customerId = customerId; }
  if (managerId) { where.push('p.manager_user_id = :managerId'); rep.managerId = managerId; }

  const whereSql = 'WHERE ' + where.join(' AND ');

  try {
  const [rows] = await sequelize.query(`
    SELECT p.*,
      (SELECT COUNT(*) FROM pjm_tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM pjm_tasks WHERE project_id = p.id AND status = 'done') as completed_task_count,
      (SELECT COUNT(*) FROM pjm_milestones WHERE project_id = p.id) as milestone_count,
      (SELECT COUNT(*) FROM pjm_resources WHERE project_id = p.id) as resource_count,
      (SELECT COUNT(*) FROM pjm_risks WHERE project_id = p.id AND status != 'resolved') as open_risks
    FROM pjm_projects p ${whereSql}
    ORDER BY p.created_at DESC LIMIT :limit OFFSET :offset
  `, { replacements: { ...rep, limit: limitN, offset } });

  const [[{ count }]] = await sequelize.query(
    `SELECT COUNT(*) as count FROM pjm_projects p ${whereSql}`,
    { replacements: rep }
  );

  const countNum = parseInt((count as any) || '0', 10);
  if (countNum === 0 && !branchId && !customerId && !managerId) {
    const demo = filterEsiDemoProjects({
      status: status as string,
      priority: priority as string,
      search: search as string,
      page: pageN,
      limit: limitN,
    });
    return res.status(200).json(successResponse(demo));
  }

  return res.status(200).json(successResponse({ rows, total: countNum, page: pageN, limit: limitN }));
  } catch (error: any) {
    console.warn('[PJM] projects fallback to ESI demo:', error.message?.slice(0, 120));
    const demo = filterEsiDemoProjects({
      status: status as string,
      priority: priority as string,
      search: search as string,
      page: pageN,
      limit: limitN,
    });
    return res.status(200).json(successResponse(demo));
  }
}

async function getProjectDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json(errorResponse('MISSING_ID', 'id required'));

  const [rowsP] = await sequelize.query(`
    SELECT p.*,
      c.name as customer_name,
      b.name as branch_name
    FROM pjm_projects p
    LEFT JOIN customers c ON p.customer_id = c.id
    LEFT JOIN branches b ON p.branch_id = b.id
    WHERE p.id = :id
  `, { replacements: { id } });
  const project = rowsP[0];
  if (!project) return res.status(404).json(errorResponse('NOT_FOUND', 'Project not found'));

  const [tasks] = await sequelize.query(
    `SELECT * FROM pjm_tasks WHERE project_id = :id ORDER BY COALESCE(sort_order, 0), created_at`,
    { replacements: { id } }
  );
  const [milestones] = await sequelize.query(
    `SELECT m.*,
            (SELECT COUNT(*) FROM pjm_tasks WHERE milestone_id = m.id) as task_count,
            (SELECT COUNT(*) FROM pjm_tasks WHERE milestone_id = m.id AND status = 'done') as done_count
     FROM pjm_milestones m WHERE project_id = :id ORDER BY COALESCE(sort_order, 0)`,
    { replacements: { id } }
  );
  const [resources] = await sequelize.query(
    `SELECT r.*, e.name as employee_name_hris, e.position as employee_position
     FROM pjm_resources r
     LEFT JOIN hris_employees e ON r.hris_employee_id = e.id
     WHERE r.project_id = :id`,
    { replacements: { id } }
  );
  const [risks] = await sequelize.query(`SELECT * FROM pjm_risks WHERE project_id = :id ORDER BY risk_score DESC`, { replacements: { id } });
  const [budgetItems] = await sequelize.query(`SELECT * FROM pjm_budgets WHERE project_id = :id`, { replacements: { id } });
  const [documents] = await sequelize.query(`SELECT * FROM pjm_documents WHERE project_id = :id ORDER BY created_at DESC`, { replacements: { id } });
  const [sprints] = await sequelize.query(`SELECT * FROM pjm_sprints WHERE project_id = :id ORDER BY start_date DESC`, { replacements: { id } }).catch(() => [[]]);
  const [comments] = await sequelize.query(
    `SELECT * FROM pjm_comments WHERE project_id = :id AND task_id IS NULL ORDER BY created_at DESC LIMIT 50`,
    { replacements: { id } }
  ).catch(() => [[]]);
  const [activity] = await sequelize.query(
    `SELECT * FROM pjm_activity_log WHERE project_id = :id ORDER BY created_at DESC LIMIT 50`,
    { replacements: { id } }
  ).catch(() => [[]]);
  const [watchers] = await sequelize.query(
    `SELECT * FROM pjm_watchers WHERE project_id = :id AND task_id IS NULL`,
    { replacements: { id } }
  ).catch(() => [[]]);

  const evm = await calculateEVM(String(id));

  return res.status(200).json(successResponse({
    ...project,
    tasks, milestones, resources, risks, budgetItems, documents,
    sprints: sprints || [],
    comments: comments || [],
    activity: activity || [],
    watchers: watchers || [],
    evm,
  }));
}

// ──────────────────────────────────────────────────────────────────
// Tasks
// ──────────────────────────────────────────────────────────────────
async function getTasks(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, status, assigneeId, assigneeUserId, sprintId, search, page = '1', limit = '50' } = req.query;
  const pageN = parseInt(page as string);
  const limitN = parseInt(limit as string);
  const offset = (pageN - 1) * limitN;

  const where: string[] = ['1=1'];
  const rep: any = {};
  if (projectId) { where.push('t.project_id = :projectId'); rep.projectId = projectId; }
  if (status && status !== 'all') { where.push('t.status = :status'); rep.status = status; }
  if (assigneeId) { where.push('t.assignee_employee_id = :assigneeId'); rep.assigneeId = assigneeId; }
  if (assigneeUserId) { where.push('t.assignee_user_id = :assigneeUserId'); rep.assigneeUserId = Number(assigneeUserId); }
  if (sprintId) { where.push('t.sprint_id = :sprintId'); rep.sprintId = sprintId; }
  if (search) { where.push('(t.name ILIKE :search OR t.task_code ILIKE :search)'); rep.search = `%${search}%`; }
  const whereSql = 'WHERE ' + where.join(' AND ');

  const [rows] = await sequelize.query(`
    SELECT t.*, p.name as project_name, p.project_code
    FROM pjm_tasks t JOIN pjm_projects p ON t.project_id = p.id
    ${whereSql} ORDER BY COALESCE(t.sort_order, 0), t.created_at DESC LIMIT :limit OFFSET :offset
  `, { replacements: { ...rep, limit: limitN, offset } });

  const [[{ count }]] = await sequelize.query(
    `SELECT COUNT(*) as count FROM pjm_tasks t ${whereSql}`,
    { replacements: rep }
  );

  return res.status(200).json(successResponse({ rows, total: parseInt(count) }));
}

async function getTaskDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const [rowsT] = await sequelize.query(`
    SELECT t.*, p.name as project_name, p.project_code, p.id as project_id
    FROM pjm_tasks t JOIN pjm_projects p ON t.project_id = p.id WHERE t.id = :id
  `, { replacements: { id } });
  const task = rowsT[0];
  if (!task) return res.status(404).json(errorResponse('NOT_FOUND', 'Task not found'));

  const [timesheets] = await sequelize.query(`SELECT * FROM pjm_timesheets WHERE task_id = :id ORDER BY work_date DESC`, { replacements: { id } });
  const [comments] = await sequelize.query(`SELECT * FROM pjm_comments WHERE task_id = :id ORDER BY created_at ASC`, { replacements: { id } }).catch(() => [[]]);
  const [attachments] = await sequelize.query(`SELECT * FROM pjm_attachments WHERE task_id = :id`, { replacements: { id } }).catch(() => [[]]);
  const [deps] = await sequelize.query(`
    SELECT d.*,
      pt.name as predecessor_name, st.name as successor_name
    FROM pjm_dependencies d
    LEFT JOIN pjm_tasks pt ON d.predecessor_task_id = pt.id
    LEFT JOIN pjm_tasks st ON d.successor_task_id = st.id
    WHERE d.predecessor_task_id = :id OR d.successor_task_id = :id
  `, { replacements: { id } }).catch(() => [[]]);

  return res.status(200).json(successResponse({
    ...task,
    timesheets,
    comments: comments || [],
    attachments: attachments || [],
    dependencies: deps || [],
  }));
}

// ──────────────────────────────────────────────────────────────────
// Other simple getters
// ──────────────────────────────────────────────────────────────────
async function getMilestones(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  const where: string[] = ['1=1']; const rep: any = {};
  if (projectId) { where.push('m.project_id = :projectId'); rep.projectId = projectId; }
  const [rows] = await sequelize.query(`
    SELECT m.*, p.name as project_name, p.project_code,
      (SELECT COUNT(*) FROM pjm_tasks WHERE milestone_id = m.id) as task_count,
      (SELECT COUNT(*) FROM pjm_tasks WHERE milestone_id = m.id AND status = 'done') as done_count
    FROM pjm_milestones m JOIN pjm_projects p ON m.project_id = p.id
    WHERE ${where.join(' AND ')} ORDER BY COALESCE(m.sort_order, 0), m.due_date
  `, { replacements: rep });
  return res.status(200).json(successResponse(rows));
}

async function getTimesheets(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, employeeId, status, startDate, endDate, page = '1', limit = '50' } = req.query;
  const pageN = parseInt(page as string);
  const limitN = parseInt(limit as string);
  const offset = (pageN - 1) * limitN;

  const where: string[] = ['1=1']; const rep: any = { limit: limitN, offset };
  if (projectId) { where.push('ts.project_id = :projectId'); rep.projectId = projectId; }
  if (employeeId) { where.push('ts.hris_employee_id = :employeeId'); rep.employeeId = employeeId; }
  if (status && status !== 'all') { where.push('ts.status = :status'); rep.status = status; }
  if (startDate) { where.push('ts.work_date >= :startDate'); rep.startDate = startDate; }
  if (endDate) { where.push('ts.work_date <= :endDate'); rep.endDate = endDate; }
  const whereSql = 'WHERE ' + where.join(' AND ');

  const [rows] = await sequelize.query(`
    SELECT ts.*, p.name as project_name, t.name as task_name, e.name as hris_employee_name
    FROM pjm_timesheets ts
    JOIN pjm_projects p ON ts.project_id = p.id
    LEFT JOIN pjm_tasks t ON ts.task_id = t.id
    LEFT JOIN hris_employees e ON ts.hris_employee_id = e.id
    ${whereSql} ORDER BY ts.work_date DESC LIMIT :limit OFFSET :offset
  `, { replacements: rep });

  const [sums] = await sequelize.query(`
    SELECT COUNT(*) as count,
           COALESCE(SUM(hours_worked), 0) as "totalHours",
           COALESCE(SUM(total_cost), 0) as "totalCost"
    FROM pjm_timesheets ts ${whereSql}
  `, { replacements: rep });
  const meta = sums[0] || {};

  return res.status(200).json(successResponse({
    rows,
    total: parseInt(meta.count),
    totalHours: parseFloat(meta.totalHours),
    totalCost: parseFloat(meta.totalCost),
  }));
}

async function getResources(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  const where: string[] = ['1=1']; const rep: any = {};
  if (projectId) { where.push('r.project_id = :projectId'); rep.projectId = projectId; }
  const [rows] = await sequelize.query(`
    SELECT r.*, p.name as project_name, e.name as hris_employee_name
    FROM pjm_resources r
    JOIN pjm_projects p ON r.project_id = p.id
    LEFT JOIN hris_employees e ON r.hris_employee_id = e.id
    WHERE ${where.join(' AND ')} ORDER BY r.created_at DESC
  `, { replacements: rep });
  return res.status(200).json(successResponse(rows));
}

async function getRisks(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, status } = req.query;
  const where: string[] = ['1=1']; const rep: any = {};
  if (projectId) { where.push('r.project_id = :projectId'); rep.projectId = projectId; }
  if (status && status !== 'all') { where.push('r.status = :status'); rep.status = status; }
  const [rows] = await sequelize.query(`
    SELECT r.*, p.name as project_name
    FROM pjm_risks r JOIN pjm_projects p ON r.project_id = p.id
    WHERE ${where.join(' AND ')} ORDER BY r.risk_score DESC
  `, { replacements: rep });
  return res.status(200).json(successResponse(rows));
}

async function getBudgets(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  const where: string[] = ['1=1']; const rep: any = {};
  if (projectId) { where.push('b.project_id = :projectId'); rep.projectId = projectId; }
  const whereSql = 'WHERE ' + where.join(' AND ');

  const [rows] = await sequelize.query(`
    SELECT b.*, p.name as project_name
    FROM pjm_budgets b JOIN pjm_projects p ON b.project_id = p.id
    ${whereSql} ORDER BY b.category
  `, { replacements: rep });

  const [sums] = await sequelize.query(`
    SELECT COALESCE(SUM(planned_amount), 0) as total_planned,
           COALESCE(SUM(actual_amount), 0) as total_actual,
           COALESCE(SUM(committed_amount), 0) as total_committed
    FROM pjm_budgets b ${whereSql}
  `, { replacements: rep });

  return res.status(200).json(successResponse({ rows, summary: sums[0] || {} }));
}

async function getDocuments(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  const where: string[] = ['1=1']; const rep: any = {};
  if (projectId) { where.push('d.project_id = :projectId'); rep.projectId = projectId; }
  const [rows] = await sequelize.query(`
    SELECT d.*, p.name as project_name
    FROM pjm_documents d JOIN pjm_projects p ON d.project_id = p.id
    WHERE ${where.join(' AND ')} ORDER BY d.created_at DESC
  `, { replacements: rep });
  return res.status(200).json(successResponse(rows));
}

async function getGanttData(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;

  // Build filtered WHERE clauses
  const whereProj: string[] = ['1=1']; const rep: any = {};
  if (projectId) { whereProj.push('id = :projectId'); rep.projectId = projectId; }

  const [projects] = await sequelize.query(
    `SELECT id, name, status, start_date, end_date, progress_percent, manager_name
     FROM pjm_projects WHERE ${whereProj.join(' AND ')} ORDER BY start_date ASC NULLS LAST`,
    { replacements: rep }
  );

  const taskWhere: string[] = ['1=1']; const taskRep: any = {};
  if (projectId) { taskWhere.push('project_id = :projectId'); taskRep.projectId = projectId; }
  const [tasks] = await sequelize.query(`
    SELECT id, project_id, name, status, start_date, due_date, progress_percent, assignee_name,
           parent_task_id, milestone_id, priority, sprint_id
    FROM pjm_tasks WHERE ${taskWhere.join(' AND ')} ORDER BY COALESCE(sort_order, 0)
  `, { replacements: taskRep });

  const [milestones] = await sequelize.query(`
    SELECT id, project_id, name, status, due_date, completed_date FROM pjm_milestones
    WHERE ${taskWhere.join(' AND ')} ORDER BY COALESCE(sort_order, 0)
  `, { replacements: taskRep });

  const [deps] = await sequelize.query(`
    SELECT predecessor_task_id, successor_task_id, dependency_type, lag_days, project_id
    FROM pjm_dependencies WHERE ${taskWhere.join(' AND ')}
  `, { replacements: taskRep }).catch(() => [[] as any[]]);

  // Unified flat list for UI
  const items: any[] = [];
  for (const p of projects as any[]) {
    items.push({ ...p, type: 'project' });
  }
  for (const t of tasks as any[]) {
    items.push({
      ...t,
      type: 'task',
      start_date: t.start_date,
      end_date: t.due_date,
    });
  }
  for (const m of milestones as any[]) {
    items.push({
      ...m,
      type: 'milestone',
      start_date: m.due_date,
      end_date: m.due_date,
    });
  }

  return res.status(200).json(successResponse({
    items,
    projects,
    tasks,
    milestones,
    dependencies: deps || [],
  }));
}

// Enhanced Gantt data with baselines, critical path flags, grouping-ready payload
async function getGanttFullData(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, assigneeId, status, startDate, endDate } = req.query;

  const projWhere: string[] = ['1=1']; const projRep: any = {};
  if (projectId) { projWhere.push('p.id = :projectId'); projRep.projectId = projectId; }
  if (status) { projWhere.push('p.status = :status'); projRep.status = status; }

  const [projects] = await sequelize.query(`
    SELECT p.id, p.project_code, p.name, p.status, p.priority,
           p.start_date, p.end_date, p.progress_percent, p.manager_name,
           p.manager_employee_id, p.budget_amount,
           COALESCE(b.name, '') as branch_name,
           COALESCE(c.name, '') as customer_name
    FROM pjm_projects p
    LEFT JOIN branches b ON p.branch_id = b.id
    LEFT JOIN crm_customers c ON p.customer_id = c.id
    WHERE ${projWhere.join(' AND ')}
    ORDER BY p.start_date ASC NULLS LAST
  `, { replacements: projRep }).catch(async () => {
    // Fallback without join if branches/crm_customers tables missing
    const [rows] = await sequelize.query(`
      SELECT id, project_code, name, status, priority, start_date, end_date, progress_percent,
             manager_name, manager_employee_id, budget_amount
      FROM pjm_projects WHERE ${projWhere.join(' AND ')} ORDER BY start_date ASC NULLS LAST
    `, { replacements: projRep });
    return [rows];
  });

  const taskWhere: string[] = ['1=1']; const taskRep: any = {};
  if (projectId) { taskWhere.push('t.project_id = :projectId'); taskRep.projectId = projectId; }
  if (assigneeId) { taskWhere.push('t.assignee_employee_id = :assigneeId'); taskRep.assigneeId = assigneeId; }
  if (status) { taskWhere.push('t.status = :status'); taskRep.status = status; }
  if (startDate) { taskWhere.push('t.due_date >= :startDate'); taskRep.startDate = startDate; }
  if (endDate) { taskWhere.push('t.start_date <= :endDate'); taskRep.endDate = endDate; }

  const [tasks] = await sequelize.query(`
    SELECT t.id, t.project_id, t.name, t.status, t.priority,
           t.start_date, t.due_date, t.progress_percent,
           t.assignee_name, t.assignee_employee_id,
           t.estimated_hours, t.actual_hours,
           t.parent_task_id, t.milestone_id, t.sprint_id,
           t.story_points, COALESCE(t.sort_order, 0) as sort_order,
           p.project_code, p.name as project_name
    FROM pjm_tasks t
    JOIN pjm_projects p ON t.project_id = p.id
    WHERE ${taskWhere.join(' AND ')}
    ORDER BY p.id, t.sort_order ASC, t.start_date ASC NULLS LAST
  `, { replacements: taskRep });

  const [milestones] = await sequelize.query(`
    SELECT m.id, m.project_id, m.name, m.status, m.due_date, m.completed_date,
           p.project_code, p.name as project_name
    FROM pjm_milestones m
    JOIN pjm_projects p ON m.project_id = p.id
    WHERE ${taskWhere.join(' AND ').replace(/t\./g, 'm.').replace('m.due_date', 'm.due_date')}
  `, { replacements: taskRep }).catch(() => [[] as any[]]);

  const [dependencies] = await sequelize.query(`
    SELECT d.id, d.predecessor_task_id, d.successor_task_id,
           d.dependency_type, d.lag_days, d.project_id
    FROM pjm_dependencies d
    WHERE 1=1 ${projectId ? 'AND d.project_id = :projectId' : ''}
  `, { replacements: projRep }).catch(() => [[] as any[]]);

  // Baselines (snapshots of original schedule)
  const [baselines] = await sequelize.query(`
    SELECT b.entity_id, b.entity_type, b.snapshot_data
    FROM pjm_baselines b
    WHERE b.is_active = true ${projectId ? 'AND b.project_id = :projectId' : ''}
  `, { replacements: projRep }).catch(() => [[] as any[]]);

  // Build baseline map
  const baselineMap = new Map<string, { start: any; end: any }>();
  for (const b of (baselines as any[]) || []) {
    try {
      const snap = typeof b.snapshot_data === 'string' ? JSON.parse(b.snapshot_data) : b.snapshot_data;
      if (snap?.start_date && snap?.end_date) baselineMap.set(b.entity_id, { start: snap.start_date, end: snap.end_date });
    } catch {}
  }

  // Simple critical path calc: tasks on the longest chain from project start to end
  const criticalTaskIds = await computeCriticalTaskIds(tasks as any[], dependencies as any[]);

  const items: any[] = [];
  for (const p of (projects as any[])) {
    items.push({
      id: p.id, name: p.name, type: 'project',
      projectId: p.id, projectCode: p.project_code, projectName: p.name,
      start: p.start_date, end: p.end_date,
      progress: Number(p.progress_percent || 0),
      status: p.status, priority: p.priority,
      assigneeName: p.manager_name,
    });
  }
  for (const t of (tasks as any[])) {
    const baseline = baselineMap.get(t.id);
    items.push({
      id: t.id, name: t.name, type: 'task',
      projectId: t.project_id, projectCode: t.project_code, projectName: t.project_name,
      start: t.start_date, end: t.due_date,
      progress: Number(t.progress_percent || 0),
      status: t.status, priority: t.priority,
      assigneeName: t.assignee_name, assigneeId: t.assignee_employee_id,
      estimatedHours: t.estimated_hours, actualHours: t.actual_hours,
      parentId: t.parent_task_id, milestoneId: t.milestone_id, sprintId: t.sprint_id,
      storyPoints: t.story_points,
      isCritical: criticalTaskIds.has(t.id),
      baseline: baseline || null,
    });
  }
  for (const m of (milestones as any[])) {
    items.push({
      id: m.id, name: m.name, type: 'milestone',
      projectId: m.project_id, projectCode: m.project_code, projectName: m.project_name,
      start: m.due_date, end: m.due_date,
      status: m.status,
    });
  }

  return res.status(200).json(successResponse({
    items, projects, tasks, milestones, dependencies,
    criticalPath: Array.from(criticalTaskIds),
    counts: {
      projects: (projects as any[]).length,
      tasks: (tasks as any[]).length,
      milestones: (milestones as any[]).length,
      dependencies: (dependencies as any[]).length,
    },
  }));
}

async function computeCriticalTaskIds(tasks: any[], deps: any[]): Promise<Set<string>> {
  // simplistic CPM: for each task compute earliest start based on dependencies,
  // then backtrack latest start. Critical if ES == LS.
  const critical = new Set<string>();
  if (!tasks?.length) return critical;

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const duration = (t: any) => {
    if (!t.start_date || !t.due_date) return 0;
    return Math.max(1, (new Date(t.due_date).getTime() - new Date(t.start_date).getTime()) / 86400000);
  };
  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();
  for (const d of deps || []) {
    if (!byId.has(d.successor_task_id) || !byId.has(d.predecessor_task_id)) continue;
    if (!preds.has(d.successor_task_id)) preds.set(d.successor_task_id, []);
    preds.get(d.successor_task_id)!.push(d.predecessor_task_id);
    if (!succs.has(d.predecessor_task_id)) succs.set(d.predecessor_task_id, []);
    succs.get(d.predecessor_task_id)!.push(d.successor_task_id);
  }

  // topological order (simple)
  const order: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const p of preds.get(id) || []) visit(p);
    order.push(id);
  };
  for (const t of tasks) visit(t.id);

  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of order) {
    const t = byId.get(id);
    const d = duration(t);
    const start = Math.max(0, ...(preds.get(id) || []).map((p) => ef.get(p) || 0));
    es.set(id, start);
    ef.set(id, start + d);
  }

  const projectEnd = Math.max(0, ...Array.from(ef.values()));
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const t = byId.get(id);
    const d = duration(t);
    const succList = succs.get(id) || [];
    const finish = succList.length ? Math.min(...succList.map((s) => ls.get(s) || projectEnd)) : projectEnd;
    lf.set(id, finish);
    ls.set(id, finish - d);
  }

  for (const id of order) {
    if (Math.abs((es.get(id) || 0) - (ls.get(id) || 0)) < 0.01) critical.add(id);
  }
  return critical;
}

async function getSettings(_req: NextApiRequest, res: NextApiResponse) {
  const [rows] = await sequelize.query(`SELECT * FROM pjm_settings ORDER BY setting_key`);
  return res.status(200).json(successResponse(rows));
}

// ──────────────────────────────────────────────────────────────────
// Sprints / Comments / Activity / Approvals / Deps / Watchers
// ──────────────────────────────────────────────────────────────────
async function getSprints(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  const where: string[] = ['1=1']; const rep: any = {};
  if (projectId) { where.push('s.project_id = :projectId'); rep.projectId = projectId; }
  const [rows] = await sequelize.query(`
    SELECT s.*, p.name as project_name,
      (SELECT COUNT(*) FROM pjm_tasks WHERE sprint_id = s.id) as task_count,
      (SELECT COUNT(*) FROM pjm_tasks WHERE sprint_id = s.id AND status = 'done') as done_count,
      (SELECT COALESCE(SUM(story_points), 0) FROM pjm_tasks WHERE sprint_id = s.id) as total_points
    FROM pjm_sprints s JOIN pjm_projects p ON s.project_id = p.id
    WHERE ${where.join(' AND ')}
    ORDER BY s.start_date DESC
  `, { replacements: rep });
  return res.status(200).json(successResponse(rows));
}

async function getComments(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, taskId } = req.query;
  const where: string[] = ['1=1']; const rep: any = {};
  if (projectId) { where.push('project_id = :projectId'); rep.projectId = projectId; }
  if (taskId) { where.push('task_id = :taskId'); rep.taskId = taskId; }
  const [rows] = await sequelize.query(`
    SELECT * FROM pjm_comments WHERE ${where.join(' AND ')} ORDER BY created_at ASC
  `, { replacements: rep });
  return res.status(200).json(successResponse(rows));
}

async function getActivityLog(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, entityType, entityId, limit = '100' } = req.query;
  const where: string[] = ['1=1']; const rep: any = { limit: parseInt(limit as string) };
  if (projectId) { where.push('project_id = :projectId'); rep.projectId = projectId; }
  if (entityType) { where.push('entity_type = :entityType'); rep.entityType = entityType; }
  if (entityId) { where.push('entity_id = :entityId'); rep.entityId = entityId; }
  const [rows] = await sequelize.query(`
    SELECT * FROM pjm_activity_log WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT :limit
  `, { replacements: rep });
  return res.status(200).json(successResponse(rows));
}

async function getApprovals(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, status, entityType } = req.query;
  const where: string[] = ['1=1']; const rep: any = {};
  if (projectId) { where.push('project_id = :projectId'); rep.projectId = projectId; }
  if (status && status !== 'all') { where.push('status = :status'); rep.status = status; }
  if (entityType) { where.push('entity_type = :entityType'); rep.entityType = entityType; }
  const [rows] = await sequelize.query(`
    SELECT * FROM pjm_approvals WHERE ${where.join(' AND ')} ORDER BY created_at DESC
  `, { replacements: rep });
  return res.status(200).json(successResponse(rows));
}

async function getDependencies(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json(errorResponse('MISSING_PARAM', 'projectId required'));
  const [rows] = await sequelize.query(`
    SELECT d.*, pt.name as predecessor_name, st.name as successor_name
    FROM pjm_dependencies d
    LEFT JOIN pjm_tasks pt ON d.predecessor_task_id = pt.id
    LEFT JOIN pjm_tasks st ON d.successor_task_id = st.id
    WHERE d.project_id = :projectId
  `, { replacements: { projectId } });
  return res.status(200).json(successResponse(rows));
}

async function getWatchers(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, taskId } = req.query;
  const where: string[] = ['1=1']; const rep: any = {};
  if (projectId) { where.push('project_id = :projectId'); rep.projectId = projectId; }
  if (taskId) { where.push('task_id = :taskId'); rep.taskId = taskId; }
  const [rows] = await sequelize.query(
    `SELECT * FROM pjm_watchers WHERE ${where.join(' AND ')}`,
    { replacements: rep }
  );
  return res.status(200).json(successResponse(rows));
}

async function getBaselines(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json(errorResponse('MISSING_PARAM', 'projectId required'));
  const [rows] = await sequelize.query(
    `SELECT * FROM pjm_baselines WHERE project_id = :projectId ORDER BY snapshot_date DESC`,
    { replacements: { projectId } }
  );
  return res.status(200).json(successResponse(rows));
}

// ──────────────────────────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────────────────────────
async function getEVM(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json(errorResponse('MISSING_PARAM', 'projectId required'));
  const evm = await calculateEVM(String(projectId));
  return res.status(200).json(successResponse(evm));
}

async function getCriticalPath(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json(errorResponse('MISSING_PARAM', 'projectId required'));
  const path = await analyzeCriticalPath(String(projectId));
  return res.status(200).json(successResponse({
    tasks: path,
    criticalCount: path.filter((t) => t.isCritical).length,
    totalDuration: path.length ? Math.max(...path.map((t) => t.earliestFinish)) : 0,
  }));
}

async function getWorkload(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, startDate, endDate } = req.query;
  const data = await getTeamWorkload({
    projectId: projectId as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  return res.status(200).json(successResponse(data));
}

async function getBurndown_(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, sprintId } = req.query;
  if (!projectId) return res.status(400).json(errorResponse('MISSING_PARAM', 'projectId required'));
  const data = await getBurndown({
    projectId: String(projectId),
    sprintId: sprintId ? String(sprintId) : undefined,
  });
  return res.status(200).json(successResponse(data));
}

async function getCalendar(req: NextApiRequest, res: NextApiResponse) {
  const { startDate, endDate, projectId } = req.query;
  const start = (startDate as string) || new Date(new Date().setDate(1)).toISOString().split('T')[0];
  const end = (endDate as string) || new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString().split('T')[0];

  const where: string[] = [`(
    (t.start_date BETWEEN :start AND :end)
    OR (t.due_date BETWEEN :start AND :end)
    OR (t.start_date <= :start AND t.due_date >= :end)
  )`];
  const rep: any = { start, end };
  if (projectId) { where.push('t.project_id = :projectId'); rep.projectId = projectId; }

  const [tasks] = await sequelize.query(`
    SELECT t.id, t.name, t.status, t.start_date, t.due_date, t.priority, t.assignee_name, p.name as project_name, p.project_code
    FROM pjm_tasks t JOIN pjm_projects p ON t.project_id = p.id
    WHERE ${where.join(' AND ')}
  `, { replacements: rep });

  const [milestones] = await sequelize.query(`
    SELECT m.id, m.name, m.status, m.due_date, p.name as project_name, p.project_code
    FROM pjm_milestones m JOIN pjm_projects p ON m.project_id = p.id
    WHERE m.due_date BETWEEN :start AND :end ${projectId ? 'AND m.project_id = :projectId' : ''}
  `, { replacements: rep });

  // Unified events list
  const events: any[] = [];
  for (const t of (tasks || []) as any[]) {
    if (t.due_date) {
      events.push({
        id: `t-${t.id}`, title: t.name, date: t.due_date, type: 'task',
        status: t.status, project_name: t.project_name, assignee_name: t.assignee_name,
      });
    }
  }
  for (const m of (milestones || []) as any[]) {
    events.push({
      id: `m-${m.id}`, title: m.name, date: m.due_date, type: 'milestone',
      status: m.status, project_name: m.project_name,
    });
  }

  return res.status(200).json(successResponse({ events, tasks, milestones }));
}

async function getTeamDirectory(_req: NextApiRequest, res: NextApiResponse) {
  const [rows] = await sequelize.query(`
    SELECT DISTINCT
      COALESCE(r.hris_employee_id::text, r.resource_name) as key,
      r.resource_name as name, r.role, r.cost_per_hour,
      e.email, e.position, e.department,
      (SELECT COUNT(*) FROM pjm_resources r2 WHERE r2.resource_name = r.resource_name) as project_count
    FROM pjm_resources r
    LEFT JOIN hris_employees e ON r.hris_employee_id = e.id
    WHERE r.resource_type = 'human'
  `).catch(() => [[]]);
  return res.status(200).json(successResponse(rows || []));
}

// ──────────────────────────────────────────────────────────────────
// POST HANDLERS
// ──────────────────────────────────────────────────────────────────
async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string, actorId: number | null, actorName: string | null) {
  const data = req.body;

  switch (action) {
    case 'projects': return postProject(res, data, actorId, actorName);
    case 'tasks': return postTask(res, data, actorId, actorName);
    case 'milestones': return postMilestone(res, data, actorId, actorName);
    case 'timesheets': return postTimesheet(res, data, actorId, actorName);
    case 'resources': return postResource(res, data, actorId, actorName);
    case 'risks': return postRisk(res, data, actorId, actorName);
    case 'budgets': return postBudget(res, data, actorId, actorName);
    case 'documents': return postDocument(res, data, actorId, actorName);
    case 'sprints': return postSprint(res, data, actorId);
    case 'comments': return postComment(res, data, actorId, actorName);
    case 'dependencies': return postDependency(res, data, actorId);
    case 'watchers': return postWatcher(res, data, actorId, actorName);
    case 'approvals': return postApproval(res, data, actorId, actorName);
    case 'baselines': return postBaseline(res, data, actorId);
    case 'submit-timesheet': return submitTimesheet(res, data, actorId, actorName);
    case 'approve-timesheet': return approveTimesheet(res, data, actorId, actorName);
    case 'reject-timesheet': return rejectTimesheet(res, data, actorId, actorName);
    case 'assign-task': return assignTask(res, data, actorId, actorName);
    case 'update-schedule': return updateSchedule(res, data, actorId, actorName);
    default:
      return res.status(400).json(errorResponse('INVALID_ACTION', `Unknown POST action: ${action}`));
  }
}

async function postProject(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const code = `PJM-${Date.now().toString(36).toUpperCase()}`;
  const [result] = await sequelize.query(`
    INSERT INTO pjm_projects (id, tenant_id, project_code, name, description, status, priority, category,
      project_type, client_name, client_contact, manager_name, manager_user_id, manager_employee_id,
      branch_id, customer_id, start_date, end_date, budget_amount, currency, tags, notes,
      created_by, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :code, :name, :description, :status, :priority, :category,
      :projectType, :clientName, :clientContact, :managerName, :managerUserId, :managerEmployeeId,
      :branchId, :customerId, :startDate, :endDate, :budgetAmount, :currency, :tags, :notes,
      :createdBy, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, code, name: data.name, description: data.description || null,
    status: data.status || 'planning', priority: data.priority || 'normal', category: data.category || null,
    projectType: data.projectType || 'internal',
    clientName: data.clientName || null, clientContact: data.clientContact || null,
    managerName: data.managerName || null, managerUserId: data.managerUserId || null, managerEmployeeId: data.managerEmployeeId || null,
    branchId: data.branchId || null, customerId: data.customerId || null,
    startDate: data.startDate || null, endDate: data.endDate || null,
    budgetAmount: data.budgetAmount || 0, currency: data.currency || 'IDR',
    tags: JSON.stringify(data.tags || []), notes: data.notes || null,
    createdBy: actorId,
  }});

  const project = result[0];
  await logActivity({
    projectId: project.id, entityType: 'project', entityId: project.id, action: 'create',
    actorUserId: actorId, actorName, description: `Proyek "${project.name}" dibuat`,
  });
  if (data.managerUserId) {
    await sendNotification({ userId: data.managerUserId, title: 'Anda ditugaskan sebagai Manager Proyek',
      message: `Proyek: ${project.name}`, type: 'info', referenceType: 'pjm_project', referenceId: project.id });
  }
  return res.status(201).json(successResponse(project));
}

async function postTask(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const taskCode = `T-${Date.now().toString(36).toUpperCase()}`;

  // If assigneeEmployeeId given, enrich assigneeName
  let assigneeName = data.assigneeName;
  if (data.assigneeEmployeeId && !assigneeName) {
    const e = await getEmployeeById(data.assigneeEmployeeId);
    assigneeName = e?.name || null;
  }

  const [result] = await sequelize.query(`
    INSERT INTO pjm_tasks (id, tenant_id, project_id, parent_task_id, milestone_id, sprint_id,
      task_code, name, description, status, priority, task_type,
      assignee_name, assignee_user_id, assignee_employee_id, reporter_user_id,
      start_date, due_date, estimated_hours, story_points, sort_order, labels, created_by, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :parentTaskId, :milestoneId, :sprintId,
      :taskCode, :name, :description, :status, :priority, :taskType,
      :assigneeName, :assigneeUserId, :assigneeEmployeeId, :reporterUserId,
      :startDate, :dueDate, :estimatedHours, :storyPoints, :sortOrder, :labels, :createdBy, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId,
    parentTaskId: data.parentTaskId || null, milestoneId: data.milestoneId || null, sprintId: data.sprintId || null,
    taskCode, name: data.name, description: data.description || null,
    status: data.status || 'todo', priority: data.priority || 'normal', taskType: data.taskType || 'task',
    assigneeName: assigneeName || null, assigneeUserId: data.assigneeUserId || null,
    assigneeEmployeeId: data.assigneeEmployeeId || null, reporterUserId: actorId,
    startDate: data.startDate || null, dueDate: data.dueDate || null,
    estimatedHours: data.estimatedHours || 0, storyPoints: data.storyPoints || 0,
    sortOrder: data.sortOrder || 0, labels: JSON.stringify(data.labels || []),
    createdBy: actorId,
  }});
  const task = result[0];

  await logActivity({
    projectId: data.projectId, entityType: 'task', entityId: task.id, action: 'create',
    actorUserId: actorId, actorName, description: `Tugas "${task.name}" dibuat`,
  });

  if (data.assigneeUserId) {
    await sendNotification({ userId: data.assigneeUserId, title: 'Anda ditugaskan pada tugas baru',
      message: task.name, type: 'info', referenceType: 'pjm_task', referenceId: task.id });
  }

  await refreshProjectRollups(data.projectId);

  return res.status(201).json(successResponse(task));
}

async function postMilestone(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const [result] = await sequelize.query(`
    INSERT INTO pjm_milestones (id, tenant_id, project_id, name, description, status, due_date,
      deliverables, sort_order, budget_amount, created_by, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :name, :description, :status, :dueDate,
      :deliverables, :sortOrder, :budgetAmount, :createdBy, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId, name: data.name,
    description: data.description || null, status: data.status || 'pending',
    dueDate: data.dueDate || null, deliverables: JSON.stringify(data.deliverables || []),
    sortOrder: data.sortOrder || 0, budgetAmount: data.budgetAmount || 0,
    createdBy: actorId,
  }});
  await logActivity({ projectId: data.projectId, entityType: 'milestone', entityId: result[0].id, action: 'create', actorUserId: actorId, actorName, description: `Milestone "${result[0].name}" dibuat` });
  return res.status(201).json(successResponse(result[0]));
}

async function postTimesheet(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  // Enrich from HRIS employee if given
  let employeeName = data.employeeName;
  let hourlyRate = data.hourlyRate || 0;
  if (data.hrisEmployeeId) {
    const e = await getEmployeeById(data.hrisEmployeeId);
    if (e) { employeeName = employeeName || e.name; hourlyRate = hourlyRate || e.costPerHour || 0; }
  }
  const totalCost = (Number(data.hoursWorked || 0) + Number(data.overtimeHours || 0)) * Number(hourlyRate || 0);

  const [result] = await sequelize.query(`
    INSERT INTO pjm_timesheets (id, tenant_id, project_id, task_id,
      employee_id, employee_name, hris_employee_id,
      work_date, hours_worked, overtime_hours, hourly_rate, total_cost,
      description, status, billable, created_by, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :taskId,
      :employeeId, :employeeName, :hrisEmployeeId,
      :workDate, :hoursWorked, :overtimeHours, :hourlyRate, :totalCost,
      :description, :status, :billable, :createdBy, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId, taskId: data.taskId || null,
    employeeId: data.employeeId || null, employeeName: employeeName || null, hrisEmployeeId: data.hrisEmployeeId || null,
    workDate: data.workDate, hoursWorked: data.hoursWorked || 0, overtimeHours: data.overtimeHours || 0,
    hourlyRate, totalCost, description: data.description || null,
    status: data.status || 'draft', billable: data.billable !== false,
    createdBy: actorId,
  }});

  if (data.projectId) await refreshProjectRollups(data.projectId);
  await logActivity({ projectId: data.projectId, entityType: 'timesheet', entityId: result[0].id, action: 'create',
    actorUserId: actorId, actorName, description: `Timesheet ${data.workDate} (${data.hoursWorked}h) dibuat` });
  return res.status(201).json(successResponse(result[0]));
}

async function postResource(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  // Enrich from HRIS
  let resourceName = data.resourceName;
  let costPerHour = data.costPerHour || 0;
  if (data.hrisEmployeeId) {
    const e = await getEmployeeById(data.hrisEmployeeId);
    if (e) { resourceName = resourceName || e.name; }
  }
  const [result] = await sequelize.query(`
    INSERT INTO pjm_resources (id, tenant_id, project_id, resource_type, resource_name, role,
      hris_employee_id, fleet_vehicle_id, inventory_item_id,
      allocation_percent, start_date, end_date, cost_per_hour, status, quantity, unit,
      notes, created_by, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :resourceType, :resourceName, :role,
      :hrisEmployeeId, :fleetVehicleId, :inventoryItemId,
      :allocationPercent, :startDate, :endDate, :costPerHour, :status, :quantity, :unit,
      :notes, :createdBy, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId,
    resourceType: data.resourceType || 'human', resourceName: resourceName || null, role: data.role || null,
    hrisEmployeeId: data.hrisEmployeeId || null, fleetVehicleId: data.fleetVehicleId || null,
    inventoryItemId: data.inventoryItemId || null,
    allocationPercent: data.allocationPercent || 100,
    startDate: data.startDate || null, endDate: data.endDate || null,
    costPerHour, status: data.status || 'active',
    quantity: data.quantity || 1, unit: data.unit || 'unit',
    notes: data.notes || null, createdBy: actorId,
  }});
  await logActivity({ projectId: data.projectId, entityType: 'resource', entityId: result[0].id, action: 'create', actorUserId: actorId, actorName, description: `Resource "${result[0].resource_name}" ditambahkan` });
  return res.status(201).json(successResponse(result[0]));
}

async function postRisk(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const riskCode = `R-${Date.now().toString(36).toUpperCase()}`;
  const probScore: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 };
  const impScore: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 };
  const riskScore = (probScore[data.probability || 'medium'] || 2) * (impScore[data.impact || 'medium'] || 2);

  const [result] = await sequelize.query(`
    INSERT INTO pjm_risks (id, tenant_id, project_id, risk_code, title, description, category,
      probability, impact, risk_score, status, mitigation_plan, contingency_plan,
      owner_name, owner_user_id, owner_employee_id,
      identified_date, created_by, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :riskCode, :title, :description, :category,
      :probability, :impact, :riskScore, :status, :mitigationPlan, :contingencyPlan,
      :ownerName, :ownerUserId, :ownerEmployeeId,
      CURRENT_DATE, :createdBy, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId, riskCode, title: data.title,
    description: data.description || null, category: data.category || null,
    probability: data.probability || 'medium', impact: data.impact || 'medium', riskScore,
    status: data.status || 'identified',
    mitigationPlan: data.mitigationPlan || null, contingencyPlan: data.contingencyPlan || null,
    ownerName: data.ownerName || null, ownerUserId: data.ownerUserId || null, ownerEmployeeId: data.ownerEmployeeId || null,
    createdBy: actorId,
  }});

  await logActivity({ projectId: data.projectId, entityType: 'risk', entityId: result[0].id, action: 'create', actorUserId: actorId, actorName, description: `Risiko "${result[0].title}" dicatat (skor ${riskScore})` });

  // High risks auto-notify PM
  if (riskScore >= 9) {
    await notifyWatchers({ projectId: data.projectId, title: '⚠ Risiko Tinggi Teridentifikasi', message: `${result[0].title} (skor ${riskScore})`, referenceId: result[0].id });
  }

  return res.status(201).json(successResponse(result[0]));
}

async function postBudget(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const [result] = await sequelize.query(`
    INSERT INTO pjm_budgets (id, tenant_id, project_id, category, description,
      planned_amount, actual_amount, committed_amount, period, period_date,
      purchase_order_id, expense_id, notes, created_by, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :category, :description,
      :plannedAmount, :actualAmount, :committedAmount, :period, :periodDate,
      :purchaseOrderId, :expenseId, :notes, :createdBy, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId, category: data.category,
    description: data.description || null,
    plannedAmount: data.plannedAmount || 0, actualAmount: data.actualAmount || 0,
    committedAmount: data.committedAmount || 0,
    period: data.period || null, periodDate: data.periodDate || null,
    purchaseOrderId: data.purchaseOrderId || null, expenseId: data.expenseId || null,
    notes: data.notes || null, createdBy: actorId,
  }});
  if (data.projectId) await recomputeProjectActualCost(data.projectId);
  await logActivity({ projectId: data.projectId, entityType: 'budget', entityId: result[0].id, action: 'create', actorUserId: actorId, actorName, description: `Anggaran "${result[0].category}" ditambahkan` });
  return res.status(201).json(successResponse(result[0]));
}

async function postDocument(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const [result] = await sequelize.query(`
    INSERT INTO pjm_documents (id, tenant_id, project_id, task_id, title, document_type, description,
      file_url, file_name, file_size, version, access_level, external_link,
      uploaded_by, uploaded_by_name, created_by, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :taskId, :title, :documentType, :description,
      :fileUrl, :fileName, :fileSize, :version, :accessLevel, :externalLink,
      :uploadedBy, :uploadedByName, :createdBy, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId, taskId: data.taskId || null,
    title: data.title, documentType: data.documentType || null, description: data.description || null,
    fileUrl: data.fileUrl || null, fileName: data.fileName || null, fileSize: data.fileSize || 0,
    version: data.version || '1.0', accessLevel: data.accessLevel || 'team', externalLink: data.externalLink || null,
    uploadedBy: actorId, uploadedByName: actorName, createdBy: actorId,
  }});
  await logActivity({ projectId: data.projectId, entityType: 'document', entityId: result[0].id, action: 'upload', actorUserId: actorId, actorName, description: `Dokumen "${result[0].title}" diupload` });
  return res.status(201).json(successResponse(result[0]));
}

async function postSprint(res: NextApiResponse, data: any, actorId: number | null) {
  const [result] = await sequelize.query(`
    INSERT INTO pjm_sprints (id, tenant_id, project_id, name, goal, status, start_date, end_date,
      planned_points, created_by, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :name, :goal, :status, :startDate, :endDate,
      :plannedPoints, :createdBy, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId,
    name: data.name, goal: data.goal || null, status: data.status || 'planned',
    startDate: data.startDate || null, endDate: data.endDate || null,
    plannedPoints: data.plannedPoints || 0, createdBy: actorId,
  }});
  return res.status(201).json(successResponse(result[0]));
}

async function postComment(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const [result] = await sequelize.query(`
    INSERT INTO pjm_comments (id, tenant_id, project_id, task_id, parent_comment_id,
      author_user_id, author_name, author_employee_id, body, mentions, attachments,
      created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :taskId, :parentCommentId,
      :authorUserId, :authorName, :authorEmployeeId, :body, :mentions, :attachments,
      NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId, taskId: data.taskId || null,
    parentCommentId: data.parentCommentId || null,
    authorUserId: actorId, authorName: data.authorName || actorName,
    authorEmployeeId: data.authorEmployeeId || null, body: data.body,
    mentions: JSON.stringify(data.mentions || []),
    attachments: JSON.stringify(data.attachments || []),
  }});

  // update comment_count on task
  if (data.taskId) {
    await sequelize.query(
      `UPDATE pjm_tasks SET comment_count = COALESCE(comment_count, 0) + 1 WHERE id = :id`,
      { replacements: { id: data.taskId } }
    ).catch(() => {});
  }

  // notify mentions
  const mentions: number[] = data.mentions || [];
  for (const uid of mentions) {
    await sendNotification({ userId: uid, title: `${actorName || 'Seseorang'} menyebut Anda di komentar`,
      message: data.body?.slice(0, 120), category: 'project_management',
      referenceType: data.taskId ? 'pjm_task' : 'pjm_project',
      referenceId: data.taskId || data.projectId });
  }

  await logActivity({ projectId: data.projectId, entityType: data.taskId ? 'task' : 'project', entityId: data.taskId || data.projectId, action: 'comment', actorUserId: actorId, actorName, description: `Komentar: ${String(data.body || '').slice(0, 60)}` });

  return res.status(201).json(successResponse(result[0]));
}

async function postDependency(res: NextApiResponse, data: any, actorId: number | null) {
  const [result] = await sequelize.query(`
    INSERT INTO pjm_dependencies (id, tenant_id, project_id, predecessor_task_id, successor_task_id, dependency_type, lag_days, created_by, created_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :predecessorTaskId, :successorTaskId, :dependencyType, :lagDays, :createdBy, NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId,
    predecessorTaskId: data.predecessorTaskId, successorTaskId: data.successorTaskId,
    dependencyType: data.dependencyType || 'FS', lagDays: data.lagDays || 0,
    createdBy: actorId,
  }});
  return res.status(201).json(successResponse(result[0]));
}

async function postWatcher(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const [result] = await sequelize.query(`
    INSERT INTO pjm_watchers (id, tenant_id, project_id, task_id, user_id, user_name, notify_email, notify_in_app, created_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :taskId, :userId, :userName, :notifyEmail, :notifyInApp, NOW())
    ON CONFLICT DO NOTHING
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId, taskId: data.taskId || null,
    userId: data.userId || actorId, userName: data.userName || actorName,
    notifyEmail: data.notifyEmail !== false, notifyInApp: data.notifyInApp !== false,
  }});
  return res.status(201).json(successResponse(result[0] || { duplicated: true }));
}

async function postApproval(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const [result] = await sequelize.query(`
    INSERT INTO pjm_approvals (id, tenant_id, project_id, entity_type, entity_id, approval_type,
      status, requested_by, requested_by_name, approver_user_id, approver_name, payload, created_at, updated_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, :entityType, :entityId, :approvalType,
      'pending', :requestedBy, :requestedByName, :approverUserId, :approverName, :payload, NOW(), NOW())
    RETURNING *
  `, { replacements: {
    tenantId: data.tenantId || null, projectId: data.projectId,
    entityType: data.entityType, entityId: data.entityId, approvalType: data.approvalType || 'generic',
    requestedBy: actorId, requestedByName: actorName,
    approverUserId: data.approverUserId || null, approverName: data.approverName || null,
    payload: JSON.stringify(data.payload || {}),
  }});

  if (data.approverUserId) {
    await sendNotification({ userId: data.approverUserId, title: `Permintaan approval: ${data.approvalType || 'generic'}`,
      message: `Dari: ${actorName || 'User'}`, type: 'info',
      referenceType: 'pjm_approval', referenceId: result[0].id });
  }
  return res.status(201).json(successResponse(result[0]));
}

async function postBaseline(res: NextApiResponse, data: any, actorId: number | null) {
  const evm = await calculateEVM(data.projectId);
  const [result] = await sequelize.query(`
    INSERT INTO pjm_baselines (id, tenant_id, project_id, snapshot_date,
      bac, pv, ev, ac, spi, cpi, eac, etc, variance_schedule, variance_cost, notes, created_by, created_at)
    VALUES (gen_random_uuid(), :tenantId, :projectId, CURRENT_DATE,
      :bac, :pv, :ev, :ac, :spi, :cpi, :eac, :etc, :sv, :cv, :notes, :createdBy, NOW())
    RETURNING *
  `, { replacements: { tenantId: data.tenantId || null, projectId: data.projectId,
    bac: evm.bac, pv: evm.pv, ev: evm.ev, ac: evm.ac, spi: evm.spi, cpi: evm.cpi, eac: evm.eac, etc: evm.etc,
    sv: evm.sv, cv: evm.cv, notes: data.notes || null, createdBy: actorId }});
  return res.status(201).json(successResponse(result[0]));
}

async function submitTimesheet(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const { id } = data;
  const [rows] = await sequelize.query(`
    UPDATE pjm_timesheets SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
    WHERE id = :id RETURNING *
  `, { replacements: { id } });
  await logActivity({ projectId: rows[0]?.project_id, entityType: 'timesheet', entityId: id, action: 'submit', actorUserId: actorId, actorName, description: 'Timesheet disubmit untuk approval' });
  return res.status(200).json(successResponse(rows[0]));
}

async function approveTimesheet(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const { id } = data;
  const [rows] = await sequelize.query(`
    UPDATE pjm_timesheets SET status = 'approved', approved_at = NOW(),
      approved_by = :actorId, approved_by_user_id = :actorId, updated_at = NOW()
    WHERE id = :id RETURNING *
  `, { replacements: { id, actorId } });
  if (rows[0]) {
    await syncTimesheetToPayroll(id, actorId);
    await refreshProjectRollups(rows[0].project_id);
    await logActivity({ projectId: rows[0].project_id, entityType: 'timesheet', entityId: id, action: 'approve', actorUserId: actorId, actorName, description: 'Timesheet disetujui' });
  }
  return res.status(200).json(successResponse(rows[0]));
}

async function rejectTimesheet(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const { id, reason } = data;
  const [rows] = await sequelize.query(`
    UPDATE pjm_timesheets SET status = 'rejected', rejection_reason = :reason, updated_at = NOW() WHERE id = :id RETURNING *
  `, { replacements: { id, reason: reason || null } });
  await logActivity({ projectId: rows[0]?.project_id, entityType: 'timesheet', entityId: id, action: 'reject', actorUserId: actorId, actorName, description: `Timesheet ditolak: ${reason || '-'}` });
  return res.status(200).json(successResponse(rows[0]));
}

async function assignTask(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const { id, assigneeUserId, assigneeEmployeeId, assigneeName } = data;
  const [rows] = await sequelize.query(`
    UPDATE pjm_tasks SET assignee_user_id = :userId, assignee_employee_id = :empId,
      assignee_name = :name, updated_at = NOW() WHERE id = :id RETURNING *
  `, { replacements: { id, userId: assigneeUserId || null, empId: assigneeEmployeeId || null, name: assigneeName || null } });
  const task = rows[0];
  if (task) {
    if (assigneeUserId) {
      await sendNotification({ userId: assigneeUserId, title: 'Anda ditugaskan pada tugas baru',
        message: task.name, type: 'info', referenceType: 'pjm_task', referenceId: task.id });
    }
    await logActivity({ projectId: task.project_id, entityType: 'task', entityId: task.id, action: 'assign', actorUserId: actorId, actorName, description: `Ditugaskan ke ${assigneeName || 'user'}` });
  }
  return res.status(200).json(successResponse(task));
}

async function updateSchedule(res: NextApiResponse, data: any, actorId: number | null, actorName: string | null) {
  const { id, entityType, startDate, endDate } = data || {};
  if (!id || !startDate || !endDate) {
    return res.status(400).json(errorResponse('MISSING_FIELDS', 'id, startDate, endDate required'));
  }
  const table = entityType === 'milestone' ? 'pjm_milestones'
    : entityType === 'project' ? 'pjm_projects'
    : 'pjm_tasks';

  try {
    if (table === 'pjm_milestones') {
      await sequelize.query(`UPDATE pjm_milestones SET due_date = :endDate, updated_at = NOW() WHERE id = :id`,
        { replacements: { id, endDate } });
    } else if (table === 'pjm_projects') {
      await sequelize.query(`UPDATE pjm_projects SET start_date = :startDate, end_date = :endDate, updated_at = NOW() WHERE id = :id`,
        { replacements: { id, startDate, endDate } });
    } else {
      await sequelize.query(`UPDATE pjm_tasks SET start_date = :startDate, due_date = :endDate, updated_at = NOW() WHERE id = :id`,
        { replacements: { id, startDate, endDate } });
    }

    // Look up project_id for audit log
    let projectId: any = null;
    try {
      const [rows]: any = await sequelize.query(
        table === 'pjm_projects'
          ? `SELECT id as project_id FROM pjm_projects WHERE id = :id`
          : `SELECT project_id FROM ${table} WHERE id = :id`,
        { replacements: { id } }
      );
      projectId = rows?.[0]?.project_id || null;
    } catch {}

    await logActivity({
      projectId,
      entityType: entityType || 'task',
      entityId: id,
      action: 'reschedule',
      actorUserId: actorId,
      actorName,
      description: `Reschedule ke ${new Date(startDate).toLocaleDateString('id-ID')} → ${new Date(endDate).toLocaleDateString('id-ID')}`,
      newValue: { startDate, endDate },
    });

    return res.status(200).json(successResponse({ id, startDate, endDate }));
  } catch (err: any) {
    return res.status(500).json(errorResponse('UPDATE_FAILED', err.message));
  }
}

// ──────────────────────────────────────────────────────────────────
// PUT HANDLERS
// ──────────────────────────────────────────────────────────────────
async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string, actorId: number | null, actorName: string | null) {
  const { id } = req.query;
  const data = req.body;
  if (!id) return res.status(400).json(errorResponse('MISSING_ID', 'ID is required'));

  switch (action) {
    case 'projects': return putProject(res, id as string, data, actorId, actorName);
    case 'tasks': return putTask(res, id as string, data, actorId, actorName);
    case 'milestones': return putGeneric(res, 'pjm_milestones', id as string, data, {
      name: 'name', description: 'description', status: 'status',
      dueDate: 'due_date', completedDate: 'completed_date', sortOrder: 'sort_order',
    }, actorId, actorName, 'milestone');
    case 'timesheets': return putGeneric(res, 'pjm_timesheets', id as string, data, {
      hoursWorked: 'hours_worked', overtimeHours: 'overtime_hours', description: 'description',
      status: 'status', billable: 'billable', hourlyRate: 'hourly_rate',
    }, actorId, actorName, 'timesheet');
    case 'resources': return putGeneric(res, 'pjm_resources', id as string, data, {
      resourceName: 'resource_name', role: 'role', allocationPercent: 'allocation_percent',
      costPerHour: 'cost_per_hour', startDate: 'start_date', endDate: 'end_date',
      status: 'status', quantity: 'quantity', unit: 'unit',
    }, actorId, actorName, 'resource');
    case 'risks': return putRisk(res, id as string, data, actorId, actorName);
    case 'budgets': return putGeneric(res, 'pjm_budgets', id as string, data, {
      category: 'category', description: 'description', plannedAmount: 'planned_amount',
      actualAmount: 'actual_amount', committedAmount: 'committed_amount',
      period: 'period', periodDate: 'period_date',
    }, actorId, actorName, 'budget');
    case 'documents': return putGeneric(res, 'pjm_documents', id as string, data, {
      title: 'title', documentType: 'document_type', description: 'description',
      fileUrl: 'file_url', version: 'version', accessLevel: 'access_level',
    }, actorId, actorName, 'document');
    case 'sprints': return putGeneric(res, 'pjm_sprints', id as string, data, {
      name: 'name', goal: 'goal', status: 'status', startDate: 'start_date',
      endDate: 'end_date', plannedPoints: 'planned_points', completedPoints: 'completed_points',
      velocity: 'velocity', retrospectiveNotes: 'retrospective_notes',
    }, actorId, actorName, 'sprint');
    case 'approvals': return putApproval(res, id as string, data, actorId, actorName);
    default:
      return res.status(400).json(errorResponse('INVALID_ACTION', `Unknown PUT action: ${action}`));
  }
}

async function putGeneric(
  res: NextApiResponse, table: string, id: string, data: any,
  fieldMap: Record<string, string>, actorId: number | null, actorName: string | null, entityType: string
) {
  const fields: string[] = [];
  const rep: any = { id };
  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) { fields.push(`${col} = :${key}`); rep[key] = data[key]; }
  }
  if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields to update'));
  fields.push('updated_at = NOW()');
  const [result] = await sequelize.query(
    `UPDATE ${table} SET ${fields.join(', ')} WHERE id = :id RETURNING *`,
    { replacements: rep }
  );
  const row = result[0];
  if (row) {
    await logActivity({ projectId: row.project_id || null, entityType, entityId: id, action: 'update', actorUserId: actorId, actorName, newValue: data });
    if (entityType === 'timesheet' || entityType === 'budget') {
      if (row.project_id) await recomputeProjectActualCost(row.project_id);
    }
  }
  return res.status(200).json(successResponse(row));
}

async function putProject(res: NextApiResponse, id: string, data: any, actorId: number | null, actorName: string | null) {
  const fieldMap: Record<string, string> = {
    name: 'name', description: 'description', status: 'status', priority: 'priority',
    category: 'category', projectType: 'project_type', clientName: 'client_name', clientContact: 'client_contact',
    managerName: 'manager_name', managerUserId: 'manager_user_id', managerEmployeeId: 'manager_employee_id',
    branchId: 'branch_id', customerId: 'customer_id',
    startDate: 'start_date', endDate: 'end_date',
    actualStartDate: 'actual_start_date', actualEndDate: 'actual_end_date',
    budgetAmount: 'budget_amount', actualCost: 'actual_cost', progressPercent: 'progress_percent',
    ragStatus: 'rag_status', healthScore: 'health_score', visibility: 'visibility',
    notes: 'notes',
  };
  const fields: string[] = []; const rep: any = { id };
  for (const [k, c] of Object.entries(fieldMap)) {
    if (data[k] !== undefined) { fields.push(`${c} = :${k}`); rep[k] = data[k]; }
  }
  if (data.tags !== undefined) { fields.push(`tags = :tags`); rep.tags = JSON.stringify(data.tags); }
  if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields to update'));
  fields.push('updated_at = NOW()');
  const [result] = await sequelize.query(
    `UPDATE pjm_projects SET ${fields.join(', ')} WHERE id = :id RETURNING *`,
    { replacements: rep }
  );
  await logActivity({ projectId: id, entityType: 'project', entityId: id, action: 'update', actorUserId: actorId, actorName, newValue: data });
  await notifyWatchers({ projectId: id, title: 'Proyek diperbarui', message: `Update: ${Object.keys(data).join(', ')}` });
  return res.status(200).json(successResponse(result[0]));
}

async function putTask(res: NextApiResponse, id: string, data: any, actorId: number | null, actorName: string | null) {
  const fieldMap: Record<string, string> = {
    name: 'name', description: 'description', status: 'status', priority: 'priority',
    taskType: 'task_type', assigneeName: 'assignee_name', assigneeUserId: 'assignee_user_id',
    assigneeEmployeeId: 'assignee_employee_id',
    startDate: 'start_date', dueDate: 'due_date', completedDate: 'completed_date',
    estimatedHours: 'estimated_hours', actualHours: 'actual_hours', progressPercent: 'progress_percent',
    sortOrder: 'sort_order', milestoneId: 'milestone_id', sprintId: 'sprint_id',
    storyPoints: 'story_points', blockedReason: 'blocked_reason',
  };
  const fields: string[] = []; const rep: any = { id };
  for (const [k, c] of Object.entries(fieldMap)) {
    if (data[k] !== undefined) { fields.push(`${c} = :${k}`); rep[k] = data[k]; }
  }
  if (data.labels !== undefined) { fields.push('labels = :labels'); rep.labels = JSON.stringify(data.labels); }
  if (data.checklist !== undefined) { fields.push('checklist = :checklist'); rep.checklist = JSON.stringify(data.checklist); }

  if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields to update'));
  fields.push('updated_at = NOW()');

  // Auto-set completed_date when status becomes done
  if (data.status === 'done' && data.completedDate === undefined) {
    fields.push("completed_date = CURRENT_DATE");
  }

  const [result] = await sequelize.query(
    `UPDATE pjm_tasks SET ${fields.join(', ')} WHERE id = :id RETURNING *`,
    { replacements: rep }
  );
  const task = result[0];
  if (task) {
    await logActivity({ projectId: task.project_id, entityType: 'task', entityId: id, action: 'update', actorUserId: actorId, actorName, newValue: data });
    await refreshProjectRollups(task.project_id);

    if (data.status && task.assignee_user_id) {
      await sendNotification({ userId: task.assignee_user_id, title: `Status tugas diubah: ${task.name}`,
        message: `Status: ${data.status}`, type: 'info',
        referenceType: 'pjm_task', referenceId: task.id });
    }
  }
  return res.status(200).json(successResponse(task));
}

async function putRisk(res: NextApiResponse, id: string, data: any, actorId: number | null, actorName: string | null) {
  const fieldMap: Record<string, string> = {
    title: 'title', description: 'description', category: 'category',
    probability: 'probability', impact: 'impact', status: 'status',
    mitigationPlan: 'mitigation_plan', contingencyPlan: 'contingency_plan',
    ownerName: 'owner_name', ownerUserId: 'owner_user_id', ownerEmployeeId: 'owner_employee_id',
    resolvedDate: 'resolved_date',
  };
  const fields: string[] = []; const rep: any = { id };
  for (const [k, c] of Object.entries(fieldMap)) {
    if (data[k] !== undefined) { fields.push(`${c} = :${k}`); rep[k] = data[k]; }
  }
  if (data.probability || data.impact) {
    const probScore: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 };
    const impScore: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 };
    const rs = (probScore[data.probability || 'medium'] || 2) * (impScore[data.impact || 'medium'] || 2);
    fields.push('risk_score = :riskScore'); rep.riskScore = rs;
  }
  if (fields.length === 0) return res.status(400).json(errorResponse('NO_FIELDS', 'No fields to update'));
  fields.push('updated_at = NOW()');
  const [result] = await sequelize.query(`UPDATE pjm_risks SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements: rep });
  if (result[0]) await logActivity({ projectId: result[0].project_id, entityType: 'risk', entityId: id, action: 'update', actorUserId: actorId, actorName });
  return res.status(200).json(successResponse(result[0]));
}

async function putApproval(res: NextApiResponse, id: string, data: any, actorId: number | null, actorName: string | null) {
  const { decision, reason } = data; // 'approve' | 'reject'
  const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'pending';
  const dateCol = decision === 'approve' ? 'approved_at' : decision === 'reject' ? 'rejected_at' : null;

  const setClauses = [`status = :status`, 'updated_at = NOW()'];
  if (dateCol) setClauses.push(`${dateCol} = NOW()`);
  if (reason) setClauses.push('reason = :reason');

  const [result] = await sequelize.query(`
    UPDATE pjm_approvals SET ${setClauses.join(', ')}, approver_user_id = :actorId, approver_name = :actorName
    WHERE id = :id RETURNING *
  `, { replacements: { id, status, reason: reason || null, actorId, actorName } });

  if (result[0]?.requested_by) {
    await sendNotification({ userId: result[0].requested_by,
      title: `Approval ${status === 'approved' ? 'disetujui' : 'ditolak'}: ${result[0].approval_type}`,
      message: reason || 'Tidak ada catatan', type: status === 'approved' ? 'success' : 'warning',
      referenceType: 'pjm_approval', referenceId: id });
  }
  await logActivity({ projectId: result[0]?.project_id, entityType: 'approval', entityId: id, action: decision, actorUserId: actorId, actorName, description: reason || undefined });
  return res.status(200).json(successResponse(result[0]));
}

// ──────────────────────────────────────────────────────────────────
// DELETE HANDLERS
// ──────────────────────────────────────────────────────────────────
async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string, actorId: number | null, actorName: string | null) {
  const { id } = req.query;
  if (!id) return res.status(400).json(errorResponse('MISSING_ID', 'ID is required'));

  const tableMap: Record<string, string> = {
    projects: 'pjm_projects', tasks: 'pjm_tasks', milestones: 'pjm_milestones',
    timesheets: 'pjm_timesheets', resources: 'pjm_resources', risks: 'pjm_risks',
    budgets: 'pjm_budgets', documents: 'pjm_documents',
    sprints: 'pjm_sprints', comments: 'pjm_comments', dependencies: 'pjm_dependencies',
    watchers: 'pjm_watchers', attachments: 'pjm_attachments', approvals: 'pjm_approvals',
  };

  const table = tableMap[action];
  if (!table) return res.status(400).json(errorResponse('INVALID_ACTION', `Unknown DELETE action: ${action}`));

  // Capture project_id for activity log
  let projectId: string | null = null;
  try {
    const [rows] = await sequelize.query(
      `SELECT ${table === 'pjm_projects' ? 'id' : 'project_id'} as pid FROM ${table} WHERE id = :id`,
      { replacements: { id } }
    );
    projectId = rows[0]?.pid || null;
  } catch (_) {}

  await sequelize.query(`DELETE FROM ${table} WHERE id = :id`, { replacements: { id } });

  await logActivity({ projectId, entityType: action.replace(/s$/, ''), entityId: String(id), action: 'delete', actorUserId: actorId, actorName });
  if (projectId && (action === 'tasks' || action === 'timesheets' || action === 'budgets')) {
    await refreshProjectRollups(projectId);
  }
  return res.status(200).json(successResponse({ deleted: true }));
}

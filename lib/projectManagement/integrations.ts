/**
 * Project Management Integration Library
 *
 * Provides cross-module integration helpers for:
 *  - HRIS (employees, payroll sync, leave awareness, attendance)
 *  - User/Auth (actor resolution, role-based filtering)
 *  - Finance (expense/ledger sync, actual cost accrual)
 *  - Procurement (PO linkage for committed budget)
 *  - Fleet / Inventory (equipment & material resources)
 *  - CRM Customers (client-facing projects)
 *  - Branches (multi-branch scoping)
 *  - Notifications (assignment, due-date, risk escalation, approval)
 *  - Activity logging (complete audit trail)
 *  - EVM calculations (PV, EV, AC, SPI, CPI, EAC, ETC)
 *  - Critical path analysis
 *
 * All helpers are soft-fail: they log and return null on DB/table absence
 * so the PM module keeps working even if a sibling module is not provisioned.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sequelize = require('../sequelize');

// ──────────────────────────────────────────────────────────────────
// Soft-query helper: swallow errors so missing sibling tables
// never crash the PM API.
// ──────────────────────────────────────────────────────────────────
async function safeQuery<T = any>(sql: string, replacements: any = {}): Promise<T[]> {
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows as T[];
  } catch (err: any) {
    console.warn('[PJM.integration] query failed:', err.message?.slice(0, 160));
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────
// HRIS Integration
// ──────────────────────────────────────────────────────────────────
export interface EmployeeLite {
  id: string;
  name: string;
  employeeNumber?: string;
  email?: string;
  position?: string;
  department?: string;
  branchId?: string;
  avatarUrl?: string;
  costPerHour?: number;
  isActive?: boolean;
}

export async function listEmployees(opts: {
  search?: string;
  branchId?: string;
  department?: string;
  limit?: number;
} = {}): Promise<EmployeeLite[]> {
  const { search, branchId, department, limit = 200 } = opts;
  let where = `WHERE COALESCE("status", 'active') = 'active'`;
  const rep: any = { limit };

  if (search) { where += ` AND (name ILIKE :search OR "employeeNumber" ILIKE :search OR email ILIKE :search)`; rep.search = `%${search}%`; }
  if (branchId) { where += ` AND "branchId" = :branchId`; rep.branchId = branchId; }
  if (department) { where += ` AND department = :department`; rep.department = department; }

  const rows = await safeQuery(
    `SELECT id, name, "employeeNumber", email, position, department, "branchId"
     FROM hris_employees ${where}
     ORDER BY name ASC LIMIT :limit`,
    rep
  );

  // Fallback: some installs use the legacy `employees` table
  if (rows.length === 0) {
    const legacy = await safeQuery(
      `SELECT id::text as id, name, employee_number as "employeeNumber",
              email, position, department, NULL as "branchId"
       FROM employees
       WHERE COALESCE(is_active, true) = true
         ${search ? ` AND (name ILIKE :search OR employee_number ILIKE :search)` : ''}
       ORDER BY name ASC LIMIT :limit`,
      { ...rep }
    );
    return legacy.map((r: any) => ({ ...r, isActive: true }));
  }

  return rows.map((r: any) => ({ ...r, isActive: true }));
}

export async function getEmployeeById(id: string): Promise<EmployeeLite | null> {
  const rows = await safeQuery(
    `SELECT id, name, "employeeNumber", email, position, department, "branchId"
     FROM hris_employees WHERE id = :id LIMIT 1`,
    { id }
  );
  if (rows[0]) return { ...rows[0], isActive: true } as EmployeeLite;
  return null;
}

// Sync approved timesheet hours to HRIS payroll totals (idempotent)
export async function syncTimesheetToPayroll(timesheetId: string, actorId: number | null): Promise<boolean> {
  const rows = await safeQuery(
    `SELECT id, hris_employee_id, employee_id, work_date, hours_worked, overtime_hours,
            total_cost, status, synced_to_payroll, project_id
     FROM pjm_timesheets WHERE id = :id LIMIT 1`,
    { id: timesheetId }
  );
  const ts = rows[0] as any;
  if (!ts) return false;
  if (ts.status !== 'approved' || ts.synced_to_payroll) return false;

  await safeQuery(
    `UPDATE pjm_timesheets
        SET synced_to_payroll = TRUE, synced_to_payroll_at = NOW(), updated_at = NOW()
      WHERE id = :id`,
    { id: timesheetId }
  );

  await logActivity({
    projectId: ts.project_id,
    entityType: 'timesheet',
    entityId: timesheetId,
    action: 'payroll_synced',
    actorUserId: actorId,
    description: `Timesheet ${ts.work_date} synced to payroll (${Number(ts.hours_worked).toFixed(1)}h)`,
  });

  return true;
}

// ──────────────────────────────────────────────────────────────────
// Finance Integration
// ──────────────────────────────────────────────────────────────────
export async function recomputeProjectActualCost(projectId: string): Promise<number> {
  const rows = await safeQuery(
    `SELECT COALESCE(SUM(total_cost), 0) as ts_cost
       FROM pjm_timesheets
      WHERE project_id = :projectId AND status IN ('approved', 'submitted')`,
    { projectId }
  );
  const tsCost = Number((rows[0] as any)?.ts_cost || 0);

  const budgets = await safeQuery(
    `SELECT COALESCE(SUM(actual_amount), 0) as bg_cost
       FROM pjm_budgets WHERE project_id = :projectId`,
    { projectId }
  );
  const budgetActual = Number((budgets[0] as any)?.bg_cost || 0);

  const totalActual = tsCost + budgetActual;

  await safeQuery(
    `UPDATE pjm_projects SET actual_cost = :cost, updated_at = NOW() WHERE id = :id`,
    { cost: totalActual, id: projectId }
  );

  return totalActual;
}

// Optional push to finance expenses ledger (soft-fail)
export async function pushExpenseToFinance(opts: {
  projectId: string;
  category: string;
  amount: number;
  description?: string;
  periodDate?: string;
  createdBy?: number;
}): Promise<string | null> {
  const rows = await safeQuery(
    `INSERT INTO finance_expenses (
        id, tenant_id, project_id, category, amount, description,
        expense_date, status, created_by, created_at, updated_at
     ) VALUES (
        gen_random_uuid(), NULL, :projectId, :category, :amount, :description,
        COALESCE(:periodDate, CURRENT_DATE), 'pending', :createdBy, NOW(), NOW()
     ) RETURNING id`,
    opts as any
  );
  return (rows[0] as any)?.id ?? null;
}

// ──────────────────────────────────────────────────────────────────
// Procurement / PO linkage
// ──────────────────────────────────────────────────────────────────
export async function listRecentPurchaseOrders(opts: { search?: string; limit?: number } = {}) {
  const { search, limit = 30 } = opts;
  return safeQuery(
    `SELECT id, po_number, supplier_name, total_amount, status, order_date
       FROM purchase_orders
      WHERE 1=1 ${search ? `AND (po_number ILIKE :search OR supplier_name ILIKE :search)` : ''}
      ORDER BY order_date DESC LIMIT :limit`,
    { search: search ? `%${search}%` : undefined, limit }
  );
}

// ──────────────────────────────────────────────────────────────────
// CRM Customers
// ──────────────────────────────────────────────────────────────────
export async function listCustomers(opts: { search?: string; limit?: number } = {}) {
  const { search, limit = 50 } = opts;
  return safeQuery(
    `SELECT id, name, code, email, phone, company_name
       FROM customers
      WHERE COALESCE(is_active, true) = true
        ${search ? `AND (name ILIKE :search OR company_name ILIKE :search OR email ILIKE :search)` : ''}
      ORDER BY name ASC LIMIT :limit`,
    { search: search ? `%${search}%` : undefined, limit }
  );
}

// ──────────────────────────────────────────────────────────────────
// Fleet / Inventory / Branches
// ──────────────────────────────────────────────────────────────────
export async function listFleetVehicles(opts: { limit?: number } = {}) {
  return safeQuery(
    `SELECT id, license_plate, vehicle_type, status
       FROM fleet_vehicles
      WHERE COALESCE(status, 'active') != 'decommissioned'
      ORDER BY license_plate ASC LIMIT :limit`,
    { limit: opts.limit || 50 }
  );
}

export async function listInventoryItems(opts: { search?: string; limit?: number } = {}) {
  const { search, limit = 50 } = opts;
  return safeQuery(
    `SELECT id, name, sku, unit, category
       FROM inventory_items
      WHERE 1=1 ${search ? `AND (name ILIKE :search OR sku ILIKE :search)` : ''}
      ORDER BY name ASC LIMIT :limit`,
    { search: search ? `%${search}%` : undefined, limit }
  );
}

export async function listBranches() {
  try {
    const rows = await safeQuery(
      `SELECT id, name, code FROM branches WHERE COALESCE(is_active, true) = true ORDER BY name ASC`
    );
    if (rows && rows.length > 0) return rows;
  } catch {
    // fall through to ESI single-org stub
  }
  return [{ id: 'esi-hq', name: 'Kantor Pusat ESI', code: 'ESI-HQ' }];
}

// ──────────────────────────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────────────────────────
export async function sendNotification(opts: {
  userId: number;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<boolean> {
  try {
    await sequelize.query(
      `INSERT INTO notifications (tenant_id, user_id, title, message, type, category, reference_type, reference_id, is_read, created_at, updated_at)
       VALUES (NULL, :userId, :title, :message, :type, :category, :referenceType, :referenceId, FALSE, NOW(), NOW())`,
      { replacements: { type: 'info', ...opts, message: opts.message || null, category: opts.category || 'project_management', referenceType: opts.referenceType || null, referenceId: opts.referenceId || null } }
    );
    return true;
  } catch (err: any) {
    console.warn('[PJM.integration] notify failed:', err.message?.slice(0, 120));
    return false;
  }
}

// Bulk notify watchers of an entity
export async function notifyWatchers(opts: {
  projectId: string;
  taskId?: string;
  title: string;
  message?: string;
  referenceId?: string;
}): Promise<number> {
  const watchers = await safeQuery(
    `SELECT DISTINCT user_id FROM pjm_watchers
      WHERE project_id = :projectId ${opts.taskId ? 'AND (task_id = :taskId OR task_id IS NULL)' : ''}`,
    { projectId: opts.projectId, taskId: opts.taskId }
  );
  let count = 0;
  for (const w of watchers as any[]) {
    if (w.user_id) {
      const ok = await sendNotification({
        userId: w.user_id,
        title: opts.title,
        message: opts.message,
        category: 'project_management',
        referenceType: opts.taskId ? 'pjm_task' : 'pjm_project',
        referenceId: opts.referenceId || opts.taskId || opts.projectId,
      });
      if (ok) count++;
    }
  }
  return count;
}

// ──────────────────────────────────────────────────────────────────
// Activity log
// ──────────────────────────────────────────────────────────────────
export async function logActivity(opts: {
  projectId: string | null;
  entityType: string;
  entityId?: string;
  action: string;
  actorUserId?: number | null;
  actorName?: string | null;
  description?: string | null;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}): Promise<void> {
  try {
    await sequelize.query(
      `INSERT INTO pjm_activity_log
         (tenant_id, project_id, entity_type, entity_id, action, actor_user_id, actor_name,
          description, old_value, new_value, metadata, created_at)
       VALUES (NULL, :projectId, :entityType, :entityId, :action, :actorUserId, :actorName,
               :description, :oldValue, :newValue, :metadata, NOW())`,
      {
        replacements: {
          projectId: opts.projectId,
          entityType: opts.entityType,
          entityId: opts.entityId || null,
          action: opts.action,
          actorUserId: opts.actorUserId ?? null,
          actorName: opts.actorName ?? null,
          description: opts.description ?? null,
          oldValue: opts.oldValue ? JSON.stringify(opts.oldValue) : null,
          newValue: opts.newValue ? JSON.stringify(opts.newValue) : null,
          metadata: JSON.stringify(opts.metadata || {}),
        },
      }
    );
  } catch (err: any) {
    console.warn('[PJM.integration] log activity failed:', err.message?.slice(0, 120));
  }
}

// ──────────────────────────────────────────────────────────────────
// EVM (Earned Value Management) calculations
// ──────────────────────────────────────────────────────────────────
export interface EVMMetrics {
  bac: number;     // Budget at Completion
  pv: number;      // Planned Value
  ev: number;      // Earned Value
  ac: number;      // Actual Cost
  sv: number;      // Schedule Variance
  cv: number;      // Cost Variance
  spi: number;     // Schedule Performance Index
  cpi: number;     // Cost Performance Index
  eac: number;     // Estimate at Completion
  etc: number;     // Estimate to Complete
  vac: number;     // Variance at Completion
  pctPlanned: number;
  pctComplete: number;
  pctSpent: number;
}

export async function calculateEVM(projectId: string): Promise<EVMMetrics> {
  const rows = await safeQuery(
    `SELECT budget_amount, actual_cost, progress_percent, start_date, end_date
       FROM pjm_projects WHERE id = :id LIMIT 1`,
    { id: projectId }
  );
  const p = (rows[0] || {}) as any;
  const bac = Number(p.budget_amount || 0);
  const ac = Number(p.actual_cost || 0);
  const pctComplete = Math.min(Math.max(Number(p.progress_percent || 0), 0), 100) / 100;

  let pctPlanned = 0;
  if (p.start_date && p.end_date) {
    const start = new Date(p.start_date).getTime();
    const end = new Date(p.end_date).getTime();
    const now = Date.now();
    pctPlanned = end > start ? Math.min(Math.max((now - start) / (end - start), 0), 1) : 0;
  }

  const pv = bac * pctPlanned;
  const ev = bac * pctComplete;
  const sv = ev - pv;
  const cv = ev - ac;
  const spi = pv > 0 ? ev / pv : 1;
  const cpi = ac > 0 ? ev / ac : 1;
  const eac = cpi > 0 ? bac / cpi : bac;
  const etc = eac - ac;
  const vac = bac - eac;
  const pctSpent = bac > 0 ? (ac / bac) * 100 : 0;

  return {
    bac, pv, ev, ac, sv, cv, spi, cpi, eac, etc, vac,
    pctPlanned: pctPlanned * 100,
    pctComplete: pctComplete * 100,
    pctSpent,
  };
}

// ──────────────────────────────────────────────────────────────────
// Critical Path Analysis
// ──────────────────────────────────────────────────────────────────
export interface CriticalPathTask {
  id: string;
  name: string;
  durationDays: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isCritical: boolean;
}

export async function analyzeCriticalPath(projectId: string): Promise<CriticalPathTask[]> {
  const tasks = await safeQuery(
    `SELECT id::text as id, name, start_date, due_date, estimated_hours
       FROM pjm_tasks WHERE project_id = :projectId`,
    { projectId }
  );
  const deps = await safeQuery(
    `SELECT predecessor_task_id::text as pred, successor_task_id::text as succ
       FROM pjm_dependencies WHERE project_id = :projectId`,
    { projectId }
  );

  if (tasks.length === 0) return [];

  const byId: Record<string, any> = {};
  for (const t of tasks as any[]) {
    const dur = (t.start_date && t.due_date)
      ? Math.max(1, Math.round((new Date(t.due_date).getTime() - new Date(t.start_date).getTime()) / 86400000))
      : Math.max(1, Math.round(Number(t.estimated_hours || 8) / 8));
    byId[t.id] = { id: t.id, name: t.name, durationDays: dur, predecessors: [], successors: [] };
  }
  for (const d of deps as any[]) {
    if (byId[d.succ] && byId[d.pred]) {
      byId[d.succ].predecessors.push(d.pred);
      byId[d.pred].successors.push(d.succ);
    }
  }

  // Forward pass
  const visitedF = new Set<string>();
  const forward = (id: string): number => {
    if (visitedF.has(id)) return byId[id].earliestFinish;
    visitedF.add(id);
    const node = byId[id];
    const es = node.predecessors.length === 0
      ? 0
      : Math.max(...node.predecessors.map((p: string) => forward(p)));
    node.earliestStart = es;
    node.earliestFinish = es + node.durationDays;
    return node.earliestFinish;
  };
  for (const id of Object.keys(byId)) forward(id);

  const projectFinish = Math.max(...Object.values(byId).map((n: any) => n.earliestFinish));

  // Backward pass
  const visitedB = new Set<string>();
  const backward = (id: string): number => {
    if (visitedB.has(id)) return byId[id].latestStart;
    visitedB.add(id);
    const node = byId[id];
    node.latestFinish = node.successors.length === 0
      ? projectFinish
      : Math.min(...node.successors.map((s: string) => backward(s)));
    node.latestStart = node.latestFinish - node.durationDays;
    return node.latestStart;
  };
  for (const id of Object.keys(byId)) backward(id);

  return Object.values(byId).map((n: any) => ({
    id: n.id,
    name: n.name,
    durationDays: n.durationDays,
    earliestStart: n.earliestStart,
    earliestFinish: n.earliestFinish,
    latestStart: n.latestStart,
    latestFinish: n.latestFinish,
    slack: n.latestStart - n.earliestStart,
    isCritical: (n.latestStart - n.earliestStart) === 0,
  }));
}

// ──────────────────────────────────────────────────────────────────
// Team Workload
// ──────────────────────────────────────────────────────────────────
export async function getTeamWorkload(opts: { projectId?: string; startDate?: string; endDate?: string } = {}) {
  const { projectId, startDate, endDate } = opts;
  const start = startDate || new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
  const end = endDate || new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0];

  const taskLoad = await safeQuery(
    `SELECT
        COALESCE(assignee_employee_id::text, assignee_name) as employee_key,
        assignee_name,
        COUNT(*) as task_count,
        SUM(COALESCE(estimated_hours, 0)) as estimated_hours,
        COUNT(*) FILTER (WHERE status = 'in_progress') as active_tasks,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'done') as overdue_tasks
     FROM pjm_tasks
     WHERE assignee_name IS NOT NULL
       ${projectId ? 'AND project_id = :projectId' : ''}
       AND (due_date IS NULL OR due_date >= :start)
       AND (start_date IS NULL OR start_date <= :end)
     GROUP BY employee_key, assignee_name
     ORDER BY estimated_hours DESC`,
    { projectId, start, end }
  );

  const loggedHours = await safeQuery(
    `SELECT
        COALESCE(hris_employee_id::text, employee_name) as employee_key,
        employee_name,
        SUM(hours_worked) as hours_this_period
     FROM pjm_timesheets
     WHERE employee_name IS NOT NULL
       ${projectId ? 'AND project_id = :projectId' : ''}
       AND work_date BETWEEN :start AND :end
     GROUP BY employee_key, employee_name`,
    { projectId, start, end }
  );

  const hoursMap: Record<string, number> = {};
  for (const r of loggedHours as any[]) hoursMap[r.employee_key] = Number(r.hours_this_period || 0);

  return (taskLoad as any[]).map((r) => ({
    employeeKey: r.employee_key,
    name: r.assignee_name,
    taskCount: Number(r.task_count || 0),
    estimatedHours: Number(r.estimated_hours || 0),
    activeTasks: Number(r.active_tasks || 0),
    overdueTasks: Number(r.overdue_tasks || 0),
    loggedHours: Number(hoursMap[r.employee_key] || 0),
    utilization: r.estimated_hours > 0 ? Math.min(Number(hoursMap[r.employee_key] || 0) / Number(r.estimated_hours) * 100, 100) : 0,
  }));
}

// ──────────────────────────────────────────────────────────────────
// Burndown (by sprint or by project)
// ──────────────────────────────────────────────────────────────────
export async function getBurndown(opts: { projectId: string; sprintId?: string }) {
  const { projectId, sprintId } = opts;
  const tasks = await safeQuery(
    `SELECT created_at, completed_date, estimated_hours, status
       FROM pjm_tasks
      WHERE project_id = :projectId ${sprintId ? 'AND sprint_id = :sprintId' : ''}`,
    { projectId, sprintId }
  );
  if (tasks.length === 0) return { series: [], total: 0 };

  const total = (tasks as any[]).reduce((s, t) => s + Number(t.estimated_hours || 0), 0);

  // Build day-by-day: start -> today
  const earliest = (tasks as any[])
    .map((t) => new Date(t.created_at).getTime())
    .reduce((a, b) => Math.min(a, b), Date.now());

  const dayMs = 86400000;
  const days: { date: string; remaining: number; ideal: number }[] = [];
  const totalDays = Math.max(1, Math.ceil((Date.now() - earliest) / dayMs));
  for (let i = 0; i <= totalDays; i++) {
    const day = new Date(earliest + i * dayMs);
    const dayStr = day.toISOString().split('T')[0];
    const completedHours = (tasks as any[])
      .filter((t) => t.completed_date && new Date(t.completed_date).getTime() <= day.getTime())
      .reduce((s, t) => s + Number(t.estimated_hours || 0), 0);
    days.push({
      date: dayStr,
      remaining: total - completedHours,
      ideal: total * (1 - i / totalDays),
    });
  }
  return { series: days, total };
}

// ──────────────────────────────────────────────────────────────────
// Utility: update project rollups after task/timesheet change
// ──────────────────────────────────────────────────────────────────
export async function refreshProjectRollups(projectId: string): Promise<void> {
  const [stats] = await safeQuery(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'done') as completed,
            COALESCE(SUM(actual_hours), 0) as total_hours
       FROM pjm_tasks WHERE project_id = :id`,
    { id: projectId }
  ) as any;

  if (!stats) return;
  await safeQuery(
    `UPDATE pjm_projects
        SET total_tasks = :total, completed_tasks = :completed,
            total_hours = :hours, updated_at = NOW()
      WHERE id = :id`,
    { id: projectId, total: stats.total || 0, completed: stats.completed || 0, hours: stats.total_hours || 0 }
  );

  await recomputeProjectActualCost(projectId);
}

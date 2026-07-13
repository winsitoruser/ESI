import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { rowsToSnake, rowToSnake } from '@/lib/hris/serialize-rows';

let Project: any, ProjectWorker: any, ProjectTimesheet: any, ProjectPayroll: any;
try { Project = require('../../../models/Project'); } catch(e) {}
try { ProjectWorker = require('../../../models/ProjectWorker'); } catch(e) {}
try { ProjectTimesheet = require('../../../models/ProjectTimesheet'); } catch(e) {}
try { ProjectPayroll = require('../../../models/ProjectPayroll'); } catch(e) {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { method } = req;
  const { action } = req.query;

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action as string);
      case 'POST': return handlePost(req, res, action as string, session);
      case 'PUT': return handlePut(req, res, action as string);
      case 'DELETE': return handleDelete(req, res, action as string);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Project API error:', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Terjadi kesalahan server' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'overview': {
      const { Op } = require('sequelize');
      const activeWhere = { status: { [Op.in]: ['active', 'in_progress'] } };
      const [total, active] = await Promise.all([
        Project?.count() || 0,
        Project?.count({ where: activeWhere }) || 0,
      ]);
      let workers = 0;
      let timesheets = 0;
      try {
        workers = ProjectWorker ? await ProjectWorker.count({ where: { status: 'active' } }) : 0;
      } catch {
        workers = ProjectWorker ? await ProjectWorker.count() : 0;
      }
      try {
        timesheets = ProjectTimesheet ? await ProjectTimesheet.count() : 0;
      } catch {
        timesheets = 0;
      }
      const totalBudget = Project ? (await Project.sum('budgetAmount')) || 0 : 0;
      const totalActual = Project ? (await Project.sum('actualCost')) || 0 : 0;
      const dataSource = total > 0 ? 'live' : 'empty';
      return res.json({
        success: true,
        data: { totalProjects: total, activeProjects: active, activeWorkers: workers, totalTimesheets: timesheets, totalBudget, totalActual },
        dataSource,
      });
    }
    case 'projects': {
      const { status, department, industry } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (department) where.department = department;
      if (industry) where.industry = industry;
      const rows = Project ? await Project.findAll({ where, order: [['createdAt', 'DESC']] }) : [];
      return res.json({ success: true, data: rows.map(serializeProject) });
    }
    case 'project-detail': {
      const { id } = req.query;
      if (!id || !Project) return res.status(404).json({ error: 'Not found' });
      const project = await Project.findByPk(id);
      const workers = ProjectWorker ? await ProjectWorker.findAll({ where: { projectId: id }, order: [['createdAt', 'DESC']] }) : [];
      const timesheetCount = ProjectTimesheet ? await ProjectTimesheet.count({ where: { projectId: id } }) : 0;
      const totalHours = ProjectTimesheet ? (await ProjectTimesheet.sum('hoursWorked', { where: { projectId: id } })) || 0 : 0;
      const payrollItems = ProjectPayroll ? await ProjectPayroll.findAll({ where: { projectId: id }, order: [['period_start', 'DESC']] }) : [];
      return res.json({
        success: true,
        data: {
          project: serializeProject(project),
          workers: workers.map(serializeWorker),
          timesheetCount,
          totalHours,
          payrollItems: rowsToSnake(payrollItems),
        },
      });
    }
    case 'workers': {
      const { project_id, status: wStatus, worker_type } = req.query;
      const where: any = {};
      if (project_id) where.projectId = project_id;
      if (wStatus) where.status = wStatus;
      if (worker_type) where.resourceType = worker_type;
      const rows = ProjectWorker ? await ProjectWorker.findAll({ where, order: [['createdAt', 'DESC']] }) : [];
      return res.json({ success: true, data: rows.map(serializeWorker) });
    }
    case 'timesheets': {
      const { project_id: pId, employee_id, status: tStatus, date_from, date_to } = req.query;
      const where: any = {};
      if (pId) where.projectId = pId;
      if (employee_id) where.employeeId = employee_id;
      if (tStatus) where.status = tStatus;
      if (date_from && date_to) {
        const { Op } = require('sequelize');
        where.workDate = { [Op.between]: [date_from, date_to] };
      }
      const rows = ProjectTimesheet ? await ProjectTimesheet.findAll({ where, order: [['workDate', 'DESC']], limit: 200 }) : [];
      return res.json({ success: true, data: rows.map(serializeTimesheet) });
    }
    case 'payroll': {
      const { project_id: prId, employee_id: eId, status: pStatus } = req.query;
      const where: any = {};
      if (prId) where.projectId = prId;
      if (eId) where.employeeId = eId;
      if (pStatus) where.status = pStatus;
      const data = ProjectPayroll ? await ProjectPayroll.findAll({ where, order: [['periodStart', 'DESC']] }) : [];
      return res.json({ success: true, data: rowsToSnake(data) });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const body = req.body;
  switch (action) {
    case 'project': {
      if (!Project) return res.json({ success: true, data: body });
      const count = await Project.count();
      body.projectCode = body.projectCode || `PRJ-${String(count + 1).padStart(4, '0')}`;
      const project = await Project.create(body);
      return res.json({ success: true, data: project });
    }
    case 'worker': {
      if (!ProjectWorker) return res.json({ success: true, data: body });
      if (!body.projectId) return res.status(400).json({ success: false, error: 'Proyek wajib dipilih' });
      if (!body.employeeId) return res.status(400).json({ success: false, error: 'Karyawan wajib dipilih' });
      const worker = await ProjectWorker.create(mapWorkerPayload(body));
      return res.json({ success: true, data: worker });
    }
    case 'workers-bulk': {
      const { projectId, workers } = body;
      if (!ProjectWorker || !projectId || !workers?.length) return res.json({ success: true });
      const created = [];
      for (const w of workers) {
        try {
          const worker = await ProjectWorker.create(mapWorkerPayload({ ...w, projectId }));
          created.push(worker);
        } catch(e) { /* duplicate, skip */ }
      }
      return res.json({ success: true, data: created, count: created.length });
    }
    case 'timesheet': {
      if (!ProjectTimesheet) return res.json({ success: true, data: body });
      if (!body.projectId) return res.status(400).json({ success: false, error: 'Proyek wajib dipilih' });
      if (!body.employeeId) return res.status(400).json({ success: false, error: 'Karyawan wajib dipilih' });
      const ts = await ProjectTimesheet.create(mapTimesheetPayload(body));
      return res.json({ success: true, data: ts });
    }
    case 'timesheets-bulk': {
      const { entries } = body;
      if (!ProjectTimesheet || !entries?.length) return res.json({ success: true });
      const created = await ProjectTimesheet.bulkCreate(entries.map(mapTimesheetPayload));
      return res.json({ success: true, data: created, count: created.length });
    }
    case 'approve-timesheet': {
      const { id } = body;
      if (!ProjectTimesheet || !id) return res.json({ success: true });
      await ProjectTimesheet.update({
        status: 'approved', approvedBy: (session.user as any)?.id, approvedAt: new Date()
      }, { where: { id } });
      return res.json({ success: true, message: 'Timesheet approved' });
    }
    case 'calculate-payroll': {
      const { projectId: prjId, employeeId, periodStart, periodEnd } = body;
      if (!ProjectTimesheet || !ProjectPayroll || !prjId || !employeeId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const { Op } = require('sequelize');
      // Get approved timesheets for the period
      const timesheets = await ProjectTimesheet.findAll({
        where: {
          projectId: prjId, employeeId,
          status: 'approved',
          workDate: { [Op.between]: [periodStart, periodEnd] }
        }
      });
      // Get worker rate
      const worker = await ProjectWorker.findOne({ where: { projectId: prjId, employeeId } });
      const dailyRate = parseFloat(worker?.costPerHour || 0) * 8;
      const hourlyRate = parseFloat(worker?.costPerHour || 0);

      const regularHours = timesheets.reduce((sum: number, t: any) => sum + parseFloat(t.hoursWorked || 0), 0);
      const overtimeHours = timesheets.reduce((sum: number, t: any) => sum + parseFloat(t.overtimeHours || 0), 0);
      const daysWorked = timesheets.length;

      const grossAmount = dailyRate > 0
        ? (daysWorked * dailyRate) + (overtimeHours * dailyRate / 8 * 1.5)
        : (regularHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5);

      const payroll = await ProjectPayroll.create({
        projectId: prjId, employeeId, periodStart, periodEnd,
        regularHours, overtimeHours, dailyRate, overtimeRate: dailyRate / 8 * 1.5,
        daysWorked, grossAmount, netAmount: grossAmount, status: 'calculated'
      });
      return res.json({ success: true, data: payroll });
    }
    case 'approve-payroll': {
      const { id: payId } = body;
      if (!ProjectPayroll || !payId) return res.json({ success: true });
      await ProjectPayroll.update({
        status: 'approved', approvedBy: (session.user as any)?.id, approvedAt: new Date()
      }, { where: { id: payId } });
      return res.json({ success: true, message: 'Payroll approved' });
    }
    case 'pay-payroll': {
      const { id: ppId, paymentRef } = body;
      if (!ProjectPayroll || !ppId) return res.json({ success: true });
      await ProjectPayroll.update({
        status: 'paid', paidAt: new Date(), paymentRef
      }, { where: { id: ppId } });
      return res.json({ success: true, message: 'Payment recorded' });
    }
    case 'update-progress': {
      const { id: prId, completionPercent: cp } = body;
      if (!Project || !prId) return res.json({ success: true });
      const statusUpdate: any = { progressPercent: cp };
      if (cp >= 100) {
        statusUpdate.status = 'completed';
        statusUpdate.actualEndDate = new Date().toISOString().split('T')[0];
      }
      await Project.update(statusUpdate, { where: { id: prId } });
      return res.json({ success: true, message: 'Progress updated' });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  switch (action) {
    case 'project': {
      if (!Project) return res.json({ success: true });
      await Project.update(req.body, { where: { id } });
      return res.json({ success: true, message: 'Project updated' });
    }
    case 'worker': {
      if (!ProjectWorker) return res.json({ success: true });
      await ProjectWorker.update(mapWorkerPayload(req.body), { where: { id } });
      return res.json({ success: true, message: 'Worker updated' });
    }
    case 'timesheet': {
      if (!ProjectTimesheet) return res.json({ success: true });
      await ProjectTimesheet.update(mapTimesheetPayload(req.body), { where: { id } });
      return res.json({ success: true, message: 'Timesheet updated' });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  const models: any = { project: Project, worker: ProjectWorker, timesheet: ProjectTimesheet, payroll: ProjectPayroll };
  const model = models[action];
  if (!model) return res.status(400).json({ error: 'Invalid action' });
  await model.destroy({ where: { id } });
  return res.json({ success: true, message: 'Deleted' });
}

function serializeProject(row: any) {
  const s = rowToSnake(row) || {};
  return {
    ...s,
    completion_percent: s.progress_percent ?? s.completion_percent ?? 0,
    industry: s.category || s.industry || '',
    location: s.location || '',
  };
}

function serializeWorker(row: any) {
  const s = rowToSnake(row) || {};
  return {
    ...s,
    worker_type: s.resource_type || s.worker_type || 'employee',
    daily_rate: s.daily_rate ?? (s.cost_per_hour ? Number(s.cost_per_hour) * 8 : 0),
    hourly_rate: s.hourly_rate ?? s.cost_per_hour ?? 0,
    assignment_start: s.start_date,
    assignment_end: s.end_date,
  };
}

function serializeTimesheet(row: any) {
  const s = rowToSnake(row) || {};
  return {
    ...s,
    timesheet_date: s.work_date,
    activity_description: s.description,
  };
}

function mapWorkerPayload(body: any) {
  const dailyRate = Number(body.dailyRate) || 0;
  const hourlyRate = Number(body.hourlyRate) || (dailyRate > 0 ? dailyRate / 8 : 0);
  return {
    projectId: body.projectId,
    employeeId: body.employeeId || null,
    resourceName: body.employeeName || body.resourceName || null,
    resourceType: body.workerType || body.resourceType || 'employee',
    role: body.role || null,
    allocationPercent: body.allocationPercent ?? 100,
    startDate: body.assignmentStart || body.startDate || null,
    endDate: body.assignmentEnd || body.endDate || null,
    costPerHour: hourlyRate,
  };
}

function mapTimesheetPayload(body: any) {
  return {
    projectId: body.projectId,
    employeeId: body.employeeId || null,
    employeeName: body.employeeName || null,
    workDate: body.timesheetDate || body.workDate,
    hoursWorked: body.hoursWorked ?? 0,
    overtimeHours: body.overtimeHours ?? 0,
    description: body.activityDescription || body.description || null,
    status: body.status || 'submitted',
  };
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let Project: any, ProjectWorker: any, ProjectTimesheet: any, ProjectPayroll: any;
try { Project = require('../../../../models/Project'); } catch(e) {}
try { ProjectWorker = require('../../../../models/ProjectWorker'); } catch(e) {}
try { ProjectTimesheet = require('../../../../models/ProjectTimesheet'); } catch(e) {}
try { ProjectPayroll = require('../../../../models/ProjectPayroll'); } catch(e) {}

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
    console.error('Project API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'overview': {
      const [total, active, workers, timesheets] = await Promise.all([
        Project?.count() || 0,
        Project?.count({ where: { status: 'active' } }) || 0,
        ProjectWorker?.count({ where: { status: 'active' } }) || 0,
        ProjectTimesheet?.count() || 0,
      ]);
      const totalBudget = Project ? (await Project.sum('budgetAmount')) || 0 : 0;
      const totalActual = Project ? (await Project.sum('actualCost')) || 0 : 0;
      return res.json({
        success: true,
        data: { totalProjects: total, activeProjects: active, activeWorkers: workers, totalTimesheets: timesheets, totalBudget, totalActual }
      });
    }
    case 'projects': {
      const { status, department, industry } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (department) where.department = department;
      if (industry) where.industry = industry;
      const data = Project ? await Project.findAll({ where, order: [['created_at', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    case 'project-detail': {
      const { id } = req.query;
      if (!id || !Project) return res.status(404).json({ error: 'Not found' });
      const project = await Project.findByPk(id);
      const workers = ProjectWorker ? await ProjectWorker.findAll({ where: { projectId: id }, order: [['created_at', 'DESC']] }) : [];
      const timesheetCount = ProjectTimesheet ? await ProjectTimesheet.count({ where: { projectId: id } }) : 0;
      const totalHours = ProjectTimesheet ? (await ProjectTimesheet.sum('hoursWorked', { where: { projectId: id } })) || 0 : 0;
      const payrollItems = ProjectPayroll ? await ProjectPayroll.findAll({ where: { projectId: id }, order: [['period_start', 'DESC']] }) : [];
      return res.json({ success: true, data: { project, workers, timesheetCount, totalHours, payrollItems } });
    }
    case 'workers': {
      const { project_id, status: wStatus, worker_type } = req.query;
      const where: any = {};
      if (project_id) where.projectId = project_id;
      if (wStatus) where.status = wStatus;
      if (worker_type) where.workerType = worker_type;
      const data = ProjectWorker ? await ProjectWorker.findAll({ where, order: [['created_at', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    case 'timesheets': {
      const { project_id: pId, employee_id, status: tStatus, date_from, date_to } = req.query;
      const where: any = {};
      if (pId) where.projectId = pId;
      if (employee_id) where.employeeId = employee_id;
      if (tStatus) where.status = tStatus;
      if (date_from && date_to) {
        const { Op } = require('sequelize');
        where.timesheetDate = { [Op.between]: [date_from, date_to] };
      }
      const data = ProjectTimesheet ? await ProjectTimesheet.findAll({ where, order: [['timesheet_date', 'DESC']], limit: 200 }) : [];
      return res.json({ success: true, data });
    }
    case 'payroll': {
      const { project_id: prId, employee_id: eId, status: pStatus } = req.query;
      const where: any = {};
      if (prId) where.projectId = prId;
      if (eId) where.employeeId = eId;
      if (pStatus) where.status = pStatus;
      const data = ProjectPayroll ? await ProjectPayroll.findAll({ where, order: [['period_start', 'DESC']] }) : [];
      return res.json({ success: true, data });
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
      const worker = await ProjectWorker.create(body);
      return res.json({ success: true, data: worker });
    }
    case 'workers-bulk': {
      const { projectId, workers } = body;
      if (!ProjectWorker || !projectId || !workers?.length) return res.json({ success: true });
      const created = [];
      for (const w of workers) {
        try {
          const worker = await ProjectWorker.create({ ...w, projectId });
          created.push(worker);
        } catch(e) { /* duplicate, skip */ }
      }
      return res.json({ success: true, data: created, count: created.length });
    }
    case 'timesheet': {
      if (!ProjectTimesheet) return res.json({ success: true, data: body });
      const ts = await ProjectTimesheet.create(body);
      return res.json({ success: true, data: ts });
    }
    case 'timesheets-bulk': {
      const { entries } = body;
      if (!ProjectTimesheet || !entries?.length) return res.json({ success: true });
      const created = await ProjectTimesheet.bulkCreate(entries);
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
          timesheetDate: { [Op.between]: [periodStart, periodEnd] }
        }
      });
      // Get worker rate
      const worker = await ProjectWorker.findOne({ where: { projectId: prjId, employeeId } });
      const dailyRate = parseFloat(worker?.dailyRate || 0);
      const hourlyRate = parseFloat(worker?.hourlyRate || 0);

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
      const statusUpdate: any = { completionPercent: cp };
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
      await ProjectWorker.update(req.body, { where: { id } });
      return res.json({ success: true, message: 'Worker updated' });
    }
    case 'timesheet': {
      if (!ProjectTimesheet) return res.json({ success: true });
      await ProjectTimesheet.update(req.body, { where: { id } });
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

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';

let HeadcountPlan: any, ManpowerBudget: any, sequelize: any;
try { HeadcountPlan = require('../../../models/HeadcountPlan'); } catch {}
try { ManpowerBudget = require('../../../models/ManpowerBudget'); } catch {}
try { sequelize = require('../../../lib/sequelize'); } catch {}

function toSnakeRow(row: any) {
  if (!row) return row;
  const plain = row?.toJSON ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    tenant_id: plain.tenantId ?? plain.tenant_id ?? null,
    name: plain.name,
    period_start: plain.periodStart ?? plain.period_start,
    period_end: plain.periodEnd ?? plain.period_end,
    department: plain.department,
    branch_id: plain.branchId ?? plain.branch_id ?? null,
    current_headcount: Number(plain.currentHeadcount ?? plain.current_headcount ?? 0),
    planned_headcount: Number(plain.plannedHeadcount ?? plain.planned_headcount ?? 0),
    approved_headcount: plain.approvedHeadcount ?? plain.approved_headcount ?? null,
    budget_amount: Number(plain.budgetAmount ?? plain.budget_amount ?? 0),
    status: plain.status,
    justification: plain.justification,
    approved_by: plain.approvedBy ?? plain.approved_by ?? null,
    approved_at: plain.approvedAt ?? plain.approved_at ?? null,
    details: plain.details ?? [],
    created_by: plain.createdBy ?? plain.created_by ?? null,
    created_at: plain.createdAt ?? plain.created_at,
    updated_at: plain.updatedAt ?? plain.updated_at,
  };
}

function budgetToSnake(row: any) {
  if (!row) return row;
  const plain = row?.toJSON ? row.toJSON() : { ...row };
  const planned = Number(plain.plannedAmount ?? plain.planned_amount ?? 0);
  const actual = Number(plain.actualAmount ?? plain.actual_amount ?? 0);
  return {
    id: plain.id,
    tenant_id: plain.tenantId ?? plain.tenant_id ?? null,
    fiscal_year: Number(plain.fiscalYear ?? plain.fiscal_year ?? 0),
    department: plain.department,
    branch_id: plain.branchId ?? plain.branch_id ?? null,
    budget_category: plain.budgetCategory ?? plain.budget_category ?? 'salary',
    planned_amount: planned,
    actual_amount: actual,
    variance: Number(plain.variance ?? (planned - actual)),
    currency: plain.currency ?? 'IDR',
    status: plain.status ?? 'draft',
    approved_by: plain.approvedBy ?? plain.approved_by ?? null,
    approved_at: plain.approvedAt ?? plain.approved_at ?? null,
    notes: plain.notes ?? '',
    breakdown: plain.breakdown ?? [],
    created_at: plain.createdAt ?? plain.created_at,
    updated_at: plain.updatedAt ?? plain.updated_at,
  };
}

async function attendanceStats(tenantId: string | null) {
  if (!sequelize || !tenantId) return { total: 0, present: 0, late: 0, absent: 0, avgHours: 0 };
  const stats = { total: 0, present: 0, late: 0, absent: 0, avgHours: 0, hoursSum: 0, hoursCount: 0 };

  const queries = [
    `SELECT COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status IN ('present','late','hadir','terlambat','work_from_home')) as present,
            COUNT(*) FILTER (WHERE status IN ('late','terlambat')) as late,
            COUNT(*) FILTER (WHERE status IN ('absent','alpha','tidak_hadir')) as absent,
            COALESCE(
              AVG(work_hours) FILTER (WHERE work_hours IS NOT NULL AND work_hours > 0),
              AVG(EXTRACT(EPOCH FROM (clock_out - clock_in))/3600)
                FILTER (WHERE clock_out IS NOT NULL AND clock_in IS NOT NULL)
            ) as avg_hours
     FROM employee_attendance ea
     WHERE ea.date >= CURRENT_DATE - 30
       AND (
         ea.tenant_id = :tid
         OR ea.employee_id IN (SELECT id FROM employees WHERE tenant_id = :tid)
       )`,
  ];

  for (const sql of queries) {
    try {
      const [rows] = await sequelize.query(sql, { replacements: { tid: tenantId } });
      const r = rows[0] || {};
      stats.total += parseInt(r.total || '0', 10);
      stats.present += parseInt(r.present || '0', 10);
      stats.late += parseInt(r.late || '0', 10);
      stats.absent += parseInt(r.absent || '0', 10);
      const avg = parseFloat(r.avg_hours || '0');
      if (avg > 0) {
        stats.hoursSum += avg;
        stats.hoursCount += 1;
      }
    } catch { /* table may not exist */ }
  }

  stats.avgHours = stats.hoursCount > 0 ? stats.hoursSum / stats.hoursCount : 0;
  return stats;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { method } = req;
  const { action } = req.query;

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action as string, session);
      case 'POST': return handlePost(req, res, action as string);
      case 'PUT': return handlePut(req, res, action as string);
      case 'DELETE': return handleDelete(req, res, action as string);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Workforce Analytics API error:', error?.message || error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const tenantId = tenantIdFromSession(session);

  switch (action) {
    case 'overview': {
      const analytics: any = {
        totalEmployees: 0, activeEmployees: 0, newHires: 0, terminations: 0,
        turnoverRate: 0, absenteeismRate: 0, avgTenure: 0,
        departmentBreakdown: [], monthlyTrend: [],
      };

      if (!tenantId) {
        return res.json({ success: true, data: analytics, dataSource: 'empty' });
      }

      if (sequelize) {
        try {
          const [empCount] = await sequelize.query(`
            SELECT COUNT(*)::int as total,
                   COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL OR is_active = true) as active
            FROM employees
            WHERE tenant_id = :tid
          `, { replacements: { tid: tenantId } });
          analytics.totalEmployees = parseInt(empCount[0]?.total || '0', 10);
          analytics.activeEmployees = parseInt(empCount[0]?.active || '0', 10);

          const [newHires] = await sequelize.query(`
            SELECT COUNT(*)::int as c FROM employees
            WHERE tenant_id = :tid AND created_at >= NOW() - INTERVAL '30 days'
          `, { replacements: { tid: tenantId } });
          analytics.newHires = parseInt(newHires[0]?.c || '0', 10);

          try {
            const [terms] = await sequelize.query(`
              SELECT COUNT(*)::int as c FROM termination_requests
              WHERE status IN ('approved','completed') AND created_at >= NOW() - INTERVAL '30 days'
                AND tenant_id = :tid
            `, { replacements: { tid: tenantId } });
            analytics.terminations = parseInt(terms[0]?.c || '0', 10);
          } catch { analytics.terminations = 0; }

          if (analytics.activeEmployees > 0) {
            analytics.turnoverRate = Number(((analytics.terminations / analytics.activeEmployees) * 100).toFixed(1));
          }

          const [depts] = await sequelize.query(`
            SELECT department, COUNT(*)::int as count FROM employees
            WHERE tenant_id = :tid AND department IS NOT NULL AND department <> ''
            GROUP BY department ORDER BY count DESC LIMIT 10
          `, { replacements: { tid: tenantId } });
          analytics.departmentBreakdown = depts;

          const [trend] = await sequelize.query(`
            SELECT DATE_TRUNC('month', created_at) as month, COUNT(*)::int as hires
            FROM employees
            WHERE tenant_id = :tid AND created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at) ORDER BY month
          `, { replacements: { tid: tenantId } });
          analytics.monthlyTrend = trend;

          const att = await attendanceStats(tenantId);
          if (att.total > 0) {
            analytics.absenteeismRate = Number(((att.absent / att.total) * 100).toFixed(1));
          }
        } catch (e) {
          console.warn('overview query error:', (e as Error).message);
        }
      }
      const hasData = analytics.totalEmployees > 0 || (analytics.departmentBreakdown?.length || 0) > 0;
      return res.json({ success: true, data: analytics, dataSource: hasData ? 'live' : 'empty' });
    }
    case 'headcount-plans': {
      const { status, department } = req.query;
      if (!tenantId || !HeadcountPlan) return res.json({ success: true, data: [] });
      const where: any = { tenantId };
      if (status) where.status = status;
      if (department) where.department = department;
      const rows = await HeadcountPlan.findAll({ where, order: [['created_at', 'DESC']] });
      return res.json({ success: true, data: rows.map(toSnakeRow) });
    }
    case 'budgets': {
      const { fiscal_year, department: dept, category } = req.query;
      if (!tenantId || !ManpowerBudget) return res.json({ success: true, data: [] });
      const where: any = { tenantId };
      if (fiscal_year) where.fiscalYear = fiscal_year;
      if (dept) where.department = dept;
      if (category) where.budgetCategory = category;
      const rows = await ManpowerBudget.findAll({ where, order: [['fiscal_year', 'DESC']] });
      return res.json({ success: true, data: rows.map(budgetToSnake) });
    }
    case 'turnover-analysis': {
      const result: any = { byMonth: [], byDepartment: [], byType: [], avgTenure: 0 };
      if (!tenantId) return res.json({ success: true, data: result });
      if (sequelize) {
        try {
          const [byMonth] = await sequelize.query(`
            SELECT DATE_TRUNC('month', created_at) as month, COUNT(*)::int as count
            FROM termination_requests
            WHERE status IN ('approved','completed')
              AND created_at >= NOW() - INTERVAL '12 months'
              AND tenant_id = :tid
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month
          `, { replacements: { tid: tenantId } });
          result.byMonth = byMonth;

          const [byType] = await sequelize.query(`
            SELECT termination_type, COUNT(*)::int as count
            FROM termination_requests
            WHERE status IN ('approved','completed') AND tenant_id = :tid
            GROUP BY termination_type ORDER BY count DESC
          `, { replacements: { tid: tenantId } });
          result.byType = byType;
        } catch (e) {
          console.warn('turnover query error:', (e as Error).message);
        }
      }
      return res.json({ success: true, data: result });
    }
    case 'productivity': {
      const result: any = { attendanceRate: 0, avgWorkHours: 0, overtimeRate: 0, lateRate: 0 };
      const att = await attendanceStats(tenantId);
      if (att.total > 0) {
        result.attendanceRate = Number(((att.present / att.total) * 100).toFixed(1));
        result.lateRate = Number(((att.late / att.total) * 100).toFixed(1));
      }
      result.avgWorkHours = Number(att.avgHours.toFixed(1));
      return res.json({ success: true, data: result });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string) {
  const body = req.body || {};
  switch (action) {
    case 'headcount-plan': {
      if (!HeadcountPlan) return res.status(503).json({ success: false, error: 'HeadcountPlan model unavailable' });
      if (!body.name?.trim()) return res.status(400).json({ success: false, error: 'Nama rencana wajib diisi' });
      if (!body.periodStart || !body.periodEnd) return res.status(400).json({ success: false, error: 'Periode wajib diisi' });
      const plan = await HeadcountPlan.create({
        name: body.name.trim(),
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        department: body.department || null,
        currentHeadcount: parseInt(body.currentHeadcount, 10) || 0,
        plannedHeadcount: parseInt(body.plannedHeadcount, 10) || 0,
        budgetAmount: parseFloat(body.budgetAmount) || 0,
        justification: body.justification || null,
        status: body.status || 'draft',
      });
      return res.json({ success: true, data: toSnakeRow(plan) });
    }
    case 'budget': {
      if (!ManpowerBudget) return res.status(503).json({ success: false, error: 'ManpowerBudget model unavailable' });
      const planned = parseFloat(body.plannedAmount) || 0;
      const actual = parseFloat(body.actualAmount) || 0;
      const budget = await ManpowerBudget.create({
        fiscalYear: parseInt(body.fiscalYear, 10) || new Date().getFullYear(),
        department: body.department || null,
        budgetCategory: body.budgetCategory || 'salary',
        plannedAmount: planned,
        actualAmount: actual,
        variance: planned - actual,
        notes: body.notes || null,
        status: body.status || 'draft',
      });
      return res.json({ success: true, data: budgetToSnake(budget) });
    }
    case 'approve-plan': {
      const { id } = body;
      if (!HeadcountPlan || !id) return res.status(400).json({ success: false, error: 'ID required' });
      await HeadcountPlan.update({
        status: 'approved',
        approvedHeadcount: body.approvedHeadcount,
        approvedAt: new Date(),
      }, { where: { id } });
      return res.json({ success: true, message: 'Plan approved' });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  switch (action) {
    case 'headcount-plan': {
      if (!HeadcountPlan) return res.status(503).json({ success: false, error: 'HeadcountPlan model unavailable' });
      const body = req.body || {};
      await HeadcountPlan.update({
        name: body.name,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        department: body.department,
        currentHeadcount: parseInt(body.currentHeadcount, 10) || 0,
        plannedHeadcount: parseInt(body.plannedHeadcount, 10) || 0,
        budgetAmount: parseFloat(body.budgetAmount) || 0,
        justification: body.justification,
        status: body.status,
      }, { where: { id } });
      return res.json({ success: true, message: 'Plan updated' });
    }
    case 'budget': {
      if (!ManpowerBudget) return res.status(503).json({ success: false, error: 'ManpowerBudget model unavailable' });
      const body = req.body || {};
      const planned = parseFloat(body.plannedAmount) || 0;
      const actual = parseFloat(body.actualAmount) || 0;
      await ManpowerBudget.update({
        fiscalYear: parseInt(body.fiscalYear, 10) || new Date().getFullYear(),
        department: body.department,
        budgetCategory: body.budgetCategory || 'salary',
        plannedAmount: planned,
        actualAmount: actual,
        variance: planned - actual,
        notes: body.notes,
        status: body.status,
      }, { where: { id } });
      return res.json({ success: true, message: 'Budget updated' });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  const models: any = { 'headcount-plan': HeadcountPlan, budget: ManpowerBudget };
  const model = models[action];
  if (!model) return res.status(400).json({ error: 'Invalid action' });
  const deleted = await model.destroy({ where: { id } });
  if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
  return res.json({ success: true, message: 'Deleted' });
}

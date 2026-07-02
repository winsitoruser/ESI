import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let HeadcountPlan: any, ManpowerBudget: any, sequelize: any;
try { HeadcountPlan = require('../../../../models/HeadcountPlan'); } catch(e) {}
try { ManpowerBudget = require('../../../../models/ManpowerBudget'); } catch(e) {}
try { sequelize = require('../../../../lib/sequelize'); } catch(e) {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { method } = req;
  const { action } = req.query;

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action as string);
      case 'POST': return handlePost(req, res, action as string);
      case 'PUT': return handlePut(req, res, action as string);
      case 'DELETE': return handleDelete(req, res, action as string);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Workforce Analytics API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'overview': {
      // Aggregate analytics from existing tables
      const analytics: any = {
        totalEmployees: 0, activeEmployees: 0, newHires: 0, terminations: 0,
        turnoverRate: 0, absenteeismRate: 0, avgTenure: 0,
        departmentBreakdown: [], monthlyTrend: []
      };

      if (sequelize) {
        try {
          // Total & active employees
          const [empCount] = await sequelize.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL) as active FROM employees`);
          analytics.totalEmployees = parseInt(empCount[0]?.total || '0');
          analytics.activeEmployees = parseInt(empCount[0]?.active || '0');

          // New hires (last 30 days)
          const [newHires] = await sequelize.query(`SELECT COUNT(*) as c FROM employees WHERE created_at >= NOW() - INTERVAL '30 days'`);
          analytics.newHires = parseInt(newHires[0]?.c || '0');

          // Terminations (last 30 days)
          const [terms] = await sequelize.query(`SELECT COUNT(*) as c FROM termination_requests WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'`);
          analytics.terminations = parseInt(terms[0]?.c || '0');

          // Turnover rate
          if (analytics.activeEmployees > 0) {
            analytics.turnoverRate = ((analytics.terminations / analytics.activeEmployees) * 100).toFixed(1);
          }

          // Department breakdown
          const [depts] = await sequelize.query(`SELECT department, COUNT(*) as count FROM employees WHERE department IS NOT NULL GROUP BY department ORDER BY count DESC LIMIT 10`);
          analytics.departmentBreakdown = depts;

          // Monthly headcount trend (last 12 months)
          const [trend] = await sequelize.query(`
            SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as hires
            FROM employees WHERE created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at) ORDER BY month
          `);
          analytics.monthlyTrend = trend;

          // Absenteeism rate (last 30 days)
          const [absent] = await sequelize.query(`
            SELECT COUNT(*) FILTER (WHERE status IN ('absent', 'alpha')) as absent_days,
                   COUNT(*) as total_records
            FROM employee_attendance WHERE date >= CURRENT_DATE - 30
          `);
          if (parseInt(absent[0]?.total_records || '0') > 0) {
            analytics.absenteeismRate = ((parseInt(absent[0]?.absent_days || '0') / parseInt(absent[0]?.total_records)) * 100).toFixed(1);
          }
        } catch (e) { /* tables may not exist yet */ }
      }
      return res.json({ success: true, data: analytics });
    }
    case 'headcount-plans': {
      const { status, department } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (department) where.department = department;
      const data = HeadcountPlan ? await HeadcountPlan.findAll({ where, order: [['created_at', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    case 'budgets': {
      const { fiscal_year, department: dept, category } = req.query;
      const where: any = {};
      if (fiscal_year) where.fiscalYear = fiscal_year;
      if (dept) where.department = dept;
      if (category) where.budgetCategory = category;
      const data = ManpowerBudget ? await ManpowerBudget.findAll({ where, order: [['fiscal_year', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    case 'turnover-analysis': {
      const result: any = { byMonth: [], byDepartment: [], byType: [], avgTenure: 0 };
      if (sequelize) {
        try {
          const [byMonth] = await sequelize.query(`
            SELECT DATE_TRUNC('month', created_at) as month,
                   termination_type, COUNT(*) as count
            FROM termination_requests WHERE status IN ('approved','completed')
            AND created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at), termination_type ORDER BY month
          `);
          result.byMonth = byMonth;

          const [byType] = await sequelize.query(`
            SELECT termination_type, COUNT(*) as count
            FROM termination_requests WHERE status IN ('approved','completed')
            GROUP BY termination_type ORDER BY count DESC
          `);
          result.byType = byType;
        } catch(e) {}
      }
      return res.json({ success: true, data: result });
    }
    case 'productivity': {
      const result: any = { attendanceRate: 0, avgWorkHours: 0, overtimeRate: 0, lateRate: 0 };
      if (sequelize) {
        try {
          const [att] = await sequelize.query(`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'present' OR status = 'late') as present,
              COUNT(*) FILTER (WHERE status = 'late') as late,
              AVG(EXTRACT(EPOCH FROM (clock_out - clock_in))/3600) FILTER (WHERE clock_out IS NOT NULL) as avg_hours
            FROM employee_attendance WHERE date >= CURRENT_DATE - 30
          `);
          const total = parseInt(att[0]?.total || '0');
          if (total > 0) {
            result.attendanceRate = ((parseInt(att[0]?.present || '0') / total) * 100).toFixed(1);
            result.lateRate = ((parseInt(att[0]?.late || '0') / total) * 100).toFixed(1);
          }
          result.avgWorkHours = parseFloat(att[0]?.avg_hours || '0').toFixed(1);
        } catch(e) {}
      }
      return res.json({ success: true, data: result });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string) {
  const body = req.body;
  switch (action) {
    case 'headcount-plan': {
      if (!HeadcountPlan) return res.json({ success: true, data: body, message: 'Created (mock)' });
      const plan = await HeadcountPlan.create(body);
      return res.json({ success: true, data: plan });
    }
    case 'budget': {
      if (!ManpowerBudget) return res.json({ success: true, data: body, message: 'Created (mock)' });
      body.variance = (parseFloat(body.plannedAmount || 0) - parseFloat(body.actualAmount || 0));
      const budget = await ManpowerBudget.create(body);
      return res.json({ success: true, data: budget });
    }
    case 'approve-plan': {
      const { id } = body;
      if (!HeadcountPlan || !id) return res.json({ success: true });
      await HeadcountPlan.update({
        status: 'approved', approvedHeadcount: body.approvedHeadcount, approvedAt: new Date()
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
      if (!HeadcountPlan) return res.json({ success: true });
      await HeadcountPlan.update(req.body, { where: { id } });
      return res.json({ success: true, message: 'Plan updated' });
    }
    case 'budget': {
      if (!ManpowerBudget) return res.json({ success: true });
      const body = req.body;
      body.variance = (parseFloat(body.plannedAmount || 0) - parseFloat(body.actualAmount || 0));
      await ManpowerBudget.update(body, { where: { id } });
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
  await model.destroy({ where: { id } });
  return res.json({ success: true, message: 'Deleted' });
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { buildNineBoxFromReviews, getNineBoxSummary, getMockNineBox } from '@/lib/hris/nine-box-matrix';
import { allowHrMockFallback } from '@/lib/hris/data-source';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);
  let dataSource: 'live' | 'demo' = 'live';

  try {
    if (!sequelize) {
      if (allowHrMockFallback()) {
        const mock = getMockNineBox();
        return res.json({ success: true, data: { employees: mock, summary: getNineBoxSummary(mock) }, dataSource: 'demo' });
      }
      return res.json({ success: true, data: { employees: [], summary: getNineBoxSummary([]) }, dataSource: 'empty' });
    }

    const [reviews] = await sequelize.query(`
      SELECT pr.employee_id as "employeeId",
        e.name as "employeeName",
        e.department,
        e.position,
        pr.overall_score as "overallRating",
        pr.period as "reviewPeriod"
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      WHERE pr.status = 'completed' AND pr.overall_score IS NOT NULL
        AND (pr.period LIKE :period || '%' OR pr.period IS NULL)
      ORDER BY pr.overall_score DESC
      LIMIT 100
    `, { replacements: { period } });

    if (!reviews?.length) {
      // Fallback: use KPI data when no performance reviews
      const [kpiRows] = await sequelize.query(`
        SELECT e.id as "employeeId", e.name as "employeeName", e.department, e.position,
          ROUND(AVG(CASE WHEN ek.target > 0 THEN ek.actual/ek.target*100 ELSE 70 END)::numeric, 0) as achievement
        FROM employees e
        LEFT JOIN employee_kpis ek ON ek.employee_id = e.id AND ek.period = :period
        WHERE e.is_active = true OR e.status = 'active' OR e.status IS NULL
        GROUP BY e.id, e.name, e.department, e.position
        LIMIT 50
      `, { replacements: { period } });

      if (kpiRows?.length) {
        const syntheticReviews = kpiRows.map((r: any) => ({
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          department: r.department,
          position: r.position,
          overallRating: Math.min(5, Math.max(1, (r.achievement || 70) / 20)),
          reviewPeriod: period,
        }));
        const kpiData = kpiRows.map((r: any) => ({ employeeId: r.employeeId, achievement: r.achievement || 70 }));
        const employees = buildNineBoxFromReviews(syntheticReviews, kpiData);
        return res.json({ success: true, data: { employees, summary: getNineBoxSummary(employees) }, dataSource: 'live' });
      }

      if (allowHrMockFallback()) {
        const mock = getMockNineBox();
        return res.json({ success: true, data: { employees: mock, summary: getNineBoxSummary(mock) }, dataSource: 'demo' });
      }
      return res.json({ success: true, data: { employees: [], summary: getNineBoxSummary([]) }, dataSource: 'empty' });
    }

    const employeeIds = reviews.map((r: any) => r.employeeId);
    const [kpiRows] = await sequelize.query(`
      SELECT employee_id, ROUND(AVG(CASE WHEN target > 0 THEN actual/target*100 ELSE 0 END)::numeric, 0) as achievement
      FROM employee_kpis WHERE employee_id = ANY(:ids) AND period = :period
      GROUP BY employee_id
    `, { replacements: { ids: employeeIds, period } });

    const kpiData = (kpiRows || []).map((k: any) => ({ employeeId: k.employee_id, achievement: parseFloat(k.achievement) || 70 }));
    const employees = buildNineBoxFromReviews(reviews, kpiData);
    const summary = getNineBoxSummary(employees);

    return res.json({ success: true, data: { employees, summary }, dataSource });
  } catch (error: any) {
    if (allowHrMockFallback()) {
      const mock = getMockNineBox();
      return res.json({ success: true, data: { employees: mock, summary: getNineBoxSummary(mock) }, dataSource: 'demo', warning: error?.message });
    }
    return res.json({ success: true, data: { employees: [], summary: getNineBoxSummary([]) }, dataSource: 'empty', warning: error?.message });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { buildNineBoxFromReviews, getNineBoxSummary, getMockNineBox } from '@/lib/hris/nine-box-matrix';
import { allowHrMockFallback } from '@/lib/hris/data-source';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

const emptyPayload = () => ({
  employees: [],
  summary: getNineBoxSummary([]),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const tenantId = tenantIdFromSession(session);
  const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);

  if (!tenantId) {
    if (allowHrMockFallback()) {
      const mock = getMockNineBox();
      return res.json({ success: true, data: { employees: mock, summary: getNineBoxSummary(mock) }, dataSource: 'demo' });
    }
    return res.json({ success: true, data: emptyPayload(), dataSource: 'empty' });
  }

  try {
    if (!sequelize) {
      if (allowHrMockFallback()) {
        const mock = getMockNineBox();
        return res.json({ success: true, data: { employees: mock, summary: getNineBoxSummary(mock) }, dataSource: 'demo' });
      }
      return res.json({ success: true, data: emptyPayload(), dataSource: 'empty' });
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
        AND e.tenant_id = :tenantId
        AND (pr.period LIKE :period || '%' OR pr.period IS NULL)
      ORDER BY pr.overall_score DESC
      LIMIT 100
    `, { replacements: { period, tenantId } });

    if (!reviews?.length) {
      // Fallback: use KPI data when no performance reviews (tenant-scoped only)
      const [kpiRows] = await sequelize.query(`
        SELECT e.id as "employeeId", e.name as "employeeName", e.department, e.position,
          ROUND(AVG(CASE WHEN ek.target > 0 THEN ek.actual/ek.target*100 ELSE 70 END)::numeric, 0) as achievement
        FROM employees e
        LEFT JOIN employee_kpis ek ON ek.employee_id = e.id AND ek.period = :period
        WHERE e.tenant_id = :tenantId
          AND (e.is_active = true OR LOWER(COALESCE(e.status, 'active')) = 'active')
        GROUP BY e.id, e.name, e.department, e.position
        LIMIT 50
      `, { replacements: { period, tenantId } });

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
      return res.json({ success: true, data: emptyPayload(), dataSource: 'empty' });
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

    return res.json({ success: true, data: { employees, summary }, dataSource: 'live' });
  } catch (error: any) {
    if (allowHrMockFallback()) {
      const mock = getMockNineBox();
      return res.json({ success: true, data: { employees: mock, summary: getNineBoxSummary(mock) }, dataSource: 'demo', warning: error?.message });
    }
    return res.json({ success: true, data: emptyPayload(), dataSource: 'empty', warning: error?.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });

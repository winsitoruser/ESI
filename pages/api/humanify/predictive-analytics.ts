/**
 * Predictive HR Analytics API
 * GET ?action=overview|attrition|absenteeism|headcount
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  computeAttritionRisk,
  forecastAbsenteeism,
  forecastHeadcount,
  forecastLeaveDemand,
  buildPredictiveInsights,
  type PredictiveOverview,
} from '@/lib/hris/predictive-analytics';
import { allowHrMockFallback } from '@/lib/hris/data-source';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function safeQuery(sql: string, replacements: Record<string, unknown> = {}) {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows || [];
  } catch {
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);
  const action = (req.query.action as string) || 'overview';
  const tenantId = (session.user as any)?.tenantId || null;
  const tf = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const r = { tenantId, period };

  let dataSource: PredictiveOverview['dataSource'] = 'live';

  if (action === 'attrition' || action === 'overview') {
    const employees = await safeQuery(`
      SELECT e.id, e.name, e.department, e.position, e.join_date, e.created_at, e.status
      FROM employees e
      WHERE (e.is_active = true OR e.status = 'active' OR e.status IS NULL) ${tf}
      LIMIT 200
    `, r);

    const attSignals = await safeQuery(`
      SELECT employee_id,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::int as late,
        COUNT(*) FILTER (WHERE status IN ('absent','alpha','tidak_hadir'))::int as absent
      FROM employee_attendance
      WHERE date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY employee_id
    `, r);

    const kpiSignals = await safeQuery(`
      SELECT employee_id,
        ROUND(AVG(CASE WHEN target > 0 THEN actual/target*100 ELSE 0 END)::numeric, 1) as achievement
      FROM employee_kpis WHERE period = :period GROUP BY employee_id
    `, r);

    const disciplinarySignals = await safeQuery(`
      SELECT employee_id, COUNT(*)::int AS cnt
      FROM disciplinary_letters
      WHERE status IN ('issued', 'active') AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY employee_id
    `, r);

    const perfSignals = await safeQuery(`
      SELECT employee_id, ROUND(AVG(overall_rating)::numeric, 1) AS avg_rating
      FROM performance_reviews
      WHERE status IN ('submitted', 'reviewed', 'acknowledged')
      GROUP BY employee_id
    `, r);

    const [engRow] = await safeQuery(`
      SELECT ROUND(AVG((elem->>'answer')::numeric), 1) AS score
      FROM survey_responses sr
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(sr.answers) = 'array' THEN sr.answers ELSE '[]'::jsonb END
      ) AS elem
      WHERE (elem->>'answer') ~ '^[0-9]+\\.?[0-9]*$'
        AND sr.submitted_at >= CURRENT_DATE - INTERVAL '6 months'
    `, r);

    const attMap = new Map(attSignals.map((a: any) => [String(a.employee_id), a]));
    const kpiMap = new Map(kpiSignals.map((k: any) => [String(k.employee_id), parseFloat(k.achievement)]));
    const discMap = new Map(disciplinarySignals.map((d: any) => [String(d.employee_id), d.cnt > 0]));
    const perfMap = new Map(perfSignals.map((p: any) => [String(p.employee_id), parseFloat(p.avg_rating)]));

    const risks = employees.map((e: any) => {
      const att = attMap.get(String(e.id)) || {};
      const perfRating = perfMap.get(String(e.id));
      const kpiAchievement = kpiMap.get(String(e.id)) ?? (perfRating ? perfRating * 20 : 85);
      return computeAttritionRisk(e, {
        lateCount: att.late || 0,
        absentCount: att.absent || 0,
        attendanceTotal: att.total || 0,
        kpiAchievement,
        hasDisciplinary: discMap.get(String(e.id)) || false,
        monthsSincePromotion: 18,
      });
    }).sort((a: any, b: any) => b.riskScore - a.riskScore);

    if (employees.length === 0) {
      dataSource = allowHrMockFallback() ? 'demo' : 'partial';
    }

    if (action === 'attrition') {
      return res.json({ success: true, data: risks, dataSource });
    }

    const monthlyRates = await safeQuery(`
      SELECT TO_CHAR(date, 'YYYY-MM') as month,
        ROUND(COUNT(*) FILTER (WHERE status IN ('absent','alpha'))::numeric / NULLIF(COUNT(*),0) * 100, 1) as rate
      FROM employee_attendance
      WHERE date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM') ORDER BY month
    `, r);

    const absenteeism = forecastAbsenteeism(
      monthlyRates.map((m: any) => ({ month: m.month, rate: parseFloat(m.rate) || 0 })),
      period,
    );

    const hires = await safeQuery(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*)::int as c
      FROM employees WHERE created_at >= NOW() - INTERVAL '6 months' ${tf.replace('e.', '')}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    `, r);

    const exits = await safeQuery(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*)::int as c
      FROM termination_requests WHERE status IN ('approved','completed') AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    `, r);

    const headcount = forecastHeadcount(
      employees.length,
      hires.map((h: any) => h.c),
      exits.map((e: any) => e.c),
    );

    const leaveMonthly = await safeQuery(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*)::int as count
      FROM leave_requests
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month
    `, r);

    const leaveForecast = forecastLeaveDemand(
      leaveMonthly.map((m: any) => ({ month: m.month, count: m.count })),
      period,
    );

    const overview: PredictiveOverview = {
      attritionRisk: {
        highRiskCount: risks.filter((r: any) => r.riskLevel === 'high').length,
        criticalCount: risks.filter((r: any) => r.riskLevel === 'critical').length,
        avgRiskScore: risks.length ? Math.round(risks.reduce((s: number, r: any) => s + r.riskScore, 0) / risks.length) : 0,
        topRisks: risks.slice(0, 10),
      },
      absenteeism,
      headcount,
      leaveForecast,
      insights: buildPredictiveInsights(risks, absenteeism, headcount),
      engagementScore: engRow?.score ? parseFloat(engRow.score) : null,
      generatedAt: new Date().toISOString(),
      dataSource: employees.length > 0 ? dataSource : (allowHrMockFallback() ? 'demo' : 'partial'),
    };

    return res.json({ success: true, data: overview, dataSource: overview.dataSource });
  }

  if (action === 'absenteeism') {
    const monthlyRates = await safeQuery(`
      SELECT TO_CHAR(date, 'YYYY-MM') as month,
        ROUND(COUNT(*) FILTER (WHERE status IN ('absent','alpha'))::numeric / NULLIF(COUNT(*),0) * 100, 1) as rate
      FROM employee_attendance WHERE date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM') ORDER BY month
    `, r);
    return res.json({
      success: true,
      data: forecastAbsenteeism(monthlyRates.map((m: any) => ({ month: m.month, rate: parseFloat(m.rate) || 0 })), period),
    });
  }

  if (action === 'headcount') {
    const [count] = await safeQuery(`SELECT COUNT(*)::int as c FROM employees e WHERE 1=1 ${tf}`, r);
    const hires = await safeQuery(`SELECT COUNT(*)::int as c FROM employees WHERE created_at >= NOW() - INTERVAL '30 days'`, r);
    const exits = await safeQuery(`SELECT COUNT(*)::int as c FROM termination_requests WHERE status IN ('approved','completed') AND created_at >= NOW() - INTERVAL '30 days'`, r);
    return res.json({
      success: true,
      data: forecastHeadcount(count?.c || 0, [hires[0]?.c || 0], [exits[0]?.c || 0]),
    });
  }

  if (action === 'leave') {
    const leaveMonthly = await safeQuery(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*)::int as count
      FROM leave_requests
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month
    `, r);
    return res.json({
      success: true,
      data: forecastLeaveDemand(
        leaveMonthly.map((m: any) => ({ month: m.month, count: m.count })),
        period,
      ),
    });
  }

  return res.status(400).json({ success: false, error: 'Invalid action' });
}

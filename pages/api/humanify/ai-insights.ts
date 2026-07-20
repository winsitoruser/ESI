/**
 * Humanify AI Insights API — SumoPod-backed HR advisor
 * GET ?module=recruitment|attendance|kpi|...&batch=true
 * POST { module, context }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  generateAIInsights,
  generateModuleInsightsBatchAsync,
  type HRModule,
} from '@/lib/hris/ai-service';
import { getSumopodConfig } from '@/lib/hris/sumopod-config';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

const VALID_MODULES: HRModule[] = [
  'recruitment', 'attendance', 'kpi', 'performance', 'payroll',
  'reimbursement', 'leave', 'engagement', 'workforce', 'general',
];

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function gatherContext(
  module: HRModule,
  period: string,
  tenantId: string | null,
): Promise<Record<string, unknown>> {
  if (!sequelize || !tenantId) return {};
  const r = { period, tenantId };
  const tf = 'AND tenant_id = :tenantId';

  try {
    if (module === 'recruitment') {
      const [rows] = await sequelize.query(`
        SELECT
          (SELECT COUNT(*)::int FROM hris_candidates WHERE tenant_id = :tenantId) as total_candidates,
          (SELECT COUNT(*)::int FROM hris_candidates WHERE current_stage = 'hired' AND tenant_id = :tenantId) as hired,
          (SELECT COUNT(*)::int FROM hris_job_openings WHERE status = 'open' AND tenant_id = :tenantId) as open_positions
      `, { replacements: r });
      return rows[0] || {};
    }
    if (module === 'attendance') {
      const [rows] = await sequelize.query(`
        SELECT
          ROUND(COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home'))::numeric / NULLIF(COUNT(*),0) * 100, 1) as attendance_rate,
          ROUND(COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::numeric / NULLIF(COUNT(*),0) * 100, 1) as late_rate
        FROM employee_attendance
        WHERE TO_CHAR(date, 'YYYY-MM') = :period ${tf}
      `, { replacements: r });
      const d = rows[0] || {};
      return { attendanceRate: d.attendance_rate, lateRate: d.late_rate };
    }
    if (module === 'kpi') {
      const [rows] = await sequelize.query(`
        SELECT
          ROUND(AVG(CASE WHEN ek.target > 0 THEN ek.actual/ek.target*100 ELSE 0 END)::numeric, 1) as avg_achievement,
          COUNT(*) FILTER (WHERE ek.target > 0 AND ek.actual/ek.target >= 0.7 AND ek.actual/ek.target < 1)::int as at_risk,
          COUNT(*) FILTER (WHERE ek.target > 0 AND ek.actual/ek.target < 0.7)::int as off_track
        FROM employee_kpis ek
        JOIN employees e ON ek.employee_id = e.id
        WHERE ek.period = :period AND e.tenant_id = :tenantId
      `, { replacements: r });
      const d = rows[0] || {};
      return { avgAchievement: d.avg_achievement, atRisk: d.at_risk, offTrack: d.off_track };
    }
    if (module === 'reimbursement') {
      const [rows] = await sequelize.query(`
        SELECT COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::float as pending_amount
        FROM employee_claims WHERE tenant_id = :tenantId
      `, { replacements: r });
      const d = rows[0] || {};
      return { pending: d.pending, pendingAmount: d.pending_amount };
    }
    if (module === 'workforce') {
      const [rows] = await sequelize.query(`
        SELECT COUNT(*)::int as total FROM employees
        WHERE (is_active = true OR status = 'active' OR status IS NULL) AND tenant_id = :tenantId
      `, { replacements: r });
      const [hires] = await sequelize.query(
        `SELECT COUNT(*)::int as c FROM employees WHERE created_at >= NOW() - INTERVAL '30 days' AND tenant_id = :tenantId`,
        { replacements: r },
      );
      const [terms] = await sequelize.query(
        `SELECT COUNT(*)::int as c FROM termination_requests
         WHERE status IN ('approved','completed') AND created_at >= NOW() - INTERVAL '30 days' AND tenant_id = :tenantId`,
        { replacements: r },
      );
      const active = rows[0]?.total || 1;
      return {
        totalEmployees: active,
        newHires: hires[0]?.c || 0,
        turnoverRate: Math.round(((terms[0]?.c || 0) / active) * 100),
      };
    }
  } catch { /* partial context */ }

  return {};
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);
  const tenantId = tenantIdFromSession(session);
  const sumopod = getSumopodConfig();

  if (req.method === 'GET') {
    const batch = req.query.batch === 'true';
    const module = req.query.module as HRModule;

    if (batch) {
      const modules: HRModule[] = ['recruitment', 'attendance', 'kpi', 'reimbursement', 'workforce'];
      const contexts = await Promise.all(
        modules.map(async (m) => ({ module: m, context: await gatherContext(m, period, tenantId) })),
      );
      const result = await generateModuleInsightsBatchAsync(contexts);
      return res.json({
        success: true,
        data: result.insights,
        source: result.source,
        count: result.insights.length,
        llmEnabled: sumopod.llmEnabled,
        llmModel: sumopod.chatModel,
      });
    }

    if (!module || !VALID_MODULES.includes(module)) {
      return res.status(400).json({ success: false, error: 'Invalid module', validModules: VALID_MODULES });
    }

    const context = req.query.context
      ? JSON.parse(req.query.context as string)
      : await gatherContext(module, period, tenantId);

    const result = await generateAIInsights({ module, context });
    return res.json({
      success: true,
      ...result,
      llmEnabled: sumopod.llmEnabled,
      llmModel: sumopod.chatModel,
    });
  }

  if (req.method === 'POST') {
    const { module, context } = req.body || {};
    if (!module || !VALID_MODULES.includes(module)) {
      return res.status(400).json({ success: false, error: 'Invalid module' });
    }
    const result = await generateAIInsights({ module, context: context || {} });
    return res.json({
      success: true,
      ...result,
      llmEnabled: sumopod.llmEnabled,
      llmModel: sumopod.chatModel,
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withHQAuth(handler, { module: 'hris' });

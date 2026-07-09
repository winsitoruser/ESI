/**
 * Humanify AI Insights API
 * GET ?module=recruitment|attendance|kpi|...&batch=true
 * POST { module, context }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { generateAIInsights, generateModuleInsightsBatch, type HRModule } from '@/lib/hris/ai-service';

const VALID_MODULES: HRModule[] = [
  'recruitment', 'attendance', 'kpi', 'performance', 'payroll',
  'reimbursement', 'leave', 'engagement', 'workforce', 'general',
];

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function gatherContext(module: HRModule, period: string): Promise<Record<string, unknown>> {
  if (!sequelize) return {};
  const r = { period };

  try {
    if (module === 'recruitment') {
      const [rows] = await sequelize.query(`
        SELECT
          (SELECT COUNT(*)::int FROM hris_candidates) as total_candidates,
          (SELECT COUNT(*)::int FROM hris_candidates WHERE current_stage = 'hired') as hired,
          (SELECT COUNT(*)::int FROM hris_job_openings WHERE status = 'open') as open_positions
      `);
      return rows[0] || {};
    }
    if (module === 'attendance') {
      const [rows] = await sequelize.query(`
        SELECT
          ROUND(COUNT(*) FILTER (WHERE status IN ('present','late','work_from_home'))::numeric / NULLIF(COUNT(*),0) * 100, 1) as attendance_rate,
          ROUND(COUNT(*) FILTER (WHERE status IN ('late','terlambat'))::numeric / NULLIF(COUNT(*),0) * 100, 1) as late_rate
        FROM employee_attendance WHERE TO_CHAR(date, 'YYYY-MM') = :period
      `, { replacements: r });
      return rows[0] || {};
    }
    if (module === 'kpi') {
      const [rows] = await sequelize.query(`
        SELECT
          ROUND(AVG(CASE WHEN target > 0 THEN actual/target*100 ELSE 0 END)::numeric, 1) as avg_achievement,
          COUNT(*) FILTER (WHERE target > 0 AND actual/target >= 0.7 AND actual/target < 1)::int as at_risk,
          COUNT(*) FILTER (WHERE target > 0 AND actual/target < 0.7)::int as off_track
        FROM employee_kpis WHERE period = :period
      `, { replacements: r });
      const d = rows[0] || {};
      return { avgAchievement: d.avg_achievement, atRisk: d.at_risk, offTrack: d.off_track };
    }
    if (module === 'reimbursement') {
      const [rows] = await sequelize.query(`
        SELECT COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::float as pending_amount
        FROM employee_claims
      `);
      return rows[0] || {};
    }
    if (module === 'workforce') {
      const [rows] = await sequelize.query(`
        SELECT COUNT(*)::int as total FROM employees WHERE is_active = true
      `);
      const [hires] = await sequelize.query(`SELECT COUNT(*)::int as c FROM employees WHERE created_at >= NOW() - INTERVAL '30 days'`);
      const [terms] = await sequelize.query(`SELECT COUNT(*)::int as c FROM termination_requests WHERE status IN ('approved','completed') AND created_at >= NOW() - INTERVAL '30 days'`);
      const active = rows[0]?.total || 1;
      return { totalEmployees: active, newHires: hires[0]?.c || 0, turnoverRate: Math.round(((terms[0]?.c || 0) / active) * 100) };
    }
  } catch { /* partial context */ }

  return {};
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);

  if (req.method === 'GET') {
    const batch = req.query.batch === 'true';
    const module = req.query.module as HRModule;

    if (batch) {
      const modules: HRModule[] = ['recruitment', 'attendance', 'kpi', 'reimbursement', 'workforce'];
      const contexts = await Promise.all(modules.map(async m => ({ module: m, context: await gatherContext(m, period) })));
      const insights = generateModuleInsightsBatch(contexts);
      return res.json({ success: true, data: insights, source: 'rules', count: insights.length });
    }

    if (!module || !VALID_MODULES.includes(module)) {
      return res.status(400).json({ success: false, error: 'Invalid module', validModules: VALID_MODULES });
    }

    const context = req.query.context
      ? JSON.parse(req.query.context as string)
      : await gatherContext(module, period);

    const result = await generateAIInsights({ module, context });
    return res.json({ success: true, ...result });
  }

  if (req.method === 'POST') {
    const { module, context } = req.body || {};
    if (!module || !VALID_MODULES.includes(module)) {
      return res.status(400).json({ success: false, error: 'Invalid module' });
    }
    const result = await generateAIInsights({ module, context: context || {} });
    return res.json({ success: true, ...result });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

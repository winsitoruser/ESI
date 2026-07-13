/**
 * Humanify AI Hub API — copilot, automation rules, dashboard
 * GET  ?action=dashboard|automation-rules|automation-logs|insights
 * POST ?action=chat|automation-execute|automation-scan|toggle-rule
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import {
  listRules, listLogs, executeRule, scanAllRules, getAutomationDashboard, ensureDefaultRules,
} from '@/lib/hris/hr-automation';
import { chatWithCopilot, saveConversation } from '@/lib/hris/ai-copilot';
import { generateModuleInsightsBatchAsync } from '@/lib/hris/ai-service';
import { getSumopodConfig } from '@/lib/hris/sumopod-config';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function asUuid(v: unknown): string | null {
  const s = v != null ? String(v) : '';
  return UUID_RE.test(s) ? s : null;
}

async function gatherBatchContext(period: string) {
  const modules = ['recruitment', 'attendance', 'kpi', 'reimbursement', 'workforce'] as const;
  const contexts = await Promise.all(modules.map(async (module) => {
    let context: Record<string, unknown> = {};
    try {
      if (module === 'recruitment') {
        const [rows] = await sequelize.query(`SELECT (SELECT COUNT(*)::int FROM hris_candidates) AS total_candidates, (SELECT COUNT(*)::int FROM hris_job_openings WHERE status = 'open') AS open_positions`);
        context = rows[0] || {};
      } else if (module === 'attendance') {
        const [rows] = await sequelize.query(`SELECT ROUND(COUNT(*) FILTER (WHERE status IN ('present','late'))::numeric / NULLIF(COUNT(*),0) * 100, 1) AS attendance_rate FROM employee_attendance WHERE TO_CHAR(date, 'YYYY-MM') = :period`, { replacements: { period } });
        context = rows[0] || {};
      } else if (module === 'kpi') {
        const [rows] = await sequelize.query(`SELECT ROUND(AVG(CASE WHEN target > 0 THEN actual/target*100 ELSE 0 END)::numeric, 1) AS avg_achievement FROM employee_kpis WHERE period = :period`, { replacements: { period } });
        context = rows[0] || {};
      } else if (module === 'reimbursement') {
        const [rows] = await sequelize.query(`SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending FROM employee_claims`);
        context = rows[0] || {};
      } else if (module === 'workforce') {
        const [rows] = await sequelize.query(`SELECT COUNT(*)::int AS total FROM employees WHERE is_active = true`);
        context = rows[0] || {};
      }
    } catch { /* partial */ }
    return { module, context };
  }));
  return contexts;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;
    const userId = asUuid((session.user as any).id);
    const { action } = req.query;
    const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);

    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const dash = await getAutomationDashboard(tenantId);
        const contexts = sequelize ? await gatherBatchContext(period) : [];
        const insights = contexts.length
          ? await generateModuleInsightsBatchAsync(contexts as any)
          : { insights: [], source: 'rules' as const };
        const sumo = getSumopodConfig();
        return res.json({
          success: true,
          data: {
            ...dash,
            insights: insights.insights,
            insightSource: insights.source,
            llmEnabled: sumo.llmEnabled,
            llmModel: sumo.chatModel,
          },
        });
      }

      if (action === 'automation-rules') {
        await ensureDefaultRules(tenantId);
        const rules = await listRules(tenantId);
        return res.json({ success: true, data: rules });
      }

      if (action === 'automation-logs') {
        const logs = await listLogs(tenantId);
        return res.json({ success: true, data: logs });
      }

      if (action === 'insights') {
        const contexts = sequelize ? await gatherBatchContext(period) : [];
        const result = await generateModuleInsightsBatchAsync(contexts as any);
        return res.json({ success: true, ...result, count: result.insights.length });
      }

      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'chat') {
        const { message, history } = req.body || {};
        if (!message?.trim()) return res.status(400).json({ success: false, error: 'message required' });
        await saveConversation({ tenantId, userId, role: 'user', message, source: 'user' });
        const result = await chatWithCopilot({ message, tenantId, userId, history });
        await saveConversation({
          tenantId, userId, role: 'assistant', message: result.reply,
          module: result.module, source: result.source,
        });
        return res.json({ success: true, data: result });
      }

      if (action === 'automation-execute') {
        const { rule_id } = req.body || {};
        if (!rule_id) return res.status(400).json({ success: false, error: 'rule_id required' });
        const result = await executeRule(rule_id, tenantId);
        return res.json({ success: true, data: result });
      }

      if (action === 'automation-scan') {
        const result = await scanAllRules(tenantId);
        return res.json({ success: true, data: result });
      }

      if (action === 'toggle-rule') {
        const { rule_id, is_active } = req.body || {};
        if (!rule_id || !sequelize) return res.status(400).json({ success: false, error: 'rule_id required' });
        await sequelize.query(
          `UPDATE hris_automation_rules SET is_active = :active, updated_at = NOW() WHERE id = :id AND tenant_id IS NOT DISTINCT FROM :tid`,
          { replacements: { active: !!is_active, id: rule_id, tid: tenantId } },
        );
        return res.json({ success: true });
      }

      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[AI Hub]', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
}

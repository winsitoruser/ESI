/**
 * Humanify AI Hub API — copilot, automation rules, dashboard
 * GET  ?action=dashboard|automation-rules|automation-logs|automation-alerts|insights
 * POST ?action=chat|automation-execute|automation-scan|toggle-rule|mark-alerts-read
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  listRules, listLogs, listAlerts, markAlertsRead, executeRule, scanAllRules,
  getAutomationDashboard, ensureDefaultRules,
} from '@/lib/hris/hr-automation';
import { chatWithCopilot, saveConversation } from '@/lib/hris/ai-copilot';
import { generateModuleInsightsBatchAsync } from '@/lib/hris/ai-service';
import { getSumopodConfig } from '@/lib/hris/sumopod-config';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function asUuid(v: unknown): string | null {
  const s = v != null ? String(v) : '';
  return UUID_RE.test(s) ? s : null;
}

async function gatherBatchContext(period: string, tenantId: string | null) {
  if (!sequelize || !tenantId) return [];
  const modules = ['recruitment', 'attendance', 'kpi', 'reimbursement', 'workforce'] as const;
  const tid = { tid: tenantId, period };
  const contexts = await Promise.all(modules.map(async (module) => {
    let context: Record<string, unknown> = {};
    try {
      if (module === 'recruitment') {
        const [rows] = await sequelize.query(
          `SELECT
             (SELECT COUNT(*)::int FROM hris_candidates WHERE tenant_id = :tid) AS total_candidates,
             (SELECT COUNT(*)::int FROM hris_job_openings WHERE status = 'open' AND tenant_id = :tid) AS open_positions`,
          { replacements: tid },
        );
        context = rows[0] || {};
      } else if (module === 'attendance') {
        const [rows] = await sequelize.query(
          `SELECT ROUND(
             COUNT(*) FILTER (WHERE ea.status IN ('present','late'))::numeric
             / NULLIF(COUNT(*),0) * 100, 1
           ) AS attendance_rate
           FROM employee_attendance ea
           JOIN employees e ON e.id = ea.employee_id
           WHERE e.tenant_id = :tid AND TO_CHAR(ea.date, 'YYYY-MM') = :period`,
          { replacements: tid },
        );
        context = rows[0] || {};
      } else if (module === 'kpi') {
        const [rows] = await sequelize.query(
          `SELECT ROUND(AVG(CASE WHEN ek.target > 0 THEN ek.actual/ek.target*100 ELSE 0 END)::numeric, 1) AS avg_achievement
           FROM employee_kpis ek
           JOIN employees e ON e.id = ek.employee_id
           WHERE e.tenant_id = :tid AND ek.period = :period`,
          { replacements: tid },
        );
        context = rows[0] || {};
      } else if (module === 'reimbursement') {
        const [rows] = await sequelize.query(
          `SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
           FROM employee_claims WHERE tenant_id = :tid`,
          { replacements: tid },
        );
        context = rows[0] || {};
      } else if (module === 'workforce') {
        const [rows] = await sequelize.query(
          `SELECT COUNT(*)::int AS total FROM employees WHERE is_active = true AND tenant_id = :tid`,
          { replacements: tid },
        );
        context = rows[0] || {};
      }
    } catch { /* partial */ }
    return { module, context };
  }));
  return contexts;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { isHumanifyAiEnabled, humanifyAiDisabledPayload } = await import('@/lib/hris/ai-enabled');
    if (!isHumanifyAiEnabled()) {
      return res.status(503).json(humanifyAiDisabledPayload());
    }

    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;
    const { assertHumanifyFeature } = await import('@/lib/saas/assert-feature');
    if (!(await assertHumanifyFeature(req, res, {
      tenantId,
      role: (session.user as any).role,
      feature: 'ai',
      path: '/api/humanify/ai-hub',
    }))) return;

    const userId = asUuid((session.user as any).id);
    const userEmail = (session.user as any).email || null;
    const { action } = req.query;
    const period = (req.query.period as string) || new Date().toISOString().substring(0, 7);

    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const dash = await getAutomationDashboard(tenantId);
        const contexts = sequelize ? await gatherBatchContext(period, tenantId) : [];
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

      if (action === 'automation-alerts') {
        const alerts = await listAlerts(tenantId, 30);
        return res.json({ success: true, data: alerts });
      }

      if (action === 'insights') {
        const contexts = sequelize ? await gatherBatchContext(period, tenantId) : [];
        const result = await generateModuleInsightsBatchAsync(contexts as any);
        return res.json({ success: true, ...result, count: result.insights.length });
      }

      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'chat') {
        const { message, history, pendingTools } = req.body || {};
        if (!message?.trim()) return res.status(400).json({ success: false, error: 'message required' });

        let reservedTokens = 0;
        if (tenantId) {
          try {
            const { assertAiTokensAvailable, consumeAiTokens } = await import('@/lib/saas/ai-token-wallet');
            const { estimateBillableTokens } = await import('@/lib/saas/ai-token-pricing');
            const gate = await assertAiTokensAvailable(tenantId);
            if (!gate.ok) {
              return res.status(402).json({
                success: false,
                error: gate.error || 'Token AIMAN tidak tersedia',
                code: 'AI_TOKEN_REQUIRED',
                data: { aiTokens: gate.snapshot },
              });
            }
            // Reserve min billable before LLM so we don't deliver free replies
            reservedTokens = estimateBillableTokens(String(message), 120);
            const reserved = await consumeAiTokens(tenantId, reservedTokens);
            if (!reserved.ok) {
              return res.status(402).json({
                success: false,
                error: reserved.error || 'Saldo token AIMAN tidak cukup',
                code: 'AI_TOKEN_REQUIRED',
              });
            }
          } catch (e) {
            console.warn('[ai-hub] token gate', (e as Error)?.message || e);
            return res.status(503).json({
              success: false,
              error: 'Pengecekan token AIMAN gagal. Coba lagi sebentar.',
              code: 'AI_TOKEN_GATE_ERROR',
            });
          }
        }

        await saveConversation({ tenantId, userId, role: 'user', message, source: 'user' });
        const result = await chatWithCopilot({
          message,
          tenantId,
          userId,
          userEmail,
          history,
          pendingTools: Array.isArray(pendingTools) ? pendingTools : undefined,
        });
        await saveConversation({
          tenantId, userId, role: 'assistant', message: result.reply,
          module: result.module, source: result.source,
        });

        if (tenantId) {
          try {
            const { estimateBillableTokens } = await import('@/lib/saas/ai-token-pricing');
            const { consumeAiTokens } = await import('@/lib/saas/ai-token-wallet');
            const total = estimateBillableTokens(
              `${String(message)}\n${String(result?.reply || '')}`,
              120,
            );
            const extra = Math.max(0, total - reservedTokens);
            if (extra > 0) {
              const consumed = await consumeAiTokens(tenantId, extra);
              if (consumed.ok) {
                (result as any).tokensUsed = total;
                (result as any).aiTokens = {
                  balance: consumed.wallet.balance,
                  used: consumed.wallet.used,
                };
              } else {
                (result as any).tokensUsed = reservedTokens;
              }
            } else {
              (result as any).tokensUsed = reservedTokens;
            }
          } catch { /* best-effort settle */ }
        }

        return res.json({ success: true, data: result });
      }

      if (action === 'agent-confirm') {
        const { tool, tools } = req.body || {};
        const allowed = new Set([
          'run_automation_scan',
          'execute_recruitment_screening',
          'execute_contract_expiry_alert',
          'execute_leave_backlog_alert',
          'run_leave_escalation',
          'payroll_prep_checklist',
          'payroll_create_draft_run',
          'recruitment_screen_preview',
          'list_hr_backlog',
          'leave_pending_detail',
          'contract_expiry_check',
          'onboarding_status',
          'ir_pending_sp_list',
          'ir_phase_reminder',
        ]);
        const list: string[] = Array.isArray(tools) && tools.length
          ? tools.map(String)
          : tool ? [String(tool)] : [];
        if (!list.length || list.some((t) => !allowed.has(t))) {
          return res.status(400).json({ success: false, error: 'tool invalid' });
        }
        const { confirmAimanAgentActions, confirmAimanAgentAction } = await import('@/lib/hris/aiman-agent');
        if (list.length === 1) {
          const confirmed = await confirmAimanAgentAction({
            tool: list[0] as any,
            tenantId,
            actorUserId: userId,
            actorEmail: userEmail,
          });
          await saveConversation({
            tenantId, userId, role: 'assistant', message: confirmed.reply,
            module: 'agent', source: 'agent-confirm',
          });
          return res.json({ success: true, data: confirmed });
        }
        const batch = await confirmAimanAgentActions({
          tools: list as any,
          tenantId,
          actorUserId: userId,
          actorEmail: userEmail,
        });
        await saveConversation({
          tenantId, userId, role: 'assistant', message: batch.reply,
          module: 'agent', source: 'agent-confirm',
        });
        return res.json({ success: true, data: batch });
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

      if (action === 'mark-alerts-read') {
        const { alert_ids } = req.body || {};
        const n = await markAlertsRead(
          tenantId,
          Array.isArray(alert_ids) ? alert_ids.map(String) : undefined,
        );
        return res.json({ success: true, data: { marked: n } });
      }

      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[AI Hub]', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });

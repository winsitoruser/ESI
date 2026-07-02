import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(sql: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, replacements ? { replacements } : undefined);
    return rows || [];
  } catch (e: any) { console.error('Admin AI Q:', e.message); return []; }
}

async function qExec(sql: string, replacements?: any): Promise<boolean> {
  if (!sequelize) return false;
  try { await sequelize.query(sql, replacements ? { replacements } : undefined); return true; }
  catch (e: any) { console.error('Admin AI Exec:', e.message); return false; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const userRole = ((session.user as any).role || '').toLowerCase();
    if (!['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { action } = req.query;

    // ── GET routes ──
    if (req.method === 'GET') {
      switch (action) {
        case 'overview': {
          const models = await q(`SELECT COUNT(*) as cnt FROM ai_models WHERE is_active = true`);
          const workflows = await q(`SELECT COUNT(*) as cnt FROM ai_workflows WHERE is_active = true`);
          const executions = await q(`SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as success, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed, COALESCE(SUM(total_cost),0) as cost FROM ai_executions`);
          const recentExec = await q(`SELECT ae.*, aw.name as workflow_name, am.name as model_name, am.provider FROM ai_executions ae LEFT JOIN ai_workflows aw ON ae.workflow_id=aw.id LEFT JOIN ai_models am ON ae.ai_model_id=am.id ORDER BY ae.created_at DESC LIMIT 20`);
          const modelList = await q(`SELECT am.*, (SELECT COUNT(*) FROM ai_workflows aw WHERE aw.ai_model_id=am.id) as workflow_count, (SELECT COUNT(*) FROM ai_executions ae WHERE ae.ai_model_id=am.id) as exec_count FROM ai_models am ORDER BY am.is_default DESC, am.created_at DESC`);
          const workflowList = await q(`SELECT aw.*, am.name as model_name, am.provider FROM ai_workflows aw LEFT JOIN ai_models am ON aw.ai_model_id=am.id ORDER BY aw.created_at DESC`);
          const tenantUsage = await q(`SELECT ae.tenant_id, COUNT(*) as executions, COALESCE(SUM(ae.total_cost),0) as cost, SUM(ae.input_tokens) as input_tokens, SUM(ae.output_tokens) as output_tokens FROM ai_executions ae GROUP BY ae.tenant_id ORDER BY cost DESC LIMIT 20`);

          return res.json({
            success: true,
            data: {
              stats: {
                totalModels: parseInt(models[0]?.cnt) || 0,
                totalWorkflows: parseInt(workflows[0]?.cnt) || 0,
                totalExecutions: parseInt(executions[0]?.total) || 0,
                successExecutions: parseInt(executions[0]?.success) || 0,
                failedExecutions: parseInt(executions[0]?.failed) || 0,
                totalCost: parseFloat(executions[0]?.cost) || 0,
              },
              models: modelList,
              workflows: workflowList,
              recentExecutions: recentExec,
              tenantUsage,
            },
          });
        }

        case 'models': {
          const rows = await q(`SELECT am.*, (SELECT COUNT(*) FROM ai_workflows aw WHERE aw.ai_model_id=am.id) as workflow_count, (SELECT COUNT(*) FROM ai_executions ae WHERE ae.ai_model_id=am.id) as exec_count, (SELECT COALESCE(SUM(ae.total_cost),0) FROM ai_executions ae WHERE ae.ai_model_id=am.id) as total_cost_used FROM ai_models am ORDER BY am.is_default DESC, am.created_at DESC`);
          return res.json({ success: true, data: rows });
        }

        case 'workflows': {
          const rows = await q(`SELECT aw.*, am.name as model_name, am.provider, (SELECT COUNT(*) FROM ai_executions ae WHERE ae.workflow_id=aw.id) as exec_count, (SELECT COALESCE(SUM(ae.total_cost),0) FROM ai_executions ae WHERE ae.workflow_id=aw.id) as total_cost FROM ai_workflows aw LEFT JOIN ai_models am ON aw.ai_model_id=am.id ORDER BY aw.created_at DESC`);
          return res.json({ success: true, data: rows });
        }

        case 'executions': {
          const { limit: lim = '50', offset: off = '0', status: st, tenant_id: tid } = req.query;
          let w = 'WHERE 1=1'; const p: any = {};
          if (st) { w += ' AND ae.status = :st'; p.st = st; }
          if (tid) { w += ' AND ae.tenant_id = :tid'; p.tid = tid; }
          const rows = await q(`SELECT ae.*, aw.name as workflow_name, am.name as model_name, am.provider FROM ai_executions ae LEFT JOIN ai_workflows aw ON ae.workflow_id=aw.id LEFT JOIN ai_models am ON ae.ai_model_id=am.id ${w} ORDER BY ae.created_at DESC LIMIT ${parseInt(lim as string)} OFFSET ${parseInt(off as string)}`, p);
          const total = await q(`SELECT COUNT(*) as cnt FROM ai_executions ae ${w}`, p);
          return res.json({ success: true, data: rows, total: parseInt(total[0]?.cnt) || 0 });
        }

        default:
          return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
      }
    }

    // ── POST routes ──
    if (req.method === 'POST') {
      const b = req.body || {};
      switch (action) {
        case 'toggle-model': {
          const { id, is_active } = b;
          if (!id) return res.status(400).json({ success: false, error: 'id required' });
          await qExec(`UPDATE ai_models SET is_active = :active WHERE id = :id`, { active: is_active !== false, id });
          return res.json({ success: true, message: `Model ${is_active !== false ? 'activated' : 'deactivated'}` });
        }

        case 'set-default-model': {
          const { id } = b;
          if (!id) return res.status(400).json({ success: false, error: 'id required' });
          await qExec(`UPDATE ai_models SET is_default = false WHERE is_default = true`);
          await qExec(`UPDATE ai_models SET is_default = true WHERE id = :id`, { id });
          return res.json({ success: true, message: 'Default model updated' });
        }

        case 'toggle-workflow': {
          const { id, is_active } = b;
          if (!id) return res.status(400).json({ success: false, error: 'id required' });
          await qExec(`UPDATE ai_workflows SET is_active = :active WHERE id = :id`, { active: is_active !== false, id });
          return res.json({ success: true, message: `Workflow ${is_active !== false ? 'activated' : 'deactivated'}` });
        }

        case 'delete-model': {
          const { id } = b;
          if (!id) return res.status(400).json({ success: false, error: 'id required' });
          await qExec(`UPDATE ai_workflows SET ai_model_id = NULL WHERE ai_model_id = :id`, { id });
          await qExec(`DELETE FROM ai_models WHERE id = :id`, { id });
          return res.json({ success: true, message: 'Model deleted' });
        }

        case 'delete-workflow': {
          const { id } = b;
          if (!id) return res.status(400).json({ success: false, error: 'id required' });
          await qExec(`DELETE FROM ai_executions WHERE workflow_id = :id`, { id });
          await qExec(`DELETE FROM ai_workflows WHERE id = :id`, { id });
          return res.json({ success: true, message: 'Workflow deleted' });
        }

        default:
          return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Admin AI API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

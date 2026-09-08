/**
 * POST /api/humanify/satisfaction — CSAT/NPS pulse (Wave-83)
 * GET  ?action=summary — tenant avg (HR admin via withHQAuth)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { ensureSatisfactionTable, recordSatisfaction } from '@/lib/saas/satisfaction';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  const tenantId = tenantIdFromSession(session);

  if (req.method === 'POST') {
    const score = Number(req.body?.score);
    if (Number.isNaN(score) || score < 0 || score > 10) {
      return res.status(400).json({ success: false, error: 'score 0–10 required' });
    }
    try {
      const row = await recordSatisfaction({
        tenantId,
        userId: session?.user?.id,
        score,
        comment: req.body?.comment || null,
        channel: req.body?.channel || 'ess',
        context: req.body?.context || 'pulse',
      });
      return res.status(201).json({ success: true, data: row });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'save failed' });
    }
  }

  if (req.method === 'GET' && req.query.action === 'summary') {
    if (!sequelize || !tenantId) return res.json({ success: true, data: { count: 0, avg: null } });
    await ensureSatisfactionTable(sequelize);
    try {
      const [rows] = await sequelize.query(
        `SELECT COUNT(*)::int AS count, ROUND(AVG(score)::numeric, 2)::float AS avg
         FROM humanify_satisfaction_responses
         WHERE tenant_id = :tid AND created_at >= NOW() - INTERVAL '90 days'`,
        { replacements: { tid: tenantId } },
      );
      return res.json({ success: true, data: rows?.[0] || { count: 0, avg: null } });
    } catch {
      return res.json({ success: true, data: { count: 0, avg: null } });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withHQAuth(handler);

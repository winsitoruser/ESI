/**
 * Phase 22 — global search (tenant-scoped employees).
 *   GET ?q=<query>&limit=8
 * Returns lightweight employee matches for the command/search palette.
 * Page/navigation matches are resolved client-side from the sidebar config.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function tableExists(name: string): Promise<boolean> {
  if (!sequelize) return false;
  try {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=:name LIMIT 1`,
      { replacements: { name } },
    );
    return Boolean(rows?.length);
  } catch { return false; }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = (session.user as any).tenantId || null;

  const q = String(req.query.q || '').trim();
  const limit = Math.min(15, Math.max(1, Number(req.query.limit) || 8));

  if (q.length < 2) {
    return res.json({ success: true, data: { employees: [] } });
  }

  // Always tenant-scoped — no tenant, no results (avoids cross-tenant leakage).
  if (!sequelize || !tenantId) {
    return res.json({ success: true, data: { employees: [] } });
  }

  try {
    if (!(await tableExists('employees'))) {
      return res.json({ success: true, data: { employees: [] } });
    }
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const [rows] = await sequelize.query(
      `SELECT id, name, email, employee_code, position, department
       FROM employees
       WHERE tenant_id = :tid AND (
         name ILIKE :like OR email ILIKE :like OR
         COALESCE(employee_code,'') ILIKE :like OR
         COALESCE(position,'') ILIKE :like OR
         COALESCE(department,'') ILIKE :like
       )
       ORDER BY name ASC
       LIMIT :limit`,
      { replacements: { like, tid: tenantId, limit } },
    );
    const employees = (rows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      employeeId: r.employee_code || null,
      position: r.position || null,
      department: r.department || null,
    }));
    return res.json({ success: true, data: { employees } });
  } catch (e: any) {
    console.error('[search]', e?.message || e);
    return res.status(500).json({ success: false, error: 'Search failed' });
  }
}

export default withHQAuth(handler, { module: 'hris' });

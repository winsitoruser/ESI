/**
 * Public Humanify API v1 — Bearer API key auth
 * GET /api/v1/employees
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateBearer } from '@/lib/saas/humanify-api-keys';
import { resolveTenantPlan } from '@/lib/saas/assert-feature';
import { planHasFeature } from '@/lib/saas/plan-entitlements';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function tableExists(name: string): Promise<boolean> {
  const [rows] = await sequelize.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = :name LIMIT 1
  `, { replacements: { name } });
  return Boolean(rows?.length);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  if (!sequelize) {
    return res.status(503).json({ success: false, error: 'Unavailable' });
  }

  const auth = await authenticateBearer(
    req.headers.authorization,
    'employees:read',
  );
  if (!auth) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      hint: 'Authorization: Bearer hfy_live_…',
    });
  }

  const plan = await resolveTenantPlan(auth.tenantId);
  if (!planHasFeature(plan, 'api')) {
    return res.status(403).json({
      success: false,
      error: 'FEATURE_NOT_IN_PLAN',
      message: 'API keys hanya tersedia di paket Enterprise / Trial.',
    });
  }

  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    let rows: any[] = [];
    if (await tableExists('employees')) {
      const [r] = await sequelize.query(`
        SELECT id, employee_number AS "employeeNumber", name, email, phone,
               department, position, status, employment_type AS "employmentType",
               join_date AS "joinDate"
        FROM employees
        WHERE tenant_id = :tid
        ORDER BY created_at DESC NULLS LAST
        LIMIT :lim
      `, { replacements: { tid: auth.tenantId, lim: limit } });
      rows = r || [];
    } else if (await tableExists('hris_employees')) {
      const [r] = await sequelize.query(`
        SELECT id, employee_number AS "employeeNumber", name, email, phone,
               department, position, status, employment_type AS "employmentType",
               join_date AS "joinDate"
        FROM hris_employees
        WHERE tenant_id = :tid
        ORDER BY created_at DESC NULLS LAST
        LIMIT :lim
      `, { replacements: { tid: auth.tenantId, lim: limit } });
      rows = r || [];
    }

    return res.json({
      success: true,
      data: rows,
      meta: { count: rows.length, tenantId: auth.tenantId, keyName: auth.name },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}

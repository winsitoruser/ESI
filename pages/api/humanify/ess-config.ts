/**
 * ESS portal configuration for the current tenant.
 * GET  — current config
 * POST — save modules / face enrollment / announcement
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { resolveEffectiveTenantId } from '@/lib/hris/resolve-employee-tenant';
import { getEssPortalConfig, saveEssPortalConfig } from '@/lib/hris/ess-portal-config';

async function tenantForEss(session: any): Promise<string | null> {
  let sequelize: any;
  try { sequelize = require('@/lib/sequelize'); } catch { return tenantIdFromSession(session); }
  return resolveEffectiveTenantId({
    sequelize,
    session,
    sessionTenantId: tenantIdFromSession(session) || session?.user?.tenantId,
  });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = await tenantForEss(session);
  if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });

  try {
    if (req.method === 'GET') {
      const data = await getEssPortalConfig(tenantId);
      return res.json({ success: true, data });
    }
    if (req.method === 'POST') {
      const data = await saveEssPortalConfig(tenantId, req.body || {});
      return res.json({ success: true, data, message: 'Konfigurasi portal tersimpan' });
    }
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });

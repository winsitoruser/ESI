/**
 * Humanify enterprise API (Phase 5)
 * GET  ?action=branding|api-keys|overview
 * POST ?action=save-branding|create-api-key|revoke-api-key|export-employees
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { assertHumanifyFeature } from '@/lib/saas/assert-feature';
import { getTenantBranding, saveTenantBranding } from '@/lib/saas/humanify-branding';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from '@/lib/saas/humanify-api-keys';
import { exportTenantEmployeesCsv, exportTenantBundle } from '@/lib/saas/humanify-export';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

const OWNER_ROLES = new Set([
  'owner', 'hq_admin', 'super_admin', 'superadmin', 'platform_admin', 'hr_admin',
]);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = String((session.user as any).role || '');
  const tenantId = (session.user as any).tenantId as string | null;
  const userId = (session.user as any).id as string | undefined;
  const action = String(req.query.action || (req.method === 'GET' ? 'overview' : ''));

  if (!tenantId && !isPlatformOperator(role)) {
    return res.status(400).json({ success: false, error: 'No tenant' });
  }

  const ok = await assertHumanifyFeature(req, res, {
    tenantId,
    role,
    feature: 'api',
  });
  if (!ok) return;

  if (!OWNER_ROLES.has(role.toLowerCase()) && !isPlatformOperator(role)) {
    return res.status(403).json({ success: false, error: 'Hanya owner/HR admin' });
  }

  try {
    if (req.method === 'GET' && action === 'branding') {
      const branding = await getTenantBranding(tenantId!);
      return res.json({ success: true, data: branding });
    }

    if (req.method === 'GET' && action === 'api-keys') {
      const keys = await listApiKeys(tenantId!);
      return res.json({ success: true, data: keys });
    }

    if (req.method === 'GET' && action === 'overview') {
      const [branding, keys] = await Promise.all([
        getTenantBranding(tenantId!),
        listApiKeys(tenantId!),
      ]);
      return res.json({
        success: true,
        data: {
          branding,
          apiKeys: keys,
          docs: {
            authHeader: 'Authorization: Bearer hfy_live_…',
            employeesEndpoint: '/api/v1/employees',
            careers: '/c/{slug}/careers',
          },
        },
      });
    }

    if (req.method === 'POST' && action === 'save-branding') {
      const branding = await saveTenantBranding(tenantId!, req.body || {});
      return res.json({ success: true, data: branding });
    }

    if (req.method === 'POST' && action === 'create-api-key') {
      const created = await createApiKey({
        tenantId: tenantId!,
        name: req.body?.name || 'Integration',
        scopes: req.body?.scopes,
        createdBy: userId || null,
      });
      return res.status(201).json({
        success: true,
        data: created,
        message: 'Simpan API key sekarang — tidak ditampilkan lagi.',
      });
    }

    if (req.method === 'POST' && action === 'revoke-api-key') {
      const result = await revokeApiKey(tenantId!, String(req.body?.id || ''));
      return res.json({ success: true, data: result });
    }

    if (req.method === 'POST' && action === 'export-employees') {
      const format = String(req.body?.format || req.query.format || 'csv');
      if (format === 'json') {
        const bundle = await exportTenantBundle(tenantId!);
        return res.json({ success: true, data: bundle });
      }
      const file = await exportTenantEmployeesCsv(tenantId!);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      return res.status(200).send(file.csv);
    }

    return res.status(400).json({ success: false, error: 'Action tidak dikenal' });
  } catch (e: any) {
    console.error('[enterprise]', e);
    return res.status(500).json({ success: false, error: e.message || 'Gagal' });
  }
}

export default withHQAuth(handler);

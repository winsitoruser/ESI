/**
 * Humanify SaaS Phase 13 — enterprise SSO (SAML) config API
 * GET  ?action=config → masked config + SP metadata
 * POST ?action=save    → save/validate IdP config
 * POST ?action=disable → turn SSO off
 *
 * Feature-gated to plans with `sso` (enterprise/trial). Owner-only.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { assertHumanifyFeature } from '@/lib/saas/assert-feature';
import { disableSso, getSsoConfig, saveSsoConfig } from '@/lib/saas/sso-config';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';

const OWNER_ROLES = new Set([
  'owner', 'hq_admin', 'super_admin', 'superadmin', 'platform_admin',
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = String((session.user as any).role || '');
  const tenantId = (session.user as any).tenantId as string | null;
  const action = String(req.query.action || (req.method === 'GET' ? 'config' : ''));

  if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });

  const ok = await assertHumanifyFeature(req, res, { tenantId, role, feature: 'sso' });
  if (!ok) return;

  if (!OWNER_ROLES.has(role.toLowerCase()) && !isPlatformOperator(role)) {
    return res.status(403).json({ success: false, error: 'Hanya owner' });
  }

  const base = (req.headers.origin as string) || process.env.NEXTAUTH_URL || 'https://humanify.id';

  try {
    if (req.method === 'GET' && action === 'config') {
      const data = await getSsoConfig(tenantId, base);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST' && action === 'save') {
      const data = await saveSsoConfig(tenantId, req.body || {}, base);
      return res.json({ success: true, data, message: 'Konfigurasi SSO tersimpan.' });
    }

    if (req.method === 'POST' && action === 'disable') {
      const data = await disableSso(tenantId, base);
      return res.json({ success: true, data, message: 'SSO dinonaktifkan.' });
    }

    return res.status(400).json({ success: false, error: 'Action tidak dikenal' });
  } catch (e: any) {
    const status = e?.statusCode || 500;
    console.error('[sso]', e);
    return res.status(status).json({ success: false, error: e.message || 'Gagal', errors: e?.errors });
  }
}

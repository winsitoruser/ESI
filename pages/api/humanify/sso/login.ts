/**
 * GET /api/humanify/sso/login?tenant=<slug> — start SAML AuthnRequest → IdP
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveTenantForSso, buildSpIdp } from '@/lib/saas/sso-saml';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const slug = String(req.query.tenant || '');
    if (!slug) return res.status(400).json({ success: false, error: 'tenant query required' });

    const resolved = await resolveTenantForSso(slug);
    if (!resolved) {
      return res.status(404).json({
        success: false,
        error: 'SSO tidak aktif atau belum dikonfigurasi untuk tenant ini',
      });
    }

    const { sp, idp } = await buildSpIdp(resolved.tenant.id, slug);
    const { context } = await sp.createLoginRequest(idp, 'redirect');
    // RelayState carries tenant slug for ACS
    const url = new URL(context);
    url.searchParams.set('RelayState', slug);
    return res.redirect(302, url.toString());
  } catch (e: any) {
    console.error('[sso/login]', e);
    return res.status(500).json({ success: false, error: e?.message || 'SSO login error' });
  }
}

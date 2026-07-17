/**
 * POST /api/humanify/sso/acs — SAML Assertion Consumer Service
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { buildSpIdp, findOrProvisionSsoUser, resolveTenantForSso } from '@/lib/saas/sso-saml';
import { mintSsoHandoff } from '@/lib/saas/sso-handoff';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const base = (process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
  const fail = (msg: string) => {
    const q = new URLSearchParams({ error: msg.slice(0, 200) });
    return res.redirect(302, `${base}/humanify/login?${q.toString()}`);
  };

  try {
    const slug = String(req.body?.RelayState || req.query.RelayState || '').trim();
    if (!slug) return fail('SSO RelayState (tenant) hilang');

    const resolved = await resolveTenantForSso(slug);
    if (!resolved) return fail('SSO tidak aktif untuk tenant ini');

    const { sp, idp, raw } = await buildSpIdp(resolved.tenant.id, slug);
    const { extract } = await sp.parseLoginResponse(idp, 'post', { body: req.body });

    const email =
      extract?.nameID ||
      extract?.attributes?.email ||
      extract?.attributes?.mail ||
      extract?.attributes?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    const name =
      extract?.attributes?.displayName ||
      extract?.attributes?.name ||
      extract?.attributes?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      null;

    const user = await findOrProvisionSsoUser({
      tenantId: resolved.tenant.id,
      email: String(email || ''),
      name: name ? String(name) : null,
      emailDomain: raw.emailDomain,
    });

    try { await user.update({ lastLogin: new Date() }); } catch { /* */ }

    const token = await mintSsoHandoff({ userId: user.id, tenantId: resolved.tenant.id });
    const dest = new URL(`${base}/humanify/login`);
    dest.searchParams.set('ssoToken', token);
    dest.searchParams.set('callbackUrl', '/humanify');
    return res.redirect(302, dest.toString());
  } catch (e: any) {
    console.error('[sso/acs]', e);
    return fail(e?.message || 'SSO assertion gagal divalidasi');
  }
}

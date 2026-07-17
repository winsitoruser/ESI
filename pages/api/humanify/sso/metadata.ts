/**
 * GET /api/humanify/sso/metadata?tenant=<slug> — SP metadata XML (public)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveTenantForSso, buildSpIdp } from '@/lib/saas/sso-saml';
import { getSpMetadata } from '@/lib/saas/sso-config';
import { resolveTenantBySlug } from '@/lib/saas/tenant-slug';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const slug = String(req.query.tenant || '');
    if (!slug) return res.status(400).send('tenant query required');
    const tenant = await resolveTenantBySlug(slug);
    if (!tenant) return res.status(404).send('Tenant not found');

    const resolved = await resolveTenantForSso(slug);
    if (resolved) {
      const { sp } = await buildSpIdp(tenant.id, slug);
      const xml = sp.getMetadata();
      res.setHeader('Content-Type', 'application/samlmetadata+xml');
      return res.status(200).send(xml);
    }

    const spMeta = await getSpMetadata(tenant.id);
    const xml = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${spMeta.entityId}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol" AuthnRequestsSigned="false" WantAssertionsSigned="true">
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${spMeta.acsUrl}" index="0" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
    res.setHeader('Content-Type', 'application/samlmetadata+xml');
    return res.status(200).send(xml);
  } catch (e: any) {
    console.error('[sso/metadata]', e);
    return res.status(500).send(e?.message || 'Metadata error');
  }
}

/**
 * samlify SP/IdP helpers for Humanify SSO.
 */
import { getRawSsoConfig, getSpMetadata } from './sso-config';
import { resolveTenantBySlug, resolveTenantById } from './tenant-slug';

let saml: any;
function getSaml() {
  if (!saml) {
    saml = require('samlify');
    // Skip XSD validation (heavy / often fails in serverless); we still verify signatures.
    try {
      saml.setSchemaValidator({
        validate: () => Promise.resolve('skipped'),
      });
    } catch { /* */ }
  }
  return saml;
}

export async function resolveTenantForSso(tenantSlug: string) {
  const tenant = await resolveTenantBySlug(tenantSlug);
  if (!tenant) return null;
  const raw = await getRawSsoConfig(tenant.id);
  if (!raw?.enabled || !raw.entryPoint || !raw.idpEntityId || !raw.cert) return null;
  const spMeta = await getSpMetadata(tenant.id);
  return { tenant, raw, spMeta };
}

export async function buildSpIdp(tenantId: string, tenantSlug: string) {
  const lib = getSaml();
  const raw = await getRawSsoConfig(tenantId);
  if (!raw?.enabled || !raw.entryPoint || !raw.idpEntityId || !raw.cert) {
    throw new Error('SSO belum dikonfigurasi / tidak aktif');
  }
  const spMeta = await getSpMetadata(tenantId);
  const sp = lib.ServiceProvider({
    entityID: spMeta.entityId,
    assertionConsumerService: [{
      Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
      Location: spMeta.acsUrl,
    }],
    wantAssertionsSigned: true,
  });
  const idp = lib.IdentityProvider({
    entityID: raw.idpEntityId,
    singleSignOnService: [{
      Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
      Location: raw.entryPoint,
    }],
    signingCert: raw.cert,
  });
  return { sp, idp, raw, spMeta, tenantSlug };
}

export async function findOrProvisionSsoUser(opts: {
  tenantId: string;
  email: string;
  name?: string | null;
  emailDomain?: string | null;
}) {
  const email = String(opts.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Assertion tanpa email/NameID');
  if (opts.emailDomain) {
    const domain = email.split('@')[1];
    if (domain !== opts.emailDomain.replace(/^@/, '').toLowerCase()) {
      throw new Error(`Email domain tidak diizinkan (harus @${opts.emailDomain})`);
    }
  }

  const bcrypt = require('bcryptjs');
  const crypto = require('crypto');
  const db = require('../../models');

  let user = await db.User.findOne({ where: { email } });
  if (user) {
    if (user.tenantId && String(user.tenantId) !== String(opts.tenantId)) {
      throw new Error('Email sudah terdaftar di tenant lain');
    }
    if (!user.isActive) throw new Error('Akun tidak aktif');
    if (!user.tenantId) {
      await user.update({ tenantId: opts.tenantId });
    }
    return user;
  }

  const randomPass = crypto.randomBytes(32).toString('base64url');
  const hashed = await bcrypt.hash(randomPass, 10);
  user = await db.User.create({
    name: opts.name || email.split('@')[0],
    email,
    password: hashed,
    tenantId: opts.tenantId,
    role: 'staff',
    isActive: true,
  });
  return user;
}

export { resolveTenantById };

/**
 * Humanify SaaS Phase 13 — enterprise SSO (SAML) configuration.
 *
 * Foundation only: stores/validates the tenant IdP config and exposes the SP
 * metadata (entityId / ACS / login URLs) that the customer registers in their
 * IdP. The assertion-consumer login wiring is a deliberate follow-up so the
 * live credentials login flow is never destabilised.
 */
import crypto from 'crypto';
import { getTenantColumns, parseTenantSettings } from './tenant-schema';
import { resolveTenantById } from './tenant-slug';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export interface SsoConfigInput {
  enabled?: boolean;
  entryPoint?: string;
  idpEntityId?: string;
  cert?: string;
  emailDomain?: string;
}

export interface SsoConfigPublic {
  enabled: boolean;
  provider: 'saml';
  entryPoint: string | null;
  idpEntityId: string | null;
  emailDomain: string | null;
  certPresent: boolean;
  certFingerprint: string | null;
  updatedAt: string | null;
  /** SSO login remains a scaffolded follow-up until ACS wiring ships. */
  loginActive: boolean;
}

export interface SsoServiceProviderMetadata {
  entityId: string;
  acsUrl: string;
  loginInitUrl: string;
  metadataUrl: string;
}

function baseUrl(explicit?: string): string {
  return (explicit || process.env.NEXTAUTH_URL || 'https://humanify.id').replace(/\/$/, '');
}

function normalizePem(raw?: string): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  return s;
}

function fingerprint(cert: string | null): string | null {
  if (!cert) return null;
  const body = cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
  try {
    const der = Buffer.from(body, 'base64');
    const hash = crypto.createHash('sha256').update(der).digest('hex').toUpperCase();
    return hash.match(/.{2}/g)?.join(':') || null;
  } catch {
    return null;
  }
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function readSettings(tenantId: string): Promise<Record<string, any> | null> {
  if (!sequelize) return null;
  const cols = await getTenantColumns();
  if (!cols.has('settings')) return null;
  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  if (!rows?.length) return null;
  return parseTenantSettings(rows[0].settings);
}

function toPublic(raw: any): SsoConfigPublic {
  const cert = normalizePem(raw?.cert);
  return {
    enabled: Boolean(raw?.enabled),
    provider: 'saml',
    entryPoint: raw?.entryPoint || null,
    idpEntityId: raw?.idpEntityId || null,
    emailDomain: raw?.emailDomain || null,
    certPresent: Boolean(cert),
    certFingerprint: fingerprint(cert),
    updatedAt: raw?.updatedAt || null,
    loginActive: false,
  };
}

export async function getSpMetadata(
  tenantId: string,
  explicitBase?: string,
): Promise<SsoServiceProviderMetadata> {
  const tenant = await resolveTenantById(tenantId);
  const slug = tenant?.slug || tenantId;
  const base = baseUrl(explicitBase);
  return {
    entityId: `${base}/sso/${slug}`,
    acsUrl: `${base}/api/humanify/sso/acs`,
    loginInitUrl: `${base}/api/humanify/sso/login?tenant=${encodeURIComponent(slug)}`,
    metadataUrl: `${base}/api/humanify/sso/metadata?tenant=${encodeURIComponent(slug)}`,
  };
}

export async function getSsoConfig(
  tenantId: string,
  explicitBase?: string,
): Promise<{ config: SsoConfigPublic; sp: SsoServiceProviderMetadata }> {
  const settings = (await readSettings(tenantId)) || {};
  const config = toPublic(settings.sso || {});
  const sp = await getSpMetadata(tenantId, explicitBase);
  return { config, sp };
}

export async function saveSsoConfig(
  tenantId: string,
  input: SsoConfigInput,
  explicitBase?: string,
): Promise<{ config: SsoConfigPublic; sp: SsoServiceProviderMetadata }> {
  if (!sequelize) throw new Error('Database unavailable');
  const cols = await getTenantColumns();
  if (!cols.has('settings')) throw new Error('Kolom settings tidak tersedia');

  const entryPoint = String(input.entryPoint || '').trim();
  const idpEntityId = String(input.idpEntityId || '').trim();
  const cert = normalizePem(input.cert);
  const emailDomain = String(input.emailDomain || '').trim().toLowerCase().replace(/^@/, '');
  const enabled = Boolean(input.enabled);

  const errors: string[] = [];
  if (entryPoint && !isHttpUrl(entryPoint)) errors.push('entryPoint harus URL http(s) yang valid');
  if (enabled) {
    if (!entryPoint) errors.push('entryPoint (IdP SSO URL) wajib untuk mengaktifkan SSO');
    if (!idpEntityId) errors.push('idpEntityId (IdP issuer) wajib untuk mengaktifkan SSO');
    if (!cert) errors.push('Sertifikat X.509 IdP wajib untuk mengaktifkan SSO');
  }
  if (errors.length) {
    const err: any = new Error(errors[0]);
    err.errors = errors;
    err.statusCode = 422;
    throw err;
  }

  const settings = (await readSettings(tenantId)) || {};
  settings.sso = {
    provider: 'saml',
    enabled,
    entryPoint: entryPoint || null,
    idpEntityId: idpEntityId || null,
    cert: cert || null,
    emailDomain: emailDomain || null,
    updatedAt: new Date().toISOString(),
  };
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );

  return getSsoConfig(tenantId, explicitBase);
}

export async function disableSso(
  tenantId: string,
  explicitBase?: string,
): Promise<{ config: SsoConfigPublic; sp: SsoServiceProviderMetadata }> {
  if (!sequelize) throw new Error('Database unavailable');
  const settings = (await readSettings(tenantId)) || {};
  if (settings.sso) {
    settings.sso = { ...settings.sso, enabled: false, updatedAt: new Date().toISOString() };
    await sequelize.query(
      `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
      { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
    );
  }
  return getSsoConfig(tenantId, explicitBase);
}

/**
 * Tenant MFA policy — optional enforce-2FA for all members.
 * Stored in tenants.settings.security.requireMfa (default false).
 */
import { getTenantColumns, parseTenantSettings } from './tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

async function readSettings(tenantId: string): Promise<Record<string, any> | null> {
  if (!sequelize || !tenantId) return null;
  const cols = await getTenantColumns();
  if (!cols.has('settings')) return null;
  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  if (!rows?.length) return null;
  return parseTenantSettings(rows[0].settings);
}

export async function isTenantMfaRequired(tenantId?: string | null): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const settings = await readSettings(tenantId);
    return Boolean(settings?.security?.requireMfa);
  } catch {
    return false;
  }
}

export async function setTenantMfaRequired(
  tenantId: string,
  requireMfa: boolean,
): Promise<{ requireMfa: boolean }> {
  if (!sequelize || !tenantId) throw new Error('Database unavailable');
  const cols = await getTenantColumns();
  if (!cols.has('settings')) throw new Error('Tenant settings tidak tersedia');

  const settings = (await readSettings(tenantId)) || {};
  settings.security = {
    ...(settings.security || {}),
    requireMfa: Boolean(requireMfa),
    updatedAt: new Date().toISOString(),
  };

  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
  return { requireMfa: Boolean(requireMfa) };
}

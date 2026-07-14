/**
 * Humanify SaaS Phase 5 — tenant white-label branding (settings JSON)
 */
import { getTenantColumns, parseTenantSettings } from './tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export interface TenantBranding {
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  hidePoweredBy: boolean;
  careersHeadline: string;
}

export const DEFAULT_BRANDING: TenantBranding = {
  logoUrl: '',
  primaryColor: '#1d4ed8',
  accentColor: '#0f172a',
  hidePoweredBy: false,
  careersHeadline: '',
};

function sanitizeColor(raw: unknown, fallback: string): string {
  const s = String(raw || '').trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s;
  return fallback;
}

function sanitizeUrl(raw: unknown): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s.slice(0, 500);
  return '';
}

export function readTenantBranding(settings: unknown): TenantBranding {
  const parsed = parseTenantSettings(settings);
  const b = parsed.branding || {};
  return {
    logoUrl: sanitizeUrl(b.logoUrl),
    primaryColor: sanitizeColor(b.primaryColor, DEFAULT_BRANDING.primaryColor),
    accentColor: sanitizeColor(b.accentColor, DEFAULT_BRANDING.accentColor),
    hidePoweredBy: Boolean(b.hidePoweredBy),
    careersHeadline: String(b.careersHeadline || '').trim().slice(0, 120),
  };
}

export async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  if (!sequelize || !tenantId) return { ...DEFAULT_BRANDING };
  const cols = await getTenantColumns();
  if (!cols.has('settings')) return { ...DEFAULT_BRANDING };
  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  return readTenantBranding(rows?.[0]?.settings);
}

export async function saveTenantBranding(
  tenantId: string,
  patch: Partial<TenantBranding>,
): Promise<TenantBranding> {
  if (!sequelize) throw new Error('Database unavailable');
  const cols = await getTenantColumns();
  if (!cols.has('settings')) throw new Error('Kolom settings tidak tersedia');

  const [rows] = await sequelize.query(
    `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  if (!rows?.[0]) throw new Error('Tenant tidak ditemukan');

  const settings = parseTenantSettings(rows[0].settings);
  const current = readTenantBranding(settings);
  const next: TenantBranding = {
    logoUrl: patch.logoUrl !== undefined ? sanitizeUrl(patch.logoUrl) : current.logoUrl,
    primaryColor:
      patch.primaryColor !== undefined
        ? sanitizeColor(patch.primaryColor, current.primaryColor)
        : current.primaryColor,
    accentColor:
      patch.accentColor !== undefined
        ? sanitizeColor(patch.accentColor, current.accentColor)
        : current.accentColor,
    hidePoweredBy:
      patch.hidePoweredBy !== undefined ? Boolean(patch.hidePoweredBy) : current.hidePoweredBy,
    careersHeadline:
      patch.careersHeadline !== undefined
        ? String(patch.careersHeadline || '').trim().slice(0, 120)
        : current.careersHeadline,
  };
  settings.branding = next;
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
  return next;
}

/**
 * Tenant-scoped ESS portal configuration (tabs, face enrollment, banner).
 * Stored on tenants.settings.ess_portal — defaults keep current portal behavior.
 */
import { getTenantColumns, parseTenantSettings } from '../saas/tenant-schema';
import { withDbSavepoint } from '../saas/tenant-request-bound';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export const ESS_PORTAL_MODULES = [
  { key: 'attendance', label: 'Absensi', tab: 'attendance' },
  { key: 'leave', label: 'Cuti', tab: 'leave' },
  { key: 'claims', label: 'Klaim', tab: 'claims' },
  { key: 'overtime', label: 'Lembur', tab: 'overtime' },
  { key: 'travel', label: 'Perjalanan dinas', tab: 'travel' },
  { key: 'payslip', label: 'Slip gaji', tab: 'payslip' },
  { key: 'kpi', label: 'KPI', tab: 'kpi' },
  { key: 'files', label: 'Dokumen', tab: 'files' },
  { key: 'surveys', label: 'Survei', tab: 'surveys' },
  { key: 'training', label: 'Training & LMS', tab: 'training' },
  { key: 'visit', label: 'Kunjungan lapangan', tab: 'visit' },
  { key: 'disciplinary', label: 'Surat SP', tab: 'disciplinary' },
] as const;

export type EssPortalModuleKey = (typeof ESS_PORTAL_MODULES)[number]['key'];

export type EssPortalConfig = {
  modules: Record<EssPortalModuleKey, boolean>;
  requireFaceEnrollment: boolean;
  announcement: string;
  updatedAt: string | null;
};

export function defaultEssPortalModules(): Record<EssPortalModuleKey, boolean> {
  return Object.fromEntries(ESS_PORTAL_MODULES.map((m) => [m.key, true])) as Record<EssPortalModuleKey, boolean>;
}

export function parseEssPortalConfig(raw: unknown): EssPortalConfig {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : {};
  const defaults = defaultEssPortalModules();
  const modules = { ...defaults };
  if (src.modules && typeof src.modules === 'object') {
    for (const key of Object.keys(defaults) as EssPortalModuleKey[]) {
      if (typeof src.modules[key] === 'boolean') modules[key] = src.modules[key];
    }
  }
  const announcement = String(src.announcement || '').trim().slice(0, 280);
  return {
    modules,
    requireFaceEnrollment: src.requireFaceEnrollment !== false,
    announcement,
    updatedAt: src.updatedAt ? String(src.updatedAt) : null,
  };
}

export function isEssModuleEnabled(config: EssPortalConfig | null | undefined, key: string): boolean {
  if (!config) return true;
  if (!(key in config.modules)) return true;
  return Boolean(config.modules[key as EssPortalModuleKey]);
}

export async function getEssPortalConfig(tenantId: string): Promise<EssPortalConfig> {
  if (!sequelize || !tenantId) return parseEssPortalConfig(null);
  try {
    const cols = await getTenantColumns();
    if (!cols.has('settings')) return parseEssPortalConfig(null);
    const [rows] = await sequelize.query(
      `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
      { replacements: { id: tenantId } },
    );
    const settings = parseTenantSettings(rows?.[0]?.settings);
    return parseEssPortalConfig(settings.ess_portal);
  } catch {
    return parseEssPortalConfig(null);
  }
}

export async function saveEssPortalConfig(
  tenantId: string,
  patch: Partial<EssPortalConfig>,
): Promise<EssPortalConfig> {
  if (!sequelize) throw new Error('Database unavailable');
  const cols = await getTenantColumns();
  if (!cols.has('settings')) throw new Error('Kolom settings tidak tersedia');

  const current = await getEssPortalConfig(tenantId);
  const next = parseEssPortalConfig({
    ...current,
    ...patch,
    modules: { ...current.modules, ...(patch.modules || {}) },
    updatedAt: new Date().toISOString(),
  });

  const setUpdated = cols.has('updated_at') ? ', updated_at = NOW()' : '';
  const merged = await withDbSavepoint(sequelize, async () => {
    await sequelize.query(
      `UPDATE tenants
       SET settings = (
         COALESCE(settings::jsonb, '{}'::jsonb)
         || jsonb_build_object('ess_portal', CAST(:portal AS jsonb))
       )${setUpdated}
       WHERE id = :id`,
      { replacements: { id: tenantId, portal: JSON.stringify(next) } },
    );
    return true;
  }, 'ess_portal_cfg');

  if (!merged) {
    const [rows] = await sequelize.query(
      `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
      { replacements: { id: tenantId } },
    );
    const settings = parseTenantSettings(rows?.[0]?.settings);
    settings.ess_portal = next;
    await sequelize.query(
      `UPDATE tenants SET settings = CAST(:settings AS jsonb)${setUpdated} WHERE id = :id`,
      { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
    );
  }

  return next;
}

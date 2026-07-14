/**
 * Humanify SaaS — tenant onboarding wizard state (stored in tenants.settings JSON).
 */
import { getTenantColumns, parseTenantSettings } from './tenant-schema';
import { resolveTenantById } from './tenant-slug';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export const SAAS_ONBOARDING_STEPS = [
  { key: 'company', title: 'Profil Perusahaan', order: 1 },
  { key: 'organization', title: 'Struktur Organisasi', order: 2 },
  { key: 'policies', title: 'Kebijakan Dasar', order: 3 },
  { key: 'launch', title: 'Go Live', order: 4 },
] as const;

export type SaasOnboardingStepKey = (typeof SAAS_ONBOARDING_STEPS)[number]['key'];

export interface SaasOnboardingState {
  step: number;
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
  company?: Record<string, unknown>;
  organization?: Record<string, unknown>;
  policies?: Record<string, unknown>;
}

async function loadTenantRow(tenantId: string) {
  if (!sequelize) return null;
  const [rows] = await sequelize.query(
    `SELECT * FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  return rows?.[0] || null;
}

export function readSaasOnboarding(settings: unknown): SaasOnboardingState | null {
  const parsed = parseTenantSettings(settings);
  const ob = parsed?.saas_onboarding;
  if (!ob || typeof ob !== 'object') return null;
  return ob as SaasOnboardingState;
}

/** Legacy tenants without saas_onboarding are treated as already set up. */
export async function isSaasOnboardingComplete(tenantId: string | null | undefined): Promise<boolean> {
  if (!tenantId || !sequelize) return true;
  const cols = await getTenantColumns();
  const row = await loadTenantRow(tenantId);
  if (!row) return true;

  const ob = readSaasOnboarding(row.settings);
  if (ob?.completed) return true;

  if (cols.has('setup_completed') && row.setup_completed === true) return true;

  // No wizard record → existing tenant before Phase 1
  if (!ob) return true;

  return false;
}

export async function getSaasOnboardingStatus(tenantId: string) {
  const cols = await getTenantColumns();
  const row = await loadTenantRow(tenantId);
  if (!row) throw new Error('Tenant not found');

  const ob = readSaasOnboarding(row.settings) || {
    step: 1,
    completed: false,
    startedAt: new Date().toISOString(),
  };

  const tenant = await resolveTenantById(tenantId);
  const trialEndsAt =
    cols.has('subscription_end') && row.subscription_end
      ? row.subscription_end
      : cols.has('trial_ends_at') && row.trial_ends_at
        ? row.trial_ends_at
        : null;

  return {
    step: ob.step || 1,
    totalSteps: SAAS_ONBOARDING_STEPS.length,
    completed: ob.completed || false,
    saasOnboarding: ob,
    tenant: {
      id: tenantId,
      name: tenant?.name || row.name,
      slug: tenant?.slug || row.slug,
      status: tenant?.status || row.status,
      careersUrl: tenant?.slug ? `/c/${tenant.slug}/careers` : null,
    },
    trialEndsAt,
  };
}

async function persistSettings(tenantId: string, settings: Record<string, any>) {
  const cols = await getTenantColumns();
  if (!cols.has('settings')) {
    throw new Error('Kolom settings tidak tersedia di database');
  }
  await sequelize.query(
    `UPDATE tenants SET settings = CAST(:settings AS jsonb), updated_at = NOW() WHERE id = :id`,
    { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
  );
}

export async function saveSaasOnboardingStep(
  tenantId: string,
  stepKey: SaasOnboardingStepKey,
  data: Record<string, unknown>,
) {
  const row = await loadTenantRow(tenantId);
  if (!row) throw new Error('Tenant not found');

  const settings = parseTenantSettings(row.settings);
  const current: SaasOnboardingState = readSaasOnboarding(settings) || {
    step: 1,
    completed: false,
    startedAt: new Date().toISOString(),
  };

  const stepMeta = SAAS_ONBOARDING_STEPS.find((s) => s.key === stepKey);
  if (!stepMeta) throw new Error('Invalid step');

  (current as any)[stepKey] = data;
  current.step = Math.max(current.step || 1, stepMeta.order + 1);
  current.completed = false;

  settings.saas_onboarding = current;
  await persistSettings(tenantId, settings);

  const cols = await getTenantColumns();
  if (cols.has('onboarding_step')) {
    await sequelize.query(
      `UPDATE tenants SET onboarding_step = :step, updated_at = NOW() WHERE id = :id`,
      { replacements: { id: tenantId, step: stepMeta.order } },
    );
  }

  return getSaasOnboardingStatus(tenantId);
}

export async function completeSaasOnboarding(tenantId: string) {
  const row = await loadTenantRow(tenantId);
  if (!row) throw new Error('Tenant not found');

  const settings = parseTenantSettings(row.settings);
  const current: SaasOnboardingState = readSaasOnboarding(settings) || {
    step: SAAS_ONBOARDING_STEPS.length,
    completed: false,
    startedAt: new Date().toISOString(),
  };

  current.completed = true;
  current.completedAt = new Date().toISOString();
  current.step = SAAS_ONBOARDING_STEPS.length;
  settings.saas_onboarding = current;

  // Store HR defaults for later module seeding
  settings.hris_defaults = {
    departments: current.organization?.departments || ['HR', 'Finance', 'Operations', 'IT'],
    workDays: current.policies?.workDays || [1, 2, 3, 4, 5],
    defaultShift: current.policies?.defaultShift || '09:00-18:00',
    leaveTypes: current.policies?.leaveTypes || ['annual', 'sick'],
    seededAt: new Date().toISOString(),
  };

  await persistSettings(tenantId, settings);

  const cols = await getTenantColumns();
  const sets: string[] = [`updated_at = NOW()`];
  const replacements: Record<string, unknown> = { id: tenantId };

  if (cols.has('setup_completed')) {
    sets.push('setup_completed = true');
  }
  if (cols.has('onboarding_step')) {
    sets.push('onboarding_step = 99');
    replacements.step = 99;
  }
  if (cols.has('status')) {
    sets.push(`status = 'trial'`);
  }
  if (cols.has('subscription_plan')) {
    sets.push(`subscription_plan = 'trial'`);
  }
  if (cols.has('subscription_start')) {
    sets.push('subscription_start = NOW()');
  }
  if (cols.has('subscription_end')) {
    sets.push(`subscription_end = NOW() + INTERVAL '14 days'`);
  }
  if (cols.has('trial_ends_at')) {
    sets.push(`trial_ends_at = NOW() + INTERVAL '14 days'`);
  }

  await sequelize.query(
    `UPDATE tenants SET ${sets.join(', ')} WHERE id = :id`,
    { replacements },
  );

  return getSaasOnboardingStatus(tenantId);
}

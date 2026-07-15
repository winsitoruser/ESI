/**
 * Humanify SaaS Phase 10 — self-serve plan change (upgrade routes to checkout,
 * downgrade applied immediately with seat guardrails).
 */
import {
  getPlanDefinition,
  normalizeHumanifyPlan,
  type HumanifyPlanId,
} from './plan-entitlements';
import { getTenantColumns } from './tenant-schema';
import { countTenantSeats } from './seat-metering';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

const PLAN_RANK: Record<HumanifyPlanId, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  enterprise: 3,
};

export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'same';

export interface PlanChangePreview {
  currentPlan: HumanifyPlanId;
  targetPlan: HumanifyPlanId;
  direction: PlanChangeDirection;
  seats: { users: number; employees: number };
  targetMaxUsers: number;
  targetMaxEmployees: number;
  fits: boolean;
  blockers: string[];
  requiresCheckout: boolean;
}

async function readTenantPlan(tenantId: string): Promise<HumanifyPlanId> {
  if (!sequelize) return 'enterprise';
  const cols = await getTenantColumns();
  if (!cols.has('subscription_plan')) return 'enterprise';
  const [rows] = await sequelize.query(
    `SELECT subscription_plan FROM tenants WHERE id = :id LIMIT 1`,
    { replacements: { id: tenantId } },
  );
  return normalizeHumanifyPlan(rows?.[0]?.subscription_plan);
}

export async function previewPlanChange(
  tenantId: string,
  targetRaw: string,
): Promise<PlanChangePreview> {
  const currentPlan = await readTenantPlan(tenantId);
  const targetPlan = normalizeHumanifyPlan(targetRaw);
  const targetDef = getPlanDefinition(targetPlan);
  const seats = await countTenantSeats(tenantId);

  const direction: PlanChangeDirection =
    PLAN_RANK[targetPlan] > PLAN_RANK[currentPlan]
      ? 'upgrade'
      : PLAN_RANK[targetPlan] < PLAN_RANK[currentPlan]
        ? 'downgrade'
        : 'same';

  const blockers: string[] = [];
  if (targetPlan === 'trial') {
    blockers.push('Tidak bisa turun ke Trial. Gunakan penutupan akun untuk berhenti berlangganan.');
  }
  if (seats.employees > targetDef.maxEmployees) {
    blockers.push(`Karyawan aktif ${seats.employees} melebihi batas paket ${targetDef.name} (${targetDef.maxEmployees}).`);
  }
  if (seats.users > targetDef.maxUsers) {
    blockers.push(`User ${seats.users} melebihi batas paket ${targetDef.name} (${targetDef.maxUsers}).`);
  }

  const fits = blockers.length === 0;
  // Upgrades to a higher paid tier require payment via checkout.
  const requiresCheckout = direction === 'upgrade' && targetPlan !== 'trial';

  return {
    currentPlan,
    targetPlan,
    direction,
    seats,
    targetMaxUsers: targetDef.maxUsers,
    targetMaxEmployees: targetDef.maxEmployees,
    fits,
    blockers,
    requiresCheckout,
  };
}

export interface PlanChangeResult {
  applied: boolean;
  requiresCheckout: boolean;
  currentPlan: HumanifyPlanId;
  targetPlan: HumanifyPlanId;
  direction: PlanChangeDirection;
  blockers: string[];
  message: string;
}

export async function applyPlanChange(
  tenantId: string,
  targetRaw: string,
): Promise<PlanChangeResult> {
  if (!sequelize) throw new Error('Database unavailable');
  const preview = await previewPlanChange(tenantId, targetRaw);
  const base: Omit<PlanChangeResult, 'applied' | 'message'> = {
    requiresCheckout: preview.requiresCheckout,
    currentPlan: preview.currentPlan,
    targetPlan: preview.targetPlan,
    direction: preview.direction,
    blockers: preview.blockers,
  };

  if (preview.direction === 'same') {
    return { ...base, applied: false, message: 'Paket sudah aktif.' };
  }
  if (preview.targetPlan === 'trial') {
    return { ...base, applied: false, message: preview.blockers[0] || 'Target tidak valid.' };
  }
  if (preview.requiresCheckout) {
    return {
      ...base,
      applied: false,
      message: 'Upgrade memerlukan pembayaran — lanjutkan via checkout.',
    };
  }
  if (!preview.fits) {
    return {
      ...base,
      applied: false,
      message: preview.blockers[0] || 'Kuota melebihi batas paket tujuan.',
    };
  }

  const cols = await getTenantColumns();
  if (!cols.has('subscription_plan')) {
    throw new Error('Kolom subscription_plan tidak tersedia');
  }
  await sequelize.query(
    `UPDATE tenants SET subscription_plan = :plan, updated_at = NOW() WHERE id = :id`,
    { replacements: { plan: preview.targetPlan, id: tenantId } },
  );

  return {
    ...base,
    applied: true,
    message: `Paket diturunkan ke ${preview.targetPlan}. Perubahan berlaku segera.`,
  };
}

/**
 * Humanify SaaS Phase 10 — self-serve plan change (upgrade routes to checkout,
 * downgrade applied immediately with seat guardrails).
 */
import {
  getPlanDefinition,
  HUMANIFY_PLANS,
  normalizeHumanifyPlan,
  type HumanifyPlanId,
} from './plan-entitlements';
import { getTenantColumns } from './tenant-schema';
import { countTenantSeats } from './seat-metering';
import { splitInclusivePpn } from './humanify-billing';

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
  /** Rough unused-time credit when downgrading mid-cycle (IDR, tax-inclusive). */
  proration?: {
    daysRemaining: number;
    cycleDays: number;
    currentMonthlyIdr: number;
    targetMonthlyIdr: number;
    creditIdr: number;
    note: string;
  } | null;
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

  let proration: PlanChangePreview['proration'] = null;
  if (direction === 'downgrade' && fits && sequelize) {
    const cols = await getTenantColumns();
    let daysRemaining = 0;
    const cycleDays = 30;
    if (cols.has('subscription_end')) {
      const [rows] = await sequelize.query(
        `SELECT subscription_end FROM tenants WHERE id = :id LIMIT 1`,
        { replacements: { id: tenantId } },
      );
      const end = rows?.[0]?.subscription_end ? new Date(rows[0].subscription_end) : null;
      if (end && end.getTime() > Date.now()) {
        daysRemaining = Math.max(0, Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
      }
    }
    if (!daysRemaining) daysRemaining = Math.floor(cycleDays / 2); // assume mid-cycle if no end date
    const currentMonthlyIdr = HUMANIFY_PLANS[currentPlan]?.priceMonthlyIdr || 0;
    const targetMonthlyIdr = HUMANIFY_PLANS[targetPlan]?.priceMonthlyIdr || 0;
    const delta = Math.max(0, currentMonthlyIdr - targetMonthlyIdr);
    const creditIdr = Math.round((delta * daysRemaining) / cycleDays);
    const money = splitInclusivePpn(creditIdr);
    proration = {
      daysRemaining,
      cycleDays,
      currentMonthlyIdr,
      targetMonthlyIdr,
      creditIdr,
      note: creditIdr > 0
        ? `Perkiraan kredit pro-rata ~${creditIdr.toLocaleString('id-ID')} IDR (termasuk PPN ~${money.tax.toLocaleString('id-ID')}) untuk ${daysRemaining} hari sisa siklus. Kredit dicatat di akun; cairkan via support bila perlu refund.`
        : 'Tidak ada kredit pro-rata (selisih harga 0 atau siklus habis).',
    };
  }

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
    proration,
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

  // Persist estimated proration credit on tenant settings for ops/support.
  if (preview.proration?.creditIdr) {
    try {
      const cols = await getTenantColumns();
      if (cols.has('settings')) {
        const [rows] = await sequelize.query(
          `SELECT settings FROM tenants WHERE id = :id LIMIT 1`,
          { replacements: { id: tenantId } },
        );
        const settings = typeof rows?.[0]?.settings === 'string'
          ? JSON.parse(rows[0].settings || '{}')
          : (rows?.[0]?.settings || {});
        settings.billingCredits = settings.billingCredits || [];
        settings.billingCredits.push({
          at: new Date().toISOString(),
          type: 'downgrade_proration',
          from: preview.currentPlan,
          to: preview.targetPlan,
          creditIdr: preview.proration.creditIdr,
          daysRemaining: preview.proration.daysRemaining,
        });
        await sequelize.query(
          `UPDATE tenants SET settings = CAST(:settings AS jsonb) WHERE id = :id`,
          { replacements: { id: tenantId, settings: JSON.stringify(settings) } },
        );
      }
    } catch { /* ignore credit persist errors */ }
  }

  return {
    ...base,
    applied: true,
    message: preview.proration?.creditIdr
      ? `Paket diturunkan ke ${preview.targetPlan}. Kredit pro-rata ~Rp ${preview.proration.creditIdr.toLocaleString('id-ID')} dicatat.`
      : `Paket diturunkan ke ${preview.targetPlan}. Perubahan berlaku segera.`,
  };
}

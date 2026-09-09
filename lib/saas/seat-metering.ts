/**
 * Humanify SaaS Phase 6 — seat / headcount metering vs plan limits
 */
import {
  getPlanDefinition,
  normalizeHumanifyPlan,
  type HumanifyPlanId,
} from './plan-entitlements';
import { resolveTenantPlan } from './assert-feature';
import { withDbSavepoint, safeQueryWithSavepoint } from './tenant-request-bound';
import { readTenantBillingState } from './seat-pricing';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

async function tableExists(name: string): Promise<boolean> {
  if (!sequelize) return false;
  const rows = await safeQueryWithSavepoint(
    sequelize,
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :name LIMIT 1`,
    { name },
    'seat_table_exists',
  );
  return Boolean(rows?.length);
}

export interface SeatUsage {
  planId: HumanifyPlanId;
  users: number;
  employees: number;
  maxUsers: number;
  maxEmployees: number;
  usersPct: number;
  employeesPct: number;
  nearLimit: boolean;
  overLimit: boolean;
  upgradeHint?: string;
}

export async function countTenantSeats(tenantId: string): Promise<{ users: number; employees: number }> {
  if (!sequelize || !tenantId) return { users: 0, employees: 0 };

  let users = 0;
  let employees = 0;

  // Prefer isActive column; fall back without poisoning request-bound TX.
  const withActive = await withDbSavepoint(sequelize, async () => {
    const [u] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM users
       WHERE tenant_id = :tid
         AND COALESCE("isActive", true) = true`,
      { replacements: { tid: tenantId } },
    );
    return u?.[0]?.c ?? 0;
  }, 'seat_users_active');

  if (withActive != null) {
    users = withActive;
  } else {
    const rows = await safeQueryWithSavepoint(
      sequelize,
      `SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = :tid`,
      { tid: tenantId },
      'seat_users_plain',
    );
    users = rows?.[0]?.c || 0;
  }

  try {
    if (await tableExists('employees')) {
      const rows = await safeQueryWithSavepoint(
        sequelize,
        `SELECT COUNT(*)::int AS c FROM employees
         WHERE tenant_id = :tid
           AND COALESCE(is_active, true) = true
           AND LOWER(COALESCE(status, 'active'))
               NOT IN ('inactive', 'terminated', 'resigned', 'exited', 'offboarded')`,
        { tid: tenantId },
        'seat_employees',
      );
      employees = rows?.[0]?.c || 0;
    } else if (await tableExists('hris_employees')) {
      const rows = await safeQueryWithSavepoint(
        sequelize,
        `SELECT COUNT(*)::int AS c FROM hris_employees WHERE tenant_id = :tid`,
        { tid: tenantId },
        'seat_hris_employees',
      );
      employees = rows?.[0]?.c || 0;
    }
  } catch { /* */ }

  return { users, employees };
}

export async function getSeatUsage(
  tenantId: string,
  planRaw?: string | null,
): Promise<SeatUsage | null> {
  if (!tenantId) return null;
  const planId = normalizeHumanifyPlan(planRaw ?? (await resolveTenantPlan(tenantId)));
  const def = getPlanDefinition(planId);
  const { users, employees } = await countTenantSeats(tenantId);
  let billedSeats: number | null = null;
  try {
    billedSeats = (await readTenantBillingState(tenantId)).billedSeats;
  } catch { /* */ }
  const maxEmployees = billedSeats && billedSeats > 0 ? billedSeats : def.maxEmployees;
  const maxUsers = billedSeats && billedSeats > 0 ? Math.max(def.maxUsers, billedSeats) : def.maxUsers;
  const usersPct = maxUsers > 0 ? Math.round((users / maxUsers) * 100) : 0;
  const employeesPct = maxEmployees > 0 ? Math.round((employees / maxEmployees) * 100) : 0;
  const overLimit = users > maxUsers || employees > maxEmployees;
  const nearLimit = !overLimit && (usersPct >= 80 || employeesPct >= 80);
  const upgradeHint =
    overLimit || nearLimit
      ? 'Kuota kursi langganan hampir penuh. Tambah kursi di /humanify/billing'
      : undefined;

  return {
    planId,
    users,
    employees,
    maxUsers,
    maxEmployees,
    usersPct,
    employeesPct,
    nearLimit,
    overLimit,
    upgradeHint,
  };
}

/** Soft-block creating another employee when over maxEmployees (platform ops bypass). */
export async function assertEmployeeSeatAvailable(
  tenantId: string | null | undefined,
  role?: string | null,
): Promise<{ ok: true } | { ok: false; status: number; body: Record<string, unknown> }> {
  const r = String(role || '').toLowerCase();
  if (['super_admin', 'superadmin', 'platform_admin'].includes(r)) return { ok: true };
  if (!tenantId) return { ok: true };

  const usage = await getSeatUsage(tenantId);
  if (!usage) return { ok: true };
  if (usage.employees < usage.maxEmployees) return { ok: true };

  return {
    ok: false,
    status: 403,
    body: {
      success: false,
      error: 'SEAT_LIMIT_EMPLOYEES',
      message: `Batas kursi langganan tercapai (${usage.employees}/${usage.maxEmployees}). Tambah kursi di Billing.`,
      seats: usage,
      upgradePath: '/humanify/billing',
    },
  };
}

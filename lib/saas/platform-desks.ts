/**
 * Admin Total — internal desk RBAC (spec §14–15).
 * Session role super_admin always has full access.
 * platform_admin without a desk row also has full access (compat).
 */
import { logAdminAction } from '@/lib/saas/admin-audit';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export const STAFF_DESKS = [
  'super', 'management', 'finance', 'marketing', 'sales', 'cs', 'product', 'it',
] as const;
export type StaffDesk = (typeof STAFF_DESKS)[number];

export const DESK_LABEL: Record<StaffDesk, string> = {
  super: 'Super Admin',
  management: 'Management',
  finance: 'Finance',
  marketing: 'Marketing',
  sales: 'Sales',
  cs: 'Customer Service',
  product: 'Product',
  it: 'IT / Developer',
};

export const PERMISSIONS = [
  'users.view',
  'users.edit',
  'clients.view',
  'clients.edit',
  'billing.view',
  'billing.edit',
  'billing.refund',
  'finance.view',
  'finance.refund',
  'crm.view',
  'crm.edit',
  'marketing.view',
  'marketing.edit',
  'content.view',
  'content.publish',
  'approvals.decide',
  'system.view',
  'audit.view',
  'roles.assign',
] as const;
export type StaffPermission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL: Record<StaffPermission, string> = {
  'users.view': 'Lihat pengguna',
  'users.edit': 'Ubah / suspend user',
  'clients.view': 'Lihat klien',
  'clients.edit': 'Ubah klien / plan / trial',
  'billing.view': 'Lihat billing',
  'billing.edit': 'Ubah paket & voucher',
  'billing.refund': 'Refund (billing)',
  'finance.view': 'Lihat finance',
  'finance.refund': 'Refund finance',
  'crm.view': 'Lihat CRM',
  'crm.edit': 'Ubah pipeline',
  'marketing.view': 'Lihat campaign',
  'marketing.edit': 'Ubah campaign',
  'content.view': 'Lihat CMS',
  'content.publish': 'Publish konten',
  'approvals.decide': 'Putuskan approval',
  'system.view': 'Lihat sistem',
  'audit.view': 'Lihat audit',
  'roles.assign': 'Assign desk staf',
};

const ALL = PERMISSIONS;

export const DESK_GRANTS: Record<StaffDesk, readonly StaffPermission[] | 'all'> = {
  super: 'all',
  management: 'all',
  finance: [
    'users.view', 'clients.view', 'billing.view', 'billing.refund',
    'finance.view', 'finance.refund', 'approvals.decide', 'audit.view',
  ],
  marketing: [
    'users.view', 'clients.view', 'marketing.view', 'marketing.edit',
    'content.view', 'content.publish',
  ],
  sales: [
    'users.view', 'clients.view', 'clients.edit', 'crm.view', 'crm.edit', 'marketing.view',
  ],
  cs: [
    'users.view', 'users.edit', 'clients.view', 'billing.view', 'crm.view', 'content.view',
  ],
  product: [
    'users.view', 'clients.view', 'billing.view', 'billing.edit', 'content.view', 'content.publish',
  ],
  it: ['users.view', 'system.view', 'audit.view'],
};

export function isStaffDesk(raw: unknown): raw is StaffDesk {
  return (STAFF_DESKS as readonly string[]).includes(String(raw || '').toLowerCase());
}

export function deskHasPermission(desk: StaffDesk | null | undefined, permission: StaffPermission): boolean {
  if (!desk) return true;
  const grants = DESK_GRANTS[desk];
  if (grants === 'all') return true;
  return grants.includes(permission);
}

export function permissionMatrix(): Array<{
  permission: StaffPermission;
  label: string;
  desks: Record<StaffDesk, boolean>;
}> {
  return PERMISSIONS.map((permission) => ({
    permission,
    label: PERMISSION_LABEL[permission],
    desks: Object.fromEntries(
      STAFF_DESKS.map((d) => [d, deskHasPermission(d, permission)]),
    ) as Record<StaffDesk, boolean>,
  }));
}

/** Map mutating platform API actions → permission. GET is always allowed. */
export function permissionForAction(action: string, method: string): StaffPermission | null {
  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD') return null;
  const a = String(action || '');
  if (a === 'user-status') return 'users.edit';
  if (a === 'tenant-status' || a === 'tenant-plan' || a === 'tenant-create' || a === 'tenant-profile' || a === 'extend-trial' || a === 'impersonate') {
    return 'clients.edit';
  }
  if (a === 'plan-catalog' || a === 'billing-voucher-create' || a === 'billing-voucher-toggle' || a === 'billing-mark-paid') {
    return 'billing.edit';
  }
  if (a === 'finance-refund' || a === 'billing-cancel') return 'finance.refund';
  if (a === 'approval-decide') return 'approvals.decide';
  if (a === 'crm-lead') return 'crm.edit';
  if (a === 'campaign') return 'marketing.edit';
  if (a === 'faq-advance' || a === 'faq-unpublish' || a === 'article-advance' || a === 'article-unpublish') {
    return 'content.publish';
  }
  if (a === 'faq' || a === 'article' || a === 'banner') return 'content.view';
  if (a === 'staff-desk') return 'roles.assign';
  if (a === 'cleanup-qa' || a === 'archive-qa') return 'system.view';
  return null;
}

export async function ensureStaffDesksTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_platform_desks (
      user_id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255),
      desk VARCHAR(32) NOT NULL DEFAULT 'cs',
      updated_by VARCHAR(160),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  ready = true;
}

export type StaffDeskRow = {
  userId: string;
  email: string | null;
  desk: StaffDesk;
  updatedBy: string | null;
  updatedAt: string;
};

export async function getDeskForUser(userId: string | null | undefined): Promise<StaffDesk | null> {
  if (!sequelize || !userId) return null;
  await ensureStaffDesksTable();
  const [rows] = await sequelize.query(
    `SELECT desk FROM saas_platform_desks WHERE user_id = :id LIMIT 1`,
    { replacements: { id: String(userId) } },
  );
  const desk = rows?.[0]?.desk;
  return isStaffDesk(desk) ? desk : null;
}

export async function listStaffDesks(): Promise<StaffDeskRow[]> {
  if (!sequelize) return [];
  await ensureStaffDesksTable();
  const [rows] = await sequelize.query(
    `SELECT user_id, email, desk, updated_by, updated_at FROM saas_platform_desks ORDER BY updated_at DESC`,
  );
  return (rows || []).map((r: any) => ({
    userId: String(r.user_id),
    email: r.email || null,
    desk: isStaffDesk(r.desk) ? r.desk : 'cs',
    updatedBy: r.updated_by || null,
    updatedAt: r.updated_at,
  }));
}

export async function setStaffDesk(input: {
  userId: string;
  email?: string | null;
  desk: string;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<StaffDeskRow> {
  if (!sequelize) throw new Error('Database unavailable');
  const userId = String(input.userId || '').trim();
  if (!userId) throw new Error('userId wajib');
  const desk: StaffDesk = isStaffDesk(input.desk) ? input.desk : 'cs';
  await ensureStaffDesksTable();
  await sequelize.query(`
    INSERT INTO saas_platform_desks (user_id, email, desk, updated_by)
    VALUES (:id, :email, :desk, :by)
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      desk = EXCLUDED.desk,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
  `, {
    replacements: {
      id: userId,
      email: String(input.email || '').trim().toLowerCase() || null,
      desk,
      by: input.actorEmail || null,
    },
  });
  await logAdminAction({
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    action: 'roles.assign',
    resourceType: 'staff_desk',
    resourceId: userId,
    ip: input.ip,
    meta: { desk },
  });
  return {
    userId,
    email: input.email || null,
    desk,
    updatedBy: input.actorEmail || null,
    updatedAt: new Date().toISOString(),
  };
}

export async function operatorMay(
  sessionUser: { id?: unknown; role?: unknown } | null | undefined,
  permission: StaffPermission,
): Promise<boolean> {
  const role = String(sessionUser?.role || '').toLowerCase();
  if (role === 'super_admin' || role === 'superadmin') return true;
  const desk = await getDeskForUser(sessionUser?.id != null ? String(sessionUser.id) : null);
  return deskHasPermission(desk, permission);
}

void ALL;

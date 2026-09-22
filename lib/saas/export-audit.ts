/**
 * SEC-ABU-005 — export permission helper + dedicated audit trail.
 * Reuses saas_admin_audit via logAdminAction; adds row-count / format meta.
 */
import type { NextApiRequest } from 'next';
import { logAdminAction } from '@/lib/saas/admin-audit';

const EXPORT_ROLES = new Set([
  'owner',
  'hq_admin',
  'hr_admin',
  'finance',
  'finance_admin',
  'super_admin',
  'superadmin',
  'platform_admin',
  'platform_ops',
]);

export function canExportSensitiveData(role: string | null | undefined): boolean {
  return EXPORT_ROLES.has(String(role || '').toLowerCase());
}

export async function logDataExport(opts: {
  req?: NextApiRequest;
  tenantId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  exportType: string;
  format?: string;
  rowCount?: number;
  resourceType?: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const ip =
    (opts.req?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    opts.req?.socket?.remoteAddress ||
    null;

  await logAdminAction({
    tenantId: opts.tenantId,
    actorUserId: opts.actorUserId,
    actorEmail: opts.actorEmail,
    action: `export.${opts.exportType}`,
    resourceType: opts.resourceType || 'export',
    resourceId: opts.resourceId || null,
    meta: {
      format: opts.format || 'json',
      rowCount: opts.rowCount ?? null,
      ...(opts.meta || {}),
    },
    ip,
  });
}

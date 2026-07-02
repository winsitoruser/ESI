/**
 * Reusable audit logger for CRM/SFA modules.
 * Import this in any API handler to log create/update/delete actions.
 *
 * Usage:
 *   import { logAudit } from '@/lib/audit/auditLogger';
 *   await logAudit({ tenantId, userId, userName, action: 'create', entityType: 'crm_customer', entityId: custId, newValues: body, req });
 */

import type { NextApiRequest } from 'next';

let sequelize: any = null;
try { sequelize = require('../sequelize'); } catch (e) {}

interface AuditParams {
  tenantId: string | null;
  userId: number | string | null;
  userName?: string;
  action: 'create' | 'update' | 'delete' | 'convert' | 'assign' | 'status_change' | 'import' | 'export' | 'approve' | 'reject' | 'link' | 'resolve';
  entityType: string;
  entityId?: string | number | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  metadata?: Record<string, any>;
  req?: NextApiRequest;
}

export async function logAudit(params: AuditParams): Promise<boolean> {
  if (!sequelize) return false;
  try {
    const ip = params.req
      ? (params.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || params.req.socket?.remoteAddress || ''
      : '';
    const ua = params.req?.headers['user-agent'] || '';

    const meta = {
      ...(params.metadata || {}),
      userName: params.userName || 'System',
    };

    await sequelize.query(`
      INSERT INTO audit_logs (tenant_id, user_id, user_name, action, entity_type, entity_id,
        old_values, new_values, ip_address, user_agent, metadata, created_at)
      VALUES (:tid, :uid, :uname, :action, :et, :eid, :old, :new, :ip, :ua, :meta, NOW())
    `, {
      replacements: {
        tid: params.tenantId,
        uid: params.userId,
        uname: params.userName || 'System',
        action: params.action,
        et: params.entityType,
        eid: params.entityId || null,
        old: params.oldValues ? JSON.stringify(params.oldValues) : null,
        new: params.newValues ? JSON.stringify(params.newValues) : null,
        ip,
        ua,
        meta: JSON.stringify(meta),
      }
    });
    return true;
  } catch (e: any) {
    console.error('Audit log error:', e.message);
    return false;
  }
}

/**
 * Compute a diff between old and new values, returning only changed fields.
 */
export function computeDiff(oldValues: Record<string, any>, newValues: Record<string, any>): {
  changed: Record<string, { from: any; to: any }>;
  hasChanges: boolean;
} {
  const changed: Record<string, { from: any; to: any }> = {};
  const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);

  for (const key of allKeys) {
    if (['updated_at', 'created_at'].includes(key)) continue;
    const oldVal = oldValues?.[key];
    const newVal = newValues?.[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed[key] = { from: oldVal, to: newVal };
    }
  }

  return { changed, hasChanges: Object.keys(changed).length > 0 };
}

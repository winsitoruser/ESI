// =======================================================================
// Audit helper untuk event Role & Privilege
// =======================================================================
// Menulis ke tabel `audit_logs` via AuditLog model bila DB tersedia.
// Jika DB tidak tersedia, jatuh ke `audit-memory` (ring buffer in-memory)
// agar halaman admin tetap bisa menampilkan aktivitas terbaru selama dev.
// =======================================================================

import type { NextApiRequest } from 'next';

export type RoleAuditAction =
  | 'role.create'
  | 'role.update'
  | 'role.delete'
  | 'role.assign'
  | 'role.revoke'
  | 'permission.grant'
  | 'permission.revoke';

export interface RoleAuditEntry {
  id: string;
  action: RoleAuditAction;
  actorId: string | number | null;
  actorName: string | null;
  actorRole: string | null;
  targetType: 'role' | 'user' | 'permission';
  targetId: string | null;
  targetLabel: string | null;
  oldValues?: any;
  newValues?: any;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
}

const MEMORY_BUFFER_LIMIT = 200;
const memoryBuffer: RoleAuditEntry[] = [];

function pushMemory(entry: RoleAuditEntry) {
  memoryBuffer.unshift(entry);
  if (memoryBuffer.length > MEMORY_BUFFER_LIMIT) memoryBuffer.length = MEMORY_BUFFER_LIMIT;
}

export function getInMemoryAuditLog(): RoleAuditEntry[] {
  return [...memoryBuffer];
}

function getIpAddress(req?: NextApiRequest | null): string | null {
  if (!req) return null;
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  if (Array.isArray(xff)) return xff[0];
  return (req.socket as any)?.remoteAddress || null;
}

function getUserAgent(req?: NextApiRequest | null): string | null {
  if (!req) return null;
  const ua = req.headers['user-agent'];
  if (typeof ua === 'string') return ua;
  return null;
}

async function getModels(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../models');
    const db = mod?.default || mod;
    if (!db?.AuditLog) return null;
    return db;
  } catch {
    return null;
  }
}

interface LogOptions {
  req?: NextApiRequest | null;
  action: RoleAuditAction;
  targetType: RoleAuditEntry['targetType'];
  targetId?: string | null;
  targetLabel?: string | null;
  oldValues?: any;
  newValues?: any;
  details?: Record<string, any>;
}

export async function logRoleAudit(opts: LogOptions): Promise<RoleAuditEntry> {
  const session = opts.req ? (opts.req as any).session : null;
  const actor = session?.user || null;

  const entry: RoleAuditEntry = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: opts.action,
    actorId: actor?.id ?? actor?.email ?? null,
    actorName: actor?.name || null,
    actorRole: (actor?.role || null) as string | null,
    targetType: opts.targetType,
    targetId: opts.targetId || null,
    targetLabel: opts.targetLabel || null,
    oldValues: opts.oldValues,
    newValues: opts.newValues,
    details: opts.details,
    ipAddress: getIpAddress(opts.req),
    userAgent: getUserAgent(opts.req),
    timestamp: new Date().toISOString()
  };

  const db = await getModels();
  if (db?.AuditLog) {
    try {
      // Hanya set userId bila UUID (tipe kolom UUID di audit_logs).
      const userIdUuid = isUuid(entry.actorId) ? entry.actorId : null;
      const resourceUuid = isUuid(entry.targetId) ? entry.targetId : null;

      await db.AuditLog.create({
        userId: userIdUuid,
        action: opts.action,
        resource: opts.targetType,
        resourceId: resourceUuid,
        userRole: entry.actorRole,
        oldValues: opts.oldValues,
        newValues: opts.newValues,
        details: {
          ...opts.details,
          targetLabel: entry.targetLabel,
          actorId: entry.actorId,
          actorName: entry.actorName,
          module: 'role_privilege'
        },
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        isHqIntervention: false,
        affectedRecords: 1
      });
      entry.id = `db_${entry.timestamp}`;
      // Mirror juga ke memory supaya halaman audit lokal bisa combine.
      pushMemory(entry);
      return entry;
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[audit] DB write failed, fallback memory:', err?.message);
      }
    }
  }

  pushMemory(entry);
  return entry;
}

function isUuid(v: any): boolean {
  return typeof v === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** Load audit logs (DB + memory merged). */
export async function listRoleAudit(opts?: { limit?: number; action?: RoleAuditAction }) {
  const limit = opts?.limit || 50;
  const db = await getModels();
  const rows: RoleAuditEntry[] = [];

  if (db?.AuditLog) {
    try {
      const where: any = {
        resource: ['role', 'user', 'permission']
      };
      if (opts?.action) where.action = opts.action;
      const records = await db.AuditLog.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit
      });
      records.forEach((r: any) => {
        rows.push({
          id: String(r.id),
          action: r.action as RoleAuditAction,
          actorId: r.details?.actorId ?? r.userId ?? null,
          actorName: r.details?.actorName || null,
          actorRole: r.userRole || null,
          targetType: (r.resource || 'role') as RoleAuditEntry['targetType'],
          targetId: r.resourceId || null,
          targetLabel: r.details?.targetLabel || null,
          oldValues: r.oldValues,
          newValues: r.newValues,
          details: r.details,
          ipAddress: r.ipAddress,
          userAgent: r.userAgent,
          timestamp: (r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString())
        });
      });
    } catch {/* ignore, fall back to memory */}
  }

  const merged = [...rows, ...memoryBuffer]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
  return merged;
}

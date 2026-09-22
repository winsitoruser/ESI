/**
 * Wave 7 — security monitoring helpers (SEC-MON-*)
 */
import { logAdminAction } from '@/lib/saas/admin-audit';

const exportHits = new Map<string, number[]>();

export async function emitSecurityEvent(opts: {
  tenantId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  event: string;
  severity?: 'info' | 'warn' | 'critical';
  meta?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId,
      actorEmail: opts.actorEmail,
      action: `security.${opts.event}`,
      resourceType: 'security',
      meta: { severity: opts.severity || 'info', ...(opts.meta || {}) },
      ip: opts.ip,
    });
  } catch { /* */ }

  try {
    const { logEvent } = await import('@/lib/observability');
    logEvent({
      level: opts.severity === 'critical' ? 'error' : opts.severity === 'warn' ? 'warn' : 'info',
      message: `security.${opts.event}`,
      meta: opts.meta,
    } as any);
  } catch { /* observability optional */ }
}

/** SEC-MON-012 — flag abnormal export velocity (≥ N exports / window). */
export function trackExportVelocity(opts: {
  tenantId: string;
  actorUserId: string;
  maxPerWindow?: number;
  windowMs?: number;
}): { abnormal: boolean; count: number } {
  const key = `${opts.tenantId}:${opts.actorUserId}`;
  const windowMs = opts.windowMs ?? 15 * 60_000;
  const max = opts.maxPerWindow ?? Number(process.env.HUMANIFY_EXPORT_VELOCITY_MAX || 8);
  const now = Date.now();
  const arr = (exportHits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  exportHits.set(key, arr);
  return { abnormal: arr.length >= max, count: arr.length };
}

export async function maybeAlertAbnormalExport(opts: {
  tenantId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  exportType: string;
  count: number;
}): Promise<void> {
  await emitSecurityEvent({
    tenantId: opts.tenantId,
    actorUserId: opts.actorUserId,
    actorEmail: opts.actorEmail,
    event: 'abnormal_export',
    severity: 'warn',
    meta: { exportType: opts.exportType, count: opts.count },
  });
}

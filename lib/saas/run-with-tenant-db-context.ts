/**
 * SEC-S4-2 — run background work inside tenant DB context (set_config).
 * Clears context after each tenant to keep pooled connections safe.
 */
import { clearDbTenantContext, setDbTenantContext } from '@/lib/saas/tenant-slug';

export type TenantJobFn<T = void> = (tenantId: string) => Promise<T>;

/**
 * Execute fn for one tenant with app.current_tenant set.
 */
export async function runWithTenantDbContext<T>(
  tenantId: string,
  fn: TenantJobFn<T>,
  opts?: { isSuperAdmin?: boolean },
): Promise<T> {
  await setDbTenantContext(tenantId, Boolean(opts?.isSuperAdmin), { isLocal: true });
  try {
    return await fn(tenantId);
  } finally {
    await clearDbTenantContext();
  }
}

/**
 * Loop tenants sequentially with isolated DB context each time.
 */
export async function forEachTenantWithDbContext<T>(
  tenantIds: string[],
  fn: TenantJobFn<T>,
): Promise<{ ok: number; failed: number; errors: Array<{ tenantId: string; error: string }> }> {
  let ok = 0;
  let failed = 0;
  const errors: Array<{ tenantId: string; error: string }> = [];
  for (const tid of tenantIds) {
    if (!tid) continue;
    try {
      await runWithTenantDbContext(tid, fn);
      ok += 1;
    } catch (e: any) {
      failed += 1;
      errors.push({ tenantId: tid, error: String(e?.message || e).slice(0, 200) });
    }
  }
  return { ok, failed, errors };
}

import { setDbTenantContext, clearDbTenantContext } from '@/lib/saas/tenant-slug';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';

export async function ensureTenantDbContext(session: any): Promise<void> {
  if (!session?.user) return;
  const role = String(session.user.role || '').toLowerCase();
  const isSuper =
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'platform_admin';
  const tenantId = tenantIdFromSession(session);
  await setDbTenantContext(tenantId, isSuper);
}

export async function releaseTenantDbContext(): Promise<void> {
  await clearDbTenantContext();
}

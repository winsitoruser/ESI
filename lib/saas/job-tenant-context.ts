/**
 * Wave 15 — SEC-TEN-011 verified tenant context for background jobs
 */
import { AsyncLocalStorage } from 'async_hooks';

export type JobTenantContext = {
  tenantId: string;
  jobName: string;
  actorUserId?: string | null;
  requestedAt: number;
};

const als = new AsyncLocalStorage<JobTenantContext>();

export function runWithTenantContext<T>(ctx: Omit<JobTenantContext, 'requestedAt'>, fn: () => T): T {
  if (!ctx.tenantId) throw new Error('JOB_TENANT_REQUIRED');
  return als.run({ ...ctx, requestedAt: Date.now() }, fn);
}

export async function runWithTenantContextAsync<T>(
  ctx: Omit<JobTenantContext, 'requestedAt'>,
  fn: () => Promise<T>,
): Promise<T> {
  if (!ctx.tenantId) throw new Error('JOB_TENANT_REQUIRED');
  return als.run({ ...ctx, requestedAt: Date.now() }, fn);
}

export function getJobTenantContext(): JobTenantContext | undefined {
  return als.getStore();
}

export function requireJobTenantId(): string {
  const c = als.getStore();
  if (!c?.tenantId) throw new Error('JOB_TENANT_MISSING');
  return c.tenantId;
}

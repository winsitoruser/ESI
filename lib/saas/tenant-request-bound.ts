/**
 * Request-bound Postgres tenant context for RLS.
 *
 * When HUMANIFY_RLS_REQUEST_BOUND=true, withHQAuth wraps each request in a
 * Sequelize transaction + CLS so set_config(..., true) (transaction-local)
 * applies to every query on that request — safe with connection pools.
 */
import { AsyncLocalStorage } from 'async_hooks';

type Store = { bound: boolean };
export const tenantRequestAls = new AsyncLocalStorage<Store>();

export function isTenantRequestBoundEnabled(): boolean {
  return String(process.env.HUMANIFY_RLS_REQUEST_BOUND || '').toLowerCase() === 'true';
}

/** Prefer transaction-local set_config when request-bound mode is on. */
export function tenantConfigIsLocal(): boolean {
  return isTenantRequestBoundEnabled() || tenantRequestAls.getStore()?.bound === true;
}

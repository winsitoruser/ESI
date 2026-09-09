import { isTenantUuid } from './company-membership-policy';

/** companyId from setup URL / wizard POST — ignore arrays and junk. */
export function requestedSetupCompanyId(
  query?: Record<string, unknown> | null,
  body?: Record<string, unknown> | null,
): string {
  const raw = body?.companyId ?? body?.tenantId ?? query?.companyId ?? query?.tenantId ?? '';
  const val = Array.isArray(raw) ? raw[0] : raw;
  const id = String(val || '').trim();
  return isTenantUuid(id) ? id : '';
}

/**
 * Wave 15 — SEC-TEN-009 tenant-aware cache keys
 */
export function tenantCacheKey(tenantId: string | null | undefined, ...parts: Array<string | number | null | undefined>): string {
  const tid = String(tenantId || 'none').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'none';
  const rest = parts
    .map((p) => String(p ?? '').replace(/[:\s]+/g, '_').slice(0, 80))
    .filter(Boolean);
  return [`hfy`, tid, ...rest].join(':');
}

export function assertTenantCacheKey(key: string, tenantId: string): boolean {
  const tid = String(tenantId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return key.startsWith(`hfy:${tid}:`);
}

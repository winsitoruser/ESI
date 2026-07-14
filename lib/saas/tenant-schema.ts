/**
 * Schema-safe helpers for lean VPS `tenants` table (column set may vary).
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let columnCache: Set<string> | null = null;
let columnCacheAt = 0;
const CACHE_MS = 60_000;

export async function getTenantColumns(): Promise<Set<string>> {
  if (columnCache && Date.now() - columnCacheAt < CACHE_MS) return columnCache;
  if (!sequelize) return new Set();
  const [cols] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tenants' AND table_schema = 'public'
  `);
  columnCache = new Set((cols || []).map((c: any) => c.column_name));
  columnCacheAt = Date.now();
  return columnCache;
}

export function parseTenantSettings(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, any>;
  try {
    return JSON.parse(String(raw)) || {};
  } catch {
    return {};
  }
}

export function tenantDisplayName(row: Record<string, any>, cols: Set<string>): string {
  if (cols.has('business_name') && row.business_name) return row.business_name;
  if (row.name) return row.name;
  if (row.code) return row.code;
  return 'Perusahaan';
}

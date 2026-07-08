/** Convert Sequelize model / camelCase object to snake_case for Humanify API responses. */
export function rowToSnake(row: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!row) return null;
  const plain = typeof (row as { toJSON?: () => Record<string, unknown> }).toJSON === 'function'
    ? (row as { toJSON: () => Record<string, unknown> }).toJSON()
    : { ...row };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(plain)) {
    out[camelToSnake(k)] = v;
  }
  return out;
}

export function rowsToSnake(rows: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => rowToSnake(r as Record<string, unknown>)!).filter(Boolean);
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function isUuid(value: unknown): boolean {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

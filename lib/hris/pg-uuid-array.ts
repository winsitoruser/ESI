/**
 * Sequelize named replacements serialize a JS string[] as a bare UUID
 * (not `{uuid,uuid}`), which Postgres rejects: malformed array literal.
 */
export function asPgUuidArray(ids: unknown[] | null | undefined): string {
  const clean = (ids || [])
    .map((id) => String(id || '').trim())
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  return `{${clean.join(',')}}`;
}

export function asPgTextArray(ids: unknown[] | null | undefined): string {
  const clean = (ids || [])
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .map((id) => id.replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
    .map((id) => (/[,{}\\\s]/.test(id) ? `"${id}"` : id));
  return `{${clean.join(',')}}`;
}

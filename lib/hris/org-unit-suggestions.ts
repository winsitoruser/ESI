import { HRIS_DEPARTMENTS, type HrisOption } from './master-data';

export type OrgUnitSuggestion = {
  code: string;
  label: string;
  source: 'catalog' | 'existing';
  alreadyInOrg: boolean;
};

export function existingOrgCodes(units: { code?: string | null }[]): Set<string> {
  return new Set(
    units
      .map((u) => String(u.code || '').trim().toUpperCase())
      .filter(Boolean),
  );
}

/** Gabungan katalog dasar + unit tenant yang sudah ada (kode unik). */
export function mergeOrgUnitSuggestionPool(
  existing: { code?: string | null; name?: string | null }[],
  catalog: HrisOption[] = HRIS_DEPARTMENTS,
): OrgUnitSuggestion[] {
  const used = existingOrgCodes(existing);
  const catalogItems: OrgUnitSuggestion[] = catalog.map((d) => ({
    code: d.code,
    label: d.label,
    source: 'catalog',
    alreadyInOrg: used.has(d.code.toUpperCase()),
  }));
  const seen = new Set(catalog.map((d) => d.code.toUpperCase()));
  const extra: OrgUnitSuggestion[] = [];
  for (const unit of existing) {
    const code = String(unit.code || '').trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    extra.push({
      code,
      label: String(unit.name || code).trim() || code,
      source: 'existing',
      alreadyInOrg: true,
    });
  }
  return [...catalogItems, ...extra];
}

export function unusedCatalogSuggestions(pool: OrgUnitSuggestion[]): OrgUnitSuggestion[] {
  return pool.filter((s) => s.source === 'catalog' && !s.alreadyInOrg);
}

export function filterOrgUnitSuggestions(
  query: string,
  pool: OrgUnitSuggestion[],
  limit = 8,
): OrgUnitSuggestion[] {
  const q = query.trim().toLowerCase();
  const list = q
    ? pool.filter((s) => s.label.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
    : unusedCatalogSuggestions(pool);
  const unusedFirst = [...list].sort((a, b) => Number(a.alreadyInOrg) - Number(b.alreadyInOrg));
  return unusedFirst.slice(0, limit);
}

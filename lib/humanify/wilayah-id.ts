/**
 * Indonesian administrative regions via wilayah.id (Kepmendagri data).
 * Client should call /api/humanify/wilayah — never hit third-party URL directly for SSRF safety.
 */
export type WilayahItem = { code: string; name: string };

export const WILAYAH_SOURCE = {
  name: 'Wilayah.id',
  url: 'https://wilayah.id',
  updatedHint: 'Kepmendagri No 300.2.2-2138 Tahun 2025 · update 2025-07-04',
} as const;

/** Upstream allowlist only — used by API proxy. */
export const WILAYAH_UPSTREAM_BASE = 'https://wilayah.id/api';

export function isValidProvinceCode(code: string): boolean {
  return /^\d{2}$/.test(String(code || '').trim());
}

export function isValidRegencyCode(code: string): boolean {
  return /^\d{2}\.\d{2}$/.test(String(code || '').trim());
}

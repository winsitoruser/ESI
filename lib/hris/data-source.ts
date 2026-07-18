/** HRIS data integrity — mock fallbacks never in production. */

export type HrisDataSource = 'live' | 'demo' | 'empty';

const DEMO_ID_RE = /^(lv|ot|cl|mu|tr)\d+$/i;

/**
 * Mock/demo UI data is allowed only outside production.
 * Set HUMANIFY_ALLOW_MOCK=false to force empty-state even in development.
 */
export function allowHrMockFallback(): boolean {
  const flag = String(process.env.HUMANIFY_ALLOW_MOCK || '').toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  if (process.env.NODE_ENV === 'production') return false;
  return true;
}

/** Shared flag for Humanify pages — prefer this over local NODE_ENV checks. */
export const USE_MOCK_UI = allowHrMockFallback();

export function initialDataSource(): HrisDataSource {
  return allowHrMockFallback() ? 'demo' : 'empty';
}

export function isDemoRecordId(id: unknown): boolean {
  if (id == null) return true;
  const s = String(id);
  if (DEMO_ID_RE.test(s)) return true;
  if (s.startsWith('mock-') || s.startsWith('demo-')) return true;
  return false;
}

export function resolveDataSource(hasLiveRows: boolean, usedMock: boolean): HrisDataSource {
  if (usedMock && allowHrMockFallback()) return 'demo';
  if (hasLiveRows) return 'live';
  return 'empty';
}

export function pickMockOrEmpty<T>(mockData: T, emptyData: T): T {
  return allowHrMockFallback() ? mockData : emptyData;
}

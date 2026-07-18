/** HRIS data integrity — mock fallbacks only in non-production dev. */

export type HrisDataSource = 'live' | 'demo' | 'empty';

const DEMO_ID_RE = /^(lv|ot|cl|mu|tr)\d+$/i;

export function allowHrMockFallback(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/** Shared flag for Humanify pages — prefer this over local NODE_ENV checks. */
export const USE_MOCK_UI = process.env.NODE_ENV !== 'production';

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
  if (usedMock) return 'demo';
  if (hasLiveRows) return 'live';
  return 'empty';
}

export function pickMockOrEmpty<T>(mockData: T, emptyData: T): T {
  return allowHrMockFallback() ? mockData : emptyData;
}

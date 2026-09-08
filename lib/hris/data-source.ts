/** HRIS data integrity — mock fallbacks never in production / public SaaS hosts. */

export type HrisDataSource = 'live' | 'demo' | 'empty';

/** Classic demo ids + ESS portal mock payloads (l1, c1, ann1, mock-ps1, …). */
const DEMO_ID_RE = /^(lv|ot|cl|mu|tr|l|c|t|n|ann|ot)\d+$/i;

function envFlag(name: string): string {
  // Bracket access avoids some bundlers permanently inlining NODE_ENV incorrectly
  // across shared client/server chunks while NEXTAUTH_URL stays runtime on server.
  try {
    return String((process.env as Record<string, string | undefined>)[name] || '').toLowerCase();
  } catch {
    return '';
  }
}

/** True when this process must never serve demo/mock HR rows. */
export function isHrProductionRuntime(): boolean {
  if (envFlag('NODE_ENV') === 'production') return true;
  if (envFlag('HUMANIFY_ENV') === 'production') return true;
  if (envFlag('APP_ENV') === 'production') return true;
  if (envFlag('HUMANIFY_RLS_MODE') === 'strict' || envFlag('HUMANIFY_RLS_MODE') === 'force') return true;
  const url = `${envFlag('NEXTAUTH_URL')} ${envFlag('HUMANIFY_PUBLIC_URL')} ${envFlag('NEXT_PUBLIC_APP_URL')}`;
  if (/humanify\.id/i.test(url)) return true;
  return false;
}

/**
 * Mock/demo UI data is allowed only outside production SaaS hosts.
 * Set HUMANIFY_ALLOW_MOCK=false to force empty-state even in development.
 * Set HUMANIFY_ALLOW_MOCK=true only on local/dev (ignored on production hosts).
 */
export function allowHrMockFallback(): boolean {
  if (isHrProductionRuntime()) return false;
  const flag = envFlag('HUMANIFY_ALLOW_MOCK');
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  if (flag === 'true' || flag === '1' || flag === 'on') return true;
  // Local/dev default: allow mocks for faster UI work
  return envFlag('NODE_ENV') !== 'production';
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

/** Detect classic ESS mock payloads that must never ship to a fresh tenant. */
export function looksLikeEssMockPayload(data: unknown): boolean {
  const blob = JSON.stringify(data ?? '');
  if (!blob || blob === 'null' || blob === '[]' || blob === '{}') return false;
  if (/mock-ps\d+|Budi Santoso|budi@bedagang\.com|Kebijakan Kerja Hybrid 2026|Biaya rawat jalan|Liburan keluarga|TRV-2026-024/i.test(blob)) {
    return true;
  }
  if (/"id"\s*:\s*"(l|c|t|n|ann|ot)\d+"/i.test(blob)) return true;
  if (/"overallScore"\s*:\s*87/.test(blob) && /Kepuasan Pelanggan/.test(blob)) return true;
  // mockLeaveBalance(): Cuti Tahunan used:5 total:12
  if (/Cuti Tahunan/.test(blob) && /"used"\s*:\s*5/.test(blob) && /"total"\s*:\s*12/.test(blob)) return true;
  // mockAttendance thisMonth present:18
  if (/"present"\s*:\s*18/.test(blob) && /"late"\s*:\s*2/.test(blob) && /Kantor Pusat Jakarta/.test(blob)) return true;
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

/** Prefer empty on errors — never disguise DB/RLS failures as a populated demo tenant. */
export function pickMockOrEmptyOnError<T>(mockData: T, emptyData: T): T {
  return allowHrMockFallback() ? mockData : emptyData;
}

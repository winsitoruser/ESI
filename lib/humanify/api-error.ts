/**
 * Humanify API / UI error mapping — consistent toast + support codes.
 */

export type HumanifyApiErrorBody = {
  success?: boolean;
  error?: string;
  message?: string;
  code?: string;
  requestId?: string;
};

const CODE_HINTS: Record<string, string> = {
  NO_TENANT: 'Akun belum terikat tenant. Hubungi admin.',
  FEATURE_NOT_IN_PLAN: 'Fitur tidak termasuk paket Anda. Upgrade di Billing.',
  UNAUTHORIZED: 'Sesi berakhir. Silakan login ulang.',
  FORBIDDEN: 'Anda tidak punya akses untuk aksi ini.',
  VALIDATION_ERROR: 'Data tidak valid. Periksa formulir.',
  NOT_FOUND: 'Data tidak ditemukan.',
  CONFLICT: 'Data bentrok (duplikat).',
  RATE_LIMITED: 'Terlalu banyak permintaan. Coba lagi sebentar.',
};

export function mapApiJsonError(
  json: HumanifyApiErrorBody | null | undefined,
  fallback = 'Terjadi kesalahan',
): string {
  if (!json || typeof json !== 'object') return fallback;
  const code = json.code ? String(json.code) : '';
  if (code && CODE_HINTS[code]) {
    return CODE_HINTS[code];
  }
  const msg = json.error || json.message;
  if (msg && typeof msg === 'string' && msg.trim()) {
    return code ? `${msg} (${code})` : msg;
  }
  if (code) return `${fallback} (${code})`;
  return fallback;
}

export function humanifyErrorMessage(err: unknown, fallback = 'Terjadi kesalahan'): string {
  if (!err) return fallback;
  if (typeof err === 'string' && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as any).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

/** Append support hint with observability deep-link when requestId present. */
export function withSupportHint(message: string, requestId?: string | null): string {
  if (!requestId) return message;
  return `${message} · ref ${requestId}`;
}

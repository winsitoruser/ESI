/**
 * Wave 5 — Attendance anti-cheat (SEC-ABU-009…015)
 */
import crypto from 'crypto';

const nonceStore = new Map<string, { exp: number; used: boolean }>();

export function serverNowIso(): string {
  return new Date().toISOString();
}

export function mintAttendanceNonce(opts: { userId: string; tenantId: string; ttlSec?: number }): {
  nonce: string;
  expiresAt: string;
  serverTime: string;
} {
  const ttl = Math.max(30, Math.min(300, opts.ttlSec ?? 120));
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + ttl * 1000;
  nonceStore.set(`${opts.tenantId}:${opts.userId}:${nonce}`, { exp, used: false });
  // prune
  if (nonceStore.size > 5000) {
    const now = Date.now();
    for (const [k, v] of nonceStore) {
      if (v.exp < now || v.used) nonceStore.delete(k);
    }
  }
  return { nonce, expiresAt: new Date(exp).toISOString(), serverTime: serverNowIso() };
}

export function consumeAttendanceNonce(opts: {
  userId: string;
  tenantId: string;
  nonce?: string | null;
}): { ok: true } | { ok: false; error: string; code: string } {
  const required = String(process.env.HUMANIFY_ATTENDANCE_NONCE || '').toLowerCase() === 'true';
  if (!required) return { ok: true };
  const nonce = String(opts.nonce || '').trim();
  if (!nonce) return { ok: false, error: 'Nonce absensi diperlukan', code: 'ATTENDANCE_NONCE_REQUIRED' };
  const key = `${opts.tenantId}:${opts.userId}:${nonce}`;
  const row = nonceStore.get(key);
  if (!row) return { ok: false, error: 'Nonce tidak valid', code: 'ATTENDANCE_NONCE_INVALID' };
  if (row.used) return { ok: false, error: 'Nonce sudah dipakai (replay)', code: 'ATTENDANCE_REPLAY' };
  if (Date.now() > row.exp) {
    nonceStore.delete(key);
    return { ok: false, error: 'Nonce kedaluwarsa', code: 'ATTENDANCE_NONCE_EXPIRED' };
  }
  row.used = true;
  return { ok: true };
}

/** Haversine distance in km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type AttendanceRisk = {
  flags: string[];
  score: number;
  useServerClock: true;
  serverClockIn?: string;
};

export function assessAttendancePunch(opts: {
  clientClockIn?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  mockLocation?: boolean | null;
  rooted?: boolean | null;
  emulator?: boolean | null;
  previous?: { lat: number; lng: number; atMs: number } | null;
}): AttendanceRisk {
  const flags: string[] = [];
  let score = 0;

  // SEC-ABU-009 — always use server time as truth for "now" punches
  const serverClockIn = serverNowIso();
  if (opts.clientClockIn) {
    const clientMs = Date.parse(String(opts.clientClockIn));
    if (Number.isFinite(clientMs) && Math.abs(Date.now() - clientMs) > 5 * 60_000) {
      flags.push('client_clock_skew');
      score += 25;
    }
  }

  const maxAcc = Number(process.env.HUMANIFY_ATTENDANCE_MAX_ACCURACY_M || 200);
  if (opts.accuracyM != null && Number(opts.accuracyM) > maxAcc) {
    flags.push('low_location_accuracy');
    score += 20;
  }

  if (opts.mockLocation) {
    flags.push('mock_location');
    score += 40;
  }
  if (opts.rooted) {
    flags.push('rooted_device');
    score += 15;
  }
  if (opts.emulator) {
    flags.push('emulator');
    score += 20;
  }

  if (
    opts.previous &&
    opts.lat != null &&
    opts.lng != null &&
    Number.isFinite(opts.lat) &&
    Number.isFinite(opts.lng)
  ) {
    const elapsedH = Math.max(0.01, (Date.now() - opts.previous.atMs) / 3_600_000);
    const km = distanceKm(
      { lat: opts.previous.lat, lng: opts.previous.lng },
      { lat: Number(opts.lat), lng: Number(opts.lng) },
    );
    const speed = km / elapsedH;
    // > 800 km/h ≈ commercial flight ceiling for "impossible" short hops
    if (speed > 800 || (elapsedH < 0.5 && km > 200)) {
      flags.push('impossible_travel');
      score += 50;
    }
  }

  return { flags, score, useServerClock: true, serverClockIn };
}

/** Prefer server time when recording "now" punches; keep explicit historical edits. */
export function resolveClockIn(clientClockIn: string | null | undefined, forceServer: boolean): string {
  if (forceServer || !clientClockIn) return serverNowIso();
  const ms = Date.parse(String(clientClockIn));
  if (!Number.isFinite(ms)) return serverNowIso();
  // If within 2 min of now, treat as live punch → server time
  if (Math.abs(Date.now() - ms) < 2 * 60_000) return serverNowIso();
  return new Date(ms).toISOString();
}

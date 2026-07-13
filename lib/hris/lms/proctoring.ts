/**
 * Proctoring helpers — device fingerprint, snapshot limits
 */
import crypto from 'crypto';

export function hashDeviceFingerprint(payload: {
  userAgent?: string;
  screen?: string;
  timezone?: string;
  language?: string;
}): string {
  const raw = [payload.userAgent, payload.screen, payload.timezone, payload.language].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export const PROCTOR_INTERVAL_MS = 120_000; // snapshot every 2 min

export function shouldFlagSession(flags: {
  tab_switch_count?: number;
  copy_paste_count?: number;
  integrity_score?: number;
  snapshot_count?: number;
  proctor_enabled?: boolean;
}): boolean {
  if ((flags.tab_switch_count || 0) > 5) return true;
  if ((flags.copy_paste_count || 0) > 0) return true;
  if (flags.integrity_score != null && flags.integrity_score < 60) return true;
  if (flags.proctor_enabled && (flags.snapshot_count || 0) < 1) return true;
  return false;
}

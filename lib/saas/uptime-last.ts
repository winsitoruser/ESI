/**
 * Last external uptime probe run artifact (ops UI).
 */
import fs from 'fs';
import path from 'path';

export type UptimeLastRun = {
  present: boolean;
  ok: boolean;
  at: string | null;
  ageHours: number | null;
  result: string | null;
  healthUrl: string | null;
  path: string;
  reason?: string;
};

export function getUptimeLastPath(): string {
  return (
    process.env.UPTIME_LAST_PATH?.trim() ||
    path.join(process.env.HUMANIFY_STATE_DIR || '/var/lib/humanify', 'uptime-last.json')
  );
}

export function writeUptimeLast(summary: {
  at: string;
  result: string;
  healthUrl: string;
}): void {
  const file = getUptimeLastPath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(summary, null, 2), 'utf8');
  } catch (e: any) {
    console.warn('[uptime] write last-run failed:', e?.message || e);
  }
}

export function getUptimeLastRun(): UptimeLastRun {
  const file = getUptimeLastPath();
  if (!fs.existsSync(file)) {
    return {
      present: false,
      ok: false,
      at: null,
      ageHours: null,
      result: null,
      healthUrl: null,
      path: file,
      reason: 'never',
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const at = String(raw.at || '');
    const ts = Date.parse(at);
    const ageHours = Number.isFinite(ts) ? Math.round(((Date.now() - ts) / 3600_000) * 10) / 10 : null;
    const result = String(raw.result || '');
    return {
      present: true,
      ok: result === 'configured' || result === 'manual',
      at: at || null,
      ageHours,
      result: result || null,
      healthUrl: raw.healthUrl ? String(raw.healthUrl) : null,
      path: file,
    };
  } catch {
    return {
      present: false,
      ok: false,
      at: null,
      ageHours: null,
      result: null,
      healthUrl: null,
      path: file,
      reason: 'invalid_json',
    };
  }
}

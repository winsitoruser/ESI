/**
 * Last doc-expiry soft-deactivate cron run artifact (ops UI).
 */
import fs from 'fs';
import path from 'path';

export type SoftDeactivateLastRun = {
  present: boolean;
  ok: boolean;
  at: string | null;
  ageHours: number | null;
  expiredActive: number | null;
  updated: number | null;
  dryRun: boolean;
  path: string;
  reason?: string;
};

export function getSoftDeactivateLastPath(): string {
  return (
    process.env.SOFT_DEACTIVATE_LAST_PATH?.trim() ||
    path.join(process.env.HUMANIFY_STATE_DIR || '/var/lib/humanify', 'soft-deactivate-last.json')
  );
}

export function writeSoftDeactivateLast(summary: {
  at: string;
  expiredActive: number;
  updated: number;
  dryRun?: boolean;
}): void {
  const file = getSoftDeactivateLastPath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          at: summary.at,
          expiredActive: summary.expiredActive,
          updated: summary.updated,
          dryRun: Boolean(summary.dryRun),
        },
        null,
        2,
      ),
      'utf8',
    );
  } catch (e: any) {
    console.warn('[soft-deactivate] write last-run failed:', e?.message || e);
  }
}

export function getSoftDeactivateLastRun(): SoftDeactivateLastRun {
  const file = getSoftDeactivateLastPath();
  if (!fs.existsSync(file)) {
    return {
      present: false,
      ok: false,
      at: null,
      ageHours: null,
      expiredActive: null,
      updated: null,
      dryRun: false,
      path: file,
      reason: 'never',
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const at = String(raw.at || '');
    const ts = Date.parse(at);
    const ageHours = Number.isFinite(ts) ? Math.round(((Date.now() - ts) / 3600_000) * 10) / 10 : null;
    return {
      present: true,
      ok: true,
      at: at || null,
      ageHours,
      expiredActive: Number(raw.expiredActive ?? 0),
      updated: Number(raw.updated ?? 0),
      dryRun: Boolean(raw.dryRun),
      path: file,
    };
  } catch {
    return {
      present: false,
      ok: false,
      at: null,
      ageHours: null,
      expiredActive: null,
      updated: null,
      dryRun: false,
      path: file,
      reason: 'invalid_json',
    };
  }
}

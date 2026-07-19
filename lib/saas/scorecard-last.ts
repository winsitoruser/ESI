/**
 * Last security scorecard run artifact (ops UI).
 */
import fs from 'fs';
import path from 'path';

export type ScorecardLastRun = {
  present: boolean;
  ok: boolean;
  at: string | null;
  ageHours: number | null;
  passedTotal: number | null;
  failedTotal: number | null;
  base: string | null;
  path: string;
  reason?: string;
};

export function getScorecardLastPath(): string {
  return (
    process.env.SCORECARD_LAST_PATH?.trim() ||
    path.join(process.env.HUMANIFY_STATE_DIR || '/var/lib/humanify', 'scorecard-last.json')
  );
}

export function writeScorecardLast(summary: {
  at: string;
  base: string;
  passedTotal: number;
  failedTotal: number;
}): void {
  const file = getScorecardLastPath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(summary, null, 2), 'utf8');
  } catch (e: any) {
    console.warn('[scorecard] write last-run failed:', e?.message || e);
  }
}

export function getScorecardLastRun(): ScorecardLastRun {
  const file = getScorecardLastPath();
  if (!fs.existsSync(file)) {
    return {
      present: false,
      ok: false,
      at: null,
      ageHours: null,
      passedTotal: null,
      failedTotal: null,
      base: null,
      path: file,
      reason: 'never',
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const at = String(raw.at || '');
    const ts = Date.parse(at);
    const ageHours = Number.isFinite(ts) ? Math.round(((Date.now() - ts) / 3600_000) * 10) / 10 : null;
    const failedTotal = Number(raw.failedTotal ?? 0);
    return {
      present: true,
      ok: failedTotal === 0,
      at: at || null,
      ageHours,
      passedTotal: Number(raw.passedTotal ?? 0),
      failedTotal,
      base: raw.base ? String(raw.base) : null,
      path: file,
    };
  } catch {
    return {
      present: false,
      ok: false,
      at: null,
      ageHours: null,
      passedTotal: null,
      failedTotal: null,
      base: null,
      path: file,
      reason: 'invalid_json',
    };
  }
}

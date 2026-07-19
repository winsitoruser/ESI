/**
 * Backup freshness probe for ops UI (no secrets).
 */
import fs from 'fs';
import path from 'path';

export type BackupFreshness = {
  present: boolean;
  skipped: boolean;
  ok: boolean;
  ageHours: number | null;
  maxAgeHours: number;
  sizeMb: number | null;
  path: string;
  reason?: string;
};

export function getBackupFreshness(opts?: {
  backupDir?: string;
  maxAgeHours?: number;
}): BackupFreshness {
  const backupDir = opts?.backupDir || process.env.BACKUP_DIR || '/var/backups/humanify';
  const maxAgeHours = Math.max(1, Number(opts?.maxAgeHours || process.env.MAX_AGE_HOURS || 36) || 36);
  const latest = path.join(backupDir, 'latest.sql.gz');

  if (String(process.env.SKIP_BACKUP_CHECK || '').toLowerCase() === 'true') {
    return {
      present: false,
      skipped: true,
      ok: true,
      ageHours: null,
      maxAgeHours,
      sizeMb: null,
      path: latest,
      reason: 'SKIP_BACKUP_CHECK',
    };
  }

  if (!fs.existsSync(latest)) {
    return {
      present: false,
      skipped: !fs.existsSync(backupDir),
      ok: false,
      ageHours: null,
      maxAgeHours,
      sizeMb: null,
      path: latest,
      reason: fs.existsSync(backupDir) ? 'missing_latest' : 'dir_absent',
    };
  }

  const st = fs.statSync(latest);
  const ageHours = (Date.now() - st.mtimeMs) / 3600_000;
  const sizeMb = st.size / (1024 * 1024);
  const ok = ageHours <= maxAgeHours && st.size > 1000;
  return {
    present: true,
    skipped: false,
    ok,
    ageHours: Math.round(ageHours * 10) / 10,
    maxAgeHours,
    sizeMb: Math.round(sizeMb * 100) / 100,
    path: latest,
    reason: ok ? undefined : ageHours > maxAgeHours ? 'stale' : 'too_small',
  };
}

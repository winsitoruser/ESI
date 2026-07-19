/**
 * Last Action Inbox digest run artifact (ops UI).
 */
import fs from 'fs';
import path from 'path';

export type DigestLastRun = {
  present: boolean;
  ok: boolean;
  at: string | null;
  ageHours: number | null;
  sent: number | null;
  dryRun: boolean;
  path: string;
  reason?: string;
};

export function getDigestLastPath(): string {
  return (
    process.env.DIGEST_LAST_PATH?.trim() ||
    path.join(process.env.HUMANIFY_STATE_DIR || '/var/lib/humanify', 'action-digest-last.json')
  );
}

export function writeDigestLast(summary: {
  at: string;
  sent: number;
  dryRun?: boolean;
}): void {
  const file = getDigestLastPath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          at: summary.at,
          sent: summary.sent,
          dryRun: Boolean(summary.dryRun),
        },
        null,
        2,
      ),
      'utf8',
    );
  } catch (e: any) {
    console.warn('[digest] write last-run failed:', e?.message || e);
  }
}

export function getDigestLastRun(): DigestLastRun {
  const file = getDigestLastPath();
  if (!fs.existsSync(file)) {
    return {
      present: false,
      ok: false,
      at: null,
      ageHours: null,
      sent: null,
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
    const sent = Number(raw.sent ?? 0);
    return {
      present: true,
      ok: true,
      at: at || null,
      ageHours,
      sent,
      dryRun: Boolean(raw.dryRun),
      path: file,
    };
  } catch {
    return {
      present: false,
      ok: false,
      at: null,
      ageHours: null,
      sent: null,
      dryRun: false,
      path: file,
      reason: 'invalid_json',
    };
  }
}

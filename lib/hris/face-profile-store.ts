import { withAutocommitQuery, withDbSavepoint, safeQueryWithSavepoint, isAbortedTransactionError } from '../saas/tenant-request-bound';
import { persistFaceDataUrl, faceFileToDataUrl } from './face-storage';
import { evaluateLiveness, parseImageDataUrl, type ChallengeFrames } from './face-liveness';
import { assessEnrollmentQuality, matchEnrollmentToLive } from './face-match';

const TABLE = 'employee_face_profiles';

let faceSchemaReady = false;
let faceAttColsReady = false;

export type FaceProfileStatus = {
  enrolled: boolean;
  enrolledAt: string | null;
  employeeId: string | null;
};

export async function ensureFaceProfileSchema(sequelize: any): Promise<void> {
  if (!sequelize) return;

  if (!faceSchemaReady) {
    const ok = await withAutocommitQuery(sequelize, async (query) => {
      await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).catch(() => null);
      await query(`
        CREATE TABLE IF NOT EXISTS ${TABLE} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL,
          employee_id UUID NOT NULL,
          enroll_photo_key TEXT NOT NULL,
          enroll_photo_hash VARCHAR(64),
          liveness_passed BOOLEAN NOT NULL DEFAULT false,
          liveness_meta JSONB,
          enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (tenant_id, employee_id)
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_face_profiles_employee ON ${TABLE} (employee_id)`);
      return true;
    }, 'face_schema');
    if (ok) faceSchemaReady = true;
  }

  if (!faceAttColsReady) {
    const ok = await withAutocommitQuery(sequelize, async (query) => {
      await query(`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS face_match_score NUMERIC`);
      await query(`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS face_liveness_ok BOOLEAN`);
      await query(`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS face_match_status VARCHAR(32)`);
      return true;
    }, 'face_att_cols');
    if (ok) faceAttColsReady = true;
  }
}

export async function getFaceStatus(
  sequelize: any,
  tenantId: string,
  employeeId: string,
): Promise<FaceProfileStatus> {
  await ensureFaceProfileSchema(sequelize);
  const rows = await safeQueryWithSavepoint(
    sequelize,
    `SELECT enrolled_at FROM ${TABLE}
     WHERE tenant_id = :tid AND employee_id = :eid LIMIT 1`,
    { tid: tenantId, eid: employeeId },
    'face_status',
  );
  const row = rows?.[0];
  return {
    enrolled: Boolean(row),
    enrolledAt: row?.enrolled_at ? new Date(row.enrolled_at).toISOString() : null,
    employeeId,
  };
}

export async function enrollFace(opts: {
  sequelize: any;
  tenantId: string;
  employeeId: string;
  stillDataUrl: string;
  motionDataUrl: string;
  motionScore: number;
  challenges?: ChallengeFrames | null;
}): Promise<{ ok: true; enrolledAt: string } | { ok: false; error: string }> {
  const live = evaluateLiveness({
    stillDataUrl: opts.stillDataUrl,
    motionDataUrl: opts.motionDataUrl,
    motionScore: opts.motionScore,
    challenges: opts.challenges,
  });
  if (!live.ok) return { ok: false, error: live.reason || 'Liveness gagal' };

  const quality = await assessEnrollmentQuality(opts.stillDataUrl);
  if (!quality.ok) return { ok: false, error: quality.reason || 'Foto pendaftaran ditolak' };

  await ensureFaceProfileSchema(opts.sequelize);
  const existing = await safeQueryWithSavepoint(
    opts.sequelize,
    `SELECT id FROM ${TABLE} WHERE tenant_id = :tid AND employee_id = :eid LIMIT 1`,
    { tid: opts.tenantId, eid: opts.employeeId },
    'face_enroll_exists',
  );
  if (existing?.[0]) {
    return { ok: false, error: 'Wajah sudah terdaftar. Hubungi HR jika perlu daftar ulang.' };
  }

  const saved = persistFaceDataUrl(opts.stillDataUrl, opts.tenantId, opts.employeeId, 'enroll');
  persistFaceDataUrl(opts.motionDataUrl, opts.tenantId, opts.employeeId, 'enroll');

  const meta = {
    motionScore: live.motionScore,
    frameDistance: live.frameDistance,
    mode: live.mode,
    challenge: live.mode === 'video' ? ['nod', 'left', 'right', 'front'] : ['still', 'nod'],
    scores: opts.challenges?.scores || null,
  };

  const inserted = await withDbSavepoint(opts.sequelize, async () => {
    await opts.sequelize.query(
      `INSERT INTO ${TABLE} (
         tenant_id, employee_id, enroll_photo_key, enroll_photo_hash,
         liveness_passed, liveness_meta, enrolled_at, updated_at
       ) VALUES (
         :tid, :eid, :key, :hash, true, CAST(:meta AS jsonb), NOW(), NOW()
       )
       ON CONFLICT (tenant_id, employee_id) DO NOTHING`,
      {
        replacements: {
          tid: opts.tenantId,
          eid: opts.employeeId,
          key: saved.storageKey,
          hash: saved.hash,
          meta: JSON.stringify(meta),
        },
      },
    );
    return true;
  }, 'face_enroll_upsert');
  if (!inserted) return { ok: false, error: 'Gagal menyimpan foto wajah. Coba lagi.' };

  return { ok: true, enrolledAt: new Date().toISOString() };
}

export async function verifyClockFace(opts: {
  sequelize: any;
  tenantId: string;
  employeeId: string;
  stillDataUrl: string;
  /** When mode=selfie, motion/challenges are optional — match vs enrollment only. */
  motionDataUrl?: string;
  motionScore?: number;
  challenges?: ChallengeFrames | null;
  /** selfie = take picture + face match; liveness = legacy challenge flow */
  mode?: 'selfie' | 'liveness';
}): Promise<
  | { ok: true; photoKey: string; matchScore: number; matchStatus: string; livenessOk: boolean }
  | { ok: false; error: string; code?: string }
> {
  try {
    const mode = opts.mode || (opts.motionDataUrl ? 'liveness' : 'selfie');
    const stillParsed = parseImageDataUrl(opts.stillDataUrl);
    if (!stillParsed) {
      return { ok: false, error: 'Foto tidak valid. Ambil ulang dari kamera.', code: 'FACE_PHOTO_REQUIRED' };
    }

    if (mode === 'liveness') {
      const live = evaluateLiveness({
        stillDataUrl: opts.stillDataUrl,
        motionDataUrl: String(opts.motionDataUrl || ''),
        motionScore: Number(opts.motionScore),
        challenges: opts.challenges,
      });
      if (!live.ok) return { ok: false, error: live.reason || 'Liveness gagal', code: 'LIVENESS_FAILED' };
    }

    await ensureFaceProfileSchema(opts.sequelize);
    const rows = await safeQueryWithSavepoint(
      opts.sequelize,
      `SELECT enroll_photo_key FROM ${TABLE}
       WHERE tenant_id = :tid AND employee_id = :eid LIMIT 1`,
      { tid: opts.tenantId, eid: opts.employeeId },
      'face_enroll_lookup',
    );
    const enrollKey = rows?.[0]?.enroll_photo_key;
    if (!enrollKey) {
      return { ok: false, error: 'Wajib daftar wajah dulu sebelum absensi.', code: 'FACE_ENROLLMENT_REQUIRED' };
    }

    const enrollDataUrl = faceFileToDataUrl(enrollKey);
    if (!enrollDataUrl) {
      return { ok: false, error: 'Foto pendaftaran tidak ditemukan. Daftar ulang wajah.', code: 'FACE_ENROLLMENT_REQUIRED' };
    }

    const match = await matchEnrollmentToLive(enrollDataUrl, opts.stillDataUrl, {
      requireVision: mode === 'selfie',
    });
    if (!match.matched) {
      return {
        ok: false,
        error: match.reason || 'Wajah tidak cocok dengan foto pendaftaran. Ambil ulang dengan wajah menghadap kamera.',
        code: 'FACE_MISMATCH',
      };
    }

    let saved: { storageKey: string };
    try {
      saved = persistFaceDataUrl(opts.stillDataUrl, opts.tenantId, opts.employeeId, 'clock');
    } catch (e: any) {
      return {
        ok: false,
        error: e?.message || 'Gagal menyimpan foto absensi. Ambil ulang foto.',
        code: 'FACE_PHOTO_REQUIRED',
      };
    }

    return {
      ok: true,
      photoKey: saved.storageKey,
      matchScore: match.confidence,
      matchStatus: match.source === 'vision' ? 'matched' : 'liveness_only',
      livenessOk: mode === 'liveness',
    };
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    console.warn('verifyClockFace:', msg);
    if (e?.code === 'TX_ABORTED' || isAbortedTransactionError(e)) {
      return {
        ok: false,
        error: 'Sesi database terganggu. Muat ulang halaman lalu coba absen lagi.',
        code: 'TX_ABORTED',
      };
    }
    if (/tidak cocok|tidak terdeteksi|pendaftaran|liveness|foto|wajah|kamera/i.test(msg)) {
      return { ok: false, error: msg, code: 'FACE_MISMATCH' };
    }
    return {
      ok: false,
      error: 'Verifikasi wajah gagal. Ambil ulang foto dengan cahaya cukup dan wajah menghadap kamera.',
      code: 'FACE_MISMATCH',
    };
  }
}

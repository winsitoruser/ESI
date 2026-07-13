/**
 * Training ↔ LMS bridge — sync exams, graduations, scoring, certificates
 */
import { ensureCertificateTables, deriveStatus } from '../certificate-registry';

let sequelize: any;
try { sequelize = require('../../sequelize'); } catch {}

export async function getUnifiedTrainingOverview(tenantId: string | null) {
  if (!sequelize) return {};
  const tid = tenantId;
  const q = async (sql: string, repl: object = {}) => {
    try {
      const [rows] = await sequelize.query(sql, { replacements: { tid, ...repl } });
      return rows[0] || {};
    } catch { return {}; }
  };

  const [
    programs, curricula, lmsEnroll, batches, graduations,
    examResults, participantScores, certs, lmsCerts, competencies,
  ] = await Promise.all([
    q(`SELECT COUNT(*)::int AS c FROM hris_training_programs WHERE tenant_id = :tid OR :tid IS NULL`),
    q(`SELECT COUNT(*)::int AS c FROM hris_training_curricula WHERE tenant_id = :tid OR :tid IS NULL`),
    q(`SELECT COUNT(*)::int AS c FROM hris_lms_enrollments WHERE tenant_id = :tid`).catch(() => ({ c: 0 })),
    q(`SELECT COUNT(*)::int AS c FROM hris_training_batches WHERE tenant_id = :tid OR :tid IS NULL`),
    q(`SELECT COUNT(*)::int AS c FROM hris_training_graduations WHERE tenant_id = :tid OR :tid IS NULL`),
    q(`SELECT COUNT(*)::int AS attempts, COUNT(*) FILTER (WHERE is_passed = true)::int AS passed FROM hris_training_exam_results WHERE tenant_id = :tid OR :tid IS NULL`),
    q(`SELECT COUNT(*)::int AS c FROM hris_training_participant_scores WHERE tenant_id = :tid OR :tid IS NULL`),
    q(`SELECT COUNT(*)::int AS c FROM hris_certifications WHERE tenant_id = :tid OR :tid IS NULL`),
    q(`SELECT COUNT(*)::int AS c FROM hris_certificates WHERE tenant_id = :tid OR :tid IS NULL`),
    q(`SELECT COUNT(*)::int AS c FROM hris_lms_competency_history WHERE tenant_id = :tid`).catch(() => ({ c: 0 })),
  ]);

  return {
    programs: programs.c || 0,
    curricula: curricula.c || 0,
    lms_enrollments: lmsEnroll.c || 0,
    batches: batches.c || 0,
    graduations: graduations.c || 0,
    exam_attempts: examResults.attempts || 0,
    exam_passed: examResults.passed || 0,
    participant_scores: participantScores.c || 0,
    legacy_certifications: certs.c || 0,
    registry_certificates: lmsCerts.c || 0,
    lms_competencies: competencies.c || 0,
  };
}

/** Sync LMS exam result into training-scoring participant_scores when graduation exists */
export async function syncExamResultToScoring(opts: {
  tenantId: string | null;
  resultId: string;
  employeeId: string;
  examId: string;
  percentage: number;
  isPassed: boolean;
}) {
  if (!sequelize) return { synced: false };

  const [grad] = await sequelize.query(`
    SELECT g.id AS graduation_id, g.batch_id, g.curriculum_id
    FROM hris_training_graduations g
    WHERE g.employee_id::text = :eid AND g.tenant_id = :tid
    ORDER BY g.updated_at DESC NULLS LAST LIMIT 1
  `, { replacements: { eid: opts.employeeId, tid: opts.tenantId } });

  if (!grad.length) return { synced: false, reason: 'no_graduation' };

  const g = grad[0];
  const [cfg] = await sequelize.query(`
    SELECT id FROM hris_training_scoring_configs
    WHERE curriculum_id = :cid AND (tenant_id = :tid OR :tid IS NULL) AND status = 'active'
    ORDER BY created_at DESC LIMIT 1
  `, { replacements: { cid: g.curriculum_id, tid: opts.tenantId } });

  const [exam] = await sequelize.query(
    'SELECT title FROM hris_training_exams WHERE id = :id LIMIT 1',
    { replacements: { id: opts.examId } },
  );

  const examDetails = [{
    exam_id: opts.examId,
    title: exam[0]?.title || 'Ujian LMS',
    score: opts.percentage,
    is_passed: opts.isPassed,
    result_id: opts.resultId,
    source: 'lms',
  }];

  const [existing] = await sequelize.query(
    'SELECT id FROM hris_training_participant_scores WHERE graduation_id = :gid AND employee_id::text = :eid LIMIT 1',
    { replacements: { gid: g.graduation_id, eid: opts.employeeId } },
  );

  if (existing.length) {
    await sequelize.query(`
      UPDATE hris_training_participant_scores SET
        exam_score = :score, weighted_score = :score, is_passed = :passed,
        exam_details = :details::jsonb, graded_at = NOW(), updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || '{"source":"lms"}'::jsonb
      WHERE id = :id
    `, {
      replacements: {
        id: existing[0].id, score: opts.percentage, passed: opts.isPassed,
        details: JSON.stringify(examDetails),
      },
    });
    return { synced: true, participant_score_id: existing[0].id };
  }

  const [rows] = await sequelize.query(`
    INSERT INTO hris_training_participant_scores (
      tenant_id, graduation_id, batch_id, employee_id, exam_score, weighted_score,
      is_passed, exam_details, graded_at, metadata
    ) VALUES (:tid, :gid, :bid, :eid, :score, :score, :passed, :details::jsonb, NOW(), '{"source":"lms"}'::jsonb)
    RETURNING id
  `, {
    replacements: {
      tid: opts.tenantId, gid: g.graduation_id, bid: g.batch_id,
      eid: opts.employeeId, score: opts.percentage, passed: opts.isPassed,
      details: JSON.stringify(examDetails),
    },
  });
  return { synced: true, participant_score_id: rows[0]?.id };
}

/** Ensure graduation record when LMS course completed */
export async function syncCourseCompletionToGraduation(opts: {
  tenantId: string | null;
  employeeId: string;
  employeeName: string;
  curriculumId: string;
}) {
  if (!sequelize) return { synced: false };

  const [existing] = await sequelize.query(`
    SELECT id FROM hris_training_graduations
    WHERE employee_id::text = :eid AND curriculum_id = :cid LIMIT 1
  `, { replacements: { eid: opts.employeeId, cid: opts.curriculumId } });

  if (existing.length) {
    await sequelize.query(`
      UPDATE hris_training_graduations SET graduation_status = 'passed', updated_at = NOW()
      WHERE id = :id AND graduation_status NOT IN ('passed')
    `, { replacements: { id: existing[0].id } });
    return { synced: true, graduation_id: existing[0].id, action: 'updated' };
  }

  const [batch] = await sequelize.query(`
    SELECT id FROM hris_training_batches
    WHERE curriculum_id = :cid AND (tenant_id = :tid OR :tid IS NULL)
    ORDER BY created_at DESC LIMIT 1
  `, { replacements: { cid: opts.curriculumId, tid: opts.tenantId } });

  if (!batch[0]?.id) return { synced: false, reason: 'no_batch' };

  try {
    const [rows] = await sequelize.query(`
      INSERT INTO hris_training_graduations (
        tenant_id, batch_id, curriculum_id, employee_id, employee_name,
        graduation_status, attendance_rate
      ) VALUES (:tid, :bid, :cid, :eid, :name, 'passed', 100)
      RETURNING id
    `, {
      replacements: {
        tid: opts.tenantId, bid: batch[0].id,
        cid: opts.curriculumId, eid: opts.employeeId, name: opts.employeeName,
      },
    });
    return { synced: true, graduation_id: rows[0]?.id, action: 'created' };
  } catch (e) {
    console.warn('[training-bridge] graduation:', (e as Error).message);
    return { synced: false };
  }
}

/** Migrate hris_certifications → hris_certificates (one-way sync) */
export async function migrateLegacyCertifications(tenantId: string | null) {
  if (!sequelize) return { migrated: 0 };
  await ensureCertificateTables();

  const [legacy] = await sequelize.query(`
    SELECT c.*, e.name AS employee_name
    FROM hris_certifications c
    LEFT JOIN employees e ON e.id::text = c.employee_id::text
    WHERE c.tenant_id = :tid OR :tid IS NULL
  `, { replacements: { tid: tenantId } }).catch(() => [[]]);

  let migrated = 0;
  for (const row of legacy) {
    const certNum = row.certificate_number || row.credential_id || `LEG-${row.id}`;
    const [dup] = await sequelize.query(
      'SELECT id FROM hris_certificates WHERE certificate_number = :num LIMIT 1',
      { replacements: { num: certNum } },
    );
    if (dup.length) continue;

    const expiry = row.expiry_date ? String(row.expiry_date).split('T')[0] : null;
    await sequelize.query(`
      INSERT INTO hris_certificates (
        tenant_id, employee_id, employee_name, title, issuer, source,
        certificate_number, issued_date, expiry_date, status
      ) VALUES (
        :tid, :eid, :name, :title, :issuer, 'training',
        :num, :issued, :expiry, :status
      )
    `, {
      replacements: {
        tid: tenantId,
        eid: String(row.employee_id),
        name: row.employee_name || 'Karyawan',
        title: row.certification_name || row.title || 'Sertifikat',
        issuer: row.issuing_organization || row.issuer || 'Program Training',
        num: certNum,
        issued: row.issue_date || row.issued_date || null,
        expiry,
        status: deriveStatus(expiry || undefined),
      },
    });
    migrated++;
  }
  return { migrated, total_legacy: legacy.length };
}

/** Batch sync all unlinked LMS exam passes to scoring */
export async function batchSyncExamResults(tenantId: string | null) {
  if (!sequelize) return { synced: 0 };
  const [results] = await sequelize.query(`
    SELECT r.id, r.employee_id, r.exam_id, r.percentage, r.is_passed
    FROM hris_training_exam_results r
    WHERE (r.tenant_id = :tid OR :tid IS NULL) AND r.is_passed = true AND r.status = 'graded'
    ORDER BY r.submitted_at DESC LIMIT 200
  `, { replacements: { tid: tenantId } });

  let synced = 0;
  for (const r of results) {
    const out = await syncExamResultToScoring({
      tenantId, resultId: r.id, employeeId: String(r.employee_id),
      examId: r.exam_id, percentage: Number(r.percentage), isPassed: !!r.is_passed,
    });
    if (out.synced) synced++;
  }
  return { synced, total: results.length };
}

/** Fetch legacy certifications for registry merge */
export async function fetchLegacyTrainingCerts(): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(`
      SELECT c.id, c.employee_id, COALESCE(e.name, 'Karyawan') AS employee_name,
        COALESCE(c.certification_name, c.title) AS title,
        COALESCE(c.issuing_organization, c.issuer, 'Program Training') AS issuer,
        c.certificate_number, c.issue_date AS issued_date, c.expiry_date,
        'training' AS source
      FROM hris_certifications c
      LEFT JOIN employees e ON e.id::text = c.employee_id::text
      ORDER BY c.expiry_date ASC NULLS LAST
    `);
    return rows || [];
  } catch { return []; }
}

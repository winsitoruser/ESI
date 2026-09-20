/**
 * Employee training request → approve → enroll (FlowHCM Training Management).
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch { sequelize = null; }

let ensured = false;

export async function ensureTrainingRequestTables(): Promise<boolean> {
  if (!sequelize) return false;
  if (ensured) return true;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_training_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL,
      employee_id TEXT NOT NULL,
      employee_name VARCHAR(200),
      program_id UUID,
      program_title VARCHAR(300),
      topic VARCHAR(300) NOT NULL,
      justification TEXT,
      preferred_date DATE,
      status VARCHAR(30) DEFAULT 'pending',
      reviewer_note TEXT,
      reviewed_by VARCHAR(100),
      reviewed_at TIMESTAMPTZ,
      enrollment_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_hris_training_requests_tenant
      ON hris_training_requests (tenant_id, status, created_at DESC)
  `);
  ensured = true;
  return true;
}

function mapRow(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    programId: r.program_id,
    programTitle: r.program_title,
    topic: r.topic,
    justification: r.justification,
    preferredDate: r.preferred_date,
    status: r.status,
    reviewerNote: r.reviewer_note,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    enrollmentId: r.enrollment_id,
    createdAt: r.created_at,
  };
}

export async function listTrainingRequests(opts: {
  tenantId: string;
  status?: string;
  employeeId?: string;
}) {
  if (!(await ensureTrainingRequestTables())) return [];
  let where = 'WHERE tenant_id = :tid';
  const rep: any = { tid: opts.tenantId };
  if (opts.status && opts.status !== 'all') {
    where += ' AND status = :status';
    rep.status = opts.status;
  }
  if (opts.employeeId) {
    where += ' AND employee_id = :eid';
    rep.eid = String(opts.employeeId);
  }
  const [rows] = await sequelize.query(
    `SELECT * FROM hris_training_requests ${where} ORDER BY created_at DESC LIMIT 200`,
    { replacements: rep },
  );
  return (rows || []).map(mapRow);
}

export async function createTrainingRequest(opts: {
  tenantId: string;
  employeeId: string;
  employeeName?: string;
  programId?: string | null;
  programTitle?: string;
  topic: string;
  justification?: string;
  preferredDate?: string | null;
}) {
  if (!(await ensureTrainingRequestTables())) throw new Error('DB unavailable');
  const [rows] = await sequelize.query(
    `INSERT INTO hris_training_requests
      (tenant_id, employee_id, employee_name, program_id, program_title, topic, justification, preferred_date, status)
     VALUES (:tid, :eid, :ename, :pid, :ptitle, :topic, :just, :pdate, 'pending')
     RETURNING *`,
    {
      replacements: {
        tid: opts.tenantId,
        eid: String(opts.employeeId),
        ename: opts.employeeName || null,
        pid: opts.programId || null,
        ptitle: opts.programTitle || null,
        topic: opts.topic.slice(0, 300),
        just: opts.justification || null,
        pdate: opts.preferredDate || null,
      },
    },
  );
  return mapRow(rows[0]);
}

export async function decideTrainingRequest(opts: {
  tenantId: string;
  id: string;
  decision: 'approve' | 'reject';
  reviewerNote?: string;
  reviewedBy?: string;
}): Promise<any> {
  if (!(await ensureTrainingRequestTables())) throw new Error('DB unavailable');
  const [found] = await sequelize.query(
    `SELECT * FROM hris_training_requests WHERE id = :id AND tenant_id = :tid LIMIT 1`,
    { replacements: { id: opts.id, tid: opts.tenantId } },
  );
  const row = found?.[0];
  if (!row) return null;
  if (row.status !== 'pending') throw new Error('Request sudah diproses');

  let enrollmentId: string | null = null;
  let lmsEnrollmentId: string | null = null;
  if (opts.decision === 'approve' && row.program_id) {
    try {
      const [enr] = await sequelize.query(
        `INSERT INTO hris_training_enrollments (tenant_id, training_program_id, employee_id, status, enrolled_at)
         VALUES (:tid, :pid, :eid, 'enrolled', NOW())
         RETURNING id`,
        {
          replacements: {
            tid: opts.tenantId,
            pid: row.program_id,
            eid: row.employee_id,
          },
        },
      );
      enrollmentId = enr?.[0]?.id || null;
      if (enrollmentId) {
        await sequelize.query(
          `UPDATE hris_training_programs
           SET current_participants = COALESCE(current_participants, 0) + 1
           WHERE id = :pid AND tenant_id = :tid`,
          { replacements: { pid: row.program_id, tid: opts.tenantId } },
        );
      }
    } catch {
      /* enroll best-effort if program table missing columns */
    }
  }

  // Bridge to LMS curriculum (FlowHCM: approve training request → learning enrollment)
  if (opts.decision === 'approve') {
    try {
      let programTitle = row.program_title || null;
      if (row.program_id && !programTitle) {
        const [p] = await sequelize.query(
          `SELECT title FROM hris_training_programs WHERE id = :pid AND tenant_id = :tid LIMIT 1`,
          { replacements: { pid: row.program_id, tid: opts.tenantId } },
        );
        programTitle = p?.[0]?.title || null;
      }
      const topic = String(row.topic || '').trim();
      const [currRows] = await sequelize.query(
        `SELECT id, title FROM hris_training_curricula
         WHERE tenant_id = :tid
           AND (
             (:pid IS NOT NULL AND id::text = :pid)
             OR (:ptitle IS NOT NULL AND LOWER(title) = LOWER(:ptitle))
             OR (:topic <> '' AND LOWER(title) LIKE '%' || LOWER(:topic) || '%')
           )
         ORDER BY
           CASE WHEN :pid IS NOT NULL AND id::text = :pid THEN 0
                WHEN :ptitle IS NOT NULL AND LOWER(title) = LOWER(:ptitle) THEN 1
                ELSE 2 END
         LIMIT 1`,
        {
          replacements: {
            tid: opts.tenantId,
            pid: row.program_id || null,
            ptitle: programTitle,
            topic: topic.slice(0, 80),
          },
        },
      );
      const curriculum = currRows?.[0];
      if (curriculum?.id) {
        const [emp] = await sequelize.query(
          `SELECT name FROM employees WHERE id::text = :eid AND tenant_id = :tid LIMIT 1`,
          { replacements: { eid: String(row.employee_id), tid: opts.tenantId } },
        );
        const [lms] = await sequelize.query(
          `INSERT INTO hris_lms_enrollments (id, tenant_id, curriculum_id, employee_id, employee_name, mandatory, status)
           SELECT gen_random_uuid(), :tid, :cid, :eid, :name, false, 'enrolled'
           WHERE NOT EXISTS (
             SELECT 1 FROM hris_lms_enrollments
             WHERE curriculum_id = :cid AND employee_id::text = :eid AND tenant_id = :tid
           )
           RETURNING id`,
          {
            replacements: {
              tid: opts.tenantId,
              cid: curriculum.id,
              eid: String(row.employee_id),
              name: emp?.[0]?.name || row.employee_name || null,
            },
          },
        );
        lmsEnrollmentId = lms?.[0]?.id || null;
        if (lmsEnrollmentId) {
          try {
            const { notifyLmsEnrolled } = await import('@/lib/hris/lms/notifications');
            await notifyLmsEnrolled({
              tenantId: opts.tenantId,
              employeeId: String(row.employee_id),
              curriculumTitle: curriculum.title || topic || 'Kursus',
              curriculumId: String(curriculum.id),
              dueDate: null,
            });
          } catch { /* ignore notify */ }
        }
      }
    } catch {
      /* LMS bridge best-effort */
    }
  }

  const status = opts.decision === 'approve' ? 'approved' : 'rejected';
  const [updated] = await sequelize.query(
    `UPDATE hris_training_requests SET
       status = :status,
       reviewer_note = :note,
       reviewed_by = :by,
       reviewed_at = NOW(),
       enrollment_id = COALESCE(:enr, enrollment_id),
       updated_at = NOW()
     WHERE id = :id AND tenant_id = :tid
     RETURNING *`,
    {
      replacements: {
        status,
        note: opts.reviewerNote || (lmsEnrollmentId ? `LMS enrolled: ${lmsEnrollmentId}` : null) || null,
        by: opts.reviewedBy || null,
        enr: enrollmentId || lmsEnrollmentId,
        id: opts.id,
        tid: opts.tenantId,
      },
    },
  );
  const mapped = mapRow(updated[0]);
  if (mapped && lmsEnrollmentId) (mapped as any).lmsEnrollmentId = lmsEnrollmentId;
  return mapped;
}

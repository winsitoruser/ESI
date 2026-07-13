/**
 * LMS in-app notifications for employee portal
 */
import { notifyEmployeeByEmployeeId } from '../employee-notifications';

let sequelize: any;
try { sequelize = require('../../sequelize'); } catch {}

async function logNotification(tenantId: string | null, employeeId: string, eventType: string, sourceId?: string) {
  if (!sequelize) return;
  try {
    await sequelize.query(`
      INSERT INTO hris_lms_notification_log (id, tenant_id, employee_id, event_type, source_id, channel, sent_at)
      VALUES (gen_random_uuid(), :tid, :eid, :evt, :sid, 'in_app', NOW())
    `, { replacements: { tid: tenantId, eid: employeeId, evt: eventType, sid: sourceId || null } });
  } catch { /* table may not exist */ }
}

export async function notifyLmsEnrolled(opts: {
  tenantId: string | null;
  employeeId: string;
  curriculumTitle: string;
  curriculumId: string;
  dueDate?: string | null;
}) {
  if (!sequelize) return;
  const due = opts.dueDate ? ` Batas: ${opts.dueDate}.` : '';
  await notifyEmployeeByEmployeeId(sequelize, opts.employeeId, {
    tenantId: opts.tenantId,
    title: 'Kursus baru ditugaskan',
    message: `Anda terdaftar di "${opts.curriculumTitle}".${due}`,
    type: 'info',
    sourceType: 'lms_enrollment',
    sourceId: opts.curriculumId,
  });
  await logNotification(opts.tenantId, opts.employeeId, 'lms.enrolled', opts.curriculumId);
}

export async function notifyLmsExamScheduled(opts: {
  tenantId: string | null;
  employeeId: string;
  examTitle: string;
  examId: string;
  scheduledAt?: string;
}) {
  if (!sequelize) return;
  await notifyEmployeeByEmployeeId(sequelize, opts.employeeId, {
    tenantId: opts.tenantId,
    title: 'Jadwal ujian LMS',
    message: `Ujian "${opts.examTitle}"${opts.scheduledAt ? ` dijadwalkan ${opts.scheduledAt}` : ' sudah dibuka'}.`,
    type: 'warning',
    sourceType: 'lms_exam',
    sourceId: opts.examId,
  });
  await logNotification(opts.tenantId, opts.employeeId, 'lms.exam_scheduled', opts.examId);
}

export async function notifyLmsExamResult(opts: {
  tenantId: string | null;
  employeeId: string;
  examTitle: string;
  examId: string;
  passed: boolean;
  percentage: number;
}) {
  if (!sequelize) return;
  await notifyEmployeeByEmployeeId(sequelize, opts.employeeId, {
    tenantId: opts.tenantId,
    title: opts.passed ? 'Lulus ujian' : 'Hasil ujian',
    message: `"${opts.examTitle}" — skor ${opts.percentage.toFixed(1)}%${opts.passed ? ' (LULUS)' : ''}.`,
    type: opts.passed ? 'success' : 'warning',
    sourceType: 'lms_exam_result',
    sourceId: opts.examId,
  });
  await logNotification(opts.tenantId, opts.employeeId, opts.passed ? 'lms.exam_passed' : 'lms.exam_failed', opts.examId);
}

export async function notifyLmsCertificate(opts: {
  tenantId: string | null;
  employeeId: string;
  curriculumTitle: string;
  certificateId: string;
  verifyUrl?: string;
  expiringSoon?: boolean;
}) {
  if (!sequelize) return;
  await notifyEmployeeByEmployeeId(sequelize, opts.employeeId, {
    tenantId: opts.tenantId,
    title: opts.expiringSoon ? 'Sertifikat akan kedaluwarsa' : 'Sertifikat diterbitkan',
    message: opts.expiringSoon
      ? `Sertifikat "${opts.curriculumTitle}" perlu diperbarui.`
      : `Selamat! Sertifikat "${opts.curriculumTitle}" telah diterbitkan.${opts.verifyUrl ? ` Verifikasi: ${opts.verifyUrl}` : ''}`,
    type: opts.expiringSoon ? 'warning' : 'success',
    sourceType: 'lms_certificate',
    sourceId: opts.certificateId,
  });
  await logNotification(opts.tenantId, opts.employeeId, opts.expiringSoon ? 'lms.cert_expiring' : 'lms.certificate_issued', opts.certificateId);
}

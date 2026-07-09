/**
 * Notifications for disciplinary letter workflow — manager ↔ HR ↔ employee
 */

import { insertEmployeeNotification } from './employee-notifications';

export type DisciplinaryNotifPayload = {
  tenantId?: string | null;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'approval' | 'disciplinary';
  sourceType?: string;
  sourceId?: string | null;
};

export async function notifyUserById(
  sequelize: any,
  userId: number | string,
  payload: DisciplinaryNotifPayload,
) {
  if (!sequelize || !userId) return;
  await insertEmployeeNotification(sequelize, {
    ...payload,
    userId,
  });
}

/** Notify all HR staff / super_admin in tenant */
export async function notifyHRStaff(
  sequelize: any,
  tenantId: string | null,
  payload: DisciplinaryNotifPayload,
) {
  if (!sequelize) return;
  try {
    const [rows] = await sequelize.query(`
      SELECT DISTINCT u.id AS user_id
      FROM users u
      WHERE u.is_active = true
        AND u.role IN ('super_admin', 'admin', 'hr_staff', 'hris_staff', 'owner')
        ${tenantId ? 'AND (u.tenant_id = :tenantId OR u.tenant_id IS NULL)' : ''}
      LIMIT 20
    `, { replacements: { tenantId } });

    const notified = new Set<string>();
    for (const r of rows || []) {
      if (!r.user_id || notified.has(String(r.user_id))) continue;
      notified.add(String(r.user_id));
      await insertEmployeeNotification(sequelize, {
        ...payload,
        tenantId,
        userId: r.user_id,
      });
    }
  } catch (e) {
    console.warn('notifyHRStaff:', (e as Error)?.message);
  }
}

/** Notify manager who submitted the SP request */
export async function notifyDisciplinaryRequester(
  sequelize: any,
  requestedBy: number | string | null,
  payload: DisciplinaryNotifPayload,
) {
  if (!requestedBy) return;
  await notifyUserById(sequelize, requestedBy, payload);
}

export async function notifyDisciplinaryStakeholders(
  sequelize: any,
  letter: {
    id: string;
    employee_id: string | number;
    requested_by?: number | null;
    tenant_id?: string | null;
    letter_type?: string;
    letter_number?: string;
    status?: string;
  },
  event: 'submitted' | 'investigating' | 'approved' | 'rejected' | 'issued',
  extra?: { reason?: string; investigatorName?: string },
) {
  const typeLabel = letter.letter_type || 'SP';
  const ref = letter.letter_number || letter.id?.slice(0, 8);

  const managerMessages: Record<string, DisciplinaryNotifPayload> = {
    submitted: {
      title: 'Permohonan SP Diterima HR',
      message: `Permohonan ${typeLabel} Anda telah diterima tim HR dan menunggu proses.`,
      type: 'info',
    },
    investigating: {
      title: 'Investigasi SP Dimulai',
      message: `HR${extra?.investigatorName ? ` (${extra.investigatorName})` : ''} sedang melakukan investigasi permohonan ${typeLabel} Anda.`,
      type: 'disciplinary',
    },
    approved: {
      title: 'Permohonan SP Disetujui',
      message: `Permohonan ${typeLabel} Anda telah disetujui HR. Surat akan segera diterbitkan.`,
      type: 'success',
    },
    rejected: {
      title: 'Permohonan SP Ditolak',
      message: `Permohonan ${typeLabel} ditolak HR.${extra?.reason ? ` Alasan: ${extra.reason}` : ''}`,
      type: 'warning',
    },
    issued: {
      title: `${typeLabel} Diterbitkan`,
      message: `Surat ${typeLabel} No. ${ref} telah diterbitkan ke karyawan bersangkutan.`,
      type: 'success',
    },
  };

  const employeeMessages: Record<string, DisciplinaryNotifPayload> = {
    approved: {
      title: 'Surat Disiplin — Disetujui HR',
      message: `Proses ${typeLabel} terkait Anda telah disetujui oleh HR.`,
      type: 'warning',
    },
    issued: {
      title: `Surat Peringatan ${typeLabel} Diterbitkan`,
      message: `Anda menerima ${typeLabel}${ref ? ` No. ${ref}` : ''}. Buka menu Surat SP untuk mengakui penerimaan.`,
      type: 'disciplinary',
    },
    rejected: {
      title: 'Proses Surat Disiplin Dibatalkan',
      message: `Proses ${typeLabel} terkait Anda dibatalkan oleh HR.`,
      type: 'info',
    },
  };

  const mgrPayload = managerMessages[event];
  if (mgrPayload && letter.requested_by) {
    await notifyDisciplinaryRequester(sequelize, letter.requested_by, {
      ...mgrPayload,
      tenantId: letter.tenant_id,
      sourceType: 'disciplinary_letter',
      sourceId: String(letter.id),
    });
  }

  const empPayload = employeeMessages[event];
  if (empPayload && letter.employee_id) {
    const { notifyEmployeeByEmployeeId } = await import('./employee-notifications');
    await notifyEmployeeByEmployeeId(sequelize, letter.employee_id, {
      ...empPayload,
      tenantId: letter.tenant_id,
      sourceType: 'disciplinary_letter',
      sourceId: String(letter.id),
    });
  }
}

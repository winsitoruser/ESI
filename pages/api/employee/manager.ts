import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { canAccessManagerPortal, isSuperAdminRole } from '@/lib/humanify/manager-access';
import { resolveManagerContext, buildTeamEmployeeFilter } from '@/lib/hris/manager-team-filter';
import { approveLeaveStep, rejectLeaveRequest } from '@/lib/hris/leave-request-service';
import {
  notifyEmployeeByEmployeeId,
} from '@/lib/hris/employee-notifications';
import { notifyHRStaff } from '@/lib/hris/disciplinary-notifications';
import {
  getDefaultSOP,
  buildDefaultDraftContent,
  generateLetterNumber,
  computeExpiryDate,
  type DisciplinaryLetterType,
} from '@/lib/hris/disciplinary-workflow';
import { ensureDisciplinarySchema } from '@/lib/hris/disciplinary-schema';
import { getTeamMemberDetail } from '@/lib/hris/manager-team-member-service';
import {
  getTeamMemberVisits,
  getTeamVisitDetail,
  getTeamVisitsFeed,
  getTeamVisitSummary,
} from '@/lib/hris/manager-visit-service';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (_) {}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const role = String((session.user as any).role || '');
    if (!canAccessManagerPortal(role)) {
      return res.status(403).json({ success: false, error: 'Akses khusus manajer / super admin' });
    }

    const { action } = req.query;
    const userId = String(session.user.id || '');
    const tenantId = String((session.user as any).tenantId || '');
    const isSuperAdmin = isSuperAdminRole(role);

    if (req.method === 'GET') {
      switch (action) {
        case 'summary': return getSummary(res, userId, tenantId, isSuperAdmin);
        case 'pending-approvals': return getPendingApprovals(res, userId, tenantId, isSuperAdmin);
        case 'team': return getTeam(res, userId, tenantId, isSuperAdmin);
        case 'disciplinary-letters': return getDisciplinaryLetters(res, userId, tenantId, isSuperAdmin);
        case 'team-member-detail': return getTeamMemberDetailHandler(req, res, userId, isSuperAdmin);
        case 'team-visits': return getTeamVisitsHandler(req, res, userId, isSuperAdmin);
        case 'team-visit-feed': return getTeamVisitFeedHandler(req, res, userId, isSuperAdmin);
        case 'team-visit-summary': return getTeamVisitSummaryHandler(req, res, userId, isSuperAdmin);
        case 'team-visit-detail': return getTeamVisitDetailHandler(req, res, userId, isSuperAdmin);
        default: return res.status(400).json({ error: 'Unknown action' });
      }
    }

    if (req.method === 'POST') {
      switch (action) {
        case 'approve-leave': return approveLeave(req, res, session);
        case 'reject-leave': return rejectLeave(req, res, session);
        case 'approve-claim': return approveClaim(req, res, session);
        case 'reject-claim': return rejectClaim(req, res, session);
        case 'approve-overtime': return approveOvertime(req, res, session);
        case 'reject-overtime': return rejectOvertime(req, res, session);
        case 'create-disciplinary': return createDisciplinary(req, res, session);
        case 'submit-disciplinary': return submitDisciplinary(req, res, session);
        case 'issue-disciplinary': return issueDisciplinary(req, res, session, isSuperAdmin);
        default: return res.status(400).json({ error: 'Unknown action' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('Employee Manager API error:', error?.message || error);
    const msg = error?.message || 'Internal server error';
    return res.status(500).json({ success: false, error: msg });
  }
}

async function resolveManagerContextLocal(userId: string) {
  return resolveManagerContext(sequelize, userId);
}

function teamFilterClause(isSuperAdmin: boolean, ctx: any, userId: string) {
  return buildTeamEmployeeFilter(isSuperAdmin, ctx, userId);
}

async function safeCount(sql: string, replacements: any = {}) {
  if (!sequelize) return 0;
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return Number(rows?.[0]?.cnt || 0);
  } catch { return 0; }
}

async function getSummary(res: NextApiResponse, userId: string, tenantId: string, isSuperAdmin: boolean) {
  const ctx = await resolveManagerContextLocal(userId);
  const tf = teamFilterClause(isSuperAdmin, ctx, userId);
  const tenantClause = tenantId ? 'AND lr.tenant_id = :tenantId' : '';
  const claimTenant = tenantId ? 'AND c.tenant_id = :tenantId' : '';
  const otTenant = tenantId ? 'AND ot.tenant_id = :tenantId' : '';
  const base = { tenantId, ...tf.replacements };

  const leavePending = await safeCount(`
    SELECT COUNT(*)::int as cnt FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    WHERE lr.status = 'pending' ${tenantClause} ${tf.sql}
  `, base);

  const claimsPending = await safeCount(`
    SELECT COUNT(*)::int as cnt FROM employee_claims c
    JOIN employees e ON c.employee_id::text = e.id::text
    WHERE c.status = 'pending' ${claimTenant} ${tf.sql}
  `, base);

  const overtimePending = await safeCount(`
    SELECT COUNT(*)::int as cnt FROM employee_overtime ot
    JOIN employees e ON ot.employee_id::text = e.id::text
    WHERE ot.status = 'pending' ${otTenant} ${tf.sql}
  `, base);

  const disciplinaryDraft = await safeCount(`
    SELECT COUNT(*)::int as cnt FROM hr_disciplinary_letters dl
    WHERE dl.requested_by = :userId AND dl.status IN ('draft','drafting','pending_approval')
  `, { userId: parseInt(userId, 10) || userId });

  return res.json({
    success: true,
    data: {
      leave: leavePending,
      claims: claimsPending,
      overtime: overtimePending,
      disciplinary: disciplinaryDraft,
      total: leavePending + claimsPending + overtimePending,
    },
  });
}

async function getPendingApprovals(res: NextApiResponse, userId: string, tenantId: string, isSuperAdmin: boolean) {
  if (!sequelize) return res.json({ success: true, data: { leave: [], claims: [], overtime: [] } });
  const ctx = await resolveManagerContextLocal(userId);
  const tf = teamFilterClause(isSuperAdmin, ctx, userId);
  const base = { tenantId, ...tf.replacements };

  const tenantLeave = tenantId ? 'AND lr.tenant_id = :tenantId' : '';
  const [leave] = await sequelize.query(`
    SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.total_days, lr.reason, lr.status,
      lr.created_at, lr.current_approval_step, lr.total_approval_steps,
      e.name AS employee_name, e.position, e.department, 'leave' AS approval_type,
      las.approver_role AS pending_approver_role, las.step_order AS pending_step_order
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id::text = e.id::text
    LEFT JOIN leave_approval_steps las ON las.leave_request_id = lr.id AND las.status = 'pending'
    WHERE lr.status = 'pending' ${tenantLeave} ${tf.sql}
    ORDER BY lr.created_at ASC LIMIT 50
  `, { replacements: base }).catch(() => [[]]);

  const claimTenant = tenantId ? 'AND c.tenant_id = :tenantId' : '';
  const [claims] = await sequelize.query(`
    SELECT c.id, c.claim_type, c.amount, c.claim_date, c.description, c.status, c.created_at,
      e.name AS employee_name, e.position, e.department, 'claim' AS approval_type
    FROM employee_claims c
    JOIN employees e ON c.employee_id::text = e.id::text
    WHERE c.status = 'pending' ${claimTenant} ${tf.sql}
    ORDER BY c.created_at ASC LIMIT 50
  `, { replacements: base }).catch(() => [[]]);

  const otTenant = tenantId ? 'AND ot.tenant_id = :tenantId' : '';
  const [overtime] = await sequelize.query(`
    SELECT ot.id, ot.date, ot.start_time, ot.end_time, ot.duration_hours, ot.reason,
      ot.overtime_type, ot.status, ot.created_at,
      e.name AS employee_name, e.position, e.department, 'overtime' AS approval_type
    FROM employee_overtime ot
    JOIN employees e ON ot.employee_id::text = e.id::text
    WHERE ot.status = 'pending' ${otTenant} ${tf.sql}
    ORDER BY ot.created_at ASC LIMIT 50
  `, { replacements: base }).catch(() => [[]]);

  return res.json({ success: true, data: { leave: leave || [], claims: claims || [], overtime: overtime || [] } });
}

async function getTeamMemberDetailHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  isSuperAdmin: boolean,
) {
  try {
    const employeeId = String(req.query.employeeId || '');
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'employeeId wajib' });
    }

    const period = req.query.period ? String(req.query.period) : undefined;
    const month = req.query.month ? String(req.query.month) : undefined;

    const result = await getTeamMemberDetail(sequelize, userId, employeeId, isSuperAdmin, { period, month });
    if ('error' in result && result.error) {
      return res.status(result.status || 403).json({ success: false, error: result.error });
    }

    return res.json({ success: true, data: result });
  } catch (detailErr: any) {
    console.warn('team-member-detail error:', detailErr?.message || detailErr);
    return res.status(500).json({ success: false, error: detailErr?.message || 'Gagal memuat data karyawan' });
  }
}

async function getTeamVisitsHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  isSuperAdmin: boolean,
) {
  const employeeId = String(req.query.employeeId || '');
  if (!employeeId) return res.status(400).json({ success: false, error: 'employeeId wajib' });
  const month = req.query.month ? String(req.query.month) : undefined;
  const date = req.query.date ? String(req.query.date) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const data = await getTeamMemberVisits(sequelize, userId, employeeId, isSuperAdmin, { month, date, status, limit });
  return res.json({ success: true, data });
}

async function getTeamVisitFeedHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  isSuperAdmin: boolean,
) {
  const date = req.query.date ? String(req.query.date) : undefined;
  const month = req.query.month ? String(req.query.month) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 40;
  const data = await getTeamVisitsFeed(sequelize, userId, isSuperAdmin, { date, month, limit });
  return res.json({ success: true, data });
}

async function getTeamVisitSummaryHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  isSuperAdmin: boolean,
) {
  const date = req.query.date ? String(req.query.date) : undefined;
  const month = req.query.month ? String(req.query.month) : undefined;
  const summary = await getTeamVisitSummary(sequelize, userId, isSuperAdmin, { date, month });
  return res.json({ success: true, data: summary });
}

async function getTeamVisitDetailHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  isSuperAdmin: boolean,
) {
  const visitId = String(req.query.visitId || '');
  const result = await getTeamVisitDetail(sequelize, userId, visitId, isSuperAdmin);
  if ('error' in result && result.error) {
    return res.status(result.status || 400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, data: result.visit });
}

async function getTeam(res: NextApiResponse, userId: string, tenantId: string, isSuperAdmin: boolean) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const ctx = await resolveManagerContextLocal(userId);
  const tf = teamFilterClause(isSuperAdmin, ctx, userId);
  const tenantClause = tenantId ? 'AND (e.tenant_id = :tenantId OR e.tenant_id IS NULL)' : '';

  const [rows] = await sequelize.query(`
    SELECT e.id, e.name, e.employee_code, e.position, e.department, e.email
    FROM employees e
    WHERE (e.is_active = true OR e.status = 'active' OR e.status IS NULL)
      ${tenantClause} ${tf.sql}
      AND COALESCE(e.user_id::text, '') != :mgrUserIdStr
    ORDER BY e.name ASC LIMIT 100
  `, { replacements: { tenantId, mgrUserIdStr: String(userId), ...tf.replacements } }).catch(() => [[]]);

  return res.json({ success: true, data: rows || [] });
}

async function getDisciplinaryLetters(res: NextApiResponse, userId: string, tenantId: string, isSuperAdmin: boolean) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const uid = parseInt(userId, 10) || userId;
  const tenantClause = tenantId ? 'AND dl.tenant_id = :tenantId' : '';
  const ownerClause = isSuperAdmin ? '' : 'AND dl.requested_by = :uid';

  const [rows] = await sequelize.query(`
    SELECT dl.id, dl.letter_type, dl.status, dl.current_phase, dl.request_source,
      dl.violation_type, dl.violation_description, dl.request_reason, dl.notes,
      dl.incident_date, dl.effective_date, dl.letter_number, dl.created_at,
      dl.attachments,
      e.name AS employee_name, e.employee_code, e.department
    FROM hr_disciplinary_letters dl
    LEFT JOIN employees e ON dl.employee_id::text = e.id::text
    WHERE 1=1 ${tenantClause} ${ownerClause}
    ORDER BY dl.created_at DESC LIMIT 50
  `, { replacements: { tenantId, uid } }).catch(() => [[]]);

  return res.json({ success: true, data: rows || [] });
}

async function approveLeave(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, comments } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  const result = await approveLeaveStep({
    leaveRequestId: String(id),
    approverId: session.user?.id,
    approverName: session.user?.name || session.user?.email,
    comments,
  });

  if (!result.success) return res.status(400).json(result);

  if (sequelize && result.finalized) {
    const [lr] = await sequelize.query(`SELECT employee_id, leave_type, start_date, end_date FROM leave_requests WHERE id::text = :id`, {
      replacements: { id: String(id) },
    });
    const leave = lr?.[0];
    if (leave?.employee_id) {
      await notifyEmployeeByEmployeeId(sequelize, leave.employee_id, {
        title: 'Cuti Disetujui',
        message: `Pengajuan cuti ${leave.leave_type} (${leave.start_date} – ${leave.end_date}) telah disetujui.`,
        type: 'success',
        sourceType: 'leave_request',
        sourceId: String(id),
      });
    }
  }

  return res.json(result);
}

async function rejectLeave(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, reason } = req.body || {};
  if (!id || !reason) return res.status(400).json({ success: false, error: 'id dan alasan wajib' });

  const [lrBefore] = sequelize ? await sequelize.query(
    `SELECT employee_id, leave_type, start_date, end_date FROM leave_requests WHERE id::text = :id`,
    { replacements: { id: String(id) } },
  ) : [[]];

  const result = await rejectLeaveRequest({
    leaveRequestId: String(id),
    reason,
    approverId: session.user?.id,
  });

  if (!result.success) return res.status(400).json(result);

  const leave = lrBefore?.[0];
  if (sequelize && leave?.employee_id) {
    await notifyEmployeeByEmployeeId(sequelize, leave.employee_id, {
      title: 'Cuti Ditolak',
      message: `Pengajuan cuti ditolak. Alasan: ${reason}`,
      type: 'warning',
      sourceType: 'leave_request',
      sourceId: String(id),
    });
  }

  return res.json(result);
}

async function approveClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, approved_amount, comments } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'Klaim disetujui' });

  try {
    const [claims] = await sequelize.query(`SELECT employee_id, amount FROM employee_claims WHERE id = :id`, { replacements: { id } });
    await sequelize.query(`
      UPDATE employee_claims SET status = 'approved', approved_amount = COALESCE(:approved_amount, amount),
        notes = :comments, updated_at = NOW()
      WHERE id = :id AND status = 'pending'
    `, { replacements: { id, approved_amount: approved_amount || null, comments: comments || null } });

    if (claims?.[0]?.employee_id) {
      await notifyEmployeeByEmployeeId(sequelize, claims[0].employee_id, {
        title: 'Klaim Disetujui',
        message: `Klaim Anda sebesar Rp ${Number(approved_amount || claims[0].amount || 0).toLocaleString('id-ID')} telah disetujui.`,
        type: 'success',
        sourceType: 'employee_claim',
        sourceId: String(id),
      });
    }
    return res.json({ success: true, message: 'Klaim disetujui' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function rejectClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, reason } = req.body || {};
  if (!id || !reason) return res.status(400).json({ success: false, error: 'id dan alasan wajib' });
  if (!sequelize) return res.json({ success: true, message: 'Klaim ditolak' });

  try {
    const [claims] = await sequelize.query(`SELECT employee_id FROM employee_claims WHERE id = :id`, { replacements: { id } });
    await sequelize.query(`
      UPDATE employee_claims SET status = 'rejected', notes = :reason, updated_at = NOW()
      WHERE id = :id AND status = 'pending'
    `, { replacements: { id, reason } });

    if (claims?.[0]?.employee_id) {
      await notifyEmployeeByEmployeeId(sequelize, claims[0].employee_id, {
        title: 'Klaim Ditolak',
        message: `Klaim Anda ditolak. Alasan: ${reason}`,
        type: 'warning',
        sourceType: 'employee_claim',
        sourceId: String(id),
      });
    }
    return res.json({ success: true, message: 'Klaim ditolak' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function approveOvertime(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, comments } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'Lembur disetujui' });

  const approverId = session.user?.id;
  try {
    const [rows] = await sequelize.query(`SELECT employee_id, date, duration_hours FROM employee_overtime WHERE id = :id`, { replacements: { id } });
    await sequelize.query(`
      UPDATE employee_overtime SET status = 'approved', approved_by = :approverId,
        approved_at = NOW(), notes = COALESCE(:comments, notes), updated_at = NOW()
      WHERE id = :id AND status = 'pending'
    `, { replacements: { id, approverId, comments: comments || null } });

    if (rows?.[0]?.employee_id) {
      await notifyEmployeeByEmployeeId(sequelize, rows[0].employee_id, {
        title: 'Lembur Disetujui',
        message: `Pengajuan lembur ${rows[0].date} (${rows[0].duration_hours} jam) telah disetujui.`,
        type: 'success',
        sourceType: 'employee_overtime',
        sourceId: String(id),
      });
    }
    return res.json({ success: true, message: 'Lembur disetujui' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function rejectOvertime(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, reason } = req.body || {};
  if (!id || !reason) return res.status(400).json({ success: false, error: 'id dan alasan wajib' });
  if (!sequelize) return res.json({ success: true, message: 'Lembur ditolak' });

  try {
    const [rows] = await sequelize.query(`SELECT employee_id FROM employee_overtime WHERE id = :id`, { replacements: { id } });
    await sequelize.query(`
      UPDATE employee_overtime SET status = 'rejected', rejection_reason = :reason, updated_at = NOW()
      WHERE id = :id AND status = 'pending'
    `, { replacements: { id, reason } });

    if (rows?.[0]?.employee_id) {
      await notifyEmployeeByEmployeeId(sequelize, rows[0].employee_id, {
        title: 'Lembur Ditolak',
        message: `Pengajuan lembur ditolak. Alasan: ${reason}`,
        type: 'warning',
        sourceType: 'employee_overtime',
        sourceId: String(id),
      });
    }
    return res.json({ success: true, message: 'Lembur ditolak' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

async function createDisciplinary(req: NextApiRequest, res: NextApiResponse, session: any) {
  const {
    employee_id, letter_type, violation_type, violation_description,
    incident_date, request_reason, notes, attachments,
  } = req.body || {};
  if (!employee_id || !letter_type || !violation_description) {
    return res.status(400).json({ success: false, error: 'employee_id, letter_type, violation_description wajib' });
  }
  if (!request_reason?.trim()) {
    return res.status(400).json({ success: false, error: 'Alasan permohonan wajib diisi' });
  }
  if (!sequelize) return res.json({ success: true, message: 'Permohonan SP diajukan (mock)' });

  await ensureDisciplinarySchema(sequelize);

  const tenantId = (session.user as any)?.tenantId || null;
  const userId = parseInt(String(session.user.id), 10);
  const letterType = String(letter_type).toUpperCase() as DisciplinaryLetterType;
  const sop = getDefaultSOP(letterType);
  const levels = sop.approvalLevels || [];
  const totalSteps = levels.length || 1;

  const [emps] = await sequelize.query(`
    SELECT id, name, employee_code, position, department FROM employees WHERE id = :employee_id LIMIT 1
  `, { replacements: { employee_id } });
  const emp = emps[0];
  if (!emp) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });

  const refNumber = `REQ-${Date.now()}`;
  const evidenceList = Array.isArray(attachments) ? attachments : [];
  const defaultDraft = buildDefaultDraftContent({
    letterType,
    employeeName: emp.name,
    employeeCode: emp.employee_code,
    position: emp.position,
    department: emp.department,
    violationType: violation_type || 'discipline',
    violationDescription: violation_description,
    incidentDate: incident_date,
  });

  let result: any[];
  try {
    [result] = await sequelize.query(`
    INSERT INTO hr_disciplinary_letters (
      tenant_id, employee_id, letter_type, reference_number, status, current_phase,
      violation_type, violation_description, incident_date, request_reason, notes,
      draft_content, requested_by, request_source, attachments,
      current_approval_step, total_approval_steps, audit_trail
    ) VALUES (
      :tenantId, :employee_id, :letter_type, :refNumber, 'submitted', 'request',
      :violation_type, :violation_description, :incident_date, :request_reason, :notes,
      :draftContent::jsonb, :requested_by, 'manager_portal', :attachments::jsonb,
      0, :totalSteps,
      :auditTrail::jsonb
    ) RETURNING id, letter_type, status, current_phase, created_at
  `, {
      replacements: {
        tenantId, employee_id, letter_type: letterType, refNumber,
        violation_type: violation_type || 'discipline',
        violation_description, incident_date: incident_date || null,
        request_reason: request_reason.trim(),
        notes: notes?.trim() || null,
        draftContent: JSON.stringify(defaultDraft),
        requested_by: userId,
        attachments: JSON.stringify(evidenceList),
        totalSteps,
        auditTrail: JSON.stringify([{
          action: 'manager_request_submitted',
          by: userId,
          at: new Date().toISOString(),
          source: 'employee_portal',
          evidenceCount: evidenceList.length,
        }]),
      },
    });
  } catch (e: any) {
    const msg = e?.message || 'Gagal menyimpan permohonan';
    return res.status(500).json({ success: false, error: msg });
  }

  const letterId = result[0]?.id;
  if (letterId) {
    for (const level of levels) {
      await sequelize.query(`
        INSERT INTO hr_disciplinary_approval_steps (letter_id, step_order, phase, approver_role, approver_title, status)
        VALUES (:letterId, :stepOrder, :phase, :role, :title, 'waiting')
      `, {
        replacements: {
          letterId,
          stepOrder: level.level,
          phase: level.phase,
          role: level.role,
          title: level.title,
        },
      });
    }
  }

  await notifyHRStaff(sequelize, tenantId, {
    title: `Permohonan ${letterType} dari Manajer`,
    message: `${session.user?.name || 'Manajer'} mengajukan permohonan ${letterType} untuk ${emp.name}. Perlu review HR.`,
    type: 'approval',
    sourceType: 'disciplinary_letter',
    sourceId: String(letterId),
  });

  return res.json({
    success: true,
    data: { ...result[0], employee_name: emp.name },
    message: `Permohonan ${letterType} untuk ${emp.name} berhasil diajukan ke HR`,
  });
}

async function submitDisciplinary(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'SP diajukan untuk persetujuan' });

  const userId = parseInt(String(session.user.id), 10);
  const [rows] = await sequelize.query(`
    SELECT id, status FROM hr_disciplinary_letters
    WHERE id = :id AND requested_by = :userId
  `, { replacements: { id, userId } });
  const letter = rows[0];
  if (!letter) return res.status(404).json({ success: false, error: 'Permohonan tidak ditemukan' });
  if (letter.status === 'submitted') {
    return res.json({ success: true, message: 'Permohonan sudah diajukan ke HR' });
  }
  if (!['draft', 'drafting'].includes(letter.status)) {
    return res.status(400).json({ success: false, error: 'Status permohonan tidak dapat diajukan ulang' });
  }

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET status = 'submitted', current_phase = 'request',
      updated_at = NOW()
    WHERE id = :id AND requested_by = :userId
  `, { replacements: { id, userId } });

  return res.json({ success: true, message: 'Permohonan surat peringatan diajukan ke HR' });
}

async function issueDisciplinary(req: NextApiRequest, res: NextApiResponse, session: any, isSuperAdmin: boolean) {
  if (!isSuperAdmin) {
    return res.status(403).json({ success: false, error: 'Hanya super admin yang dapat menerbitkan SP langsung' });
  }
  const { id, effective_date } = req.body || {};
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  if (!sequelize) return res.json({ success: true, message: 'SP diterbitkan' });

  const userId = parseInt(String(session.user.id), 10);
  const [letters] = await sequelize.query(`SELECT * FROM hr_disciplinary_letters WHERE id = :id`, { replacements: { id } });
  const letter = letters[0];
  if (!letter) return res.status(404).json({ success: false, error: 'Surat tidak ditemukan' });

  const sop = getDefaultSOP(letter.letter_type);
  const issueDate = effective_date || new Date().toISOString().split('T')[0];
  const expiryDate = computeExpiryDate(issueDate, sop.validityMonths);
  const letterNumber = generateLetterNumber(letter.letter_type, Date.now() % 10000);

  await sequelize.query(`
    UPDATE hr_disciplinary_letters SET status = 'issued', current_phase = 'acknowledgment',
      letter_number = :letterNumber, effective_date = :issueDate, expiry_date = :expiryDate,
      issued_by = :userId, issued_at = NOW(), updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id, letterNumber, issueDate, expiryDate, userId } });

  await notifyEmployeeByEmployeeId(sequelize, letter.employee_id, {
    tenantId: letter.tenant_id,
    title: `Surat Peringatan ${letter.letter_type} Diterbitkan`,
    message: `Anda menerima ${letter.letter_type} No. ${letterNumber}. Buka menu Surat SP untuk mengakui penerimaan.`,
    type: 'disciplinary',
    sourceType: 'disciplinary_letter',
    sourceId: String(id),
  });

  return res.json({ success: true, message: `${letter.letter_type} ${letterNumber} berhasil diterbitkan` });
}

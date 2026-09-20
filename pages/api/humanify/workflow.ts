import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  getDefaultApprovalLevels,
  inferMutationScope,
  buildMutationLetterData,
  buildEmployeeMutationUpdates,
  type MutationType,
} from '../../../lib/hris/mutation-workflow';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { resolveOrgStructureId } from '../../../lib/hris/sync-org-departments';
import { wouldCreateCycle } from '../../../lib/hris/employee-genealogy';
import { resolveManagerContext, buildTeamEmployeeFilter } from '@/lib/hris/manager-team-filter';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;

    const claimActions = new Set([
      'claims', 'claim-detail', 'claim', 'approve-claim', 'reject-claim', 'resubmit-claim',
    ]);
    if (claimActions.has(String(action || ''))) {
      const { assertHumanifyFeature } = await import('@/lib/saas/assert-feature');
      const ok = await assertHumanifyFeature(req, res, {
        tenantId: tenantIdFromSession(session),
        role: (session.user as any).role,
        feature: 'payroll',
        path: '/api/humanify/workflow?action=claim',
      });
      if (!ok) return;
    }

    if (req.method === 'GET') {
      if (action === 'claims') return getClaims(req, res, session);
      if (action === 'mutations') return getMutations(req, res, session);
      if (action === 'claim-detail') return getClaimDetail(req, res);
      if (action === 'mutation-detail') return getMutationDetail(req, res);
      if (action === 'mutation-letter-data') return getMutationLetterData(req, res);
      if (action === 'approval-config') return getApprovalConfig(req, res, session);
      if (action === 'summary') return getWorkflowSummary(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'claim') return createClaim(req, res, session);
      if (action === 'mutation') return createMutation(req, res, session);
      if (action === 'approve-claim') return approveClaim(req, res, session);
      if (action === 'reject-claim') return rejectClaim(req, res, session);
      if (action === 'resubmit-claim') return resubmitClaim(req, res, session);
      if (action === 'approve-mutation') return approveMutationStep(req, res, session);
      if (action === 'reject-mutation') return rejectMutation(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('Workflow API Error:', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });

function getTenantId(session: any): string | null {
  return tenantIdFromSession(session);
}

/** Line-manager roles that approve via Manager Hub — re-check team without blocking HQ HR/admin. */
const LINE_MANAGER_ROLES = new Set(['manager', 'branch_manager', 'manager_toko', 'supervisor']);

/**
 * Manager Hub mutation approve/reject: ensure target employee is on manager's team.
 * HQ HR / admin / super_admin skip this (workflow remains tenant-scoped only).
 */
async function assertMutationEmployeeOnTeamForManager(
  session: any,
  employeeId: string,
  tenantId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const role = String(session?.user?.role || '').toLowerCase();
  if (!LINE_MANAGER_ROLES.has(role)) return { ok: true };
  if (!sequelize) return { ok: false, status: 503, error: 'Database tidak tersedia' };
  const userId = String(session?.user?.id || '');
  const ctx = await resolveManagerContext(sequelize, userId);
  const tf = buildTeamEmployeeFilter(false, ctx, userId);
  try {
    const [rows] = await sequelize.query(
      `SELECT e.id FROM employees e
       WHERE e.id::text = :eid AND e.tenant_id = :tid ${tf.sql}
       LIMIT 1`,
      { replacements: { eid: String(employeeId), tid: tenantId, ...tf.replacements } },
    );
    if (!rows?.[0]) {
      return { ok: false, status: 403, error: 'Mutasi di luar tim Anda atau tidak ditemukan' };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, status: 500, error: e?.message || 'Team scope check failed' };
  }
}

let mutationPlacementReady = false;
async function ensureMutationPlacementColumns() {
  if (!sequelize || mutationPlacementReady) return;
  try {
    await sequelize.query(`ALTER TABLE employee_mutations ADD COLUMN IF NOT EXISTS from_supervisor_id UUID`);
    await sequelize.query(`ALTER TABLE employee_mutations ADD COLUMN IF NOT EXISTS to_supervisor_id UUID`);
    mutationPlacementReady = true;
  } catch (e) {
    console.warn('[workflow] mutation placement columns:', (e as Error)?.message);
  }
}

const MUTATION_SELECT = `
  SELECT m.*, e.name as employee_name, e.employee_code, e.photo_url,
    fb.name as from_branch_name, tb.name as to_branch_name,
    fg.name as from_grade_name, tg.name as to_grade_name,
    fs.name as from_supervisor_name, ts.name as to_supervisor_name,
    fo.name as from_org_name, torg.name as to_org_name
  FROM employee_mutations m
  LEFT JOIN employees e ON m.employee_id = e.id
  LEFT JOIN branches fb ON m.from_branch_id = fb.id
  LEFT JOIN branches tb ON m.to_branch_id = tb.id
  LEFT JOIN job_grades fg ON m.from_job_grade_id = fg.id
  LEFT JOIN job_grades tg ON m.to_job_grade_id = tg.id
  LEFT JOIN employees fs ON m.from_supervisor_id = fs.id
  LEFT JOIN employees ts ON m.to_supervisor_id = ts.id
  LEFT JOIN org_structures fo ON m.from_org_structure_id = fo.id
  LEFT JOIN org_structures torg ON m.to_org_structure_id = torg.id
`;

// ===== CLAIMS (unchanged) =====
async function getClaims(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = getTenantId(session);
  if (!tenantId) return res.json({ success: true, data: [] });
  const { status, employee_id } = req.query;
  let where = 'WHERE c.tenant_id = :tenantId';
  const replacements: any = { tenantId };
  if (status) { where += ' AND c.status = :status'; replacements.status = status; }
  if (employee_id) { where += ' AND c.employee_id = :employee_id'; replacements.employee_id = employee_id; }

  try {
    const [rows] = await sequelize.query(`
      SELECT c.*, e.name as employee_name, e.employee_code, e.department, e.position, e.photo_url,
             tr.destination AS travel_destination,
             tr.purpose AS travel_purpose,
             tr.departure_date AS travel_departure_date,
             tr.return_date AS travel_return_date,
             tr.request_number AS travel_request_number
      FROM employee_claims c
      LEFT JOIN employees e ON c.employee_id::text = e.id::text
      LEFT JOIN travel_requests tr ON tr.id::text = c.travel_request_id::text
      ${where}
      ORDER BY c.created_at DESC LIMIT 100
    `, { replacements });
    return res.json({ success: true, data: rows || [] });
  } catch {
    // Fallback without travel join (older schema)
    try {
      const [rows] = await sequelize.query(`
        SELECT c.*, e.name as employee_name, e.employee_code, e.department, e.position, e.photo_url
        FROM employee_claims c
        LEFT JOIN employees e ON c.employee_id::text = e.id::text
        ${where}
        ORDER BY c.created_at DESC LIMIT 100
      `, { replacements });
      return res.json({ success: true, data: rows || [] });
    } catch {
      return res.json({ success: true, data: [] });
    }
  }
}

async function getClaimDetail(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: null });
  const { id } = req.query;
  try {
    const [claims] = await sequelize.query(`
      SELECT c.*, e.name as employee_name, e.employee_code, e.department, e.photo_url
      FROM employee_claims c LEFT JOIN employees e ON c.employee_id::text = e.id::text WHERE c.id = :id
    `, { replacements: { id } });
    if (!claims[0]) return res.status(404).json({ error: 'Claim not found' });
    const [steps] = await sequelize.query(`
      SELECT cs.* FROM claim_approval_steps cs WHERE cs.claim_id = :id ORDER BY cs.step_order
    `, { replacements: { id } });
    return res.json({ success: true, data: { ...claims[0], approval_steps: steps || [] } });
  } catch {
    return res.status(404).json({ error: 'Claim not found' });
  }
}

async function createClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const tenantId = getTenantId(session);
  if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });
  const { employee_id, claim_type, amount, claim_date, description, receipt_url, receipt_number } = req.body;
  if (!employee_id || !claim_type || !amount) return res.status(400).json({ error: 'employee_id, claim_type, amount required' });

  const [countRes] = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM employee_claims WHERE tenant_id = :tenantId`,
    { replacements: { tenantId } },
  );
  const claimNumber = `CLM-${String(parseInt(countRes[0].cnt) + 1).padStart(5, '0')}`;

  let receiptUrlFinal = receipt_url || null;
  let attachmentsCount = 0;
  if (receipt_url) {
    try {
      const { parseClaimReceipts } = await import('@/lib/hris/claim-receipt');
      attachmentsCount = parseClaimReceipts(receipt_url).length;
    } catch {
      attachmentsCount = 1;
    }
  }

  const [result] = await sequelize.query(`
    INSERT INTO employee_claims (tenant_id, employee_id, claim_number, claim_type, amount, claim_date, description, receipt_url, receipt_number, attachments_count, status)
    VALUES (:tenantId, :employee_id, :claimNumber, :claim_type, :amount, :claim_date, :description, :receipt_url, :receipt_number, :attachments_count, 'pending') RETURNING *
  `, {
    replacements: {
      tenantId, employee_id, claimNumber, claim_type, amount,
      claim_date: claim_date || new Date().toISOString().split('T')[0],
      description: description || null,
      receipt_url: receiptUrlFinal,
      receipt_number: receipt_number || null,
      attachments_count: attachmentsCount,
    },
  });
  return res.json({ success: true, data: result[0] || result, message: 'Claim submitted' });
}

async function approveClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const tenantId = getTenantId(session);
  const { id, approved_amount, comments } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });
  const [updated] = await sequelize.query(`
    UPDATE employee_claims SET status = 'approved', approved_amount = :approved_amount, notes = :comments, updated_at = NOW()
    WHERE id = :id AND tenant_id = :tenantId
    RETURNING id
  `, { replacements: { id, approved_amount: approved_amount || null, comments: comments || null, tenantId } });
  if (!updated?.length) return res.status(404).json({ error: 'Claim not found' });
  return res.json({ success: true, message: 'Claim approved' });
}

async function rejectClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, message: 'Claim rejected' });
  const tenantId = getTenantId(session);
  const { id, comments, rejection_reason } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });
  const reason = rejection_reason || comments || 'Ditolak';
  const [updated] = await sequelize.query(`
    UPDATE employee_claims SET status = 'rejected', notes = :reason, updated_at = NOW()
    WHERE id = :id AND tenant_id = :tenantId
    RETURNING id
  `, { replacements: { id, reason, tenantId } });
  if (!updated?.length) return res.status(404).json({ error: 'Claim not found' });
  return res.json({ success: true, message: 'Klaim berhasil ditolak' });
}

async function resubmitClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, message: 'Klaim berhasil diajukan ulang' });
  const { id, amount, description } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const tenantId = getTenantId(session);
  if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });
  const [, meta] = await sequelize.query(`
    UPDATE employee_claims SET status = 'pending', amount = COALESCE(:amount, amount),
      description = COALESCE(:description, description), updated_at = NOW()
    WHERE id = :id AND tenant_id = :tenantId
  `, { replacements: { id, amount: amount ? parseFloat(amount) : null, description: description || null, tenantId } });
  if ((meta as any)?.rowCount === 0) return res.status(404).json({ error: 'Claim not found' });
  return res.json({ success: true, message: 'Klaim berhasil diajukan ulang' });
}

// ===== MUTATIONS =====
async function getMutations(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = getTenantId(session);
  if (!tenantId) return res.json({ success: true, data: [] });
  await ensureMutationPlacementColumns();
  const { status, employee_id, mutation_type, due_soon } = req.query;
  let where = 'WHERE m.tenant_id = :tenantId';
  const replacements: any = { tenantId };
  const dueSoon = String(due_soon || '').toLowerCase() === 'true' || String(due_soon || '') === '1';
  if (dueSoon) {
    // Approved mutations whose effective date is overdue or within 14 days
    where += ` AND m.status = 'approved'
      AND m.effective_date IS NOT NULL
      AND m.effective_date::date <= (CURRENT_DATE + INTERVAL '14 days')`;
  } else if (status) {
    where += ' AND m.status = :status';
    replacements.status = status;
  }
  if (employee_id) { where += ' AND m.employee_id = :employee_id'; replacements.employee_id = employee_id; }
  if (mutation_type) { where += ' AND m.mutation_type = :mutation_type'; replacements.mutation_type = mutation_type; }

  try {
    const [rows] = await sequelize.query(`${MUTATION_SELECT} ${where} ORDER BY m.created_at DESC LIMIT 100`, { replacements });
    return res.json({ success: true, data: rows || [], meta: dueSoon ? { filter: 'due_soon', status: 'approved' } : undefined });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message, data: [] });
  }
}

async function getMutationDetail(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: null });
  await ensureMutationPlacementColumns();
  const { id } = req.query;
  try {
    const [mutations] = await sequelize.query(`${MUTATION_SELECT} WHERE m.id = :id`, { replacements: { id } });
    if (!mutations[0]) return res.status(404).json({ error: 'Mutation not found' });

    const [steps] = await sequelize.query(`
      SELECT ms.*, e.name as approver_name
      FROM mutation_approval_steps ms
      LEFT JOIN employees e ON ms.approver_id = e.id
      WHERE ms.mutation_id = :id ORDER BY ms.step_order
    `, { replacements: { id } });

    return res.json({ success: true, data: { ...mutations[0], approval_steps: steps || [] } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message });
  }
}

async function getMutationLetterData(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  await ensureMutationPlacementColumns();
  try {
    const [mutations] = await sequelize.query(`${MUTATION_SELECT} WHERE m.id = :id`, { replacements: { id } });
    if (!mutations[0]) return res.status(404).json({ success: false, error: 'Not found' });
    const mut = mutations[0];
    const letterData = buildMutationLetterData(mut);
    return res.json({
      success: true,
      data: {
        letterData,
        meta: {
          documentNumber: mut.mutation_number,
          documentDate: mut.effective_date,
          title: mut.mutation_type === 'assignment' ? 'Surat Penugasan' : 'Surat Keputusan Mutasi',
        },
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message });
  }
}

async function getApprovalConfig(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: { approval_levels: getDefaultApprovalLevels('transfer') } });
  const tenantId = getTenantId(session);
  if (!tenantId) {
    return res.json({ success: true, data: { approval_levels: getDefaultApprovalLevels('transfer') } });
  }
  try {
    const [rows] = await sequelize.query(`
      SELECT * FROM mutation_approval_configs WHERE is_active = true
      AND tenant_id = :tenantId
      ORDER BY created_at ASC LIMIT 1
    `, { replacements: { tenantId } });
    if (rows[0]) return res.json({ success: true, data: rows[0] });
  } catch { /* table may not exist */ }
  return res.json({ success: true, data: { approval_levels: getDefaultApprovalLevels('transfer') } });
}

async function snapshotEmployee(employeeId: string) {
  const [rows] = await sequelize.query(`
    SELECT e.id, e.department, e.position, e.branch_id, e.salary, e.job_grade_id, e.org_structure_id,
      e.supervisor_id, b.name as branch_name
    FROM employees e LEFT JOIN branches b ON e.branch_id = b.id WHERE e.id = :id
  `, { replacements: { id: employeeId } });
  return rows[0] || null;
}

async function createMutation(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  await ensureMutationPlacementColumns();
  const tenantId = getTenantId(session);
  const userId = (session.user as any)?.id;
  const {
    employee_id, mutation_type, effective_date, mutation_scope,
    to_branch_id, to_department, to_position, to_job_grade_id, to_org_structure_id,
    to_supervisor_id, salary_change, new_salary, reason, notes,
  } = req.body;

  if (!employee_id || !mutation_type || !effective_date) {
    return res.status(400).json({ error: 'employee_id, mutation_type, effective_date wajib diisi' });
  }

  const emp = await snapshotEmployee(String(employee_id));
  if (!emp) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });

  const resolvedOrgId = to_org_structure_id
    || await resolveOrgStructureId(sequelize, tenantId, to_department);

  const mType = mutation_type as MutationType;
  const levels = getDefaultApprovalLevels(mType);
  const totalSteps = levels.length;
  const scope = inferMutationScope({
    mutation_scope,
    from_department: emp.department,
    to_department,
    from_branch_id: emp.branch_id,
    to_branch_id,
    from_position: emp.position,
    to_position,
  });

  const [countRes] = await sequelize.query(`SELECT COUNT(*) as cnt FROM employee_mutations`);
  const mutationNumber = `MUT-${String(parseInt(countRes[0]?.cnt || 0) + 1).padStart(5, '0')}`;

  const [result] = await sequelize.query(`
    INSERT INTO employee_mutations (
      tenant_id, employee_id, mutation_type, mutation_scope, mutation_number, effective_date, status,
      from_branch_id, from_department, from_position, from_job_grade_id, from_org_structure_id,
      to_branch_id, to_department, to_position, to_job_grade_id, to_org_structure_id,
      from_supervisor_id, to_supervisor_id,
      salary_change, new_salary, reason, notes, requested_by,
      current_approval_step, total_approval_steps
    ) VALUES (
      :tenantId, :employee_id, :mutation_type, :mutation_scope, :mutationNumber, :effective_date, 'pending',
      :from_branch_id, :from_department, :from_position, :from_job_grade_id, :from_org_structure_id,
      :to_branch_id, :to_department, :to_position, :to_job_grade_id, :to_org_structure_id,
      :from_supervisor_id, :to_supervisor_id,
      :salary_change, :new_salary, :reason, :notes, :requested_by,
      1, :totalSteps
    ) RETURNING *
  `, {
    replacements: {
      tenantId, employee_id, mutation_type: mType, mutation_scope: scope, mutationNumber, effective_date,
      from_branch_id: emp.branch_id, from_department: emp.department, from_position: emp.position,
      from_job_grade_id: emp.job_grade_id || null, from_org_structure_id: emp.org_structure_id || null,
      to_branch_id: to_branch_id || null, to_department: to_department || null,
      to_position: to_position || null, to_job_grade_id: to_job_grade_id || null,
      to_org_structure_id: resolvedOrgId || null,
      from_supervisor_id: emp.supervisor_id || null,
      to_supervisor_id: to_supervisor_id || null,
      salary_change: salary_change || 0, new_salary: new_salary || null,
      reason: reason || null, notes: notes || null, requested_by: userId || null, totalSteps,
    },
  });

  const mutation = result[0] || result;
  const mutationId = mutation.id;

  for (const level of levels) {
    await sequelize.query(`
      INSERT INTO mutation_approval_steps (mutation_id, step_order, approver_role, approver_title, status)
      VALUES (:mutationId, :stepOrder, :role, :title, :status)
    `, {
      replacements: {
        mutationId,
        stepOrder: level.level,
        role: level.role,
        title: level.title,
        status: level.level === 1 ? 'pending' : 'waiting',
      },
    });
  }

  return res.json({
    success: true,
    data: mutation,
    message: `Pengajuan ${mType === 'assignment' ? 'penugasan' : 'mutasi'} ${mutationNumber} berhasil (${totalSteps} tahap persetujuan)`,
  });
}

async function approveMutationStep(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const { id, step_id, comments } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const tenantId = getTenantId(session);
  if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });

  const userId = (session.user as any)?.id;
  const [mutations] = await sequelize.query(
    `SELECT * FROM employee_mutations WHERE id = :id AND tenant_id = :tenantId`,
    { replacements: { id, tenantId } },
  );
  const mut = mutations[0];
  if (!mut) return res.status(404).json({ error: 'Not found' });
  if (mut.status !== 'pending') return res.status(400).json({ success: false, error: 'Mutasi tidak dalam status pending' });

  const teamGate = await assertMutationEmployeeOnTeamForManager(session, mut.employee_id, tenantId);
  if (!teamGate.ok) return res.status(teamGate.status).json({ success: false, error: teamGate.error });

  const stepFilter = step_id
    ? 'AND id = :stepId'
    : `AND step_order = (SELECT MIN(step_order) FROM mutation_approval_steps WHERE mutation_id = :id AND status = 'pending')`;

  await sequelize.query(`
    UPDATE mutation_approval_steps SET status = 'approved', approver_id = :userId,
      comments = :comments, acted_at = NOW()
    WHERE mutation_id = :id AND status = 'pending' ${stepFilter}
  `, { replacements: { id, stepId: step_id, userId, comments: comments || null } });

  const [waiting] = await sequelize.query(`
    SELECT id, step_order FROM mutation_approval_steps
    WHERE mutation_id = :id AND status = 'waiting' ORDER BY step_order LIMIT 1
  `, { replacements: { id } });

  if (waiting[0]) {
    await sequelize.query(`UPDATE mutation_approval_steps SET status = 'pending' WHERE id = :sid`, { replacements: { sid: waiting[0].id } });
    await sequelize.query(`
      UPDATE employee_mutations SET current_approval_step = :step, notes = COALESCE(:comments, notes), updated_at = NOW()
      WHERE id = :id AND tenant_id = :tenantId
    `, { replacements: { id, tenantId, step: waiting[0].step_order, comments: comments || null } });
    return res.json({ success: true, message: `Disetujui — menunggu persetujuan tahap ${waiting[0].step_order}` });
  }

  const [stillPending] = await sequelize.query(`
    SELECT COUNT(*)::int as cnt FROM mutation_approval_steps WHERE mutation_id = :id AND status = 'pending'
  `, { replacements: { id } });
  if (stillPending[0]?.cnt > 0) {
    return res.json({ success: true, message: 'Tahap disetujui' });
  }

  // Final approval — apply placement only when effective_date is due (else defer to cron)
  const { isMutationEffectiveOnOrBeforeToday } = await import('@/lib/hris/mutation-apply-due');
  const dueNow = isMutationEffectiveOnOrBeforeToday(mut.effective_date);
  if (dueNow) {
    await applyMutationToEmployee(mut, tenantId);
  }
  const eFileId = await createMutationEFile(mut);
  const finalStatus = dueNow ? 'executed' : 'approved';

  await sequelize.query(`
    UPDATE employee_mutations SET status = :finalStatus, e_file_id = :eFileId,
      document_url = :docUrl, notes = COALESCE(:comments, notes), updated_at = NOW()
    WHERE id = :id AND tenant_id = :tenantId
  `, {
    replacements: {
      id, tenantId, finalStatus, eFileId,
      docUrl: `/humanify/mutations?highlight=${id}`,
      comments: comments || null,
    },
  });

  return res.json({
    success: true,
    message: dueNow
      ? 'Mutasi disetujui & diterapkan. E-Letter siap diunduh.'
      : `Mutasi disetujui — penempatan menunggu tanggal efektif ${mut.effective_date}. E-Letter siap diunduh.`,
    eFileId,
    deferred: !dueNow,
  });
}

async function applyMutationToEmployee(mut: any, tenantId?: string | null) {
  let orgId = mut.to_org_structure_id || null;
  if (!orgId && mut.to_department) {
    orgId = await resolveOrgStructureId(sequelize, tenantId || mut.tenant_id, mut.to_department);
  }

  let supervisorId = mut.to_supervisor_id || null;
  if (supervisorId && String(supervisorId) === String(mut.employee_id)) {
    supervisorId = null;
  }
  if (supervisorId) {
    try {
      const [rows] = await sequelize.query(
        `SELECT id, supervisor_id FROM employees
         WHERE tenant_id = :tenantId AND COALESCE(is_active, true) = true`,
        { replacements: { tenantId: tenantId || mut.tenant_id } },
      );
      if (wouldCreateCycle(String(mut.employee_id), String(supervisorId), rows || [])) {
        console.warn('[workflow] skip supervisor update — would create cycle');
        supervisorId = null;
      }
    } catch (e) {
      console.warn('[workflow] supervisor cycle check skipped:', (e as Error)?.message);
    }
  }

  const { setClauses, replacements } = buildEmployeeMutationUpdates({
    to_department: mut.to_department,
    to_position: mut.to_position,
    to_branch_id: mut.to_branch_id,
    to_job_grade_id: mut.to_job_grade_id,
    new_salary: mut.new_salary,
    to_org_structure_id: orgId,
    to_supervisor_id: supervisorId,
  });
  if (setClauses.length <= 1) return;
  try {
    await sequelize.query(
      `UPDATE employees SET ${setClauses.join(', ')} WHERE id = :empId`,
      { replacements: { ...replacements, empId: mut.employee_id } },
    );
  } catch (e) {
    console.warn('[workflow] placement update retry without org/supervisor:', (e as Error)?.message);
    const fallback = buildEmployeeMutationUpdates({
      to_department: mut.to_department,
      to_position: mut.to_position,
      to_branch_id: mut.to_branch_id,
      to_job_grade_id: mut.to_job_grade_id,
      new_salary: mut.new_salary,
    });
    if (fallback.setClauses.length <= 1) return;
    await sequelize.query(
      `UPDATE employees SET ${fallback.setClauses.join(', ')} WHERE id = :empId`,
      { replacements: { ...fallback.replacements, empId: mut.employee_id } },
    );
  }
}

async function createMutationEFile(mut: any): Promise<string | null> {
  try {
    const docType = mut.mutation_type === 'assignment' ? 'SK_PENUGASAN' : 'SK_MUTASI';
    const title = mut.mutation_type === 'assignment'
      ? `Surat Penugasan ${mut.mutation_number}`
      : `SK Mutasi ${mut.mutation_number}`;
    const [result] = await sequelize.query(`
      INSERT INTO employee_documents (tenant_id, employee_id, document_type, document_number, title, description, status, issue_date, created_at, updated_at)
      VALUES (:tenantId, :employeeId, :docType, :docNumber, :title, :desc, 'active', :issueDate, NOW(), NOW())
      RETURNING id
    `, {
      replacements: {
        tenantId: mut.tenant_id,
        employeeId: mut.employee_id,
        docType,
        docNumber: mut.mutation_number,
        title,
        desc: `E-Letter otomatis — ${mut.mutation_type} efektif ${mut.effective_date}. ${mut.reason || ''}`,
        issueDate: mut.effective_date,
      },
    });
    return result[0]?.id || null;
  } catch (e) {
    console.warn('E-file insert skipped:', (e as Error)?.message);
    return null;
  }
}

async function rejectMutation(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const { id, comments } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  if (!comments) return res.status(400).json({ success: false, error: 'Alasan penolakan wajib diisi' });
  const tenantId = getTenantId(session);
  if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });

  const [mutations] = await sequelize.query(
    `SELECT id, employee_id FROM employee_mutations WHERE id = :id AND tenant_id = :tenantId`,
    { replacements: { id, tenantId } },
  );
  if (!mutations?.[0]) return res.status(404).json({ error: 'Not found' });

  const teamGate = await assertMutationEmployeeOnTeamForManager(session, mutations[0].employee_id, tenantId);
  if (!teamGate.ok) return res.status(teamGate.status).json({ success: false, error: teamGate.error });

  await sequelize.query(`
    UPDATE mutation_approval_steps SET status = 'rejected', comments = :comments, acted_at = NOW()
    WHERE mutation_id = :id AND status IN ('pending', 'waiting')
  `, { replacements: { id, comments } });

  await sequelize.query(`
    UPDATE employee_mutations SET status = 'rejected', notes = :comments, updated_at = NOW()
    WHERE id = :id AND tenant_id = :tenantId
  `, { replacements: { id, tenantId, comments } });

  return res.json({ success: true, message: 'Mutasi ditolak', clearedWaitingSteps: true });
}

async function getWorkflowSummary(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: {} });
  const tenantId = getTenantId(session);
  if (!tenantId) {
    return res.json({
      success: true,
      data: {
        claims: { pending: 0, approved: 0, rejected: 0 },
        mutations: { pending: 0, approved: 0 },
        overtime: { pending: 0, approved: 0 },
        pendingClaims: 0, approvedClaims: 0, rejectedClaims: 0,
        pendingMutations: 0, approvedMutations: 0,
        pendingOvertime: 0, approvedOvertime: 0,
      },
    });
  }
  const safeCount = async (sql: string, replacements: Record<string, unknown>) => {
    try {
      const [r] = await sequelize.query(sql, { replacements });
      return parseInt(r[0]?.cnt || 0, 10);
    } catch { return 0; }
  };
  const tid = { tenantId };

  const claimsPending = await safeCount(`SELECT COUNT(*) as cnt FROM employee_claims WHERE status = 'pending' AND tenant_id = :tenantId`, tid);
  const claimsApproved = await safeCount(`SELECT COUNT(*) as cnt FROM employee_claims WHERE status = 'approved' AND tenant_id = :tenantId`, tid);
  const claimsRejected = await safeCount(`SELECT COUNT(*) as cnt FROM employee_claims WHERE status = 'rejected' AND tenant_id = :tenantId`, tid);
  const mutationsPending = await safeCount(`SELECT COUNT(*) as cnt FROM employee_mutations WHERE status = 'pending' AND tenant_id = :tenantId`, tid);
  const mutationsApproved = await safeCount(`SELECT COUNT(*) as cnt FROM employee_mutations WHERE status IN ('approved','executed') AND tenant_id = :tenantId`, tid);
  const overtimePending = await safeCount(`SELECT COUNT(*) as cnt FROM overtime_requests WHERE status = 'pending' AND tenant_id = :tenantId`, tid);
  const overtimeApproved = await safeCount(`SELECT COUNT(*) as cnt FROM overtime_requests WHERE status = 'approved' AND tenant_id = :tenantId`, tid);
  const trainingPending = await safeCount(`SELECT COUNT(*) as cnt FROM hris_training_requests WHERE status = 'pending' AND tenant_id = :tenantId`, tid);
  const okrPending = await safeCount(`SELECT COUNT(*) as cnt FROM hris_okr_objectives WHERE status = 'pending_approval' AND tenant_id = :tenantId`, tid);
  const travelPending = await safeCount(`SELECT COUNT(*) as cnt FROM travel_requests WHERE status = 'pending' AND tenant_id = :tenantId`, tid);

  return res.json({
    success: true,
    data: {
      claims: { pending: claimsPending, approved: claimsApproved, rejected: claimsRejected },
      mutations: { pending: mutationsPending, approved: mutationsApproved },
      overtime: { pending: overtimePending, approved: overtimeApproved },
      training: { pending: trainingPending },
      okr: { pending: okrPending },
      travel: { pending: travelPending },
      pendingClaims: claimsPending,
      approvedClaims: claimsApproved,
      rejectedClaims: claimsRejected,
      pendingMutations: mutationsPending,
      approvedMutations: mutationsApproved,
      pendingOvertime: overtimePending,
      approvedOvertime: overtimeApproved,
      pendingTraining: trainingPending,
      pendingOkr: okrPending,
      pendingTravel: travelPending,
    },
  });
}

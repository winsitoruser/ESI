import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  getDefaultApprovalLevels,
  inferMutationScope,
  buildMutationLetterData,
  type MutationType,
} from '../../../lib/hris/mutation-workflow';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;

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
      SELECT c.*, e.name as employee_name, e.employee_code, e.department, e.position
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

async function getClaimDetail(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: null });
  const { id } = req.query;
  try {
    const [claims] = await sequelize.query(`
      SELECT c.*, e.name as employee_name, e.employee_code, e.department
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

  const [result] = await sequelize.query(`
    INSERT INTO employee_claims (tenant_id, employee_id, claim_number, claim_type, amount, claim_date, description, receipt_url, receipt_number, status)
    VALUES (:tenantId, :employee_id, :claimNumber, :claim_type, :amount, :claim_date, :description, :receipt_url, :receipt_number, 'pending') RETURNING *
  `, {
    replacements: {
      tenantId, employee_id, claimNumber, claim_type, amount,
      claim_date: claim_date || new Date().toISOString().split('T')[0],
      description: description || null, receipt_url: receipt_url || null, receipt_number: receipt_number || null,
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
const MUTATION_SELECT = `
  SELECT m.*, e.name as employee_name, e.employee_code,
    fb.name as from_branch_name, tb.name as to_branch_name,
    fg.name as from_grade_name, tg.name as to_grade_name
  FROM employee_mutations m
  LEFT JOIN employees e ON m.employee_id = e.id
  LEFT JOIN branches fb ON m.from_branch_id = fb.id
  LEFT JOIN branches tb ON m.to_branch_id = tb.id
  LEFT JOIN job_grades fg ON m.from_job_grade_id = fg.id
  LEFT JOIN job_grades tg ON m.to_job_grade_id = tg.id
`;

async function getMutations(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const tenantId = getTenantId(session);
  if (!tenantId) return res.json({ success: true, data: [] });
  const { status, employee_id, mutation_type } = req.query;
  let where = 'WHERE m.tenant_id = :tenantId';
  const replacements: any = { tenantId };
  if (status) { where += ' AND m.status = :status'; replacements.status = status; }
  if (employee_id) { where += ' AND m.employee_id = :employee_id'; replacements.employee_id = employee_id; }
  if (mutation_type) { where += ' AND m.mutation_type = :mutation_type'; replacements.mutation_type = mutation_type; }

  try {
    const [rows] = await sequelize.query(`${MUTATION_SELECT} ${where} ORDER BY m.created_at DESC LIMIT 100`, { replacements });
    return res.json({ success: true, data: rows || [] });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message, data: [] });
  }
}

async function getMutationDetail(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: null });
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
      b.name as branch_name
    FROM employees e LEFT JOIN branches b ON e.branch_id = b.id WHERE e.id = :id
  `, { replacements: { id: employeeId } });
  return rows[0] || null;
}

async function createMutation(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const tenantId = getTenantId(session);
  const userId = (session.user as any)?.id;
  const {
    employee_id, mutation_type, effective_date, mutation_scope,
    to_branch_id, to_department, to_position, to_job_grade_id, to_org_structure_id,
    salary_change, new_salary, reason, notes,
  } = req.body;

  if (!employee_id || !mutation_type || !effective_date) {
    return res.status(400).json({ error: 'employee_id, mutation_type, effective_date wajib diisi' });
  }

  const emp = await snapshotEmployee(String(employee_id));
  if (!emp) return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });

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
      salary_change, new_salary, reason, notes, requested_by,
      current_approval_step, total_approval_steps
    ) VALUES (
      :tenantId, :employee_id, :mutation_type, :mutation_scope, :mutationNumber, :effective_date, 'pending',
      :from_branch_id, :from_department, :from_position, :from_job_grade_id, :from_org_structure_id,
      :to_branch_id, :to_department, :to_position, :to_job_grade_id, :to_org_structure_id,
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
      to_org_structure_id: to_org_structure_id || null,
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

  // Final approval — apply changes + e-file
  await applyMutationToEmployee(mut);
  const eFileId = await createMutationEFile(mut);
  const finalStatus = new Date(mut.effective_date) <= new Date() ? 'executed' : 'approved';

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

  return res.json({ success: true, message: 'Mutasi disetujui & diterapkan. E-Letter siap diunduh.', eFileId });
}

async function applyMutationToEmployee(mut: any) {
  const updates: string[] = ['updated_at = NOW()'];
  const rep: any = { empId: mut.employee_id };
  if (mut.to_department) { updates.push('department = :dept'); rep.dept = mut.to_department; }
  if (mut.to_position) { updates.push('position = :pos'); rep.pos = mut.to_position; }
  if (mut.to_branch_id) { updates.push('branch_id = :branchId'); rep.branchId = mut.to_branch_id; }
  if (mut.to_job_grade_id) { updates.push('job_grade_id = :gradeId'); rep.gradeId = mut.to_job_grade_id; }
  if (mut.new_salary) { updates.push('salary = :salary'); rep.salary = mut.new_salary; }
  if (updates.length > 1) {
    await sequelize.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = :empId`, { replacements: rep });
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
    `SELECT id FROM employee_mutations WHERE id = :id AND tenant_id = :tenantId`,
    { replacements: { id, tenantId } },
  );
  if (!mutations?.[0]) return res.status(404).json({ error: 'Not found' });

  await sequelize.query(`
    UPDATE mutation_approval_steps SET status = 'rejected', comments = :comments, acted_at = NOW()
    WHERE mutation_id = :id AND status = 'pending'
  `, { replacements: { id, comments } });

  await sequelize.query(`
    UPDATE employee_mutations SET status = 'rejected', notes = :comments, updated_at = NOW()
    WHERE id = :id AND tenant_id = :tenantId
  `, { replacements: { id, tenantId, comments } });

  return res.json({ success: true, message: 'Mutasi ditolak' });
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

  return res.json({
    success: true,
    data: {
      claims: { pending: claimsPending, approved: claimsApproved, rejected: claimsRejected },
      mutations: { pending: mutationsPending, approved: mutationsApproved },
      overtime: { pending: overtimePending, approved: overtimeApproved },
      pendingClaims: claimsPending,
      approvedClaims: claimsApproved,
      rejectedClaims: claimsRejected,
      pendingMutations: mutationsPending,
      approvedMutations: mutationsApproved,
      pendingOvertime: overtimePending,
      approvedOvertime: overtimeApproved,
    },
  });
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'claims') return getClaims(req, res, session);
      if (action === 'mutations') return getMutations(req, res, session);
      if (action === 'claim-detail') return getClaimDetail(req, res);
      if (action === 'mutation-detail') return getMutationDetail(req, res);
      if (action === 'summary') return getWorkflowSummary(req, res);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'claim') return createClaim(req, res, session);
      if (action === 'mutation') return createMutation(req, res, session);
      if (action === 'approve-claim') return approveClaim(req, res, session);
      if (action === 'reject-claim') return rejectClaim(req, res, session);
      if (action === 'resubmit-claim') return resubmitClaim(req, res, session);
      if (action === 'approve-mutation') return approveMutation(req, res, session);
      if (action === 'reject-mutation') return rejectMutation(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Workflow API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ===== CLAIMS =====
async function getClaims(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { status, employee_id } = req.query;
  let where = "WHERE 1=1";
  const replacements: any = {};
  if (status) { where += " AND c.status = :status"; replacements.status = status; }
  if (employee_id) { where += " AND c.employee_id = :employee_id"; replacements.employee_id = employee_id; }

  const [rows] = await sequelize.query(`
    SELECT c.*, e.name as employee_name, e.employee_id as employee_code, e.department, e.position
    FROM employee_claims c
    LEFT JOIN employees e ON c.employee_id = e.id
    ${where}
    ORDER BY c.created_at DESC
    LIMIT 100
  `, { replacements });
  return res.json({ success: true, data: rows || [] });
}

async function getClaimDetail(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: null });
  const { id } = req.query;
  const [claims] = await sequelize.query(`
    SELECT c.*, e.name as employee_name, e.employee_id as employee_code, e.department
    FROM employee_claims c
    LEFT JOIN employees e ON c.employee_id = e.id
    WHERE c.id = :id
  `, { replacements: { id } });
  if (!claims[0]) return res.status(404).json({ error: 'Claim not found' });

  const [steps] = await sequelize.query(`
    SELECT cs.*, a.name as approver_name
    FROM claim_approval_steps cs
    LEFT JOIN employees a ON cs.approver_id::integer = a.id
    WHERE cs.claim_id = :id ORDER BY cs.step_order
  `, { replacements: { id } });

  return res.json({ success: true, data: { ...claims[0], approval_steps: steps || [] } });
}

async function createClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const tenantId = (session.user as any).tenantId;
  const { employee_id, claim_type, amount, claim_date, description, receipt_url, receipt_number } = req.body;

  if (!employee_id || !claim_type || !amount) return res.status(400).json({ error: 'employee_id, claim_type, amount required' });

  // Generate claim number
  const [countRes] = await sequelize.query(`SELECT COUNT(*) as cnt FROM employee_claims`);
  const claimNumber = `CLM-${String(parseInt(countRes[0].cnt) + 1).padStart(5, '0')}`;

  const [result] = await sequelize.query(`
    INSERT INTO employee_claims (tenant_id, employee_id, claim_number, claim_type, amount, claim_date, description, receipt_url, receipt_number, status)
    VALUES (:tenantId, :employee_id, :claimNumber, :claim_type, :amount, :claim_date, :description, :receipt_url, :receipt_number, 'pending')
    RETURNING *
  `, {
    replacements: {
      tenantId, employee_id, claimNumber, claim_type, amount,
      claim_date: claim_date || new Date().toISOString().split('T')[0],
      description: description || null, receipt_url: receipt_url || null, receipt_number: receipt_number || null
    }
  });

  return res.json({ success: true, data: result[0] || result, message: 'Claim submitted' });
}

async function approveClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const { id, approved_amount, comments } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  await sequelize.query(`
    UPDATE employee_claims SET status = 'approved', approved_amount = :approved_amount, notes = :comments, updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id, approved_amount: approved_amount || null, comments: comments || null } });

  return res.json({ success: true, message: 'Claim approved' });
}

async function rejectClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, message: 'Claim rejected' });
  const { id, comments, rejection_reason } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  if (!rejection_reason && !comments) return res.status(400).json({ success: false, error: 'Alasan penolakan wajib diisi' });

  const reason = rejection_reason || comments;
  const rejectedBy = (session.user as any)?.id || null;
  const rejectedByName = (session.user as any)?.name || null;

  await sequelize.query(`
    UPDATE employee_claims
    SET status = 'rejected',
        rejection_reason = :reason,
        notes = :comments,
        rejected_by = :rejectedBy,
        rejected_by_name = :rejectedByName,
        rejected_at = NOW(),
        updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id, reason, comments: reason, rejectedBy, rejectedByName } });

  return res.json({ success: true, message: 'Klaim berhasil ditolak' });
}

async function resubmitClaim(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, message: 'Klaim berhasil diajukan ulang' });
  const { id, amount, description, receipt_date, attachments } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  // Verify the claim is owned by the requester and is currently rejected
  const tenantId = (session.user as any)?.tenantId;
  const [claims] = await sequelize.query(
    `SELECT c.* FROM employee_claims c WHERE c.id = :id AND c.tenant_id = :tenantId AND c.status = 'rejected'`,
    { replacements: { id, tenantId } }
  );
  if (!claims || (claims as any[]).length === 0) {
    return res.status(404).json({ success: false, error: 'Klaim tidak ditemukan atau tidak dapat diajukan ulang' });
  }

  const receiptUrl = attachments?.length ? JSON.stringify(attachments.map((a: any) => a.name)) : null;

  await sequelize.query(`
    UPDATE employee_claims
    SET status = 'pending',
        amount = COALESCE(:amount, amount),
        description = COALESCE(:description, description),
        receipt_date = COALESCE(:receipt_date, receipt_date),
        receipt_url = COALESCE(:receiptUrl, receipt_url),
        rejection_reason = NULL,
        rejected_by = NULL,
        rejected_by_name = NULL,
        rejected_at = NULL,
        resubmitted_at = NOW(),
        resubmit_count = COALESCE(resubmit_count, 0) + 1,
        updated_at = NOW()
    WHERE id = :id
  `, { replacements: { id, amount: amount ? parseFloat(amount) : null, description: description || null, receipt_date: receipt_date || null, receiptUrl } });

  return res.json({ success: true, message: 'Klaim berhasil diajukan ulang dan sedang menunggu persetujuan' });
}

// ===== MUTATIONS =====
async function getMutations(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  const { status, employee_id } = req.query;
  let where = "WHERE 1=1";
  const replacements: any = {};
  if (status) { where += " AND m.status = :status"; replacements.status = status; }
  if (employee_id) { where += " AND m.employee_id = :employee_id"; replacements.employee_id = employee_id; }

  const [rows] = await sequelize.query(`
    SELECT m.*, e.name as employee_name, e.employee_id as employee_code, e.department as current_department,
      fb.name as from_branch_name, tb.name as to_branch_name
    FROM employee_mutations m
    LEFT JOIN employees e ON m.employee_id = e.id
    LEFT JOIN branches fb ON m.from_branch_id = fb.id
    LEFT JOIN branches tb ON m.to_branch_id = tb.id
    ${where}
    ORDER BY m.created_at DESC
    LIMIT 100
  `, { replacements });
  return res.json({ success: true, data: rows || [] });
}

async function getMutationDetail(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: null });
  const { id } = req.query;
  const [mutations] = await sequelize.query(`
    SELECT m.*, e.name as employee_name, e.employee_id as employee_code,
      fb.name as from_branch_name, tb.name as to_branch_name,
      fg.name as from_grade_name, tg.name as to_grade_name
    FROM employee_mutations m
    LEFT JOIN employees e ON m.employee_id = e.id
    LEFT JOIN branches fb ON m.from_branch_id = fb.id
    LEFT JOIN branches tb ON m.to_branch_id = tb.id
    LEFT JOIN job_grades fg ON m.from_job_grade_id = fg.id
    LEFT JOIN job_grades tg ON m.to_job_grade_id = tg.id
    WHERE m.id = :id
  `, { replacements: { id } });
  if (!mutations[0]) return res.status(404).json({ error: 'Mutation not found' });

  const [steps] = await sequelize.query(`
    SELECT ms.*, a.name as approver_name
    FROM mutation_approval_steps ms
    LEFT JOIN employees a ON ms.approver_id::integer = a.id
    WHERE ms.mutation_id = :id ORDER BY ms.step_order
  `, { replacements: { id } });

  return res.json({ success: true, data: { ...mutations[0], approval_steps: steps || [] } });
}

async function createMutation(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const tenantId = (session.user as any).tenantId;
  const {
    employee_id, mutation_type, effective_date,
    from_branch_id, from_department, from_position, from_job_grade_id,
    to_branch_id, to_department, to_position, to_job_grade_id,
    salary_change, new_salary, reason
  } = req.body;

  if (!employee_id || !mutation_type || !effective_date) {
    return res.status(400).json({ error: 'employee_id, mutation_type, effective_date required' });
  }

  const [countRes] = await sequelize.query(`SELECT COUNT(*) as cnt FROM employee_mutations`);
  const mutationNumber = `MUT-${String(parseInt(countRes[0].cnt) + 1).padStart(5, '0')}`;

  const [result] = await sequelize.query(`
    INSERT INTO employee_mutations (
      tenant_id, employee_id, mutation_type, mutation_number, effective_date, status,
      from_branch_id, from_department, from_position, from_job_grade_id,
      to_branch_id, to_department, to_position, to_job_grade_id,
      salary_change, new_salary, reason, requested_by
    ) VALUES (
      :tenantId, :employee_id, :mutation_type, :mutationNumber, :effective_date, 'pending',
      :from_branch_id, :from_department, :from_position, :from_job_grade_id,
      :to_branch_id, :to_department, :to_position, :to_job_grade_id,
      :salary_change, :new_salary, :reason, :requested_by
    ) RETURNING *
  `, {
    replacements: {
      tenantId, employee_id, mutation_type, mutationNumber, effective_date,
      from_branch_id: from_branch_id || null, from_department: from_department || null,
      from_position: from_position || null, from_job_grade_id: from_job_grade_id || null,
      to_branch_id: to_branch_id || null, to_department: to_department || null,
      to_position: to_position || null, to_job_grade_id: to_job_grade_id || null,
      salary_change: salary_change || 0, new_salary: new_salary || null,
      reason: reason || null, requested_by: null
    }
  });

  return res.json({ success: true, data: result[0] || result, message: 'Mutation created' });
}

async function approveMutation(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const { id, comments } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  // Get mutation to apply changes
  const [mutations] = await sequelize.query(`SELECT * FROM employee_mutations WHERE id = :id`, { replacements: { id } });
  const mut = mutations[0];
  if (!mut) return res.status(404).json({ error: 'Not found' });

  // Update mutation status
  await sequelize.query(`UPDATE employee_mutations SET status = 'approved', notes = :comments, updated_at = NOW() WHERE id = :id`, { replacements: { id, comments: comments || null } });

  // Apply mutation to employee
  const updates: string[] = ['updated_at = NOW()'];
  const rep: any = { empId: mut.employee_id };
  if (mut.to_department) { updates.push('department = :dept'); rep.dept = mut.to_department; }
  if (mut.to_position) { updates.push('position = :pos'); rep.pos = mut.to_position; }
  if (mut.to_branch_id) { updates.push('branch_id = :branchId'); rep.branchId = mut.to_branch_id; }
  if (mut.to_job_grade_id) { updates.push('job_grade_id = :gradeId'); rep.gradeId = mut.to_job_grade_id; }

  if (updates.length > 1) {
    await sequelize.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = :empId`, { replacements: rep });
  }

  return res.json({ success: true, message: 'Mutation approved & applied' });
}

async function rejectMutation(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true });
  const { id, comments } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });

  await sequelize.query(`UPDATE employee_mutations SET status = 'rejected', notes = :comments, updated_at = NOW() WHERE id = :id`, { replacements: { id, comments: comments || null } });
  return res.json({ success: true, message: 'Mutation rejected' });
}

// ===== Summary =====
async function getWorkflowSummary(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) return res.json({ success: true, data: {} });
  const [claimPending] = await sequelize.query(`SELECT COUNT(*) as cnt FROM employee_claims WHERE status = 'pending'`);
  const [claimApproved] = await sequelize.query(`SELECT COUNT(*) as cnt FROM employee_claims WHERE status = 'approved'`);
  const [mutPending] = await sequelize.query(`SELECT COUNT(*) as cnt FROM employee_mutations WHERE status = 'pending'`);
  const [mutApproved] = await sequelize.query(`SELECT COUNT(*) as cnt FROM employee_mutations WHERE status = 'approved'`);

  return res.json({
    success: true,
    data: {
      claims: { pending: parseInt(claimPending[0].cnt), approved: parseInt(claimApproved[0].cnt) },
      mutations: { pending: parseInt(mutPending[0].cnt), approved: parseInt(mutApproved[0].cnt) }
    }
  });
}

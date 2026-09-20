/**
 * ESS mutation (transfer) self-request — FlowHCM employee transfer request.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { withEmployeeAuth } from '@/lib/middleware/withEmployeeAuth';
import {
  getDefaultApprovalLevels,
  inferMutationScope,
  type MutationType,
} from '@/lib/hris/mutation-workflow';

const sequelize = require('../../../lib/sequelize');

async function resolveEmployee(session: any) {
  const userId = session.user?.id;
  const tenantId = session.user?.tenantId || null;
  if (!tenantId) return null;
  const [rows] = await sequelize.query(
    `SELECT e.id, e.name, e.department, e.position, e.branch_id, e.job_grade_id,
            e.org_structure_id, e.supervisor_id, e.employee_id
     FROM employees e
     WHERE e.user_id = :uid AND e.tenant_id = :tid LIMIT 1`,
    { replacements: { uid: userId, tid: tenantId } },
  );
  if (rows?.[0]) return { ...rows[0], tenantId };
  const [byEmail] = await sequelize.query(
    `SELECT e.id, e.name, e.department, e.position, e.branch_id, e.job_grade_id,
            e.org_structure_id, e.supervisor_id, e.employee_id
     FROM employees e
     WHERE e.email = :email AND e.tenant_id = :tid LIMIT 1`,
    { replacements: { email: session.user?.email, tid: tenantId } },
  );
  return byEmail?.[0] ? { ...byEmail[0], tenantId } : null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const emp = await resolveEmployee(session);
  if (!emp) return res.status(404).json({ error: 'Data karyawan tidak ditemukan' });
  const tenantId = String(emp.tenantId);

  try {
    if (req.method === 'GET') {
      const [rows] = await sequelize.query(
        `SELECT m.id, m.mutation_number, m.mutation_type, m.mutation_scope, m.effective_date,
                m.status, m.to_department, m.to_position, m.reason, m.created_at,
                m.current_approval_step, m.total_approval_steps
         FROM employee_mutations m
         WHERE m.tenant_id = :tid AND m.employee_id = :eid
         ORDER BY m.created_at DESC LIMIT 50`,
        { replacements: { tid: tenantId, eid: emp.id } },
      ).catch(() => [[]]);
      return res.json({ success: true, data: rows || [] });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const mutation_type = (body.mutation_type || 'transfer') as MutationType;
      const effective_date = body.effective_date;
      if (!effective_date) {
        return res.status(400).json({ error: 'effective_date wajib diisi' });
      }
      if (!body.to_department && !body.to_position && !body.to_branch_id) {
        return res.status(400).json({ error: 'Isi minimal tujuan departemen, posisi, atau cabang' });
      }

      const levels = getDefaultApprovalLevels(mutation_type);
      const scope = inferMutationScope({
        mutation_scope: body.mutation_scope,
        from_department: emp.department,
        to_department: body.to_department,
        from_branch_id: emp.branch_id,
        to_branch_id: body.to_branch_id,
        from_position: emp.position,
        to_position: body.to_position,
      });

      const [countRes] = await sequelize.query(
        `SELECT COUNT(*) as cnt FROM employee_mutations WHERE tenant_id = :tid`,
        { replacements: { tid: tenantId } },
      );
      const mutationNumber = `MUT-${String(parseInt(countRes[0]?.cnt || 0, 10) + 1).padStart(5, '0')}`;

      const [result] = await sequelize.query(
        `INSERT INTO employee_mutations (
          tenant_id, employee_id, mutation_type, mutation_scope, mutation_number, effective_date, status,
          from_branch_id, from_department, from_position, from_job_grade_id, from_org_structure_id,
          to_branch_id, to_department, to_position,
          from_supervisor_id, to_supervisor_id,
          reason, notes, requested_by,
          current_approval_step, total_approval_steps
        ) VALUES (
          :tid, :eid, :mtype, :scope, :mnum, :edate, 'pending',
          :fbranch, :fdept, :fpos, :fgrade, :forg,
          :tbranch, :tdept, :tpos,
          :fsup, :tsup,
          :reason, :notes, :by,
          1, :steps
        ) RETURNING *`,
        {
          replacements: {
            tid: tenantId,
            eid: emp.id,
            mtype: mutation_type,
            scope,
            mnum: mutationNumber,
            edate: effective_date,
            fbranch: emp.branch_id || null,
            fdept: emp.department || null,
            fpos: emp.position || null,
            fgrade: emp.job_grade_id || null,
            forg: emp.org_structure_id || null,
            tbranch: body.to_branch_id || null,
            tdept: body.to_department || null,
            tpos: body.to_position || null,
            fsup: emp.supervisor_id || null,
            tsup: body.to_supervisor_id || null,
            reason: body.reason || null,
            notes: body.notes || 'Pengajuan dari portal karyawan (ESS)',
            by: session.user?.id || null,
            steps: levels.length,
          },
        },
      );

      const mutation = result?.[0];
      if (mutation?.id) {
        for (const level of levels) {
          await sequelize.query(
            `INSERT INTO mutation_approval_steps (mutation_id, step_order, approver_role, approver_title, status)
             VALUES (:mid, :ord, :role, :title, :st)`,
            {
              replacements: {
                mid: mutation.id,
                ord: level.level,
                role: level.role,
                title: level.title,
                st: level.level === 1 ? 'pending' : 'waiting',
              },
            },
          ).catch(() => null);
        }
      }

      return res.status(201).json({
        success: true,
        data: mutation,
        message: 'Pengajuan mutasi terkirim dan menunggu persetujuan',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}

export default withEmployeeAuth(handler);

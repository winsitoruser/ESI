/**
 * ESS training request API — employee self-service (FlowHCM Training Request).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { withEmployeeAuth } from '@/lib/middleware/withEmployeeAuth';
import {
  createTrainingRequest,
  listTrainingRequests,
} from '@/lib/hris/training-request-store';

const sequelize = require('../../../lib/sequelize');

async function resolveEmployee(session: any) {
  const userId = session.user?.id;
  const tenantId = session.user?.tenantId || null;
  if (!tenantId) return null;
  const [rows] = await sequelize.query(
    `SELECT id, name AS full_name, email FROM employees
     WHERE user_id = :uid AND tenant_id = :tid LIMIT 1`,
    { replacements: { uid: userId, tid: tenantId } },
  );
  if (rows.length) return { ...rows[0], tenantId };
  const [byEmail] = await sequelize.query(
    `SELECT id, name AS full_name, email FROM employees
     WHERE email = :email AND tenant_id = :tid LIMIT 1`,
    { replacements: { email: session.user?.email, tid: tenantId } },
  );
  return byEmail[0] ? { ...byEmail[0], tenantId } : null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const emp = await resolveEmployee(session);
  if (!emp) return res.status(404).json({ error: 'Data karyawan tidak ditemukan' });
  const tenantId = String(emp.tenantId);
  const action = String(req.query.action || '');

  try {
    if (req.method === 'GET') {
      if (action === 'programs') {
        const [rows] = await sequelize.query(
          `SELECT id, title, category, status, start_date, location
           FROM hris_training_programs
           WHERE tenant_id = :tid AND status IN ('active','upcoming')
           ORDER BY start_date ASC NULLS LAST LIMIT 100`,
          { replacements: { tid: tenantId } },
        ).catch(() => [[]]);
        return res.json({ success: true, data: rows || [] });
      }
      const rows = await listTrainingRequests({
        tenantId,
        employeeId: String(emp.id),
      });
      return res.json({ success: true, data: rows });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.topic && !body.program_title) {
        return res.status(400).json({ error: 'topic wajib diisi' });
      }
      const row = await createTrainingRequest({
        tenantId,
        employeeId: String(emp.id),
        employeeName: emp.full_name || session.user?.name,
        programId: body.program_id || null,
        programTitle: body.program_title,
        topic: body.topic || body.program_title,
        justification: body.justification || body.reason,
        preferredDate: body.preferred_date || null,
      });
      return res.status(201).json({ success: true, data: row });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}

export default withEmployeeAuth(handler);

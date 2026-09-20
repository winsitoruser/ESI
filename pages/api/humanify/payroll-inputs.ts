import type { NextApiRequest, NextApiResponse } from 'next';
import {
  listPayrollInputs, createPayrollInput, updatePayrollInputStatus, getPayrollInputsSummary,
  type PayrollInputType,
} from '@/lib/hris/payroll-inputs-store';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

const VALID_TYPES = new Set(['bonus', 'cash_advance', 'loan']);
const VALID_STATUSES = new Set(['pending', 'approved', 'rejected', 'paid', 'active', 'completed']);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });

  const { action, type, id } = req.query;
  const approvedByName = String(session.user?.name || session.user?.email || '');

  try {
    if (req.method === 'GET') {
      if (action === 'summary') {
        const summary = await getPayrollInputsSummary(tenantId);
        return res.json({ success: true, data: summary });
      }
      const inputType = (type as PayrollInputType) || undefined;
      if (inputType && !VALID_TYPES.has(inputType)) {
        return res.status(400).json({ error: 'Invalid type' });
      }
      const status = req.query.status as string | undefined;
      const employeeId = (req.query.employeeId as string) || undefined;
      const data = await listPayrollInputs(inputType, status, tenantId, employeeId);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!VALID_TYPES.has(body.type)) {
        return res.status(400).json({ error: 'type wajib: bonus | cash_advance | loan' });
      }
      if (!body.employeeId || !body.employeeName) {
        return res.status(400).json({ error: 'Karyawan wajib dipilih' });
      }
      const amount = Number(body.amount);
      if (!(amount > 0)) {
        return res.status(400).json({ error: 'Nominal harus lebih dari 0' });
      }
      const record = await createPayrollInput({ ...body, amount, tenantId, status: body.status || 'pending' });
      return res.json({ success: true, data: record });
    }

    if (req.method === 'PUT' && id) {
      const { status, approvedBy } = req.body || {};
      if (!VALID_STATUSES.has(String(status))) {
        return res.status(400).json({ error: 'Status tidak valid' });
      }
      const record = await updatePayrollInputStatus(
        id as string,
        status,
        approvedBy || approvedByName,
        tenantId,
      );
      if (!record) return res.status(404).json({ error: 'Payroll input not found' });
      return res.json({ success: true, data: record });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('Payroll inputs API error:', error?.message);
    return res.status(500).json({ error: error.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });

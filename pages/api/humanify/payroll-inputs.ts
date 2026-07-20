import type { NextApiRequest, NextApiResponse } from 'next';
import {
  listPayrollInputs, createPayrollInput, updatePayrollInputStatus, getPayrollInputsSummary,
  type PayrollInputType,
} from '@/lib/hris/payroll-inputs-store';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });

  const { action, type, id } = req.query;

  try {
    if (req.method === 'GET') {
      if (action === 'summary') {
        const summary = await getPayrollInputsSummary(tenantId);
        return res.json({ success: true, data: summary });
      }
      const inputType = (type as PayrollInputType) || undefined;
      const status = req.query.status as string | undefined;
      const data = await listPayrollInputs(inputType, status, tenantId);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
      const record = await createPayrollInput({ ...req.body, tenantId });
      return res.json({ success: true, data: record });
    }

    if (req.method === 'PUT' && id) {
      const { status, approvedBy } = req.body;
      const record = await updatePayrollInputStatus(id as string, status, approvedBy, tenantId);
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

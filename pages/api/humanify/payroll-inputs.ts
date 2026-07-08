import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  listPayrollInputs, createPayrollInput, updatePayrollInputStatus, getPayrollInputsSummary,
  type PayrollInputType,
} from '@/lib/hris/payroll-inputs-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { action, type, id } = req.query;

  try {
    if (req.method === 'GET') {
      if (action === 'summary') {
        const summary = await getPayrollInputsSummary();
        return res.json({ success: true, data: summary });
      }
      const inputType = (type as PayrollInputType) || undefined;
      const status = req.query.status as string | undefined;
      const data = await listPayrollInputs(inputType, status);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
      const record = await createPayrollInput(req.body);
      return res.json({ success: true, data: record });
    }

    if (req.method === 'PUT' && id) {
      const { status, approvedBy } = req.body;
      const record = await updatePayrollInputStatus(id as string, status, approvedBy);
      return res.json({ success: true, data: record });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('Payroll inputs API error:', error?.message);
    return res.status(500).json({ error: error.message });
  }
}

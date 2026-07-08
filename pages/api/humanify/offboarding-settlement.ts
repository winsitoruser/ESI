import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  calculateFinalSettlement, settlementToPayrollComponents, type SettlementInput,
} from '@/lib/hris/offboarding-settlement';
import { getOffboardingById, updateOffboarding } from '@/lib/hris/lifecycle-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { id, action } = req.query;

  try {
    if (req.method === 'POST' && action === 'calculate') {
      const input: SettlementInput = req.body;
      const settlement = calculateFinalSettlement(input);
      const payrollComponents = settlementToPayrollComponents(settlement);
      return res.json({ success: true, data: { settlement, payrollComponents } });
    }

    if (req.method === 'POST' && action === 'apply' && id) {
      const input: SettlementInput = req.body;
      const settlement = calculateFinalSettlement(input);
      const payrollComponents = settlementToPayrollComponents(settlement);

      const entry = await getOffboardingById(id as string);
      if (!entry) return res.status(404).json({ error: 'Offboarding not found' });

      const tasks = (entry.tasks || []).map((t: any) =>
        t.key === 'final_payroll' || t.key === 'leave_payout'
          ? { ...t, completed: true, completedAt: new Date().toISOString() }
          : t
      );

      await updateOffboarding(id as string, {
        tasks,
        settlementData: { settlement, payrollComponents, appliedAt: new Date().toISOString() },
      });

      return res.json({
        success: true,
        data: { settlement, payrollComponents, message: 'Settlement diterapkan ke offboarding & siap proses payroll' },
      });
    }

    if (req.method === 'GET' && id) {
      const entry = await getOffboardingById(id as string);
      if (!entry) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, data: entry });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

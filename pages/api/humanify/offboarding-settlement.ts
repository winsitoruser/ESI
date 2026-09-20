import type { NextApiRequest, NextApiResponse } from 'next';
import {
  calculateFinalSettlement,
  settlementToPayrollComponents,
  isSettlementReadyForDisbursement,
  getSettlementNet,
  type SettlementInput,
  type SettlementStoredPayload,
} from '@/lib/hris/offboarding-settlement';
import { getOffboardingById, updateOffboarding, listOffboarding } from '@/lib/hris/lifecycle-store';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const tenantId = (session.user as any)?.tenantId || null;
  if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });

  const { id, action } = req.query;
  const user = session.user as any;

  try {
    if (req.method === 'GET' && action === 'list-ready') {
      const rows = await listOffboarding({ tenantId });
      const ready = rows
        .filter((r: any) => isSettlementReadyForDisbursement(r.settlementData))
        .map((r: any) => ({
          id: r.id,
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          position: r.position,
          resignDate: r.resignDate,
          lastWorkingDate: r.lastWorkingDate,
          netSettlement: getSettlementNet(r.settlementData),
          appliedAt: r.settlementData?.appliedAt,
          disbursementStatus: r.settlementData?.disbursementStatus || 'ready',
        }));
      const total = ready.reduce((s: number, r: any) => s + (r.netSettlement || 0), 0);
      return res.json({ success: true, data: { rows: ready, total, count: ready.length } });
    }

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

      const entry = await getOffboardingById(id as string, tenantId);
      if (!entry) return res.status(404).json({ error: 'Offboarding not found' });

      const tasks = (entry.tasks || []).map((t: any) =>
        t.key === 'final_payroll' || t.key === 'leave_payout'
          ? { ...t, completed: true, completedAt: new Date().toISOString() }
          : t
      );

      const settlementData: SettlementStoredPayload = {
        settlement,
        payrollComponents,
        appliedAt: new Date().toISOString(),
        disbursementStatus: 'ready',
        disbursedAt: null,
        disbursedBy: null,
        disbursementReference: null,
      };

      const updated = await updateOffboarding(id as string, {
        tasks,
        settlementData,
      }, tenantId);
      if (!updated) return res.status(404).json({ error: 'Offboarding not found' });

      return res.json({
        success: true,
        data: {
          settlement,
          payrollComponents,
          disbursementStatus: 'ready',
          message: 'Settlement diterapkan — siap di-disburse / transfer bank',
        },
      });
    }

    if (req.method === 'POST' && action === 'disburse' && id) {
      const entry = await getOffboardingById(id as string, tenantId);
      if (!entry) return res.status(404).json({ error: 'Offboarding not found' });
      const prev = (entry.settlementData || {}) as SettlementStoredPayload;
      if (!prev.settlement) {
        return res.status(400).json({ error: 'Hitung & terapkan settlement terlebih dahulu' });
      }
      if (prev.disbursementStatus === 'disbursed') {
        return res.status(400).json({ error: 'Settlement sudah di-disburse', data: prev });
      }

      const reference = String(req.body?.reference || `FF-${String(id).slice(0, 8).toUpperCase()}-${Date.now().toString(36)}`).slice(0, 80);
      const settlementData: SettlementStoredPayload = {
        ...prev,
        disbursementStatus: 'disbursed',
        disbursedAt: new Date().toISOString(),
        disbursedBy: user?.id ? String(user.id) : null,
        disbursedByName: user?.name || user?.email || null,
        disbursementReference: reference,
      };

      const tasks = (entry.tasks || []).map((t: any) =>
        t.key === 'final_payroll'
          ? { ...t, completed: true, completedAt: new Date().toISOString() }
          : t
      );

      const updated = await updateOffboarding(id as string, { tasks, settlementData }, tenantId);
      if (!updated) return res.status(404).json({ error: 'Offboarding not found' });

      return res.json({
        success: true,
        data: {
          settlementData,
          message: 'Final settlement ditandai sudah di-disburse',
          bankTransferUrl: '/humanify/payroll/disbursement?mode=settlement',
        },
      });
    }

    if (req.method === 'GET' && id) {
      const entry = await getOffboardingById(id as string, tenantId);
      if (!entry) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, data: entry });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });

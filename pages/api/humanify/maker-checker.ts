/**
 * Maker-checker queue API — list pending + approve/reject
 * GET  ?action=pending
 * POST ?action=decide  { requestId, approve, rejectReason? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  canActAsChecker,
  decideMakerRequest,
  listPendingMakerRequests,
} from '@/lib/saas/maker-checker';
import { assertStepUp } from '@/lib/saas/step-up-auth';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

async function applyEmployeeSalaryUpsert(payload: Record<string, unknown>, tenantId: string | null) {
  if (!sequelize) throw new Error('Database unavailable');
  const employeeId = String(payload.employeeId || '');
  const payType = String(payload.payType || 'monthly');
  await sequelize.query(`
    UPDATE employee_salaries SET is_active = false, end_date = CURRENT_DATE, updated_at = NOW()
    WHERE employee_id = :empId AND is_active = true
  `, { replacements: { empId: employeeId } });

  const [result] = await sequelize.query(`
    INSERT INTO employee_salaries (id, tenant_id, employee_id, pay_type, base_salary,
      hourly_rate, daily_rate, weekly_hours, overtime_rate_multiplier, overtime_holiday_multiplier,
      tax_status, tax_method, bank_name, bank_account_number, bank_account_name,
      bpjs_kesehatan_number, bpjs_ketenagakerjaan_number, npwp,
      project_rate, piece_rate, piece_unit, bpjs_eligible, tax_eligible, project_id,
      is_active, created_at, updated_at)
    VALUES (uuid_generate_v4(), :tenantId, :empId, :payType, :baseSalary,
      :hourlyRate, :dailyRate, :weeklyHours, :otMult, :otHolidayMult,
      :taxStatus, :taxMethod, :bankName, :bankAccNum, :bankAccName,
      :bpjsKes, :bpjsTk, :npwp,
      :projectRate, :pieceRate, :pieceUnit, :bpjsEligible, :taxEligible, :projectId,
      true, NOW(), NOW())
    RETURNING *
  `, {
    replacements: {
      tenantId,
      empId: employeeId,
      payType,
      baseSalary: Number(payload.baseSalary) || 0,
      hourlyRate: Number(payload.hourlyRate) || 0,
      dailyRate: Number(payload.dailyRate) || 0,
      weeklyHours: Number(payload.weeklyHours) || 40,
      otMult: Number(payload.overtimeRateMultiplier) || 1.5,
      otHolidayMult: Number(payload.overtimeHolidayMultiplier) || 2.0,
      taxStatus: payload.taxStatus || 'TK/0',
      taxMethod: payload.taxMethod || 'gross_up',
      bankName: payload.bankName || null,
      bankAccNum: payload.bankAccountNumber || null,
      bankAccName: payload.bankAccountName || null,
      bpjsKes: payload.bpjsKesehatanNumber || null,
      bpjsTk: payload.bpjsKetenagakerjaanNumber || null,
      npwp: payload.npwp || null,
      projectRate: Number(payload.projectRate) || 0,
      pieceRate: Number(payload.pieceRate) || 0,
      pieceUnit: payload.pieceUnit || 'unit',
      bpjsEligible: payload.bpjsEligible !== false,
      taxEligible: payload.taxEligible !== false,
      projectId: payload.projectId || null,
    },
  });
  return result?.[0] || {};
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const tenantId = (session.user as any).tenantId || null;
  const role = (session.user as any).role;
  const action = String(req.query.action || (req.method === 'GET' ? 'pending' : 'decide'));

  try {
    if (req.method === 'GET' && action === 'pending') {
      if (!canActAsChecker(role)) {
        return res.status(403).json({ success: false, error: 'Hanya checker yang dapat melihat antrean' });
      }
      const rows = await listPendingMakerRequests(tenantId, Number(req.query.limit) || 50);
      return res.json({ success: true, data: rows });
    }

    if (req.method === 'POST' && action === 'decide') {
      const requestId = String(req.body?.requestId || '');
      const approve = Boolean(req.body?.approve);
      if (!requestId) return res.status(400).json({ success: false, error: 'requestId required' });

      const stepErr = assertStepUp(req, {
        userId: String(session.user.id),
        tenantId: String(tenantId || ''),
        purpose: 'maker_checker',
      });
      if (stepErr) return res.status(403).json({ success: false, ...stepErr });

      const result = await decideMakerRequest({
        requestId,
        approve,
        checkerUserId: session.user.id,
        checkerEmail: session.user.email,
        checkerRole: role,
        rejectReason: req.body?.rejectReason,
        apply: approve
          ? async (payload) => {
              if (String((payload as any).employeeId || '')) {
                return applyEmployeeSalaryUpsert(payload, tenantId);
              }
              return payload;
            }
          : undefined,
      });
      if (!result.ok) {
        const code = result.status === 'forbidden' ? 403 : 400;
        return res.status(code).json({ success: false, error: result.error, data: result });
      }
      return res.json({ success: true, data: result });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

export default withHQAuth(handler);

/**
 * Payroll input modules: Bonus, Cash Advance (kasbon), Employee Loan.
 * Feeds calculatePayroll / approvePayroll and ESS self-serve.
 */
import { allowHrMockFallback } from '@/lib/hris/data-source';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export type PayrollInputType = 'bonus' | 'cash_advance' | 'loan';

export interface PayrollInputRecord {
  id: string;
  type: PayrollInputType;
  employeeId: string;
  employeeName: string;
  employeeUid?: string;
  department?: string;
  amount: number;
  remainingAmount?: number;
  installmentAmount?: number;
  installmentMonths?: number;
  reason?: string;
  category?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'active' | 'completed';
  payrollPeriod?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

/** Line ready to inject into payroll earnings/deductions. */
export interface PayrollInputCharge {
  inputId: string;
  employeeId: string;
  type: PayrollInputType;
  code: string;
  name: string;
  amount: number;
  as: 'earning' | 'deduction';
}

export async function ensurePayrollInputsTables(): Promise<boolean> {
  if (!sequelize) return false;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_payroll_inputs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      type VARCHAR(20) NOT NULL,
      employee_id TEXT NOT NULL,
      employee_uid VARCHAR(50),
      employee_name VARCHAR(200) NOT NULL,
      department VARCHAR(50),
      amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      remaining_amount NUMERIC(15,2),
      installment_amount NUMERIC(15,2),
      installment_months INT,
      reason TEXT,
      category VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      payroll_period VARCHAR(20),
      approved_by VARCHAR(200),
      approved_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_hris_payroll_inputs_type ON hris_payroll_inputs(type);
    CREATE INDEX IF NOT EXISTS idx_hris_payroll_inputs_employee ON hris_payroll_inputs(employee_id);
    CREATE INDEX IF NOT EXISTS idx_hris_payroll_inputs_status ON hris_payroll_inputs(status);
    CREATE INDEX IF NOT EXISTS idx_hris_payroll_inputs_tenant ON hris_payroll_inputs(tenant_id);
  `);
  return true;
}

function mapRow(row: any): PayrollInputRecord {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadata) {
    try {
      metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    } catch {
      metadata = undefined;
    }
  }
  return {
    id: row.id,
    type: row.type,
    employeeId: String(row.employee_id),
    employeeName: row.employee_name,
    employeeUid: row.employee_uid,
    department: row.department,
    amount: parseFloat(row.amount || 0),
    remainingAmount: row.remaining_amount != null ? parseFloat(row.remaining_amount) : undefined,
    installmentAmount: row.installment_amount != null ? parseFloat(row.installment_amount) : undefined,
    installmentMonths: row.installment_months != null ? parseInt(row.installment_months, 10) : undefined,
    reason: row.reason,
    category: row.category,
    status: row.status,
    payrollPeriod: row.payroll_period,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata,
  };
}

/** How much to take this payroll period for an open input. */
export function chargeAmountForInput(input: PayrollInputRecord): number {
  if (input.type === 'bonus') return Math.round(Number(input.amount) || 0);
  const remaining = Number(
    input.remainingAmount != null ? input.remainingAmount : input.amount || 0,
  );
  if (remaining <= 0) return 0;
  const installment = Number(input.installmentAmount || 0);
  if (installment > 0) return Math.round(Math.min(remaining, installment));
  return Math.round(remaining);
}

function openStatusesForType(type: PayrollInputType): string[] {
  if (type === 'loan') return ['active'];
  if (type === 'cash_advance') return ['approved', 'active'];
  return ['approved']; // bonus
}

export async function listPayrollInputs(
  type?: PayrollInputType,
  status?: string,
  tenantId?: string | null,
  employeeId?: string | null,
): Promise<PayrollInputRecord[]> {
  if (!sequelize) return allowHrMockFallback() ? getMockInputs(type, employeeId) : [];
  await ensurePayrollInputsTables();
  let sql = 'SELECT * FROM hris_payroll_inputs WHERE 1=1';
  const params: any[] = [];
  if (tenantId) { params.push(tenantId); sql += ` AND tenant_id = $${params.length}`; }
  if (type) { params.push(type); sql += ` AND type = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  if (employeeId) { params.push(String(employeeId)); sql += ` AND employee_id::text = $${params.length}::text`; }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await sequelize.query(sql, { bind: params });
  if (!rows?.length) return tenantId || !allowHrMockFallback() ? [] : getMockInputs(type, employeeId);
  return rows.map(mapRow);
}

/**
 * Open bonus (earnings) + kasbon/loan (deductions) for a tenant, optionally one employee.
 * Skips rows already applied to the given runId (metadata.last_payroll_run_id).
 */
export async function listOpenPayrollInputCharges(
  tenantId: string,
  opts?: { employeeId?: string; runId?: string },
): Promise<PayrollInputCharge[]> {
  if (!sequelize || !tenantId) return [];
  await ensurePayrollInputsTables();
  const params: any[] = [tenantId];
  let sql = `
    SELECT * FROM hris_payroll_inputs
    WHERE tenant_id = $1
      AND status IN ('approved', 'active')
      AND type IN ('bonus', 'cash_advance', 'loan')
  `;
  if (opts?.employeeId) {
    params.push(String(opts.employeeId));
    sql += ` AND employee_id::text = $${params.length}::text`;
  }
  sql += ' ORDER BY created_at ASC';
  const [rows] = await sequelize.query(sql, { bind: params });
  const charges: PayrollInputCharge[] = [];
  for (const row of rows || []) {
    const input = mapRow(row);
    if (!openStatusesForType(input.type).includes(input.status)) continue;
    if (opts?.runId && input.metadata?.last_payroll_run_id === opts.runId) continue;
    const amount = chargeAmountForInput(input);
    if (amount <= 0) continue;
    if (input.type === 'bonus') {
      charges.push({
        inputId: input.id,
        employeeId: input.employeeId,
        type: 'bonus',
        code: 'BONUS',
        name: input.reason ? `Bonus — ${input.reason}` : 'Bonus',
        amount,
        as: 'earning',
      });
    } else if (input.type === 'cash_advance') {
      charges.push({
        inputId: input.id,
        employeeId: input.employeeId,
        type: 'cash_advance',
        code: 'CASH_ADV',
        name: input.reason ? `Kasbon — ${input.reason}` : 'Potongan Kasbon',
        amount,
        as: 'deduction',
      });
    } else {
      charges.push({
        inputId: input.id,
        employeeId: input.employeeId,
        type: 'loan',
        code: 'LOAN',
        name: input.reason ? `Cicilan pinjaman — ${input.reason}` : 'Cicilan Pinjaman',
        amount,
        as: 'deduction',
      });
    }
  }
  return charges;
}

/** After payroll approve: decrement remaining / mark paid|completed; stamp last run. */
export async function applyPayrollInputCharges(
  tenantId: string,
  runId: string,
  charges: Array<{ inputId: string; amount: number }>,
  payrollPeriod?: string,
): Promise<number> {
  if (!sequelize || !tenantId || !charges.length) return 0;
  await ensurePayrollInputsTables();
  let applied = 0;
  for (const c of charges) {
    if (!c.inputId || !(c.amount > 0)) continue;
    const [rows] = await sequelize.query(
      `SELECT * FROM hris_payroll_inputs WHERE id = :id AND tenant_id = :tenantId LIMIT 1`,
      { replacements: { id: c.inputId, tenantId } },
    );
    const row = rows?.[0];
    if (!row) continue;
    const input = mapRow(row);
    if (input.metadata?.last_payroll_run_id === runId) continue;

    if (input.type === 'bonus') {
      await sequelize.query(
        `UPDATE hris_payroll_inputs
         SET status = 'paid',
             payroll_period = COALESCE(:period, payroll_period),
             metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_payroll_run_id', :runId::text, 'last_charge', :amount::numeric),
             updated_at = NOW()
         WHERE id = :id AND tenant_id = :tenantId`,
        { replacements: { id: c.inputId, tenantId, runId, amount: c.amount, period: payrollPeriod || null } },
      );
      applied++;
      continue;
    }

    const remaining = Number(input.remainingAmount != null ? input.remainingAmount : input.amount || 0);
    const take = Math.min(remaining, c.amount);
    const next = Math.max(0, Math.round((remaining - take) * 100) / 100);
    const nextStatus = next <= 0 ? 'completed' : (input.status === 'approved' ? 'active' : input.status);

    await sequelize.query(
      `UPDATE hris_payroll_inputs
       SET remaining_amount = :next,
           status = :status,
           payroll_period = COALESCE(:period, payroll_period),
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_payroll_run_id', :runId::text, 'last_charge', :amount::numeric),
           updated_at = NOW()
       WHERE id = :id AND tenant_id = :tenantId`,
      {
        replacements: {
          id: c.inputId,
          tenantId,
          next,
          status: nextStatus,
          runId,
          amount: take,
          period: payrollPeriod || null,
        },
      },
    );
    applied++;
  }
  return applied;
}

export async function getEmployeeOutstandingBalances(
  tenantId: string,
  employeeId: string,
): Promise<{ cashAdvance: number; loan: number }> {
  const items = await listPayrollInputs(undefined, undefined, tenantId, employeeId);
  let cashAdvance = 0;
  let loan = 0;
  for (const i of items) {
    if (!['approved', 'active'].includes(i.status)) continue;
    const rem = Number(i.remainingAmount != null ? i.remainingAmount : i.amount || 0);
    if (i.type === 'cash_advance') cashAdvance += rem;
    if (i.type === 'loan') loan += rem;
  }
  return { cashAdvance: Math.round(cashAdvance), loan: Math.round(loan) };
}

export async function createPayrollInput(
  data: Partial<PayrollInputRecord> & { tenantId?: string | null },
): Promise<PayrollInputRecord | null> {
  if (!sequelize) return null;
  await ensurePayrollInputsTables();
  const amount = Number(data.amount) || 0;
  const isBalanceType = data.type === 'loan' || data.type === 'cash_advance';
  const remaining = isBalanceType
    ? (data.remainingAmount ?? amount)
    : data.remainingAmount;
  const [rows] = await sequelize.query(`
    INSERT INTO hris_payroll_inputs
      (tenant_id, type, employee_id, employee_uid, employee_name, department, amount, remaining_amount,
       installment_amount, installment_months, reason, category, status, payroll_period)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *
  `, {
    bind: [
      data.tenantId || null,
      data.type, data.employeeId, data.employeeUid || null, data.employeeName,
      data.department || null, amount, remaining ?? null,
      data.installmentAmount ?? null, data.installmentMonths ?? null,
      data.reason || null, data.category || null, data.status || 'pending',
      data.payrollPeriod || null,
    ],
  });
  return rows?.[0] ? mapRow(rows[0]) : null;
}

export async function updatePayrollInputStatus(
  id: string,
  status: string,
  approvedBy?: string,
  tenantId?: string | null,
): Promise<PayrollInputRecord | null> {
  if (!sequelize) return null;
  await ensurePayrollInputsTables();

  const params: any[] = [id, status, approvedBy || null];
  let where = 'WHERE id = $1';
  if (tenantId) {
    params.push(tenantId);
    where += ` AND tenant_id = $${params.length}`;
  }
  const [rows] = await sequelize.query(`
    UPDATE hris_payroll_inputs
    SET status = CASE
          WHEN type = 'loan' AND $2 IN ('approved', 'active') THEN 'active'
          WHEN type = 'cash_advance' AND COALESCE(installment_months, 0) > 1 AND $2 = 'approved' THEN 'active'
          ELSE $2
        END,
        approved_by = COALESCE($3, approved_by),
        approved_at = CASE WHEN $2 IN ('approved', 'active', 'rejected') THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
        remaining_amount = CASE
          WHEN $2 = 'completed' AND type IN ('loan', 'cash_advance') THEN 0
          WHEN type IN ('loan', 'cash_advance') AND $2 IN ('approved', 'active')
            THEN COALESCE(remaining_amount, amount)
          ELSE remaining_amount
        END,
        updated_at = NOW()
    ${where} RETURNING *
  `, { bind: params });
  return rows?.[0] ? mapRow(rows[0]) : null;
}

/**
 * Early settle: mark open kasbon/loan as fully paid (remaining=0, status=completed).
 * Only allowed for approved/active balance types.
 */
export async function earlySettlePayrollInput(
  id: string,
  tenantId: string,
  settledBy?: string,
): Promise<PayrollInputRecord | null> {
  if (!sequelize || !tenantId) return null;
  await ensurePayrollInputsTables();
  const [rows] = await sequelize.query(
    `SELECT * FROM hris_payroll_inputs
     WHERE id = :id AND tenant_id = :tenantId
       AND type IN ('cash_advance', 'loan')
       AND status IN ('approved', 'active')
     LIMIT 1`,
    { replacements: { id, tenantId } },
  );
  if (!rows?.[0]) return null;
  const [updated] = await sequelize.query(
    `UPDATE hris_payroll_inputs
     SET remaining_amount = 0,
         status = 'completed',
         approved_by = COALESCE(:by, approved_by),
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'early_settled_at', NOW()::text,
           'early_settled_by', COALESCE(:by, '')
         ),
         updated_at = NOW()
     WHERE id = :id AND tenant_id = :tenantId
     RETURNING *`,
    { replacements: { id, tenantId, by: settledBy || null } },
  );
  return updated?.[0] ? mapRow(updated[0]) : null;
}

export async function getPayrollInputsSummary(tenantId?: string | null) {
  const items = await listPayrollInputs(undefined, undefined, tenantId);
  const byType = (t: PayrollInputType) => items.filter(i => i.type === t);
  const openCa = byType('cash_advance').filter(i => ['approved', 'active'].includes(i.status));
  const openLoan = byType('loan').filter(i => i.status === 'active');
  return {
    bonus: {
      total: byType('bonus').length,
      pending: byType('bonus').filter(i => i.status === 'pending').length,
      amount: byType('bonus').reduce((s, i) => s + i.amount, 0),
    },
    cashAdvance: {
      total: byType('cash_advance').length,
      pending: byType('cash_advance').filter(i => i.status === 'pending').length,
      amount: byType('cash_advance').reduce((s, i) => s + i.amount, 0),
      outstanding: openCa.reduce((s, i) => s + Number(i.remainingAmount != null ? i.remainingAmount : i.amount || 0), 0),
      active: openCa.length,
    },
    loan: {
      total: byType('loan').length,
      active: openLoan.length,
      outstanding: openLoan.reduce((s, i) => s + (i.remainingAmount || 0), 0),
    },
  };
}

function getMockInputs(type?: PayrollInputType, employeeId?: string | null): PayrollInputRecord[] {
  const all: PayrollInputRecord[] = [
    { id: 'b1', type: 'bonus', employeeId: '1', employeeName: 'Andi Saputra', department: 'Sales', amount: 5000000, reason: 'Pencapaian target Q1', category: 'performance', status: 'approved', payrollPeriod: '2026-03' },
    { id: 'b2', type: 'bonus', employeeId: '2', employeeName: 'Maya Putri', department: 'Operations', amount: 3000000, reason: 'Bonus proyek', category: 'project', status: 'pending', payrollPeriod: '2026-03' },
    { id: 'ca1', type: 'cash_advance', employeeId: '3', employeeName: 'Budi Santoso', department: 'Finance', amount: 2000000, remainingAmount: 2000000, installmentAmount: 1000000, installmentMonths: 2, reason: 'Biaya operasional bulanan', category: 'operational', status: 'active', payrollPeriod: '2026-03' },
    { id: 'ca2', type: 'cash_advance', employeeId: '4', employeeName: 'Siti Rahayu', department: 'HR', amount: 1500000, remainingAmount: 1500000, reason: 'Kebutuhan darurat', category: 'emergency', status: 'pending' },
    { id: 'l1', type: 'loan', employeeId: '5', employeeName: 'Dimas Prasetyo', department: 'IT', amount: 10000000, remainingAmount: 6000000, installmentAmount: 1000000, installmentMonths: 10, reason: 'Pinjaman darurat', status: 'active' },
    { id: 'l2', type: 'loan', employeeId: '6', employeeName: 'Rani Kusuma', department: 'Warehouse', amount: 5000000, remainingAmount: 5000000, installmentAmount: 500000, installmentMonths: 10, reason: 'Pinjaman pendidikan', status: 'pending' },
  ];
  let rows = type ? all.filter(i => i.type === type) : all;
  if (employeeId) rows = rows.filter(i => i.employeeId === String(employeeId));
  return rows;
}

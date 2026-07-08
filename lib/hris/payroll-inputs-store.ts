/**
 * Payroll input modules: Bonus, Cash Advance, Employee Loan
 * Feeds into payroll calculation engine.
 */
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
  `);
  return true;
}

function mapRow(row: any): PayrollInputRecord {
  return {
    id: row.id,
    type: row.type,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    employeeUid: row.employee_uid,
    department: row.department,
    amount: parseFloat(row.amount || 0),
    remainingAmount: row.remaining_amount != null ? parseFloat(row.remaining_amount) : undefined,
    installmentAmount: row.installment_amount != null ? parseFloat(row.installment_amount) : undefined,
    installmentMonths: row.installment_months,
    reason: row.reason,
    category: row.category,
    status: row.status,
    payrollPeriod: row.payroll_period,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPayrollInputs(type?: PayrollInputType, status?: string): Promise<PayrollInputRecord[]> {
  if (!sequelize) return getMockInputs(type);
  await ensurePayrollInputsTables();
  let sql = 'SELECT * FROM hris_payroll_inputs WHERE 1=1';
  const params: any[] = [];
  if (type) { params.push(type); sql += ` AND type = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await sequelize.query(sql, { bind: params });
  if (!rows?.length) return getMockInputs(type);
  return rows.map(mapRow);
}

export async function createPayrollInput(data: Partial<PayrollInputRecord>): Promise<PayrollInputRecord | null> {
  if (!sequelize) return null;
  await ensurePayrollInputsTables();
  const remaining = data.type === 'loan'
    ? (data.remainingAmount ?? data.amount)
    : data.remainingAmount;
  const [rows] = await sequelize.query(`
    INSERT INTO hris_payroll_inputs
      (type, employee_id, employee_uid, employee_name, department, amount, remaining_amount,
       installment_amount, installment_months, reason, category, status, payroll_period)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
  `, {
    bind: [
      data.type, data.employeeId, data.employeeUid || null, data.employeeName,
      data.department || null, data.amount, remaining ?? null,
      data.installmentAmount ?? null, data.installmentMonths ?? null,
      data.reason || null, data.category || null, data.status || 'pending',
      data.payrollPeriod || null,
    ],
  });
  return rows?.[0] ? mapRow(rows[0]) : null;
}

export async function updatePayrollInputStatus(
  id: string, status: string, approvedBy?: string
): Promise<PayrollInputRecord | null> {
  if (!sequelize) return null;
  const [rows] = await sequelize.query(`
    UPDATE hris_payroll_inputs
    SET status = $2, approved_by = $3, approved_at = NOW(), updated_at = NOW()
    WHERE id = $1 RETURNING *
  `, { bind: [id, status, approvedBy || null] });
  return rows?.[0] ? mapRow(rows[0]) : null;
}

export async function getPayrollInputsSummary() {
  const items = await listPayrollInputs();
  const byType = (t: PayrollInputType) => items.filter(i => i.type === t);
  return {
    bonus: { total: byType('bonus').length, pending: byType('bonus').filter(i => i.status === 'pending').length, amount: byType('bonus').reduce((s, i) => s + i.amount, 0) },
    cashAdvance: { total: byType('cash_advance').length, pending: byType('cash_advance').filter(i => i.status === 'pending').length, amount: byType('cash_advance').reduce((s, i) => s + i.amount, 0) },
    loan: { total: byType('loan').length, active: byType('loan').filter(i => i.status === 'active').length, outstanding: byType('loan').reduce((s, i) => s + (i.remainingAmount || 0), 0) },
  };
}

function getMockInputs(type?: PayrollInputType): PayrollInputRecord[] {
  const all: PayrollInputRecord[] = [
    { id: 'b1', type: 'bonus', employeeId: '1', employeeName: 'Andi Saputra', department: 'Sales', amount: 5000000, reason: 'Pencapaian target Q1', category: 'performance', status: 'approved', payrollPeriod: '2026-03' },
    { id: 'b2', type: 'bonus', employeeId: '2', employeeName: 'Maya Putri', department: 'Operations', amount: 3000000, reason: 'Bonus proyek', category: 'project', status: 'pending', payrollPeriod: '2026-03' },
    { id: 'ca1', type: 'cash_advance', employeeId: '3', employeeName: 'Budi Santoso', department: 'Finance', amount: 2000000, reason: 'Biaya operasional bulanan', status: 'approved', payrollPeriod: '2026-03' },
    { id: 'ca2', type: 'cash_advance', employeeId: '4', employeeName: 'Siti Rahayu', department: 'HR', amount: 1500000, reason: 'Kebutuhan darurat', status: 'pending' },
    { id: 'l1', type: 'loan', employeeId: '5', employeeName: 'Dimas Prasetyo', department: 'IT', amount: 10000000, remainingAmount: 6000000, installmentAmount: 1000000, installmentMonths: 10, reason: 'Pinjaman darurat', status: 'active' },
    { id: 'l2', type: 'loan', employeeId: '6', employeeName: 'Rani Kusuma', department: 'Warehouse', amount: 5000000, remainingAmount: 5000000, installmentAmount: 500000, installmentMonths: 10, reason: 'Pinjaman pendidikan', status: 'pending' },
  ];
  return type ? all.filter(i => i.type === type) : all;
}

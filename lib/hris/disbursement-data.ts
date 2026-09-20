import { allowHrMockFallback } from './data-source';
import { getMockDisbursementRows, type DisbursementRow } from './payroll-disbursement';
import { listOffboarding } from './lifecycle-store';
import { getSettlementNet, isSettlementReadyForDisbursement } from './offboarding-settlement';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export async function loadSettlementDisbursementRows(tenantId?: string | null): Promise<{
  rows: DisbursementRow[];
  dataSource: 'live' | 'demo' | 'empty';
}> {
  if (!tenantId) return { rows: [], dataSource: 'empty' };
  try {
    const offs = await listOffboarding({ tenantId });
    const ready = offs.filter((o: any) => isSettlementReadyForDisbursement(o.settlementData));
    if (!ready.length) return { rows: [], dataSource: 'empty' };

    const empIds = ready.map((o: any) => String(o.employeeId));
    let bankByEmp = new Map<string, any>();
    if (sequelize && empIds.length) {
      try {
        const [banks] = await sequelize.query(
          `SELECT COALESCE(e.employee_id, e.id::text) AS eid,
                  e.name,
                  COALESCE(es.bank_account_number, e.bank_account_number) AS account_number,
                  COALESCE(es.bank_account_name, e.bank_account_name, e.name) AS account_name,
                  COALESCE(es.bank_name, e.bank_name, 'BCA') AS bank_name,
                  COALESCE(es.bank_code, '014') AS bank_code,
                  e.email
           FROM employees e
           LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
           WHERE e.tenant_id = :tenantId
             AND (COALESCE(e.employee_id, e.id::text) = ANY(CAST(:ids AS text[]))
                  OR e.id::text = ANY(CAST(:ids AS text[])))`,
          { replacements: { tenantId, ids: empIds } },
        );
        for (const b of banks as any[]) {
          bankByEmp.set(String(b.eid), b);
          bankByEmp.set(String(b.name || '').toLowerCase(), b);
        }
      } catch { /* bank join optional */ }
    }

    const rows: DisbursementRow[] = ready.map((o: any) => {
      const bank = bankByEmp.get(String(o.employeeId)) || {};
      return {
        employeeId: String(o.employeeId),
        employeeName: o.employeeName,
        accountNumber: String(bank.account_number || ''),
        accountName: bank.account_name || o.employeeName,
        bankName: bank.bank_name || 'BCA',
        bankCode: bank.bank_code || '014',
        amount: getSettlementNet(o.settlementData),
        description: `Final Settlement ${o.id?.slice?.(0, 8) || ''}`.trim(),
        email: bank.email || undefined,
      };
    }).filter((r) => r.amount > 0);

    return { rows, dataSource: rows.length ? 'live' : 'empty' };
  } catch {
    return { rows: [], dataSource: 'empty' };
  }
}

export async function loadDisbursementRows(tenantId?: string | null): Promise<{ rows: DisbursementRow[]; dataSource: 'live' | 'demo' | 'empty' }> {
  if (!sequelize) {
    if (allowHrMockFallback()) return { rows: getMockDisbursementRows(), dataSource: 'demo' };
    return { rows: [], dataSource: 'empty' };
  }

  try {
    const tf = tenantId ? 'AND e.tenant_id = :tenantId' : '';
    const [rows] = await sequelize.query(`
      SELECT
        COALESCE(e.employee_id, e.id::text) AS employee_id,
        e.name AS employee_name,
        COALESCE(es.bank_account_number, e.bank_account_number) AS account_number,
        COALESCE(es.bank_account_name, e.bank_account_name, e.name) AS account_name,
        COALESCE(es.bank_name, e.bank_name, 'BCA') AS bank_name,
        COALESCE(es.bank_code, '014') AS bank_code,
        COALESCE(es.net_salary, es.base_salary, e.salary, e.base_salary, 0)::numeric AS amount,
        e.email
      FROM employees e
      LEFT JOIN employee_salaries es ON es.employee_id = e.id AND es.is_active = true
      WHERE e.is_active = true
        AND COALESCE(es.bank_account_number, e.bank_account_number) IS NOT NULL
        AND COALESCE(es.bank_account_number, e.bank_account_number) <> ''
        ${tf}
      ORDER BY e.name ASC
      LIMIT 500
    `, { replacements: { tenantId } });

    const mapped = (rows as any[]).map((r) => ({
      employeeId: String(r.employee_id),
      employeeName: r.employee_name,
      accountNumber: String(r.account_number),
      accountName: r.account_name,
      bankName: r.bank_name,
      bankCode: r.bank_code,
      amount: parseFloat(r.amount) || 0,
      description: 'Payroll',
      email: r.email || undefined,
    })).filter((r) => r.amount > 0);

    if (mapped.length) return { rows: mapped, dataSource: 'live' };
    if (allowHrMockFallback()) return { rows: getMockDisbursementRows(), dataSource: 'demo' };
    return { rows: [], dataSource: 'empty' };
  } catch {
    if (allowHrMockFallback()) return { rows: getMockDisbursementRows(), dataSource: 'demo' };
    return { rows: [], dataSource: 'empty' };
  }
}

/**
 * Employee portal bootstrap: ensure linked employee + required tables/columns.
 * New SaaS tenants often have an owner user without an employees row — portal
 * submits (leave/claim/OT/travel) then fail FK. Auto-provision on first use.
 */

import { withAutocommitQuery, withDbSavepoint } from '@/lib/saas/tenant-request-bound';
import { lookupDefaultTenantId, tenantIdExists } from '@/lib/hris/resolve-employee-tenant';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let schemaReady = false;

export type PortalEmployee = {
  id: string;
  name: string;
  email: string | null;
  tenantId: string | null;
  branchId: string | null;
  salary: number;
};

type QueryFn = (sql: string, opts?: any) => Promise<any>;

async function tableColumnsWith(query: QueryFn, table: string): Promise<Set<string>> {
  const [rows] = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :table`,
    { replacements: { table } },
  );
  return new Set((rows || []).map((r: any) => String(r.column_name)));
}

async function hasTableWith(query: QueryFn, table: string): Promise<boolean> {
  const [rows] = await query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :table LIMIT 1`,
    { replacements: { table } },
  );
  return (rows || []).length > 0;
}

async function tableColumns(sequelize: any, table: string): Promise<Set<string>> {
  const [rows] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :table`,
    { replacements: { table } },
  );
  return new Set((rows || []).map((r: any) => String(r.column_name)));
}

async function employeeSalarySelect(sequelize: any): Promise<string> {
  const cols = await withDbSavepoint(
    sequelize,
    () => tableColumns(sequelize, 'employees'),
    'emp_salary_cols',
  );
  if (cols?.has('salary')) return 'COALESCE(e.salary, 0) AS salary';
  if (cols?.has('base_salary')) return 'COALESCE(e.base_salary, 0) AS salary';
  return '0::numeric AS salary';
}

async function hasTable(sequelize: any, table: string): Promise<boolean> {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :table LIMIT 1`,
    { replacements: { table } },
  );
  return (rows || []).length > 0;
}

/** Idempotent schema upgrades for portal write paths — MUST run outside request TX. */
export async function ensurePortalSchema(sequelize: any): Promise<void> {
  if (!sequelize || schemaReady) return;

  const ok = await withAutocommitQuery(sequelize, async (query) => {
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').catch(() => null);

    // ── employee_claims ──
    if (!(await hasTableWith(query, 'employee_claims'))) {
      await query(`
        CREATE TABLE employee_claims (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID,
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          claim_number VARCHAR(50),
          claim_type VARCHAR(50) NOT NULL,
          amount NUMERIC(15,2) NOT NULL DEFAULT 0,
          approved_amount NUMERIC(15,2),
          currency VARCHAR(5) DEFAULT 'IDR',
          claim_date DATE,
          receipt_date DATE,
          description TEXT,
          receipt_url TEXT,
          receipt_number VARCHAR(100),
          attachments_count INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending',
          current_approval_step INTEGER DEFAULT 0,
          rejection_reason TEXT,
          rejected_by_name VARCHAR(255),
          rejected_at TIMESTAMPTZ,
          resubmit_count INTEGER DEFAULT 0,
          notes TEXT,
          paid_date DATE,
          paid_by UUID,
          payment_ref VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_emp_claim_empid ON employee_claims(employee_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_emp_claim_status ON employee_claims(status)`);
    } else {
      const cols = await tableColumnsWith(query, 'employee_claims');
      const add = async (col: string, ddl: string) => {
        if (!cols.has(col)) await query(`ALTER TABLE employee_claims ADD COLUMN ${ddl}`);
      };
      await add('receipt_date', 'receipt_date DATE');
      await add('attachments_count', 'attachments_count INTEGER DEFAULT 0');
      await add('rejection_reason', 'rejection_reason TEXT');
      await add('rejected_by_name', 'rejected_by_name VARCHAR(255)');
      await add('rejected_at', 'rejected_at TIMESTAMPTZ');
      await add('resubmit_count', 'resubmit_count INTEGER DEFAULT 0');
    }

    if (await hasTableWith(query, 'overtime_requests')) {
      const cols = await tableColumnsWith(query, 'overtime_requests');
      const add = async (col: string, ddl: string) => {
        if (!cols.has(col)) await query(`ALTER TABLE overtime_requests ADD COLUMN ${ddl}`);
      };
      await add('date', 'date DATE');
      await add('day_type', "day_type VARCHAR(20) DEFAULT 'weekday'");
      await add('start_time', 'start_time VARCHAR(10)');
      await add('end_time', 'end_time VARCHAR(10)');
      await add('work_description', 'work_description TEXT');
      await add('overtime_type', "overtime_type VARCHAR(30) DEFAULT 'regular'");
      await add('multiplier', 'multiplier NUMERIC(5,2) DEFAULT 1.5');
      await add('calculated_pay', 'calculated_pay NUMERIC(15,2) DEFAULT 0');
      await add('duration_hours', 'duration_hours NUMERIC(6,2)');
      await add('notes', 'notes TEXT');
      await add('rejection_reason', 'rejection_reason TEXT');
      if (cols.has('request_date')) {
        await query(`
          UPDATE overtime_requests SET date = request_date WHERE date IS NULL AND request_date IS NOT NULL
        `).catch(() => null);
      }
    }

    if (await hasTableWith(query, 'travel_requests')) {
      const cols = await tableColumnsWith(query, 'travel_requests');
      const add = async (col: string, ddl: string) => {
        if (!cols.has(col)) await query(`ALTER TABLE travel_requests ADD COLUMN ${ddl}`);
      };
      await add('departure_city', 'departure_city VARCHAR(100)');
      await add('transportation', "transportation VARCHAR(50) DEFAULT 'flight'");
      await add('travel_type', "travel_type VARCHAR(30) DEFAULT 'domestic'");
      await add('trip_type', "trip_type VARCHAR(20) DEFAULT 'single'");
      await add('itinerary', "itinerary JSONB DEFAULT '[]'::jsonb");
      await add('advance_amount', 'advance_amount NUMERIC(15,2) DEFAULT 0');
      await add('actual_cost', 'actual_cost NUMERIC(15,2) DEFAULT 0');
      await add('departure_date', 'departure_date DATE');
      await add('return_date', 'return_date DATE');
      await add('start_date', 'start_date DATE');
      await add('end_date', 'end_date DATE');
      if (cols.has('start_date')) {
        await query(`
          UPDATE travel_requests SET departure_date = start_date WHERE departure_date IS NULL AND start_date IS NOT NULL
        `).catch(() => null);
        await query(`
          UPDATE travel_requests SET return_date = end_date WHERE return_date IS NULL AND end_date IS NOT NULL
        `).catch(() => null);
      }
    }

    if (await hasTableWith(query, 'travel_expenses')) {
      const cols = await tableColumnsWith(query, 'travel_expenses');
      const add = async (col: string, ddl: string) => {
        if (!cols.has(col)) await query(`ALTER TABLE travel_expenses ADD COLUMN ${ddl}`);
      };
      await add('itinerary_stop_id', 'itinerary_stop_id VARCHAR(80)');
      await add('cost_line_id', 'cost_line_id VARCHAR(80)');
      await add('receipt_number', 'receipt_number VARCHAR(100)');
      await add('planned_amount', 'planned_amount NUMERIC(15,2) DEFAULT 0');
      await add('notes', 'notes TEXT');
    }

    if (await hasTableWith(query, 'leave_requests')) {
      const cols = await tableColumnsWith(query, 'leave_requests');
      const add = async (col: string, ddl: string) => {
        if (!cols.has(col)) await query(`ALTER TABLE leave_requests ADD COLUMN ${ddl}`);
      };
      await add('branch_id', 'branch_id UUID');
      await add('approval_config_id', 'approval_config_id UUID');
      await add('leave_type_id', 'leave_type_id UUID');
      await add('current_approval_step', 'current_approval_step INTEGER DEFAULT 1');
      await add('total_approval_steps', 'total_approval_steps INTEGER DEFAULT 1');
    }

    if (!(await hasTableWith(query, 'leave_approval_steps'))) {
      await query(`
        CREATE TABLE leave_approval_steps (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
          step_order INTEGER NOT NULL DEFAULT 1,
          approver_role VARCHAR(50),
          approver_id VARCHAR(50),
          status VARCHAR(20) DEFAULT 'waiting',
          comments TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    }

    return true;
  }, 'portal_schema');

  if (ok) schemaReady = true;
  else console.warn('ensurePortalSchema: autocommit DDL failed or skipped');
}

/** Catalog cuti per tenant — wajib karena FORCE RLS di leave_types. */
export async function ensureTenantLeaveTypes(
  sequelize: any,
  tenantId: string | null | undefined,
): Promise<void> {
  if (!sequelize || !tenantId || !UUID_RE.test(String(tenantId))) return;
  if (!(await hasTable(sequelize, 'leave_types'))) return;

  const { withDbSavepoint } = require('../saas/tenant-request-bound');
  const types: Array<[string, string, string, number, string]> = [
    ['annual', 'Cuti Tahunan', 'annual', 12, '#3B82F6'],
    ['sick', 'Cuti Sakit', 'sick', 14, '#EF4444'],
    ['personal', 'Cuti Pribadi', 'personal', 3, '#8B5CF6'],
    ['maternity', 'Cuti Melahirkan', 'special', 90, '#EC4899'],
    ['unpaid', 'Cuti Tanpa Gaji', 'unpaid', 30, '#6B7280'],
  ];

  await withDbSavepoint(sequelize, async () => {
    for (const [code, name, cat, max, color] of types) {
      await sequelize.query(
        `INSERT INTO leave_types (
           id, tenant_id, code, name, category, max_days_per_year, color, is_active, created_at, updated_at
         )
         SELECT gen_random_uuid(), :tenantId, :code, :name, :cat, :max, :color, true, NOW(), NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM leave_types
           WHERE tenant_id = :tenantId AND code = :code
         )`,
        { replacements: { tenantId: String(tenantId), code, name, cat, max, color } },
      );
    }
  }, 'seed_leave_types');
}

async function nextEmployeeCode(sequelize: any, tenantId: string): Promise<string> {
  const token = String(tenantId).replace(/-/g, '').slice(0, 6).toUpperCase();
  const [rows] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM employees WHERE tenant_id = :tenantId`,
    { replacements: { tenantId } },
  );
  const seq = (rows?.[0]?.c || 0) + 1;
  return `EMP-${token}-${String(seq).padStart(3, '0')}`;
}

async function seedLeaveBalances(sequelize: any, employeeId: string, tenantId: string | null) {
  if (!(await hasTable(sequelize, 'leave_balances'))) return;
  if (!(await hasTable(sequelize, 'leave_types'))) return;
  if (!tenantId) return;
  await ensureTenantLeaveTypes(sequelize, tenantId);
  const { withDbSavepoint } = require('../saas/tenant-request-bound');
  const year = new Date().getFullYear();
  await withDbSavepoint(sequelize, async () => {
    const [types] = await sequelize.query(
      `SELECT id, code, COALESCE(max_days_per_year, 12) AS max_days
       FROM leave_types
       WHERE is_active = true
         AND tenant_id = :tenantId
         AND code IN ('annual','sick','personal')`,
      { replacements: { tenantId } },
    );
    for (const t of types || []) {
      await sequelize.query(
        `INSERT INTO leave_balances (id, tenant_id, employee_id, leave_type_id, year, entitled, used, pending, remaining)
         SELECT gen_random_uuid(), :tenantId, :employeeId, :typeId, :year, :entitled, 0, 0, :entitled
         WHERE NOT EXISTS (
           SELECT 1 FROM leave_balances
           WHERE employee_id = :employeeId AND leave_type_id = :typeId AND year = :year
             AND tenant_id = :tenantId
         )`,
        {
          replacements: {
            tenantId,
            employeeId,
            typeId: t.id,
            year,
            entitled: Number(t.max_days) || 12,
          },
        },
      );
    }
  }, 'seed_leave_bal');
}

/**
 * Resolve or create the employees row for a portal user.
 * Returns null only when user/tenant cannot be resolved.
 *
 * CRITICAL: lookup is always tenant-scoped — never match another tenant's
 * employee by shared email / stale user_id (cross-tenant ESS leak).
 */
export async function ensurePortalEmployee(
  sequelize: any,
  userId: string | number,
  tenantId?: string | null,
): Promise<PortalEmployee | null> {
  if (!sequelize) return null;
  await ensurePortalSchema(sequelize);

  const uid = parseInt(String(userId), 10);
  if (!Number.isFinite(uid)) return null;

  const [users] = await sequelize.query(
    `SELECT id, name, email, phone, tenant_id, role FROM users WHERE id = :uid LIMIT 1`,
    { replacements: { uid } },
  );
  const user = users?.[0];
  if (!user) return null;

  let tid = tenantId || user.tenant_id;
  if (!tid || !UUID_RE.test(String(tid)) || !(await tenantIdExists(sequelize, String(tid)))) {
    const fromUser = user.tenant_id && UUID_RE.test(String(user.tenant_id)) ? String(user.tenant_id) : null;
    if (fromUser && fromUser !== String(tid || '') && (await tenantIdExists(sequelize, fromUser))) {
      tid = fromUser;
    } else {
      tid = await lookupDefaultTenantId(sequelize);
    }
  }
  if (!tid || !UUID_RE.test(String(tid))) {
    return null;
  }

  await ensureTenantLeaveTypes(sequelize, String(tid));
  const salarySelect = await employeeSalarySelect(sequelize);

  const inTenant = await withDbSavepoint(sequelize, async () => {
    const [rows] = await sequelize.query(
      `SELECT e.id, e.name, e.email, e.tenant_id, e.branch_id, ${salarySelect}
       FROM employees e
       WHERE e.tenant_id = :tid
         AND (
           e.user_id::text = :uid::text
           OR (
             e.email IS NOT NULL AND :email IS NOT NULL
             AND LOWER(TRIM(e.email)) = LOWER(TRIM(:email))
           )
         )
       ORDER BY CASE WHEN e.user_id::text = :uid::text THEN 0 ELSE 1 END
       LIMIT 1`,
      { replacements: { uid, tid: String(tid), email: user.email || null } },
    );
    return rows?.[0] || null;
  }, 'portal_emp_lookup');
  let row = inTenant || null;
  if (!row?.id) {
    const byUser = await withDbSavepoint(sequelize, async () => {
      const [rows] = await sequelize.query(
        `SELECT e.id, e.name, e.email, e.tenant_id, e.branch_id, ${salarySelect}
         FROM employees e
         INNER JOIN tenants t ON t.id = e.tenant_id
         WHERE e.user_id::text = :uid::text
         LIMIT 1`,
        { replacements: { uid } },
      );
      return rows?.[0] || null;
    }, 'portal_emp_by_user');
    row = byUser || null;
  }
  if (row?.id) {
    const rowTid = String(row.tenant_id || tid);
    await withDbSavepoint(sequelize, async () => {
      await sequelize.query(
        `UPDATE employees SET user_id = :uid, updated_at = NOW()
         WHERE id = :id AND tenant_id = :rowTid AND (user_id IS NULL OR user_id <> :uid)`,
        { replacements: { uid, id: row.id, rowTid } },
      );
      return true;
    }, 'portal_emp_link');
    await seedLeaveBalances(sequelize, String(row.id), rowTid);
    return {
      id: String(row.id),
      name: row.name,
      email: row.email,
      tenantId: rowTid,
      branchId: row.branch_id ? String(row.branch_id) : null,
      salary: Number(row.salary) || 0,
    };
  }

  const code = await nextEmployeeCode(sequelize, String(tid));
  const position =
    user.role === 'owner' || user.role === 'admin' || user.role === 'super_admin'
      ? 'Owner / Admin'
      : 'Staff';

  const emp = await withDbSavepoint(sequelize, async () => {
    const empCols = await tableColumns(sequelize, 'employees');
    const returningSalary = empCols.has('salary')
      ? 'COALESCE(salary, 0) AS salary'
      : empCols.has('base_salary')
        ? 'COALESCE(base_salary, 0) AS salary'
        : '0::numeric AS salary';
    const [created] = await sequelize.query(
      `INSERT INTO employees (
         id, tenant_id, user_id, employee_code, employee_id, name, email, phone,
         position, department, hire_date, status, is_active, employment_category, created_at, updated_at
       ) VALUES (
         gen_random_uuid(), :tenantId, :uid, :code, :code, :name, :email, :phone,
         :position, 'GENERAL', CURRENT_DATE, 'active', true, 'permanent', NOW(), NOW()
       )
       RETURNING id, name, email, tenant_id, branch_id, ${returningSalary}`,
      {
        replacements: {
          tenantId: tid,
          uid,
          code,
          name: user.name || user.email || 'Employee',
          email: user.email || null,
          phone: user.phone || null,
          position,
        },
      },
    );
    return created?.[0] || null;
  }, 'portal_emp_insert');

  if (!emp?.id) return null;

  await seedLeaveBalances(sequelize, String(emp.id), String(tid));

  return {
    id: String(emp.id),
    name: emp.name,
    email: emp.email,
    tenantId: emp.tenant_id ? String(emp.tenant_id) : String(tid),
    branchId: emp.branch_id ? String(emp.branch_id) : null,
    salary: Number(emp.salary) || 0,
  };
}

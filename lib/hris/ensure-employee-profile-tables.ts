/**
 * Ensure employee profile sub-tables exist (families, educations, etc.).
 * Prod historically shipped without these — upserts then 500.
 * employee_id type follows employees.id (uuid | integer).
 */

let ensured = false;

async function tableExists(sequelize: any, table: string): Promise<boolean> {
  const [rows]: any = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :table LIMIT 1`,
    { replacements: { table } },
  );
  return rows?.length > 0;
}

async function columnExists(sequelize: any, table: string, column: string): Promise<boolean> {
  const [rows]: any = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :table AND column_name = :column LIMIT 1`,
    { replacements: { table, column } },
  );
  return rows?.length > 0;
}

async function getEmployeeIdColumnType(sequelize: any): Promise<'uuid' | 'integer'> {
  try {
    const [rows]: any = await sequelize.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'id'
      LIMIT 1
    `);
    return rows?.[0]?.data_type === 'uuid' ? 'uuid' : 'integer';
  } catch {
    return 'uuid';
  }
}

function employeeIdCol(empIdType: 'uuid' | 'integer'): string {
  return empIdType === 'uuid'
    ? 'employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE'
    : 'employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE';
}

const SUB_TABLE_DDL: Record<string, (empCol: string) => string> = {
  employee_families: (empCol) => `
    CREATE TABLE employee_families (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      ${empCol},
      name VARCHAR(100) NOT NULL,
      relationship VARCHAR(30) NOT NULL,
      gender VARCHAR(10),
      date_of_birth DATE,
      place_of_birth VARCHAR(100),
      national_id VARCHAR(30),
      phone_number VARCHAR(20),
      occupation VARCHAR(100),
      is_emergency_contact BOOLEAN DEFAULT false,
      is_dependent BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  employee_educations: (empCol) => `
    CREATE TABLE employee_educations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      ${empCol},
      level VARCHAR(30) NOT NULL,
      institution VARCHAR(200) NOT NULL,
      major VARCHAR(100),
      degree VARCHAR(50),
      start_year INTEGER,
      end_year INTEGER,
      gpa DECIMAL(4,2),
      is_highest BOOLEAN DEFAULT false,
      certificate_number VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  employee_certifications: (empCol) => `
    CREATE TABLE employee_certifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      ${empCol},
      name VARCHAR(200) NOT NULL,
      issuing_organization VARCHAR(200),
      credential_id VARCHAR(100),
      issue_date DATE,
      expiry_date DATE,
      is_active BOOLEAN DEFAULT true,
      document_url TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  employee_skills: (empCol) => `
    CREATE TABLE employee_skills (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      ${empCol},
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50),
      proficiency_level VARCHAR(20) DEFAULT 'intermediate',
      years_experience INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  employee_work_experiences: (empCol) => `
    CREATE TABLE employee_work_experiences (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      ${empCol},
      company_name VARCHAR(200) NOT NULL,
      position VARCHAR(100) NOT NULL,
      department VARCHAR(100),
      start_date DATE,
      end_date DATE,
      is_current BOOLEAN DEFAULT false,
      salary DECIMAL(15,2),
      reason_leaving TEXT,
      description TEXT,
      reference_name VARCHAR(100),
      reference_phone VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
};

/** Whitelisted writable columns per sub-table (excludes id / timestamps). */
export const EMPLOYEE_PROFILE_SUB_COLUMNS: Record<string, string[]> = {
  employee_families: [
    'employee_id', 'tenant_id', 'name', 'relationship', 'gender', 'date_of_birth',
    'place_of_birth', 'national_id', 'phone_number', 'occupation',
    'is_emergency_contact', 'is_dependent', 'notes',
  ],
  employee_educations: [
    'employee_id', 'tenant_id', 'level', 'institution', 'major', 'degree',
    'start_year', 'end_year', 'gpa', 'is_highest', 'certificate_number', 'notes',
  ],
  employee_certifications: [
    'employee_id', 'tenant_id', 'name', 'issuing_organization', 'credential_id',
    'issue_date', 'expiry_date', 'is_active', 'document_url', 'notes',
  ],
  employee_skills: [
    'employee_id', 'tenant_id', 'name', 'category', 'proficiency_level',
    'years_experience', 'notes',
  ],
  employee_work_experiences: [
    'employee_id', 'tenant_id', 'company_name', 'position', 'department',
    'start_date', 'end_date', 'is_current', 'salary', 'reason_leaving',
    'description', 'reference_name', 'reference_phone',
  ],
  employee_documents: [
    'employee_id', 'tenant_id', 'document_type', 'document_number', 'title',
    'description', 'file_url', 'file_name', 'file_size', 'mime_type',
    'issue_date', 'expiry_date', 'is_active', 'status', 'signed_by',
    'signed_date', 'version', 'created_by',
  ],
  employee_contracts: [
    'employee_id', 'tenant_id', 'contract_type', 'contract_number', 'start_date',
    'end_date', 'probation_end', 'status', 'salary', 'position', 'department',
    'branch_id', 'document_id', 'renewal_count', 'previous_contract_id',
    'termination_date', 'termination_reason', 'notes', 'created_by',
    'approved_by', 'approved_at',
  ],
};

const DATE_COLS = new Set([
  'date_of_birth', 'issue_date', 'expiry_date', 'start_date', 'end_date',
  'probation_end', 'termination_date', 'signed_date', 'approved_at',
]);
const INT_COLS = new Set([
  'start_year', 'end_year', 'years_experience', 'file_size', 'version', 'renewal_count',
]);
const NUM_COLS = new Set(['gpa', 'salary']);
const BOOL_COLS = new Set([
  'is_emergency_contact', 'is_dependent', 'is_highest', 'is_active', 'is_current',
]);

/** Normalize FE payload values for PG (empty string → null, ISO date → YYYY-MM-DD). */
export function sanitizeSubDataPayload(
  table: string,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = EMPLOYEE_PROFILE_SUB_COLUMNS[table];
  if (!allowed) return {};
  const out: Record<string, unknown> = {};

  for (const key of allowed) {
    if (!(key in raw)) continue;
    let v = raw[key];
    if (v === undefined) continue;
    if (v === '') {
      out[key] = null;
      continue;
    }
    if (DATE_COLS.has(key) && typeof v === 'string') {
      const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
      out[key] = m ? m[1] : null;
      continue;
    }
    if (INT_COLS.has(key)) {
      const n = typeof v === 'number' ? v : parseInt(String(v), 10);
      out[key] = Number.isFinite(n) ? n : null;
      continue;
    }
    if (NUM_COLS.has(key)) {
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      out[key] = Number.isFinite(n) ? n : null;
      continue;
    }
    if (BOOL_COLS.has(key)) {
      out[key] = v === true || v === 'true' || v === 1 || v === '1';
      continue;
    }
    out[key] = v;
  }
  return out;
}

export async function ensureEmployeeProfileTables(sequelize: any): Promise<boolean> {
  if (!sequelize) return false;
  if (ensured) return true;

  try {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    const empIdType = await getEmployeeIdColumnType(sequelize);
    const empCol = employeeIdCol(empIdType);

    for (const [table, ddlFn] of Object.entries(SUB_TABLE_DDL)) {
      if (!(await tableExists(sequelize, table))) {
        await sequelize.query(ddlFn(empCol));
        await sequelize.query(
          `CREATE INDEX IF NOT EXISTS idx_${table.replace(/[^a-z]/g, '_').slice(0, 24)}_emp ON ${table}(employee_id)`,
        );
        await sequelize.query(
          `CREATE INDEX IF NOT EXISTS idx_${table.replace(/[^a-z]/g, '_').slice(0, 24)}_tenant ON ${table}(tenant_id)`,
        );
      }
    }

    // Optional personal columns used by FE / update-personal (prod employees is lean)
    const { withDbSavepoint } = await import('../saas/tenant-request-bound');
    for (const [col, ddl] of [
      ['gender', 'gender VARCHAR(10)'],
      ['national_id', 'national_id VARCHAR(30)'],
      ['date_of_birth', 'date_of_birth DATE'],
      ['place_of_birth', 'place_of_birth VARCHAR(100)'],
      ['marital_status', 'marital_status VARCHAR(20)'],
      ['religion', 'religion VARCHAR(30)'],
      ['contract_type', 'contract_type VARCHAR(20)'],
      ['contract_start', 'contract_start DATE'],
      ['contract_end', 'contract_end DATE'],
      ['contract_number', 'contract_number VARCHAR(100)'],
    ] as const) {
      await withDbSavepoint(sequelize, async () => {
        await sequelize.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS ${ddl}`);
      }, `emp_col_${col}`);
    }

    // contracts.employee_id is TEXT on some envs — still works with UUID strings
    if (await tableExists(sequelize, 'employee_contracts')) {
      await withDbSavepoint(sequelize, async () => {
        await sequelize.query(
          `ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
        );
      }, 'emp_contract_status');
    }

    ensured = true;
    return true;
  } catch (error) {
    console.warn('ensureEmployeeProfileTables:', (error as any)?.message || error);
    return false;
  }
}

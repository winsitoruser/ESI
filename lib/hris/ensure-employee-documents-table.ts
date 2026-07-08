let ensured = false;

async function columnExists(sequelize: any, table: string, column: string): Promise<boolean> {
  const [rows]: any = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :table AND column_name = :column LIMIT 1`,
    { replacements: { table, column } }
  );
  return rows?.length > 0;
}

async function tableExists(sequelize: any, table: string): Promise<boolean> {
  const [rows]: any = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :table LIMIT 1`,
    { replacements: { table } }
  );
  return rows?.length > 0;
}

async function addColumnIfMissing(sequelize: any, table: string, column: string, ddl: string) {
  if (!(await columnExists(sequelize, table, column))) {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

async function getEmployeeIdColumnType(sequelize: any): Promise<'uuid' | 'integer'> {
  try {
    const [rows]: any = await sequelize.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'id'
      LIMIT 1
    `);
    const type = rows?.[0]?.data_type;
    return type === 'uuid' ? 'uuid' : 'integer';
  } catch {
    return 'uuid';
  }
}

export async function ensureEmployeeDocumentsTable(sequelize: any): Promise<boolean> {
  if (!sequelize) return false;
  if (ensured) return true;

  try {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const empIdType = await getEmployeeIdColumnType(sequelize);
    const employeeIdCol = empIdType === 'uuid'
      ? 'employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE'
      : 'employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE';

    if (!(await tableExists(sequelize, 'employee_documents'))) {
      await sequelize.query(`
        CREATE TABLE employee_documents (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID,
          ${employeeIdCol},
          document_type VARCHAR(50) NOT NULL,
          document_number VARCHAR(100),
          title VARCHAR(200) NOT NULL,
          description TEXT,
          file_url TEXT,
          file_name VARCHAR(200),
          file_size INTEGER,
          mime_type VARCHAR(100),
          issue_date DATE,
          expiry_date DATE,
          is_active BOOLEAN DEFAULT true,
          status VARCHAR(20) DEFAULT 'pending',
          signed_by VARCHAR(200),
          signed_date DATE,
          version INTEGER DEFAULT 1,
          metadata JSONB DEFAULT '{}',
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    } else {
      for (const [col, ddl] of [
        ['file_url', 'file_url TEXT'],
        ['file_name', 'file_name VARCHAR(200)'],
        ['file_size', 'file_size INTEGER'],
        ['mime_type', 'mime_type VARCHAR(100)'],
        ['issue_date', 'issue_date DATE'],
        ['expiry_date', 'expiry_date DATE'],
        ['is_active', 'is_active BOOLEAN DEFAULT true'],
        ['status', "status VARCHAR(20) DEFAULT 'pending'"],
        ['signed_by', 'signed_by VARCHAR(200)'],
        ['signed_date', 'signed_date DATE'],
        ['version', 'version INTEGER DEFAULT 1'],
        ['metadata', "metadata JSONB DEFAULT '{}'"],
        ['created_by', 'created_by UUID'],
        ['description', 'description TEXT'],
        ['document_number', 'document_number VARCHAR(100)'],
      ]) {
        await addColumnIfMissing(sequelize, 'employee_documents', col, ddl);
      }
    }

    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_emp_doc_employee ON employee_documents(employee_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_emp_doc_type ON employee_documents(document_type)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_emp_doc_expiry ON employee_documents(expiry_date)`);

    ensured = true;
    return true;
  } catch (error) {
    console.warn('ensureEmployeeDocumentsTable:', error);
    return false;
  }
}

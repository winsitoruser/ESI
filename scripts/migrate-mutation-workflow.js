/**
 * HRIS Mutation / Penugasan workflow tables
 * Run: npm run db:mutation-workflow-migrate
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

const DEFAULT_LEVELS = [
  { level: 1, role: 'MANAGER', title: 'Atasan / Manajer Departemen', required: true },
  { level: 2, role: 'HR_MANAGER', title: 'HRD / SDM', required: true },
  { level: 3, role: 'DIRECTOR', title: 'Direktur / Manajemen', required: false },
];

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected to database\n');
  await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mutation_approval_configs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(100) NOT NULL DEFAULT 'Default Mutasi',
      description TEXT,
      mutation_types JSONB DEFAULT '["transfer","promotion","demotion","rotation","assignment"]',
      approval_levels JSONB NOT NULL DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mutation_approval_configs');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_mutations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      mutation_type VARCHAR(30) NOT NULL DEFAULT 'transfer',
      mutation_scope VARCHAR(30) DEFAULT 'department',
      mutation_number VARCHAR(50),
      effective_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      from_branch_id UUID,
      from_department VARCHAR(50),
      from_position VARCHAR(100),
      from_job_grade_id UUID,
      from_org_structure_id UUID,
      to_branch_id UUID,
      to_department VARCHAR(50),
      to_position VARCHAR(100),
      to_job_grade_id UUID,
      to_org_structure_id UUID,
      salary_change DECIMAL(15,2) DEFAULT 0,
      new_salary DECIMAL(15,2),
      reason TEXT,
      notes TEXT,
      document_url TEXT,
      e_file_id UUID,
      requested_by UUID,
      current_approval_step INTEGER DEFAULT 1,
      total_approval_steps INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_mutations');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mutation_approval_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      mutation_id UUID NOT NULL REFERENCES employee_mutations(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 1,
      approver_id UUID,
      approver_role VARCHAR(50),
      approver_title VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      comments TEXT,
      acted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ mutation_approval_steps');

  // Add columns if table existed from older script
  const addCol = async (col, type, def) => {
    try {
      await sequelize.query(`ALTER TABLE employee_mutations ADD COLUMN IF NOT EXISTS ${col} ${type} ${def || ''}`);
    } catch { /* ignore */ }
  };
  await addCol('mutation_scope', "VARCHAR(30)", "DEFAULT 'department'");
  await addCol('total_approval_steps', 'INTEGER', 'DEFAULT 1');
  await addCol('e_file_id', 'UUID');
  try {
    await sequelize.query(`ALTER TABLE mutation_approval_steps ADD COLUMN IF NOT EXISTS approver_title VARCHAR(100)`);
  } catch { /* ignore */ }

  // Fix employee_id type if INTEGER (legacy)
  try {
    const [cols] = await sequelize.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'employee_mutations' AND column_name = 'employee_id'
    `);
    if (cols[0]?.data_type === 'integer') {
      console.log('  ⚠ employee_mutations.employee_id is INTEGER — recreate recommended');
    }
  } catch { /* ignore */ }

  const indexes = [
    ['employee_mutations', 'employee_id', 'idx_mut_employee'],
    ['employee_mutations', 'status', 'idx_mut_status'],
    ['employee_mutations', 'mutation_number', 'idx_mut_number'],
    ['mutation_approval_steps', 'mutation_id', 'idx_mut_step_mut'],
  ];
  for (const [table, col, name] of indexes) {
    try {
      await sequelize.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${col})`);
    } catch { /* ignore */ }
  }

  const [existing] = await sequelize.query(`SELECT id FROM mutation_approval_configs LIMIT 1`);
  if (!existing.length) {
    await sequelize.query(`
      INSERT INTO mutation_approval_configs (name, description, approval_levels, is_active)
      VALUES ('Standar Mutasi & Penugasan', 'Alur persetujuan: Manajer → HRD → Direktur (promosi/demosi)', :levels, true)
    `, { replacements: { levels: JSON.stringify(DEFAULT_LEVELS) } });
    console.log('  ✓ default approval config seeded');
  }

  console.log('\n✓ Mutation workflow migration complete');
  await sequelize.close();
}

migrate().catch((e) => { console.error(e); process.exit(1); });

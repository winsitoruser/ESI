/**
 * HRIS Disciplinary Letter Workflow tables
 * Run: npm run db:disciplinary-migrate
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DEFAULT_SOP_TEMPLATES = [
  { name: 'SOP Surat Teguran', letterType: 'TEGURAN', description: 'Teguran awal sebelum SP formal.', validityMonths: 3, prerequisites: {}, phases: [{ phase: 'request', label: 'Pengajuan Atasan', role: 'MANAGER' }, { phase: 'drafting', label: 'Penyusunan Surat', role: 'HR_STAFF' }, { phase: 'approval', label: 'Persetujuan HRD', role: 'HR_MANAGER' }, { phase: 'issuance', label: 'Penerbitan', role: 'HR_STAFF' }], approvalLevels: [{ level: 1, phase: 'request', role: 'MANAGER', title: 'Atasan Langsung' }, { level: 2, phase: 'drafting', role: 'HR_STAFF', title: 'Staff HRD' }, { level: 3, phase: 'approval', role: 'HR_MANAGER', title: 'Manajer HRD' }, { level: 4, phase: 'issuance', role: 'HR_STAFF', title: 'Penerbitan' }] },
  { name: 'SOP SP1', letterType: 'SP1', description: 'Peringatan pertama resmi.', validityMonths: 6, prerequisites: {}, phases: [], approvalLevels: [{ level: 1, phase: 'request', role: 'MANAGER', title: 'Atasan' }, { level: 2, phase: 'investigation', role: 'HR_STAFF', title: 'Verifikasi HRD' }, { level: 3, phase: 'drafting', role: 'HR_STAFF', title: 'Draft SP1' }, { level: 4, phase: 'approval', role: 'HR_MANAGER', title: 'Manajer HRD' }, { level: 5, phase: 'issuance', role: 'HR_STAFF', title: 'Penerbitan' }] },
  { name: 'SOP SP2', letterType: 'SP2', description: 'Peringatan kedua, wajib SP1 aktif.', validityMonths: 6, prerequisites: { requiresPreviousType: 'SP1' }, phases: [], approvalLevels: [{ level: 1, phase: 'request', role: 'HR_STAFF', title: 'Staff HRD' }, { level: 2, phase: 'investigation', role: 'HR_MANAGER', title: 'Investigasi' }, { level: 3, phase: 'drafting', role: 'HR_STAFF', title: 'Draft SP2' }, { level: 4, phase: 'review', role: 'LEGAL', title: 'Legal' }, { level: 5, phase: 'approval', role: 'DIRECTOR', title: 'Direktur' }, { level: 6, phase: 'issuance', role: 'HR_MANAGER', title: 'Penerbitan' }] },
  { name: 'SOP SP3', letterType: 'SP3', description: 'Peringatan terakhir, wajib SP2 aktif.', validityMonths: 6, prerequisites: { requiresPreviousType: 'SP2' }, phases: [], approvalLevels: [{ level: 1, phase: 'request', role: 'HR_MANAGER', title: 'Manajer HRD' }, { level: 2, phase: 'investigation', role: 'HR_MANAGER', title: 'Sidang Pemeriksaan' }, { level: 3, phase: 'drafting', role: 'HR_STAFF', title: 'Draft SP3' }, { level: 4, phase: 'review', role: 'LEGAL', title: 'Legal' }, { level: 5, phase: 'approval', role: 'DIRECTOR', title: 'Direktur' }, { level: 6, phase: 'issuance', role: 'HR_MANAGER', title: 'Penerbitan' }] },
  { name: 'SOP PHK', letterType: 'TERMINATION', description: 'Pemutusan hubungan kerja.', validityMonths: 0, prerequisites: { requiresPreviousType: 'SP3' }, phases: [], approvalLevels: [{ level: 1, phase: 'request', role: 'HR_MANAGER', title: 'Pengajuan PHK' }, { level: 2, phase: 'investigation', role: 'HR_MANAGER', title: 'Investigasi' }, { level: 3, phase: 'review', role: 'LEGAL', title: 'Legal' }, { level: 4, phase: 'drafting', role: 'HR_STAFF', title: 'Draft PHK' }, { level: 5, phase: 'approval', role: 'DIRECTOR', title: 'Direktur' }, { level: 6, phase: 'approval', role: 'GM', title: 'Manajemen Puncak' }, { level: 7, phase: 'issuance', role: 'HR_MANAGER', title: 'Penerbitan' }] },
];

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected to database\n');
  await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hr_letter_sop_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(100) NOT NULL,
      letter_type VARCHAR(30) NOT NULL,
      description TEXT,
      phases JSONB NOT NULL DEFAULT '[]',
      approval_levels JSONB NOT NULL DEFAULT '[]',
      prerequisites JSONB DEFAULT '{}',
      validity_months INTEGER DEFAULT 6,
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hr_letter_sop_templates');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hr_disciplinary_letters (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL,
      letter_type VARCHAR(30) NOT NULL,
      letter_number VARCHAR(50),
      reference_number VARCHAR(50),
      current_phase VARCHAR(30) DEFAULT 'request',
      status VARCHAR(30) DEFAULT 'draft',
      violation_type VARCHAR(50) DEFAULT 'discipline',
      violation_description TEXT,
      regulation_id UUID,
      previous_letter_id UUID,
      incident_date DATE,
      effective_date DATE,
      expiry_date DATE,
      request_reason TEXT,
      investigation_notes TEXT,
      draft_content JSONB DEFAULT '{}',
      requested_by INTEGER,
      drafted_by INTEGER,
      issued_by INTEGER,
      issued_at TIMESTAMPTZ,
      acknowledged BOOLEAN DEFAULT false,
      acknowledged_at TIMESTAMPTZ,
      sop_template_id UUID REFERENCES hr_letter_sop_templates(id),
      current_approval_step INTEGER DEFAULT 1,
      total_approval_steps INTEGER DEFAULT 1,
      related_case_id UUID,
      related_termination_id UUID,
      termination_type VARCHAR(30),
      severance_amount DECIMAL(15,2) DEFAULT 0,
      attachments JSONB DEFAULT '[]',
      audit_trail JSONB DEFAULT '[]',
      notes TEXT,
      e_file_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hr_disciplinary_letters');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hr_disciplinary_approval_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      letter_id UUID NOT NULL REFERENCES hr_disciplinary_letters(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 1,
      phase VARCHAR(30) DEFAULT 'approval',
      approver_id INTEGER,
      approver_role VARCHAR(50),
      approver_title VARCHAR(100),
      status VARCHAR(20) DEFAULT 'waiting',
      comments TEXT,
      acted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hr_disciplinary_approval_steps');

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hr_dl_employee ON hr_disciplinary_letters(employee_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hr_dl_status ON hr_disciplinary_letters(status)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hr_dl_type ON hr_disciplinary_letters(letter_type)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hr_dl_tenant ON hr_disciplinary_letters(tenant_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hr_sop_type ON hr_letter_sop_templates(letter_type)`);

  // Seed default SOP templates if empty
  const [existing] = await sequelize.query(`SELECT COUNT(*)::int as cnt FROM hr_letter_sop_templates`);
  if ((existing[0]?.cnt || 0) === 0) {
    for (const tpl of DEFAULT_SOP_TEMPLATES) {
      await sequelize.query(`
        INSERT INTO hr_letter_sop_templates (name, letter_type, description, phases, approval_levels, prerequisites, validity_months, is_active, is_default)
        VALUES (:name, :letterType, :description, :phases, :approvalLevels, :prerequisites, :validityMonths, true, true)
      `, {
        replacements: {
          name: tpl.name,
          letterType: tpl.letterType,
          description: tpl.description,
          phases: JSON.stringify(tpl.phases),
          approvalLevels: JSON.stringify(tpl.approvalLevels),
          prerequisites: JSON.stringify(tpl.prerequisites),
          validityMonths: tpl.validityMonths,
        },
      });
    }
    console.log(`  ✓ Seeded ${DEFAULT_SOP_TEMPLATES.length} default SOP templates`);
  }

  console.log('\n✅ Disciplinary letter workflow migration complete');
  await sequelize.close();
}

migrate().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * HRIS Employee Management System - Migration & Seed
 * Creates tables:
 *   - employee_families (data keluarga)
 *   - employee_educations (riwayat pendidikan)
 *   - employee_certifications (sertifikasi)
 *   - employee_skills (keahlian)
 *   - employee_work_experiences (pengalaman kerja)
 *   - employee_documents (kontrak, NDA, PKWT/PKWTT, dll)
 *   - employee_contracts (tracking kontrak kerja)
 *   - org_structures (struktur organisasi)
 *   - job_grades (job grading)
 *   - employee_mutations (mutasi/transfer)
 *   - employee_claims (klaim reimbursement)
 *   - claim_approval_steps (approval steps for claims)
 *   - mutation_approval_steps (approval steps for mutations)
 *   - contract_reminders (reminder masa kontrak & sertifikasi)
 * 
 * Adds columns to employees: gender, blood_type, nationality, etc.
 */
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('No DATABASE_URL'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function run() {
  await sequelize.authenticate();
  console.log('Connected to DB');

  // ========================================
  // 0. ADD EXTRA COLUMNS TO EMPLOYEES TABLE
  // ========================================
  const addCol = async (col, type, def) => {
    try {
      await sequelize.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS ${col} ${type} ${def || ''}`);
    } catch (e) {}
  };

  console.log('Adding extra columns to employees...');
  await addCol('gender', "VARCHAR(10)", "DEFAULT 'MALE'");
  await addCol('blood_type', "VARCHAR(5)");
  await addCol('nationality', "VARCHAR(50)", "DEFAULT 'Indonesia'");
  await addCol('identity_type', "VARCHAR(20)", "DEFAULT 'KTP'");
  await addCol('identity_expiry', "DATE");
  await addCol('tax_id', "VARCHAR(30)");
  await addCol('bpjs_kesehatan', "VARCHAR(30)");
  await addCol('bpjs_ketenagakerjaan', "VARCHAR(30)");
  await addCol('contract_type', "VARCHAR(20)", "DEFAULT 'PKWTT'");
  await addCol('contract_start', "DATE");
  await addCol('contract_end', "DATE");
  await addCol('contract_number', "VARCHAR(50)");
  await addCol('job_grade_id', "UUID");
  await addCol('org_structure_id', "UUID");
  await addCol('supervisor_id', "UUID");
  await addCol('photo_url', "TEXT");
  console.log('✓ Employee columns added');

  // ========================================
  // 1. EMPLOYEE FAMILIES
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_families (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
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
    )
  `);
  console.log('✓ employee_families');

  // ========================================
  // 2. EMPLOYEE EDUCATIONS
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_educations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
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
    )
  `);
  console.log('✓ employee_educations');

  // ========================================
  // 3. EMPLOYEE CERTIFICATIONS
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_certifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
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
    )
  `);
  console.log('✓ employee_certifications');

  // ========================================
  // 4. EMPLOYEE SKILLS
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_skills (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50),
      proficiency_level VARCHAR(20) DEFAULT 'intermediate',
      years_experience INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ employee_skills');

  // ========================================
  // 5. EMPLOYEE WORK EXPERIENCES
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_work_experiences (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
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
    )
  `);
  console.log('✓ employee_work_experiences');

  // ========================================
  // 6. EMPLOYEE DOCUMENTS (kontrak, NDA, PKWT/PKWTT, dll)
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
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
      status VARCHAR(20) DEFAULT 'active',
      signed_by VARCHAR(200),
      signed_date DATE,
      version INTEGER DEFAULT 1,
      tags TEXT[],
      metadata JSONB DEFAULT '{}',
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ employee_documents');

  // ========================================
  // 7. EMPLOYEE CONTRACTS (tracking kontrak kerja PKWT/PKWTT)
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_contracts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      contract_type VARCHAR(20) NOT NULL DEFAULT 'PKWTT',
      contract_number VARCHAR(100),
      start_date DATE NOT NULL,
      end_date DATE,
      probation_end DATE,
      status VARCHAR(20) DEFAULT 'active',
      salary DECIMAL(15,2),
      position VARCHAR(100),
      department VARCHAR(50),
      branch_id UUID,
      document_id UUID,
      renewal_count INTEGER DEFAULT 0,
      previous_contract_id UUID,
      termination_date DATE,
      termination_reason TEXT,
      notes TEXT,
      created_by UUID,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ employee_contracts');

  // ========================================
  // 8. ORG STRUCTURES (struktur organisasi)
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS org_structures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50),
      parent_id UUID REFERENCES org_structures(id) ON DELETE SET NULL,
      level INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      head_employee_id UUID,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ org_structures');

  // ========================================
  // 9. JOB GRADES (grading jabatan)
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS job_grades (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      min_salary DECIMAL(15,2) DEFAULT 0,
      max_salary DECIMAL(15,2) DEFAULT 0,
      benefits JSONB DEFAULT '[]',
      leave_quota JSONB DEFAULT '{}',
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ job_grades');

  // ========================================
  // 10. EMPLOYEE MUTATIONS (mutasi / transfer / promosi)
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_mutations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      mutation_type VARCHAR(30) NOT NULL DEFAULT 'transfer',
      mutation_number VARCHAR(50),
      effective_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      -- from
      from_branch_id UUID,
      from_department VARCHAR(50),
      from_position VARCHAR(100),
      from_job_grade_id UUID,
      from_org_structure_id UUID,
      -- to
      to_branch_id UUID,
      to_department VARCHAR(50),
      to_position VARCHAR(100),
      to_job_grade_id UUID,
      to_org_structure_id UUID,
      -- salary change
      salary_change DECIMAL(15,2) DEFAULT 0,
      new_salary DECIMAL(15,2),
      reason TEXT,
      notes TEXT,
      document_url TEXT,
      requested_by UUID,
      current_approval_step INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ employee_mutations');

  // ========================================
  // 11. MUTATION APPROVAL STEPS
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS mutation_approval_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      mutation_id UUID NOT NULL REFERENCES employee_mutations(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 1,
      approver_id UUID,
      approver_role VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      comments TEXT,
      acted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ mutation_approval_steps');

  // ========================================
  // 12. EMPLOYEE CLAIMS (klaim reimbursement)
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_claims (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      claim_number VARCHAR(50),
      claim_type VARCHAR(50) NOT NULL,
      amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      approved_amount DECIMAL(15,2),
      currency VARCHAR(5) DEFAULT 'IDR',
      claim_date DATE NOT NULL,
      description TEXT,
      receipt_url TEXT,
      receipt_number VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      current_approval_step INTEGER DEFAULT 0,
      paid_date DATE,
      paid_by UUID,
      payment_ref VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ employee_claims');

  // ========================================
  // 13. CLAIM APPROVAL STEPS
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS claim_approval_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      claim_id UUID NOT NULL REFERENCES employee_claims(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 1,
      approver_id UUID,
      approver_role VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      approved_amount DECIMAL(15,2),
      comments TEXT,
      acted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ claim_approval_steps');

  // ========================================
  // 14. CONTRACT REMINDERS
  // ========================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS contract_reminders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      reminder_type VARCHAR(30) NOT NULL,
      reference_id UUID NOT NULL,
      reference_table VARCHAR(50) NOT NULL,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      due_date DATE NOT NULL,
      reminder_days_before INTEGER[] DEFAULT '{30,14,7,1}',
      last_notified_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'active',
      is_dismissed BOOLEAN DEFAULT false,
      dismissed_by UUID,
      dismissed_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ contract_reminders');

  // ========================================
  // INDEXES
  // ========================================
  console.log('Creating indexes...');
  const idx = async (table, cols, name) => {
    try {
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_${name} ON ${table} (${cols})`);
    } catch (e) {}
  };

  await idx('employee_families', 'employee_id', 'emp_fam_empid');
  await idx('employee_families', 'tenant_id', 'emp_fam_tenant');
  await idx('employee_educations', 'employee_id', 'emp_edu_empid');
  await idx('employee_certifications', 'employee_id', 'emp_cert_empid');
  await idx('employee_certifications', 'expiry_date', 'emp_cert_expiry');
  await idx('employee_skills', 'employee_id', 'emp_skill_empid');
  await idx('employee_work_experiences', 'employee_id', 'emp_work_empid');
  await idx('employee_documents', 'employee_id', 'emp_doc_empid');
  await idx('employee_documents', 'document_type', 'emp_doc_type');
  await idx('employee_documents', 'expiry_date', 'emp_doc_expiry');
  await idx('employee_contracts', 'employee_id', 'emp_contract_empid');
  await idx('employee_contracts', 'status', 'emp_contract_status');
  await idx('employee_contracts', 'end_date', 'emp_contract_enddate');
  await idx('org_structures', 'tenant_id', 'org_tenant');
  await idx('org_structures', 'parent_id', 'org_parent');
  await idx('job_grades', 'tenant_id', 'jg_tenant');
  await idx('employee_mutations', 'employee_id', 'emp_mut_empid');
  await idx('employee_mutations', 'status', 'emp_mut_status');
  await idx('employee_claims', 'employee_id', 'emp_claim_empid');
  await idx('employee_claims', 'status', 'emp_claim_status');
  await idx('contract_reminders', 'tenant_id', 'cr_tenant');
  await idx('contract_reminders', 'due_date', 'cr_duedate');
  await idx('contract_reminders', 'status', 'cr_status');
  await idx('contract_reminders', 'employee_id', 'cr_empid');
  console.log('✓ Indexes created');

  // ========================================
  // SEED: Job Grades
  // ========================================
  console.log('Seeding job grades...');
  const [existingGrades] = await sequelize.query(`SELECT COUNT(*) as cnt FROM job_grades`);
  if (parseInt(existingGrades[0].cnt) === 0) {
    const grades = [
      { code: 'G1', name: 'Staff Junior', level: 1, min: 3000000, max: 5000000 },
      { code: 'G2', name: 'Staff', level: 2, min: 4500000, max: 7000000 },
      { code: 'G3', name: 'Staff Senior', level: 3, min: 6000000, max: 10000000 },
      { code: 'G4', name: 'Supervisor', level: 4, min: 8000000, max: 14000000 },
      { code: 'G5', name: 'Asisten Manager', level: 5, min: 10000000, max: 18000000 },
      { code: 'G6', name: 'Manager', level: 6, min: 14000000, max: 25000000 },
      { code: 'G7', name: 'Senior Manager', level: 7, min: 20000000, max: 35000000 },
      { code: 'G8', name: 'General Manager', level: 8, min: 30000000, max: 50000000 },
      { code: 'G9', name: 'Director', level: 9, min: 40000000, max: 80000000 },
      { code: 'G10', name: 'C-Level / BOD', level: 10, min: 60000000, max: 150000000 },
    ];
    for (const g of grades) {
      await sequelize.query(`
        INSERT INTO job_grades (code, name, level, min_salary, max_salary, sort_order, benefits, leave_quota)
        VALUES (:code, :name, :level, :min, :max, :level,
          :benefits, :leave)
      `, {
        replacements: {
          ...g,
          benefits: JSON.stringify([
            g.level >= 6 ? 'Tunjangan Jabatan' : null,
            g.level >= 4 ? 'Tunjangan Transportasi' : null,
            g.level >= 7 ? 'Mobil Dinas' : null,
            g.level >= 5 ? 'BPJS Kelas 1' : 'BPJS Kelas 2',
          ].filter(Boolean)),
          leave: JSON.stringify({
            annual: 12 + Math.floor(g.level / 3),
            sick: 14,
            personal: g.level >= 4 ? 5 : 3,
          })
        }
      });
    }
    console.log('✓ Job grades seeded (10)');
  }

  // ========================================
  // SEED: Org Structures (sample)
  // ========================================
  console.log('Seeding org structures...');
  const [existingOrg] = await sequelize.query(`SELECT COUNT(*) as cnt FROM org_structures`);
  if (parseInt(existingOrg[0].cnt) === 0) {
    // Root
    await sequelize.query(`
      INSERT INTO org_structures (id, name, code, level, sort_order, description)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Board of Directors', 'BOD', 0, 1, 'Dewan Direksi')
    `);
    // L1 departments
    const depts = [
      { id: '00000000-0000-0000-0000-000000000010', name: 'Divisi Operasional', code: 'OPS', order: 1 },
      { id: '00000000-0000-0000-0000-000000000011', name: 'Divisi Keuangan', code: 'FIN', order: 2 },
      { id: '00000000-0000-0000-0000-000000000012', name: 'Divisi SDM & HR', code: 'HR', order: 3 },
      { id: '00000000-0000-0000-0000-000000000013', name: 'Divisi Sales & Marketing', code: 'SM', order: 4 },
      { id: '00000000-0000-0000-0000-000000000014', name: 'Divisi IT', code: 'IT', order: 5 },
    ];
    for (const d of depts) {
      await sequelize.query(`
        INSERT INTO org_structures (id, name, code, parent_id, level, sort_order)
        VALUES (:id, :name, :code, '00000000-0000-0000-0000-000000000001', 1, :order)
      `, { replacements: d });
    }
    // L2 sub-departments
    const subs = [
      { name: 'Gudang & Inventory', code: 'OPS-WH', parent: '00000000-0000-0000-0000-000000000010' },
      { name: 'Produksi / Dapur', code: 'OPS-PROD', parent: '00000000-0000-0000-0000-000000000010' },
      { name: 'Accounting', code: 'FIN-ACC', parent: '00000000-0000-0000-0000-000000000011' },
      { name: 'Payroll', code: 'FIN-PAY', parent: '00000000-0000-0000-0000-000000000011' },
      { name: 'Rekrutmen', code: 'HR-REC', parent: '00000000-0000-0000-0000-000000000012' },
      { name: 'Pelatihan & Pengembangan', code: 'HR-TD', parent: '00000000-0000-0000-0000-000000000012' },
    ];
    for (const s of subs) {
      await sequelize.query(`
        INSERT INTO org_structures (name, code, parent_id, level, sort_order)
        VALUES (:name, :code, :parent, 2, 1)
      `, { replacements: s });
    }
    console.log('✓ Org structures seeded');
  }

  // ========================================
  // SEED: Document Types reference
  // ========================================
  console.log('\n=== Migration Complete ===');
  console.log('Tables created:');
  console.log('  - employee_families');
  console.log('  - employee_educations');
  console.log('  - employee_certifications');
  console.log('  - employee_skills');
  console.log('  - employee_work_experiences');
  console.log('  - employee_documents');
  console.log('  - employee_contracts');
  console.log('  - org_structures');
  console.log('  - job_grades');
  console.log('  - employee_mutations');
  console.log('  - mutation_approval_steps');
  console.log('  - employee_claims');
  console.log('  - claim_approval_steps');
  console.log('  - contract_reminders');
  console.log('\nDocument types supported:');
  console.log('  KONTRAK_KERJA, PKWT, PKWTT, NDA, SP (Surat Peringatan),');
  console.log('  SK_PENGANGKATAN, SK_MUTASI, SK_PROMOSI, SURAT_REFERENSI,');
  console.log('  KTP, KK, NPWP, BPJS, IJAZAH, SERTIFIKAT, SIM, PASPOR, OTHER');

  await sequelize.close();
}

run().catch(e => { console.error(e); process.exit(1); });

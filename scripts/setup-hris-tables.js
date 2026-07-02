#!/usr/bin/env node
/**
 * HRIS Complete Database Setup
 * Creates ALL HRIS tables needed for the module to function.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL
  || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'bedagang_dev'}`;

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function run() {
  await sequelize.authenticate();
  console.log('✓ Connected to database\n');

  // Enable uuid-ossp
  await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  // ================================================================
  // 1. EMPLOYEES (foundation table)
  // ================================================================
  console.log('Creating employees table...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(20) NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(200) NOT NULL,
      phone_number VARCHAR(30),
      address TEXT,
      date_of_birth DATE,
      place_of_birth VARCHAR(100),
      national_id VARCHAR(30),
      religion VARCHAR(30),
      marital_status VARCHAR(20),
      gender VARCHAR(10) DEFAULT 'MALE',
      blood_type VARCHAR(5),
      nationality VARCHAR(50) DEFAULT 'Indonesia',
      identity_type VARCHAR(20) DEFAULT 'KTP',
      identity_expiry DATE,
      tax_id VARCHAR(30),
      bpjs_kesehatan VARCHAR(30),
      bpjs_ketenagakerjaan VARCHAR(30),
      position VARCHAR(100) NOT NULL,
      department VARCHAR(50) NOT NULL,
      branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
      work_location VARCHAR(50) DEFAULT 'ADMIN_OFFICE',
      role VARCHAR(50) DEFAULT 'STAFF',
      status VARCHAR(20) DEFAULT 'ACTIVE',
      join_date DATE DEFAULT CURRENT_DATE,
      end_date DATE,
      contract_type VARCHAR(20) DEFAULT 'PKWTT',
      contract_start DATE,
      contract_end DATE,
      contract_number VARCHAR(50),
      job_grade_id UUID,
      org_structure_id UUID,
      supervisor_id UUID,
      specialization VARCHAR(100),
      license_number VARCHAR(50),
      biography TEXT,
      photo_url TEXT,
      base_salary DECIMAL(15,2),
      salary_grade VARCHAR(20),
      emergency_contact_name VARCHAR(100),
      emergency_contact_relationship VARCHAR(50),
      emergency_contact_phone VARCHAR(30),
      tenant_id UUID,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Add unique constraint safely
  try { await sequelize.query(`ALTER TABLE employees ADD CONSTRAINT emp_email_unique UNIQUE (email)`); } catch(e) {}
  try { await sequelize.query(`ALTER TABLE employees ADD CONSTRAINT emp_empid_unique UNIQUE (employee_id)`); } catch(e) {}
  console.log('  ✓ employees');

  // ================================================================
  // 2. EMPLOYEE SUB-TABLES
  // ================================================================
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
  console.log('  ✓ employee_families');

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
  console.log('  ✓ employee_educations');

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
  console.log('  ✓ employee_certifications');

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
  console.log('  ✓ employee_skills');

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
  console.log('  ✓ employee_work_experiences');

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
      metadata JSONB DEFAULT '{}',
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_documents');

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
  console.log('  ✓ employee_contracts');

  // ================================================================
  // 3. ORG STRUCTURES & JOB GRADES
  // ================================================================
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
  console.log('  ✓ org_structures');

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
  console.log('  ✓ job_grades');

  // ================================================================
  // 4. LEAVE MANAGEMENT TABLES
  // ================================================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      category VARCHAR(30) DEFAULT 'regular',
      max_days_per_year INTEGER DEFAULT 12,
      min_days_per_request INTEGER DEFAULT 1,
      max_days_per_request INTEGER DEFAULT 14,
      carry_forward BOOLEAN DEFAULT false,
      max_carry_forward_days INTEGER DEFAULT 0,
      requires_attachment BOOLEAN DEFAULT false,
      requires_medical_cert BOOLEAN DEFAULT false,
      is_paid BOOLEAN DEFAULT true,
      salary_deduction_percent DECIMAL(5,2) DEFAULT 0,
      applicable_gender VARCHAR(10),
      min_service_months INTEGER DEFAULT 0,
      applicable_departments JSONB DEFAULT '[]',
      applicable_positions JSONB DEFAULT '[]',
      color VARCHAR(20) DEFAULT '#3B82F6',
      icon VARCHAR(30) DEFAULT 'calendar',
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ leave_types');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_approval_configs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      department VARCHAR(50),
      division VARCHAR(50),
      branch_id UUID,
      leave_type_code VARCHAR(30),
      min_days_trigger INTEGER DEFAULT 1,
      max_auto_approve_days INTEGER DEFAULT 0,
      approval_levels JSONB NOT NULL DEFAULT '[]',
      escalation_hours INTEGER DEFAULT 48,
      notify_hr BOOLEAN DEFAULT true,
      notify_manager BOOLEAN DEFAULT true,
      is_active BOOLEAN DEFAULT true,
      priority INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ leave_approval_configs');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      branch_id UUID,
      leave_type VARCHAR(30) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days DECIMAL(4,1) NOT NULL,
      reason TEXT,
      attachment_url TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      rejection_reason TEXT,
      approval_config_id UUID,
      current_approval_step INTEGER DEFAULT 1,
      total_approval_steps INTEGER DEFAULT 1,
      half_day BOOLEAN DEFAULT false,
      half_day_type VARCHAR(20),
      delegate_to UUID,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ leave_requests');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_approval_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 1,
      approver_role VARCHAR(50),
      approver_id UUID,
      approver_name VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending',
      comments TEXT,
      action_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ leave_approval_steps');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_balances (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      entitled_days DECIMAL(5,1) DEFAULT 0,
      used_days DECIMAL(5,1) DEFAULT 0,
      pending_days DECIMAL(5,1) DEFAULT 0,
      carry_forward_days DECIMAL(5,1) DEFAULT 0,
      adjustment_days DECIMAL(5,1) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (employee_id, leave_type_id, year)
    )
  `);
  console.log('  ✓ leave_balances');

  // ================================================================
  // 5. PAYROLL TABLES
  // ================================================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payroll_components (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      type VARCHAR(20) NOT NULL DEFAULT 'allowance',
      category VARCHAR(30) DEFAULT 'fixed',
      calculation_type VARCHAR(30) DEFAULT 'fixed',
      default_amount DECIMAL(15,2) DEFAULT 0,
      percentage_base VARCHAR(30),
      percentage_value DECIMAL(8,4),
      formula TEXT,
      is_taxable BOOLEAN DEFAULT true,
      is_mandatory BOOLEAN DEFAULT false,
      applies_to_pay_types JSONB DEFAULT '["monthly"]',
      applicable_departments JSONB DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ payroll_components');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_salaries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      pay_type VARCHAR(20) DEFAULT 'monthly',
      base_salary DECIMAL(15,2) DEFAULT 0,
      hourly_rate DECIMAL(15,2) DEFAULT 0,
      daily_rate DECIMAL(15,2) DEFAULT 0,
      weekly_hours INTEGER DEFAULT 40,
      overtime_rate_multiplier DECIMAL(4,2) DEFAULT 1.5,
      overtime_holiday_multiplier DECIMAL(4,2) DEFAULT 2.0,
      tax_status VARCHAR(10) DEFAULT 'TK/0',
      tax_method VARCHAR(20) DEFAULT 'gross_up',
      bank_name VARCHAR(50),
      bank_account_number VARCHAR(30),
      bank_account_name VARCHAR(100),
      bpjs_kesehatan_number VARCHAR(30),
      bpjs_ketenagakerjaan_number VARCHAR(30),
      npwp VARCHAR(30),
      is_active BOOLEAN DEFAULT true,
      start_date DATE DEFAULT CURRENT_DATE,
      end_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_salaries');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_salary_components (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_salary_id UUID REFERENCES employee_salaries(id) ON DELETE CASCADE,
      component_id UUID REFERENCES payroll_components(id) ON DELETE CASCADE,
      amount DECIMAL(15,2) DEFAULT 0,
      percentage DECIMAL(8,4),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_salary_components');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      run_code VARCHAR(30) NOT NULL,
      name VARCHAR(100),
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      pay_date DATE,
      pay_type VARCHAR(20) DEFAULT 'monthly',
      branch_id UUID,
      department VARCHAR(50),
      status VARCHAR(20) DEFAULT 'draft',
      total_gross DECIMAL(15,2) DEFAULT 0,
      total_deductions DECIMAL(15,2) DEFAULT 0,
      total_net DECIMAL(15,2) DEFAULT 0,
      employee_count INTEGER DEFAULT 0,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ payroll_runs');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payroll_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      employee_salary_id UUID,
      working_days INTEGER DEFAULT 0,
      present_days INTEGER DEFAULT 0,
      absent_days INTEGER DEFAULT 0,
      overtime_hours DECIMAL(6,2) DEFAULT 0,
      base_salary DECIMAL(15,2) DEFAULT 0,
      total_allowances DECIMAL(15,2) DEFAULT 0,
      total_deductions DECIMAL(15,2) DEFAULT 0,
      overtime_amount DECIMAL(15,2) DEFAULT 0,
      gross_salary DECIMAL(15,2) DEFAULT 0,
      tax_amount DECIMAL(15,2) DEFAULT 0,
      net_salary DECIMAL(15,2) DEFAULT 0,
      components JSONB DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'calculated',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ payroll_items');

  // ================================================================
  // 6. KPI & PERFORMANCE TABLES
  // ================================================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_kpis (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
      period VARCHAR(7) NOT NULL,
      metric_name VARCHAR(200) NOT NULL,
      category VARCHAR(30) DEFAULT 'operations',
      target DECIMAL(15,2) NOT NULL,
      actual DECIMAL(15,2) DEFAULT 0,
      unit VARCHAR(20) DEFAULT '%',
      weight INTEGER DEFAULT 100,
      status VARCHAR(30) DEFAULT 'pending',
      notes TEXT,
      reviewed_by UUID,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_kpis');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS kpi_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(30) DEFAULT 'operations',
      unit VARCHAR(20) DEFAULT '%',
      data_type VARCHAR(20) DEFAULT 'number',
      formula_type VARCHAR(30) DEFAULT 'actual_vs_target',
      formula TEXT,
      default_weight INTEGER DEFAULT 100,
      measurement_frequency VARCHAR(20) DEFAULT 'monthly',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ kpi_templates');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS performance_reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      reviewer_id INTEGER,
      period VARCHAR(20) NOT NULL,
      overall_score DECIMAL(4,2),
      status VARCHAR(20) DEFAULT 'draft',
      strengths JSONB DEFAULT '[]',
      areas_for_improvement JSONB DEFAULT '[]',
      goals JSONB DEFAULT '[]',
      comments TEXT,
      submitted_at TIMESTAMPTZ,
      reviewed_at TIMESTAMPTZ,
      acknowledged_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ performance_reviews');

  // ================================================================
  // 7. HRIS RECRUITMENT TABLES
  // ================================================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_job_openings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      branch_id UUID,
      title VARCHAR(200) NOT NULL,
      department VARCHAR(100) NOT NULL,
      location VARCHAR(200),
      employment_type VARCHAR(30) DEFAULT 'full_time',
      status VARCHAR(20) DEFAULT 'open',
      priority VARCHAR(20) DEFAULT 'medium',
      salary_min DECIMAL(15,2) DEFAULT 0,
      salary_max DECIMAL(15,2) DEFAULT 0,
      applicants INTEGER DEFAULT 0,
      description TEXT,
      requirements TEXT,
      posted_date DATE DEFAULT CURRENT_DATE,
      deadline DATE,
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hris_job_openings');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_candidates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      job_opening_id UUID REFERENCES hris_job_openings(id) ON DELETE SET NULL,
      full_name VARCHAR(200) NOT NULL,
      email VARCHAR(200),
      phone VARCHAR(30),
      current_stage VARCHAR(30) DEFAULT 'applied',
      status VARCHAR(20) DEFAULT 'active',
      source VARCHAR(50),
      rating INTEGER DEFAULT 0,
      experience_summary TEXT,
      education_level VARCHAR(50),
      applied_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      resume_url TEXT,
      metadata JSONB DEFAULT '{}',
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hris_candidates');

  // ================================================================
  // 8. HRIS TRAINING TABLES
  // ================================================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_training_programs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(50) DEFAULT 'technical',
      training_type VARCHAR(50) DEFAULT 'training',
      trainer_name VARCHAR(200),
      location VARCHAR(200),
      status VARCHAR(20) DEFAULT 'upcoming',
      start_date DATE,
      end_date DATE,
      max_participants INTEGER DEFAULT 30,
      current_participants INTEGER DEFAULT 0,
      cost_per_person DECIMAL(15,2) DEFAULT 0,
      rating DECIMAL(3,1) DEFAULT 0,
      description TEXT,
      metadata JSONB DEFAULT '{}',
      created_by UUID,
      updated_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hris_training_programs');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_training_enrollments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      training_program_id UUID REFERENCES hris_training_programs(id) ON DELETE CASCADE,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'enrolled',
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      completion_date DATE,
      score DECIMAL(5,2),
      feedback TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hris_training_enrollments');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_certifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      certification_name VARCHAR(200) NOT NULL,
      issuing_organization VARCHAR(200),
      issued_date DATE,
      expiry_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      credential_id VARCHAR(100),
      document_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ hris_certifications');

  // ================================================================
  // 9. ATTENDANCE TABLES
  // ================================================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_attendances (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      branch_id UUID,
      attendance_date DATE NOT NULL,
      check_in TIMESTAMPTZ,
      check_out TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'present',
      late_minutes INTEGER DEFAULT 0,
      early_leave_minutes INTEGER DEFAULT 0,
      overtime_minutes INTEGER DEFAULT 0,
      shift_type VARCHAR(20),
      notes TEXT,
      check_in_location JSONB,
      check_out_location JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_attendances');

  // ================================================================
  // 10. MUTATIONS & CLAIMS
  // ================================================================
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_mutations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      mutation_type VARCHAR(30) NOT NULL DEFAULT 'transfer',
      mutation_number VARCHAR(50),
      effective_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      from_branch_id UUID, from_department VARCHAR(50), from_position VARCHAR(100),
      to_branch_id UUID, to_department VARCHAR(50), to_position VARCHAR(100),
      salary_change DECIMAL(15,2) DEFAULT 0,
      new_salary DECIMAL(15,2),
      reason TEXT, notes TEXT, document_url TEXT,
      requested_by UUID,
      current_approval_step INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_mutations');

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
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_claims');

  // ================================================================
  // 11. INDEXES
  // ================================================================
  console.log('\nCreating indexes...');
  const idx = async (table, cols, name) => {
    try { await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_${name} ON ${table} (${cols})`); } catch(e) {}
  };
  await idx('employees', 'tenant_id', 'emp_tenant');
  await idx('employees', 'branch_id', 'emp_branch');
  await idx('employees', 'department', 'emp_dept');
  await idx('employees', 'status', 'emp_status');
  await idx('employee_families', 'employee_id', 'fam_emp');
  await idx('employee_educations', 'employee_id', 'edu_emp');
  await idx('employee_certifications', 'employee_id', 'cert_emp');
  await idx('employee_skills', 'employee_id', 'skill_emp');
  await idx('employee_work_experiences', 'employee_id', 'workexp_emp');
  await idx('employee_documents', 'employee_id', 'doc_emp');
  await idx('employee_contracts', 'employee_id', 'contract_emp');
  await idx('leave_requests', 'employee_id', 'lr_emp');
  await idx('leave_requests', 'status', 'lr_status');
  await idx('leave_balances', 'employee_id', 'lb_emp');
  await idx('employee_kpis', 'employee_id', 'kpi_emp');
  await idx('employee_kpis', 'period', 'kpi_period');
  await idx('employee_kpis', 'branch_id', 'kpi_branch');
  await idx('employee_attendances', 'employee_id', 'att_emp');
  await idx('employee_attendances', 'attendance_date', 'att_date');
  await idx('hris_job_openings', 'tenant_id', 'jo_tenant');
  await idx('hris_job_openings', 'status', 'jo_status');
  await idx('hris_candidates', 'tenant_id', 'cand_tenant');
  await idx('hris_candidates', 'job_opening_id', 'cand_jo');
  await idx('hris_training_programs', 'tenant_id', 'tp_tenant');
  await idx('hris_certifications', 'employee_id', 'hcert_emp');
  console.log('  ✓ Indexes created');

  // ================================================================
  // 12. SEED: Sample employees (so forms work immediately)
  // ================================================================
  console.log('\nSeeding sample data...');
  const [existEmp] = await sequelize.query(`SELECT COUNT(*) as cnt FROM employees`);
  if (parseInt(existEmp[0].cnt) === 0) {
    // Get first tenant and branch
    const [tenants] = await sequelize.query(`SELECT id FROM tenants LIMIT 1`);
    const [branches] = await sequelize.query(`SELECT id FROM branches LIMIT 1`);
    const tid = tenants[0]?.id || null;
    const bid = branches[0]?.id || null;

    const emps = [
      { eid: 'EMP001', name: 'Ahmad Wijaya', email: 'ahmad@bedagang.com', pos: 'Branch Manager', dept: 'OPERATIONS' },
      { eid: 'EMP002', name: 'Siti Rahayu', email: 'siti@bedagang.com', pos: 'Kasir Senior', dept: 'SALES' },
      { eid: 'EMP003', name: 'Budi Santoso', email: 'budi@bedagang.com', pos: 'Staff Gudang', dept: 'WAREHOUSE' },
      { eid: 'EMP004', name: 'Dewi Lestari', email: 'dewi@bedagang.com', pos: 'Admin Finance', dept: 'FINANCE' },
      { eid: 'EMP005', name: 'Eko Prasetyo', email: 'eko@bedagang.com', pos: 'IT Support', dept: 'IT' },
    ];
    for (const e of emps) {
      await sequelize.query(`
        INSERT INTO employees (employee_id, name, email, position, department, branch_id, tenant_id, status, work_location, role, join_date)
        VALUES (:eid, :name, :email, :pos, :dept, :bid, :tid, 'ACTIVE', 'ADMIN_OFFICE', 'STAFF', CURRENT_DATE - INTERVAL '180 days')
      `, { replacements: { ...e, tid, bid } });
    }
    console.log('  ✓ 5 sample employees created');
  }

  // Seed leave types
  const [existLT] = await sequelize.query(`SELECT COUNT(*) as cnt FROM leave_types`);
  if (parseInt(existLT[0].cnt) === 0) {
    const types = [
      { code: 'annual', name: 'Cuti Tahunan', cat: 'regular', days: 12, color: '#3B82F6', icon: 'calendar' },
      { code: 'sick', name: 'Sakit', cat: 'medical', days: 14, color: '#EF4444', icon: 'heart' },
      { code: 'maternity', name: 'Melahirkan', cat: 'special', days: 90, color: '#EC4899', icon: 'baby' },
      { code: 'personal', name: 'Keperluan Pribadi', cat: 'regular', days: 3, color: '#F59E0B', icon: 'coffee' },
      { code: 'marriage', name: 'Pernikahan', cat: 'special', days: 3, color: '#F43F5E', icon: 'heart' },
      { code: 'bereavement', name: 'Duka Cita', cat: 'special', days: 3, color: '#6B7280', icon: 'heart' },
      { code: 'unpaid', name: 'Tanpa Gaji', cat: 'unpaid', days: 30, color: '#9CA3AF', icon: 'user-x' },
    ];
    for (const t of types) {
      await sequelize.query(`
        INSERT INTO leave_types (code, name, category, max_days_per_year, color, icon, is_active, sort_order)
        VALUES (:code, :name, :cat, :days, :color, :icon, true, :order)
      `, { replacements: { ...t, order: types.indexOf(t) + 1 } });
    }
    console.log('  ✓ 7 leave types seeded');
  }

  // Seed job grades
  const [existJG] = await sequelize.query(`SELECT COUNT(*) as cnt FROM job_grades`);
  if (parseInt(existJG[0].cnt) === 0) {
    const grades = [
      { code: 'G1', name: 'Staff Junior', level: 1, min: 3000000, max: 5000000 },
      { code: 'G2', name: 'Staff', level: 2, min: 4500000, max: 7000000 },
      { code: 'G3', name: 'Staff Senior', level: 3, min: 6000000, max: 10000000 },
      { code: 'G4', name: 'Supervisor', level: 4, min: 8000000, max: 14000000 },
      { code: 'G5', name: 'Manager', level: 5, min: 14000000, max: 25000000 },
    ];
    for (const g of grades) {
      await sequelize.query(`
        INSERT INTO job_grades (code, name, level, min_salary, max_salary, sort_order, benefits, leave_quota)
        VALUES (:code, :name, :level, :min, :max, :level, '[]', '{}')
      `, { replacements: g });
    }
    console.log('  ✓ 5 job grades seeded');
  }

  // Seed payroll components
  const [existPC] = await sequelize.query(`SELECT COUNT(*) as cnt FROM payroll_components`);
  if (parseInt(existPC[0].cnt) === 0) {
    const comps = [
      { code: 'BASE', name: 'Gaji Pokok', type: 'earning', cat: 'fixed' },
      { code: 'TRANSP', name: 'Tunjangan Transportasi', type: 'allowance', cat: 'fixed' },
      { code: 'MEAL', name: 'Tunjangan Makan', type: 'allowance', cat: 'fixed' },
      { code: 'BPJS_KES', name: 'BPJS Kesehatan', type: 'deduction', cat: 'statutory' },
      { code: 'BPJS_TK', name: 'BPJS Ketenagakerjaan', type: 'deduction', cat: 'statutory' },
      { code: 'PPH21', name: 'PPh 21', type: 'deduction', cat: 'tax' },
    ];
    for (let i = 0; i < comps.length; i++) {
      await sequelize.query(`
        INSERT INTO payroll_components (code, name, type, category, sort_order, is_active)
        VALUES (:code, :name, :type, :cat, :order, true)
      `, { replacements: { ...comps[i], order: i + 1 } });
    }
    console.log('  ✓ 6 payroll components seeded');
  }

  // Seed KPI templates
  const [existKT] = await sequelize.query(`SELECT COUNT(*) as cnt FROM kpi_templates`);
  if (parseInt(existKT[0].cnt) === 0) {
    const tpls = [
      { code: 'SALES_REV', name: 'Revenue Penjualan', cat: 'sales', unit: 'IDR' },
      { code: 'SALES_TXN', name: 'Jumlah Transaksi', cat: 'sales', unit: 'transaksi' },
      { code: 'CUST_SAT', name: 'Kepuasan Pelanggan', cat: 'customer', unit: '%' },
      { code: 'OPS_STOCK', name: 'Akurasi Stok', cat: 'operations', unit: '%' },
      { code: 'OPS_SLA', name: 'SLA Pelayanan', cat: 'operations', unit: 'menit' },
    ];
    for (const t of tpls) {
      await sequelize.query(`
        INSERT INTO kpi_templates (code, name, category, unit, is_active)
        VALUES (:code, :name, :cat, :unit, true)
      `, { replacements: t });
    }
    console.log('  ✓ 5 KPI templates seeded');
  }

  console.log('\n✅ HRIS Database Setup Complete!');
  console.log('Tables created: employees, employee_families, employee_educations,');
  console.log('  employee_certifications, employee_skills, employee_work_experiences,');
  console.log('  employee_documents, employee_contracts, org_structures, job_grades,');
  console.log('  leave_types, leave_approval_configs, leave_requests, leave_approval_steps,');
  console.log('  leave_balances, payroll_components, employee_salaries, employee_salary_components,');
  console.log('  payroll_runs, payroll_items, employee_kpis, kpi_templates, performance_reviews,');
  console.log('  hris_job_openings, hris_candidates, hris_training_programs,');
  console.log('  hris_training_enrollments, hris_certifications, employee_attendances,');
  console.log('  employee_mutations, employee_claims');

  await sequelize.close();
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });

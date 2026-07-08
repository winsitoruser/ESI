#!/usr/bin/env node
/** Create missing Humanify tables on fresh VPS DB (UUID employee FKs) */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('127.0.0.1') || DATABASE_URL.includes('localhost')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function q(sql) {
  await sequelize.query(sql);
}

async function run() {
  await sequelize.authenticate();
  await q('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ── Attendance devices & settings ──
  await q(`
    CREATE TABLE IF NOT EXISTS attendance_devices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
      device_name VARCHAR(255) NOT NULL,
      device_type VARCHAR(50) NOT NULL DEFAULT 'fingerprint',
      device_brand VARCHAR(100), device_model VARCHAR(100),
      serial_number VARCHAR(100) UNIQUE,
      ip_address VARCHAR(45), port INTEGER DEFAULT 4370,
      communication_key VARCHAR(100), connection_type VARCHAR(30) DEFAULT 'tcp',
      api_endpoint VARCHAR(500), api_key VARCHAR(255), webhook_secret VARCHAR(255),
      sync_mode VARCHAR(30) DEFAULT 'push', sync_interval INTEGER DEFAULT 5,
      last_sync_at TIMESTAMPTZ, last_sync_status VARCHAR(30), last_sync_message TEXT,
      total_synced INTEGER DEFAULT 0, registered_users INTEGER DEFAULT 0,
      max_capacity INTEGER, firmware_version VARCHAR(50), location VARCHAR(255),
      status VARCHAR(30) DEFAULT 'active', is_online BOOLEAN DEFAULT false,
      last_heartbeat_at TIMESTAMPTZ, settings JSONB DEFAULT '{}', notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS attendance_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
      work_start_time TIME DEFAULT '08:00', work_end_time TIME DEFAULT '17:00',
      break_start_time TIME, break_end_time TIME, break_duration_minutes INTEGER DEFAULT 60,
      work_days JSONB DEFAULT '["mon","tue","wed","thu","fri"]',
      late_grace_minutes INTEGER DEFAULT 15, early_leave_grace_minutes INTEGER DEFAULT 15,
      auto_absent_after_minutes INTEGER DEFAULT 120,
      overtime_enabled BOOLEAN DEFAULT true, overtime_min_minutes INTEGER DEFAULT 60,
      overtime_requires_approval BOOLEAN DEFAULT true,
      gps_attendance_enabled BOOLEAN DEFAULT false, geo_fence_radius INTEGER DEFAULT 100,
      require_selfie BOOLEAN DEFAULT false, allow_outside_geofence BOOLEAN DEFAULT false,
      fingerprint_enabled BOOLEAN DEFAULT true, auto_process_device_logs BOOLEAN DEFAULT true,
      punch_type_detection VARCHAR(30) DEFAULT 'auto',
      annual_leave_quota INTEGER DEFAULT 12, sick_leave_quota INTEGER DEFAULT 12,
      leave_requires_approval BOOLEAN DEFAULT true,
      notify_late_to_manager BOOLEAN DEFAULT true, notify_absent_to_manager BOOLEAN DEFAULT true,
      notify_overtime_to_hr BOOLEAN DEFAULT true,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ attendance_devices, attendance_settings');

  // ── Contract reminders ──
  await q(`
    CREATE TABLE IF NOT EXISTS contract_reminders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, reminder_type VARCHAR(30) NOT NULL,
      reference_id UUID NOT NULL, reference_table VARCHAR(50) NOT NULL,
      employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
      title VARCHAR(200) NOT NULL, description TEXT,
      due_date DATE NOT NULL,
      reminder_days_before INTEGER[] DEFAULT '{30,14,7,1}',
      last_notified_at TIMESTAMPTZ, status VARCHAR(20) DEFAULT 'active',
      is_dismissed BOOLEAN DEFAULT false, dismissed_by UUID, dismissed_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ contract_reminders');

  // ── IR module ──
  const irTables = [
    `CREATE TABLE IF NOT EXISTS company_regulations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      title VARCHAR(200) NOT NULL, regulation_number VARCHAR(50), category VARCHAR(50) DEFAULT 'company_rule',
      description TEXT, content TEXT, effective_date DATE, expiry_date DATE, document_url TEXT,
      status VARCHAR(20) DEFAULT 'draft', version INTEGER DEFAULT 1, parent_regulation_id UUID,
      approved_by INTEGER, approved_at TIMESTAMPTZ,
      applicable_departments JSONB DEFAULT '[]', applicable_branches JSONB DEFAULT '[]', tags JSONB DEFAULT '[]',
      created_by INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS warning_letters (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      employee_id UUID REFERENCES employees(id), warning_type VARCHAR(10) NOT NULL DEFAULT 'SP1',
      letter_number VARCHAR(50), issue_date DATE NOT NULL, expiry_date DATE,
      violation_type VARCHAR(50) DEFAULT 'discipline', violation_description TEXT NOT NULL,
      regulation_id UUID, previous_warning_id UUID, issued_by INTEGER,
      acknowledged BOOLEAN DEFAULT false, acknowledged_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'active', attachments JSONB DEFAULT '[]', notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ir_cases (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      case_number VARCHAR(50), title VARCHAR(200) NOT NULL, case_type VARCHAR(50) DEFAULT 'disciplinary',
      employee_id UUID REFERENCES employees(id), description TEXT, status VARCHAR(20) DEFAULT 'open',
      priority VARCHAR(20) DEFAULT 'medium', assigned_to INTEGER, opened_date DATE DEFAULT CURRENT_DATE,
      closed_date DATE, resolution TEXT, evidence JSONB DEFAULT '[]', witnesses JSONB DEFAULT '[]',
      created_by INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS termination_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      employee_id UUID REFERENCES employees(id), termination_type VARCHAR(30) DEFAULT 'resignation',
      request_date DATE DEFAULT CURRENT_DATE, effective_date DATE,
      reason TEXT, status VARCHAR(30) DEFAULT 'pending_approval',
      approved_by INTEGER, approved_at TIMESTAMPTZ, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS compliance_checklists (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      name VARCHAR(200) NOT NULL, category VARCHAR(50), description TEXT,
      status VARCHAR(20) DEFAULT 'pending', period VARCHAR(20) DEFAULT 'annual',
      items JSONB DEFAULT '[]', due_date DATE, completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];
  for (const sql of irTables) await q(sql);
  console.log('✓ industrial relations tables');

  // ── Engagement ──
  await q(`
    CREATE TABLE IF NOT EXISTS surveys (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      title VARCHAR(200) NOT NULL, description TEXT, survey_type VARCHAR(30) DEFAULT 'engagement',
      status VARCHAR(20) DEFAULT 'draft', is_anonymous BOOLEAN DEFAULT true,
      questions JSONB DEFAULT '[]', target_audience VARCHAR(30) DEFAULT 'all',
      start_date DATE, end_date DATE, created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
      employee_id UUID REFERENCES employees(id), respondent_id INTEGER,
      answers JSONB DEFAULT '[]', submitted_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS recognitions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      giver_id INTEGER, receiver_id UUID REFERENCES employees(id),
      recognition_type VARCHAR(30) DEFAULT 'peer', title VARCHAR(200), message TEXT,
      points INTEGER DEFAULT 0, is_public BOOLEAN DEFAULT true, status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS announcements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      title VARCHAR(200) NOT NULL, content TEXT, category VARCHAR(30) DEFAULT 'general',
      priority VARCHAR(20) DEFAULT 'normal', status VARCHAR(20) DEFAULT 'draft',
      publish_date TIMESTAMPTZ, expire_date TIMESTAMPTZ, is_pinned BOOLEAN DEFAULT false,
      target_audience VARCHAR(30) DEFAULT 'all', view_count INTEGER DEFAULT 0,
      created_by INTEGER, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ engagement tables');

  // Align engagement tables with Sequelize models (idempotent)
  await q(`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false`);
  await q(`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS target_departments JSONB DEFAULT '[]'`);
  await q(`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS target_positions JSONB DEFAULT '[]'`);
  await q(`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS target_branches JSONB DEFAULT '[]'`);
  await q(`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0`);
  await q(`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false`);
  await q(`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS reminder_frequency VARCHAR(20) DEFAULT 'weekly'`);
  await q(`ALTER TABLE recognitions ADD COLUMN IF NOT EXISTS from_employee_id INTEGER`);
  await q(`ALTER TABLE recognitions ADD COLUMN IF NOT EXISTS to_employee_id INTEGER`);
  await q(`ALTER TABLE recognitions ADD COLUMN IF NOT EXISTS badge VARCHAR(50)`);
  await q(`ALTER TABLE recognitions ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general'`);
  await q(`ALTER TABLE recognitions ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0`);
  await q(`ALTER TABLE recognitions ADD COLUMN IF NOT EXISTS liked_by JSONB DEFAULT '[]'`);
  await q(`ALTER TABLE recognitions ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true`);
  await q(`UPDATE recognitions SET from_employee_id = giver_id WHERE from_employee_id IS NULL AND giver_id IS NOT NULL`);
  console.log('✓ engagement schema aligned');

  // ── Travel ──
  await q(`
    CREATE TABLE IF NOT EXISTS travel_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      employee_id UUID REFERENCES employees(id), request_number VARCHAR(50),
      destination VARCHAR(200), purpose TEXT, start_date DATE, end_date DATE,
      estimated_budget DECIMAL(15,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'draft',
      approved_by INTEGER, approved_at TIMESTAMPTZ, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS travel_expenses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), travel_request_id UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
      employee_id UUID REFERENCES employees(id), expense_date DATE, category VARCHAR(50),
      description TEXT, amount DECIMAL(15,2) DEFAULT 0, currency VARCHAR(10) DEFAULT 'IDR',
      receipt_url TEXT, status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS expense_budgets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      department VARCHAR(100), branch_id UUID, category VARCHAR(50) DEFAULT 'travel',
      fiscal_year INTEGER NOT NULL, monthly_limit DECIMAL(15,2) DEFAULT 0,
      annual_limit DECIMAL(15,2) DEFAULT 0, used_amount DECIMAL(15,2) DEFAULT 0,
      remaining_amount DECIMAL(15,2) DEFAULT 0, currency VARCHAR(10) DEFAULT 'IDR',
      is_active BOOLEAN DEFAULT true, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ travel tables');

  // ── Projects ──
  await q(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID,
      project_code VARCHAR(50), name VARCHAR(200) NOT NULL, description TEXT,
      client_name VARCHAR(200), client_contact VARCHAR(200), location VARCHAR(200),
      start_date DATE, end_date DATE, actual_end_date DATE, status VARCHAR(20) DEFAULT 'planning',
      budget_amount DECIMAL(15,2) DEFAULT 0, actual_cost DECIMAL(15,2) DEFAULT 0,
      budget_currency VARCHAR(10) DEFAULT 'IDR', project_manager_id INTEGER,
      department VARCHAR(100), industry VARCHAR(50), contract_number VARCHAR(100),
      contract_value DECIMAL(15,2) DEFAULT 0, completion_percent DECIMAL(5,2) DEFAULT 0,
      priority VARCHAR(20) DEFAULT 'medium', tags JSONB DEFAULT '[]', milestones JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS project_workers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), project_id UUID NOT NULL,
      employee_id UUID NOT NULL, role VARCHAR(100),
      assignment_start DATE, assignment_end DATE,
      daily_rate DECIMAL(15,2) DEFAULT 0, hourly_rate DECIMAL(15,2) DEFAULT 0,
      allocation_percent DECIMAL(5,2) DEFAULT 100, status VARCHAR(20) DEFAULT 'active',
      worker_type VARCHAR(30) DEFAULT 'permanent', contract_id UUID, contract_number VARCHAR(100),
      skills JSONB DEFAULT '[]', notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(project_id, employee_id)
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS project_timesheets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), project_id UUID NOT NULL,
      employee_id UUID NOT NULL, timesheet_date DATE NOT NULL,
      hours_worked DECIMAL(5,2) DEFAULT 0, overtime_hours DECIMAL(5,2) DEFAULT 0,
      activity_description TEXT, task_category VARCHAR(50), location VARCHAR(200),
      status VARCHAR(20) DEFAULT 'draft', approved_by INTEGER, approved_at TIMESTAMPTZ, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS project_payroll (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), project_id UUID NOT NULL,
      employee_id UUID NOT NULL, period_start DATE NOT NULL, period_end DATE NOT NULL,
      regular_hours DECIMAL(7,2) DEFAULT 0, overtime_hours DECIMAL(7,2) DEFAULT 0,
      daily_rate DECIMAL(15,2) DEFAULT 0, overtime_rate DECIMAL(15,2) DEFAULT 0,
      days_worked INTEGER DEFAULT 0, gross_amount DECIMAL(15,2) DEFAULT 0,
      deductions DECIMAL(15,2) DEFAULT 0, allowances DECIMAL(15,2) DEFAULT 0,
      net_amount DECIMAL(15,2) DEFAULT 0, currency VARCHAR(10) DEFAULT 'IDR',
      status VARCHAR(20) DEFAULT 'draft', approved_by INTEGER, approved_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ, payment_ref VARCHAR(100), notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ project tables');

  // ── Default tenant for superadmin ──
  const [[tenant]] = await sequelize.query(`SELECT id FROM tenants LIMIT 1`);
  let tenantId = tenant?.id;
  if (!tenantId) {
    const [[row]] = await sequelize.query(`
      INSERT INTO tenants (id, name, code, status, is_active, created_at, updated_at)
      VALUES (uuid_generate_v4(), 'Naincode HQ', 'NAINCODE', 'active', true, NOW(), NOW())
      RETURNING id
    `);
    tenantId = row.id;
    console.log('✓ created default tenant');
  }
  await sequelize.query(`UPDATE users SET tenant_id = :tid WHERE email = 'superadmin@bedagang.com' AND tenant_id IS NULL`, {
    replacements: { tid: tenantId },
  });
  console.log('✓ linked superadmin to tenant');

  await sequelize.query(`UPDATE employees SET tenant_id = :tid WHERE tenant_id IS NULL`, {
    replacements: { tid: tenantId },
  });
  console.log('✓ linked employees to tenant');

  await sequelize.query(`ALTER TABLE pjm_resources ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);

  // ── Seed minimal demo data ──
  const [[regCount]] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM company_regulations`);
  if (regCount.c === 0) {
    await sequelize.query(`
      INSERT INTO company_regulations (id, tenant_id, regulation_number, title, category, status, effective_date)
      VALUES (uuid_generate_v4(), :tid, 'REG-001', 'Peraturan Perusahaan', 'company_rule', 'active', CURRENT_DATE)
    `, { replacements: { tid: tenantId } });
  }
  const [[svCount]] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM surveys`);
  if (svCount.c === 0) {
    await sequelize.query(`
      INSERT INTO surveys (id, tenant_id, title, survey_type, status, is_anonymous, questions)
      VALUES (uuid_generate_v4(), :tid, 'Employee Engagement Survey', 'engagement', 'draft', true, '[]')
    `, { replacements: { tid: tenantId } });
  }

  console.log('\n✅ Humanify VPS dependencies ready');
  await sequelize.close();
}

run().catch((e) => { console.error(e); process.exit(1); });

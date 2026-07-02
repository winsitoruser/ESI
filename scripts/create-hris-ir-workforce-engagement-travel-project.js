/**
 * HRIS Migration: 5 Major Modules
 * ================================
 * Module 8:  Industrial Relations & Legal Compliance
 * Module 10: Workforce Planning & Analytics
 * Module 11: Employee Engagement & Culture
 * Module 13: Travel & Expense Management
 * Module 14: Project & Contract Worker Management
 *
 * Tables created (18):
 * IR: company_regulations, warning_letters, ir_cases, termination_requests, compliance_checklists
 * Workforce: headcount_plans, manpower_budgets
 * Engagement: surveys, survey_responses, recognitions, announcements
 * Travel: travel_requests, travel_expenses, expense_budgets
 * Project: projects, project_workers, project_timesheets, project_payroll
 *
 * Integration points:
 * - audit_logs (existing) for IR audit trail
 * - employee_claims (existing) linked to travel expenses
 * - employee_contracts (existing) linked to project workers
 * - employees.id = INTEGER for all FKs
 */

const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('No DATABASE_URL'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // ========================================
    // MODULE 8: INDUSTRIAL RELATIONS
    // ========================================

    // 1. company_regulations
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS company_regulations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        title VARCHAR(200) NOT NULL,
        regulation_number VARCHAR(50),
        category VARCHAR(50) DEFAULT 'company_rule',
        description TEXT,
        content TEXT,
        effective_date DATE,
        expiry_date DATE,
        document_url TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        version INTEGER DEFAULT 1,
        parent_regulation_id UUID,
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        applicable_departments JSONB DEFAULT '[]',
        applicable_branches JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created company_regulations');

    // 2. warning_letters (SP1/SP2/SP3)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS warning_letters (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        employee_id INTEGER NOT NULL,
        warning_type VARCHAR(10) NOT NULL DEFAULT 'SP1',
        letter_number VARCHAR(50),
        issue_date DATE NOT NULL,
        expiry_date DATE,
        violation_type VARCHAR(50) DEFAULT 'discipline',
        violation_description TEXT NOT NULL,
        regulation_id UUID,
        previous_warning_id UUID,
        issued_by INTEGER,
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'active',
        attachments JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created warning_letters');

    // 3. ir_cases (investigation/disputes)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ir_cases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        case_number VARCHAR(50),
        title VARCHAR(200) NOT NULL,
        category VARCHAR(50) DEFAULT 'misconduct',
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(30) DEFAULT 'open',
        reported_by INTEGER,
        reported_date DATE NOT NULL,
        involved_employees JSONB DEFAULT '[]',
        description TEXT,
        investigation_notes TEXT,
        resolution TEXT,
        resolution_date DATE,
        investigator_id INTEGER,
        hearing_date TIMESTAMPTZ,
        hearing_notes TEXT,
        actions_taken JSONB DEFAULT '[]',
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created ir_cases');

    // 4. termination_requests (PHK workflow)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS termination_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        employee_id INTEGER NOT NULL,
        termination_type VARCHAR(30) NOT NULL DEFAULT 'resignation',
        reason TEXT NOT NULL,
        effective_date DATE,
        notice_date DATE,
        notice_period_days INTEGER DEFAULT 30,
        last_working_day DATE,
        severance_amount DECIMAL(15,2) DEFAULT 0,
        compensation_details JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'draft',
        requested_by INTEGER,
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        exit_interview_done BOOLEAN DEFAULT false,
        exit_interview_notes TEXT,
        exit_interview_date DATE,
        clearance_status JSONB DEFAULT '{"it": false, "finance": false, "hr": false, "assets": false, "admin": false}',
        final_settlement JSONB DEFAULT '{}',
        related_warning_ids JSONB DEFAULT '[]',
        related_case_id UUID,
        attachments JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created termination_requests');

    // 5. compliance_checklists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS compliance_checklists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(50) DEFAULT 'labor_law',
        description TEXT,
        items JSONB DEFAULT '[]',
        due_date DATE,
        responsible_id INTEGER,
        reviewer_id INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        completion_percent DECIMAL(5,2) DEFAULT 0,
        completed_at TIMESTAMPTZ,
        period VARCHAR(20) DEFAULT 'annual',
        fiscal_year INTEGER,
        branch_id UUID,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created compliance_checklists');

    // ========================================
    // MODULE 10: WORKFORCE PLANNING & ANALYTICS
    // ========================================

    // 6. headcount_plans
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS headcount_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        name VARCHAR(200) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        department VARCHAR(100),
        branch_id UUID,
        current_headcount INTEGER DEFAULT 0,
        planned_headcount INTEGER DEFAULT 0,
        approved_headcount INTEGER,
        budget_amount DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'draft',
        justification TEXT,
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        details JSONB DEFAULT '[]',
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created headcount_plans');

    // 7. manpower_budgets
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS manpower_budgets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        fiscal_year INTEGER NOT NULL,
        department VARCHAR(100),
        branch_id UUID,
        budget_category VARCHAR(50) DEFAULT 'salary',
        planned_amount DECIMAL(15,2) DEFAULT 0,
        actual_amount DECIMAL(15,2) DEFAULT 0,
        variance DECIMAL(15,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'IDR',
        status VARCHAR(20) DEFAULT 'draft',
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        notes TEXT,
        breakdown JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created manpower_budgets');

    // ========================================
    // MODULE 11: EMPLOYEE ENGAGEMENT & CULTURE
    // ========================================

    // 8. surveys
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        survey_type VARCHAR(30) DEFAULT 'engagement',
        status VARCHAR(20) DEFAULT 'draft',
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        is_anonymous BOOLEAN DEFAULT true,
        is_mandatory BOOLEAN DEFAULT false,
        target_departments JSONB DEFAULT '[]',
        target_positions JSONB DEFAULT '[]',
        target_branches JSONB DEFAULT '[]',
        questions JSONB DEFAULT '[]',
        created_by INTEGER,
        total_responses INTEGER DEFAULT 0,
        reminder_enabled BOOLEAN DEFAULT false,
        reminder_frequency VARCHAR(20) DEFAULT 'weekly',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created surveys');

    // 9. survey_responses
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        survey_id UUID NOT NULL,
        employee_id INTEGER,
        answers JSONB DEFAULT '[]',
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        is_anonymous BOOLEAN DEFAULT true,
        completion_time_minutes INTEGER,
        feedback TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created survey_responses');

    // 10. recognitions
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS recognitions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        from_employee_id INTEGER NOT NULL,
        to_employee_id INTEGER NOT NULL,
        recognition_type VARCHAR(30) DEFAULT 'kudos',
        title VARCHAR(200),
        message TEXT,
        points INTEGER DEFAULT 0,
        badge VARCHAR(50),
        category VARCHAR(50) DEFAULT 'general',
        is_public BOOLEAN DEFAULT true,
        likes_count INTEGER DEFAULT 0,
        liked_by JSONB DEFAULT '[]',
        approved BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created recognitions');

    // 11. announcements
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(30) DEFAULT 'general',
        priority VARCHAR(20) DEFAULT 'normal',
        published_by INTEGER,
        publish_date TIMESTAMPTZ,
        expiry_date TIMESTAMPTZ,
        target_departments JSONB DEFAULT '[]',
        target_branches JSONB DEFAULT '[]',
        target_roles JSONB DEFAULT '[]',
        is_pinned BOOLEAN DEFAULT false,
        attachments JSONB DEFAULT '[]',
        read_by JSONB DEFAULT '[]',
        read_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created announcements');

    // ========================================
    // MODULE 13: TRAVEL & EXPENSE MANAGEMENT
    // ========================================

    // 12. travel_requests
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS travel_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        employee_id INTEGER NOT NULL,
        request_number VARCHAR(50),
        destination VARCHAR(200) NOT NULL,
        departure_city VARCHAR(100),
        purpose TEXT NOT NULL,
        departure_date DATE NOT NULL,
        return_date DATE NOT NULL,
        travel_type VARCHAR(30) DEFAULT 'domestic',
        transportation VARCHAR(30) DEFAULT 'flight',
        accommodation_needed BOOLEAN DEFAULT true,
        hotel_name VARCHAR(200),
        estimated_budget DECIMAL(15,2) DEFAULT 0,
        actual_cost DECIMAL(15,2) DEFAULT 0,
        advance_amount DECIMAL(15,2) DEFAULT 0,
        advance_status VARCHAR(20) DEFAULT 'none',
        currency VARCHAR(10) DEFAULT 'IDR',
        status VARCHAR(20) DEFAULT 'draft',
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        itinerary JSONB DEFAULT '[]',
        companions JSONB DEFAULT '[]',
        project_id UUID,
        department VARCHAR(100),
        attachments JSONB DEFAULT '[]',
        notes TEXT,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created travel_requests');

    // 13. travel_expenses
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS travel_expenses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        travel_request_id UUID,
        employee_id INTEGER NOT NULL,
        expense_date DATE NOT NULL,
        category VARCHAR(50) DEFAULT 'other',
        description TEXT,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'IDR',
        receipt_url TEXT,
        receipt_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'draft',
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        reimbursed_at TIMESTAMPTZ,
        claim_id UUID,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created travel_expenses');

    // 14. expense_budgets
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS expense_budgets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        department VARCHAR(100),
        branch_id UUID,
        category VARCHAR(50) DEFAULT 'travel',
        fiscal_year INTEGER NOT NULL,
        monthly_limit DECIMAL(15,2) DEFAULT 0,
        annual_limit DECIMAL(15,2) DEFAULT 0,
        used_amount DECIMAL(15,2) DEFAULT 0,
        remaining_amount DECIMAL(15,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'IDR',
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created expense_budgets');

    // ========================================
    // MODULE 14: PROJECT & CONTRACT WORKER
    // ========================================

    // 15. projects
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        project_code VARCHAR(50),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        client_name VARCHAR(200),
        client_contact VARCHAR(200),
        location VARCHAR(200),
        start_date DATE,
        end_date DATE,
        actual_end_date DATE,
        status VARCHAR(20) DEFAULT 'planning',
        budget_amount DECIMAL(15,2) DEFAULT 0,
        actual_cost DECIMAL(15,2) DEFAULT 0,
        budget_currency VARCHAR(10) DEFAULT 'IDR',
        project_manager_id INTEGER,
        department VARCHAR(100),
        industry VARCHAR(50),
        contract_number VARCHAR(100),
        contract_value DECIMAL(15,2) DEFAULT 0,
        completion_percent DECIMAL(5,2) DEFAULT 0,
        priority VARCHAR(20) DEFAULT 'medium',
        tags JSONB DEFAULT '[]',
        milestones JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created projects');

    // 16. project_workers
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS project_workers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL,
        employee_id INTEGER NOT NULL,
        role VARCHAR(100),
        assignment_start DATE,
        assignment_end DATE,
        daily_rate DECIMAL(15,2) DEFAULT 0,
        hourly_rate DECIMAL(15,2) DEFAULT 0,
        allocation_percent DECIMAL(5,2) DEFAULT 100,
        status VARCHAR(20) DEFAULT 'active',
        worker_type VARCHAR(30) DEFAULT 'permanent',
        contract_id UUID,
        contract_number VARCHAR(100),
        skills JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(project_id, employee_id)
      );
    `);
    console.log('✅ Created project_workers');

    // 17. project_timesheets
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS project_timesheets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL,
        employee_id INTEGER NOT NULL,
        timesheet_date DATE NOT NULL,
        hours_worked DECIMAL(5,2) DEFAULT 0,
        overtime_hours DECIMAL(5,2) DEFAULT 0,
        activity_description TEXT,
        task_category VARCHAR(50),
        location VARCHAR(200),
        status VARCHAR(20) DEFAULT 'draft',
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created project_timesheets');

    // 18. project_payroll
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS project_payroll (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL,
        employee_id INTEGER NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        regular_hours DECIMAL(7,2) DEFAULT 0,
        overtime_hours DECIMAL(7,2) DEFAULT 0,
        daily_rate DECIMAL(15,2) DEFAULT 0,
        overtime_rate DECIMAL(15,2) DEFAULT 0,
        days_worked INTEGER DEFAULT 0,
        gross_amount DECIMAL(15,2) DEFAULT 0,
        deductions DECIMAL(15,2) DEFAULT 0,
        allowances DECIMAL(15,2) DEFAULT 0,
        net_amount DECIMAL(15,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'IDR',
        status VARCHAR(20) DEFAULT 'draft',
        approved_by INTEGER,
        approved_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        payment_ref VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created project_payroll');

    // ========================================
    // SEED DATA
    // ========================================

    // Seed: Sample company regulations
    const [regCount] = await sequelize.query(`SELECT COUNT(*) as c FROM company_regulations`);
    if (parseInt(regCount[0].c) === 0) {
      const regs = [
        ['REG-001', 'Peraturan Perusahaan', 'company_rule', 'Peraturan perusahaan yang mengatur hak dan kewajiban karyawan', 'active'],
        ['REG-002', 'Kode Etik Karyawan', 'ethics', 'Pedoman perilaku dan etika kerja karyawan', 'active'],
        ['REG-003', 'Kebijakan K3 (Keselamatan Kerja)', 'safety', 'Standar keselamatan dan kesehatan kerja', 'active'],
        ['REG-004', 'Kebijakan Anti-Pelecehan', 'ethics', 'Kebijakan pencegahan pelecehan di tempat kerja', 'active'],
        ['REG-005', 'Peraturan Disiplin Kerja', 'company_rule', 'Ketentuan disiplin dan sanksi pelanggaran', 'active'],
        ['REG-006', 'Kebijakan Data Privacy', 'compliance', 'Kebijakan perlindungan data pribadi karyawan', 'active'],
      ];
      for (const r of regs) {
        await sequelize.query(`
          INSERT INTO company_regulations (id, regulation_number, title, category, description, status, effective_date)
          VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, CURRENT_DATE)
          ON CONFLICT DO NOTHING
        `, { bind: r });
      }
      console.log('✅ Seeded 6 company regulations');
    }

    // Seed: Compliance checklists
    const [ccCount] = await sequelize.query(`SELECT COUNT(*) as c FROM compliance_checklists`);
    if (parseInt(ccCount[0].c) === 0) {
      await sequelize.query(`
        INSERT INTO compliance_checklists (id, name, category, description, status, period, items)
        VALUES 
        (uuid_generate_v4(), 'Kepatuhan UU Ketenagakerjaan', 'labor_law', 'Checklist kepatuhan terhadap UU 13/2003', 'pending', 'annual',
         '${JSON.stringify([
           {item: 'Perjanjian kerja sesuai UU', required: true, status: 'pending'},
           {item: 'BPJS Kesehatan terdaftar semua karyawan', required: true, status: 'pending'},
           {item: 'BPJS Ketenagakerjaan terdaftar', required: true, status: 'pending'},
           {item: 'UMR/UMP sesuai ketentuan', required: true, status: 'pending'},
           {item: 'Jam kerja sesuai UU (40 jam/minggu)', required: true, status: 'pending'},
           {item: 'Cuti tahunan minimal 12 hari', required: true, status: 'pending'},
           {item: 'THR dibayarkan tepat waktu', required: true, status: 'pending'},
           {item: 'Peraturan perusahaan disahkan Disnaker', required: false, status: 'pending'}
         ])}'),
        (uuid_generate_v4(), 'Audit K3 Tahunan', 'safety', 'Pemeriksaan keselamatan kerja tahunan', 'pending', 'annual',
         '${JSON.stringify([
           {item: 'Peralatan P3K tersedia', required: true, status: 'pending'},
           {item: 'APAR (alat pemadam) inspeksi', required: true, status: 'pending'},
           {item: 'Jalur evakuasi jelas', required: true, status: 'pending'},
           {item: 'Pelatihan K3 karyawan', required: false, status: 'pending'},
           {item: 'APD tersedia dan layak', required: true, status: 'pending'}
         ])}'),
        (uuid_generate_v4(), 'Compliance Pajak & BPJS Bulanan', 'tax', 'Pelaporan pajak dan BPJS bulanan', 'pending', 'monthly',
         '${JSON.stringify([
           {item: 'PPh 21 dilaporkan', required: true, status: 'pending'},
           {item: 'BPJS Kesehatan dibayar', required: true, status: 'pending'},
           {item: 'BPJS TK dibayar', required: true, status: 'pending'},
           {item: 'Rekonsiliasi gaji vs pajak', required: true, status: 'pending'}
         ])}')
      `);
      console.log('✅ Seeded 3 compliance checklists');
    }

    // Seed: Sample survey
    const [svCount] = await sequelize.query(`SELECT COUNT(*) as c FROM surveys`);
    if (parseInt(svCount[0].c) === 0) {
      await sequelize.query(`
        INSERT INTO surveys (id, title, description, survey_type, status, is_anonymous, questions)
        VALUES (uuid_generate_v4(), 'Employee Engagement Survey Q1', 'Survey kepuasan dan engagement karyawan kuartal 1', 'engagement', 'draft', true,
        '${JSON.stringify([
          {id: 'q1', text: 'Seberapa puas Anda dengan lingkungan kerja saat ini?', type: 'rating', required: true},
          {id: 'q2', text: 'Apakah Anda merasa dihargai atas kontribusi Anda?', type: 'rating', required: true},
          {id: 'q3', text: 'Bagaimana hubungan Anda dengan atasan langsung?', type: 'rating', required: true},
          {id: 'q4', text: 'Apakah Anda memiliki kesempatan untuk berkembang?', type: 'rating', required: true},
          {id: 'q5', text: 'Apakah Anda merekomendasikan perusahaan ini sebagai tempat bekerja?', type: 'scale', options: {min: 0, max: 10, labels: ['Tidak Sama Sekali', 'Sangat Merekomendasikan']}, required: true},
          {id: 'q6', text: 'Apa saran Anda untuk peningkatan?', type: 'text', required: false}
        ])}')
      `);
      console.log('✅ Seeded sample engagement survey');
    }

    // Seed: Sample announcement
    const [anCount] = await sequelize.query(`SELECT COUNT(*) as c FROM announcements`);
    if (parseInt(anCount[0].c) === 0) {
      await sequelize.query(`
        INSERT INTO announcements (id, title, content, category, priority, status, publish_date, is_pinned)
        VALUES 
        (uuid_generate_v4(), 'Selamat Datang di Sistem HRIS', 'Sistem HRIS telah aktif. Silakan eksplorasi fitur-fitur yang tersedia untuk meningkatkan produktivitas Anda.', 'general', 'high', 'published', NOW(), true),
        (uuid_generate_v4(), 'Kebijakan Work From Home', 'Mulai bulan ini, karyawan dapat mengajukan WFH maksimal 2 hari per minggu melalui sistem.', 'policy', 'normal', 'published', NOW(), false)
      `);
      console.log('✅ Seeded 2 announcements');
    }

    // Seed: Expense budget categories
    const [ebCount] = await sequelize.query(`SELECT COUNT(*) as c FROM expense_budgets`);
    if (parseInt(ebCount[0].c) === 0) {
      const year = new Date().getFullYear();
      const budgets = [
        ['travel', 5000000, 60000000],
        ['meals', 2000000, 24000000],
        ['transportation', 3000000, 36000000],
        ['accommodation', 4000000, 48000000],
        ['communication', 500000, 6000000],
      ];
      for (const b of budgets) {
        await sequelize.query(`
          INSERT INTO expense_budgets (id, category, fiscal_year, monthly_limit, annual_limit, remaining_amount)
          VALUES (uuid_generate_v4(), $1, $2, $3, $4, $4)
        `, { bind: [b[0], year, b[1], b[2]] });
      }
      console.log('✅ Seeded 5 expense budget categories');
    }

    // ========================================
    // VERIFY
    // ========================================
    const tables = [
      'company_regulations', 'warning_letters', 'ir_cases', 'termination_requests', 'compliance_checklists',
      'headcount_plans', 'manpower_budgets',
      'surveys', 'survey_responses', 'recognitions', 'announcements',
      'travel_requests', 'travel_expenses', 'expense_budgets',
      'projects', 'project_workers', 'project_timesheets', 'project_payroll'
    ];
    console.log('\n📊 Table row counts:');
    for (const t of tables) {
      const [r] = await sequelize.query(`SELECT COUNT(*) as c FROM ${t}`);
      console.log(`  ${t}: ${r[0].c} rows`);
    }

    console.log('\n🎉 All 18 tables created successfully!');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

migrate();

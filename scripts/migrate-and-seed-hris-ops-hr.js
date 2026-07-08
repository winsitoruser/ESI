#!/usr/bin/env node
/**
 * HRIS Operasional HR — create missing tables, align UUID FKs, seed demo data.
 * Run: npm run db:ops-hr-setup
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {}
    : { ssl: { require: true, rejectUnauthorized: false } },
});

async function tableExists(name) {
  const [[row]] = await sequelize.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = :name
    ) AS exists`,
    { replacements: { name } }
  );
  return !!row.exists;
}

async function rowCount(name) {
  if (!(await tableExists(name))) return -1;
  const [[row]] = await sequelize.query(`SELECT COUNT(*)::int AS cnt FROM "${name}"`);
  return row.cnt;
}

async function migrateTables() {
  await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_claims (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL,
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
  console.log('  ✓ employee_claims');

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
  console.log('  ✓ claim_approval_steps');

  // Align INTEGER employee_id → UUID on empty PJM tables
  for (const table of ['pjm_resources', 'pjm_timesheets']) {
    if (!(await tableExists(table))) continue;
    const cnt = await rowCount(table);
    const [cols] = await sequelize.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = :table AND column_name = 'employee_id'`,
      { replacements: { table } }
    );
    if (cols[0]?.data_type === 'integer' && cnt === 0) {
      await sequelize.query(`ALTER TABLE ${table} ALTER COLUMN employee_id TYPE UUID USING NULL`);
      console.log(`  ✓ ${table}.employee_id → UUID`);
    }
  }

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_emp_claim_empid ON employee_claims(employee_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_emp_claim_status ON employee_claims(status)`);
}

async function seedData() {
  const [tenants] = await sequelize.query('SELECT id FROM tenants ORDER BY created_at LIMIT 1');
  const tenantId = tenants[0]?.id || null;

  const [employees] = await sequelize.query(`
    SELECT id, name, employee_code, department, position
    FROM employees WHERE status = 'active' OR is_active = true
    ORDER BY employee_code NULLS LAST, created_at
    LIMIT 12
  `);
  if (!employees.length) {
    console.warn('  ⚠ No employees found — skip seed');
    return;
  }

  const e = (i) => employees[i % employees.length];

  // ── Expense budgets ──
  if ((await rowCount('expense_budgets')) === 0) {
    const budgets = [
      ['travel', 50000000, 600000000],
      ['meal', 15000000, 180000000],
      ['training', 20000000, 240000000],
    ];
    for (const [category, monthly, annual] of budgets) {
      await sequelize.query(`
        INSERT INTO expense_budgets (tenant_id, category, fiscal_year, monthly_limit, annual_limit, used_amount, remaining_amount, is_active)
        VALUES (:tenantId, :category, 2026, :monthly, :annual, 0, :annual, true)
      `, { replacements: { tenantId, category, monthly, annual } });
    }
    console.log('  ✓ seeded expense_budgets (3)');
  }

  // ── Travel requests & expenses ──
  if ((await rowCount('travel_requests')) === 0) {
    const trips = [
      { emp: 0, dest: 'Surabaya', purpose: 'Audit operasional cabang', start: '2026-03-18', end: '2026-03-20', budget: 8500000, status: 'approved' },
      { emp: 1, dest: 'Bali', purpose: 'Meeting supplier pet care', start: '2026-03-22', end: '2026-03-24', budget: 12000000, status: 'pending' },
      { emp: 2, dest: 'Bandung', purpose: 'Training cabang baru', start: '2026-03-10', end: '2026-03-12', budget: 4500000, status: 'completed' },
    ];
    const tripIds = [];
    for (let i = 0; i < trips.length; i++) {
      const t = trips[i];
      const [rows] = await sequelize.query(`
        INSERT INTO travel_requests (tenant_id, employee_id, request_number, destination, purpose, start_date, end_date, estimated_budget, status, notes)
        VALUES (:tenantId, :empId, :num, :dest, :purpose, :start, :end, :budget, :status, :notes)
        RETURNING id
      `, {
        replacements: {
          tenantId, empId: e(t.emp).id, num: `TR-${String(i + 1).padStart(4, '0')}/2026`,
          dest: t.dest, purpose: t.purpose, start: t.start, end: t.end,
          budget: t.budget, status: t.status, notes: 'Seed data Operasional HR',
        },
      });
      tripIds.push(rows[0].id);
    }
  }

  if ((await rowCount('travel_expenses')) === 0) {
    const [trips] = await sequelize.query(`SELECT id, employee_id FROM travel_requests ORDER BY created_at LIMIT 3`);
    if (trips[2]) {
      const exp = [
        { cat: 'transportation', desc: 'Tiket kereta PP', amount: 600000 },
        { cat: 'accommodation', desc: 'Hotel 2 malam', amount: 1600000 },
        { cat: 'meal', desc: 'Uang makan dinas', amount: 450000 },
      ];
      for (const x of exp) {
        await sequelize.query(`
          INSERT INTO travel_expenses (travel_request_id, employee_id, expense_date, category, description, amount, status)
          VALUES (:tripId, :empId, '2026-03-10', :cat, :desc, :amount, 'approved')
        `, { replacements: { tripId: trips[2].id, empId: trips[2].employee_id, ...x } });
      }
    }
    console.log('  ✓ seeded travel_requests + travel_expenses');
  }

  // ── Employee claims (mutations workflow) ──
  if ((await rowCount('employee_claims')) === 0) {
    const claims = [
      { emp: 3, type: 'transport', amount: 250000, status: 'pending', desc: 'Ongkos transport lapangan' },
      { emp: 4, type: 'meal', amount: 180000, status: 'approved', desc: 'Makan meeting partner' },
      { emp: 5, type: 'travel', amount: 3200000, status: 'pending', desc: 'Reimburse perjalanan dinas' },
      { emp: 6, type: 'medical', amount: 450000, status: 'rejected', desc: 'Klaim medical check-up' },
    ];
    for (let i = 0; i < claims.length; i++) {
      const c = claims[i];
      const [rows] = await sequelize.query(`
        INSERT INTO employee_claims (tenant_id, employee_id, claim_number, claim_type, amount, approved_amount, claim_date, description, status)
        VALUES (:tenantId, :empId, :num, :type, :amount, :approved, CURRENT_DATE - :days, :desc, :status)
        RETURNING id
      `, {
        replacements: {
          tenantId, empId: e(c.emp).id, num: `CLM-2026-${String(i + 1).padStart(4, '0')}`,
          type: c.type, amount: c.amount,
          approved: c.status === 'approved' ? c.amount : null,
          days: i * 3, desc: c.desc, status: c.status,
        },
      });
      if (c.status === 'pending' && rows[0]?.id) {
        await sequelize.query(`
          INSERT INTO claim_approval_steps (claim_id, step_order, approver_role, status)
          VALUES (:claimId, 1, 'MANAGER', 'pending')
        `, { replacements: { claimId: rows[0].id } });
      }
    }
    console.log('  ✓ seeded employee_claims (4)');
  }

  // ── Project management ──
  let projectIds = [];
  if ((await rowCount('pjm_projects')) === 0) {
    const projects = [
      { code: 'PRJ-0001', name: 'Renovasi Pet Clinic Jakarta', client: 'PetCare Plus', dept: 'OPERATIONS', budget: 850000000, status: 'active', progress: 45 },
      { code: 'PRJ-0002', name: 'Implementasi POS Partner Bandung', client: 'Happy Paws', dept: 'IT', budget: 320000000, status: 'active', progress: 72 },
      { code: 'PRJ-0003', name: 'Onboarding Vet Teleconsult', client: 'ESI Platform', dept: 'HR', budget: 150000000, status: 'planning', progress: 15 },
    ];
    for (const p of projects) {
      const [rows] = await sequelize.query(`
        INSERT INTO pjm_projects (id, tenant_id, project_code, name, description, category, status, priority, start_date, end_date,
          progress_percent, budget_amount, actual_cost, currency, manager_name, department, client_name, tags)
        VALUES (uuid_generate_v4(), :tenantId, :code, :name, :desc, 'operations', :status, 'medium', '2026-01-15', '2026-06-30',
          :progress, :budget, :actual, 'IDR', :manager, :dept, :client, '["hris","pet"]'::jsonb)
        RETURNING id
      `, {
        replacements: {
          tenantId, code: p.code, name: p.name, desc: `Proyek ${p.name}`,
          status: p.status, progress: p.progress, budget: p.budget,
          actual: Math.round(p.budget * (p.progress / 100) * 0.6),
          manager: e(0).name, dept: p.dept, client: p.client,
        },
      });
      projectIds.push(rows[0].id);
    }
    console.log('  ✓ seeded pjm_projects (3)');
  } else {
    const [rows] = await sequelize.query('SELECT id FROM pjm_projects ORDER BY created_at LIMIT 3');
    projectIds = rows.map((r) => r.id);
  }

  if ((await rowCount('pjm_resources')) === 0 && projectIds.length) {
    const roles = ['Project Manager', 'Site Supervisor', 'Field Staff'];
    for (let pi = 0; pi < projectIds.length; pi++) {
      for (let wi = 0; wi < 3; wi++) {
        const emp = e(pi + wi);
        await sequelize.query(`
          INSERT INTO pjm_resources (id, tenant_id, project_id, resource_name, resource_type, role, employee_id,
            allocation_percent, start_date, end_date, cost_per_hour, notes)
          VALUES (uuid_generate_v4(), :tenantId, :projectId, :name, 'employee', :role, :empId,
            :alloc, '2026-01-15', '2026-06-30', :rate, 'Seed tim proyek')
        `, {
          replacements: {
            tenantId, projectId: projectIds[pi], name: emp.name, role: roles[wi],
            empId: emp.id, alloc: 100 - wi * 20, rate: 75000 + wi * 15000,
          },
        });
      }
    }
    console.log('  ✓ seeded pjm_resources (9)');
  }

  if ((await rowCount('pjm_timesheets')) === 0 && projectIds.length) {
    for (let pi = 0; pi < Math.min(2, projectIds.length); pi++) {
      for (let d = 0; d < 5; d++) {
        const emp = e(pi + d);
        const hours = 8;
        const rate = 85000;
        await sequelize.query(`
          INSERT INTO pjm_timesheets (id, tenant_id, project_id, employee_id, employee_name, work_date,
            hours_worked, overtime_hours, hourly_rate, total_cost, description, status)
          VALUES (uuid_generate_v4(), :tenantId, :projectId, :empId, :name, :workDate,
            :hours, :ot, :rate, :cost, :desc, 'approved')
        `, {
          replacements: {
            tenantId, projectId: projectIds[pi], empId: emp.id, name: emp.name,
            workDate: `2026-02-${String(10 + d).padStart(2, '0')}`,
            hours, ot: d % 2, rate, cost: hours * rate, desc: 'Pekerjaan lapangan proyek',
          },
        });
      }
    }
    console.log('  ✓ seeded pjm_timesheets (10)');
  }

  if ((await rowCount('project_payroll')) === 0 && projectIds.length) {
    const emp = e(1);
    await sequelize.query(`
      INSERT INTO project_payroll (id, project_id, employee_id, period_start, period_end,
        regular_hours, overtime_hours, daily_rate, days_worked, gross_amount, net_amount, status)
      VALUES (uuid_generate_v4(), :projectId, :empId, '2026-02-01', '2026-02-28', 160, 8, 680000, 20, 13600000, 13600000, 'calculated')
    `, { replacements: { projectId: projectIds[0], empId: emp.id } });
    console.log('  ✓ seeded project_payroll (1)');
  }

  // ── Industrial relations ──
  if ((await rowCount('ir_cases')) === 0) {
    const cases = [
      { title: 'Investigasi pelanggaran SOP gudang', type: 'misconduct', status: 'investigating', priority: 'high' },
      { title: 'Keluhan lingkungan kerja cabang', type: 'grievance', status: 'open', priority: 'medium' },
      { title: 'Sengketa jam lembur', type: 'dispute', status: 'open', priority: 'low' },
    ];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      await sequelize.query(`
        INSERT INTO ir_cases (tenant_id, case_number, title, case_type, employee_id, description, status, priority, opened_date, evidence, witnesses)
        VALUES (:tenantId, :num, :title, :type, :empId, :desc, :status, :priority, CURRENT_DATE - :days,
          '[]'::jsonb, '[]'::jsonb)
      `, {
        replacements: {
          tenantId, num: `CASE-2026-${String(i + 1).padStart(3, '0')}`,
          title: c.title, type: c.type, empId: e(i + 2).id,
          desc: `Kasus IR: ${c.title}`, status: c.status, priority: c.priority, days: i * 4,
        },
      });
    }
    console.log('  ✓ seeded ir_cases (3)');
  }

  if ((await rowCount('compliance_checklists')) === 0) {
    const lists = [
      {
        name: 'Audit Kepatuhan K3 Q1 2026', category: 'safety', period: 'Q1 2026',
        items: [{ name: 'APAR tersedia', status: 'completed' }, { name: 'P3K lengkap', status: 'pending' }],
        status: 'in_progress', due: '2026-03-31',
      },
      {
        name: 'Review Kontrak Karyawan', category: 'compliance', period: 'Maret 2026',
        items: [{ name: 'List kontrak expired', status: 'completed' }, { name: 'Evaluasi perpanjangan', status: 'pending' }],
        status: 'in_progress', due: '2026-03-25',
      },
    ];
    for (const cl of lists) {
      await sequelize.query(`
        INSERT INTO compliance_checklists (tenant_id, name, category, description, status, period, items, due_date)
        VALUES (:tenantId, :name, :category, :desc, :status, :period, :items::jsonb, :due)
      `, {
        replacements: {
          tenantId, name: cl.name, category: cl.category, desc: cl.name,
          status: cl.status, period: cl.period, items: JSON.stringify(cl.items), due: cl.due,
        },
      });
    }
    console.log('  ✓ seeded compliance_checklists (2)');
  }

  if ((await rowCount('company_regulations')) < 3) {
    const regs = [
      { title: 'SOP Keselamatan Kerja (K3)', num: 'SOP-K3-001', cat: 'safety' },
      { title: 'Kode Etik Karyawan', num: 'KE-2026-001', cat: 'ethics' },
    ];
    for (const r of regs) {
      const [ex] = await sequelize.query('SELECT id FROM company_regulations WHERE regulation_number = :num LIMIT 1', { replacements: { num: r.num } });
      if (ex.length) continue;
      await sequelize.query(`
        INSERT INTO company_regulations (tenant_id, title, regulation_number, category, description, status, effective_date, version)
        VALUES (:tenantId, :title, :num, :cat, :desc, 'active', '2026-01-01', 1)
      `, { replacements: { tenantId, title: r.title, num: r.num, cat: r.cat, desc: r.title } });
    }
    console.log('  ✓ seeded company_regulations (extra)');
  }

  // ── Team members link ──
  await sequelize.query(`
    UPDATE team_members tm SET employee_id = e.id
    FROM employees e
    WHERE tm.employee_id IS NULL AND lower(tm.name) = lower(e.name)
  `).catch(() => {});
  const tmCnt = await rowCount('team_members');
  if (tmCnt < 5) {
    const roleMap = { HR: 'ops', OPERATIONS: 'ops', SALES: 'sales', FINANCE: 'finance', WAREHOUSE: 'ops', KITCHEN: 'ops' };
    for (let i = 0; i < Math.min(5, employees.length); i++) {
      const emp = employees[i];
      const [ex] = await sequelize.query('SELECT id FROM team_members WHERE name = :name OR employee_id = :empId LIMIT 1', {
        replacements: { name: emp.name, empId: emp.id },
      });
      if (ex.length) continue;
      const code = emp.employee_code || `TM-${String(i + 1).padStart(4, '0')}`;
      const role = roleMap[emp.department] || 'ops';
      await sequelize.query(`
        INSERT INTO team_members (id, code, tenant_id, name, email, role, department, status, join_date, employee_id)
        VALUES (uuid_generate_v4(), :code, :tenantId, :name, :email, :role, :dept, 'active', CURRENT_DATE, :empId)
      `, {
        replacements: {
          code, tenantId, name: emp.name,
          email: `${(emp.employee_code || 'emp').toLowerCase()}@bedagang.com`,
          role, dept: emp.department, empId: emp.id,
        },
      });
    }
    console.log('  ✓ seeded team_members');
  }

  // ── Tasks ──
  if ((await rowCount('tasks')) < 5) {
    const taskTitles = [
      'Review pengajuan mutasi karyawan',
      'Follow up klaim travel expense',
      'Update data tim proyek Bandung',
      'Sidang IR kasus gudang',
      'Draft surat teguran SP1',
    ];
    for (let i = 0; i < taskTitles.length; i++) {
      const [ex] = await sequelize.query('SELECT id FROM tasks WHERE title = :title LIMIT 1', { replacements: { title: taskTitles[i] } });
      if (ex.length) continue;
      await sequelize.query(`
        INSERT INTO tasks (tenant_id, title, description, priority, status, task_type, category, due_date)
        VALUES (:tenantId, :title, :desc, :priority, :status, 'routine', 'HR', CURRENT_DATE + :days)
      `, {
        replacements: {
          tenantId, title: taskTitles[i], desc: taskTitles[i],
          priority: i % 2 ? 'high' : 'medium', status: i % 3 ? 'todo' : 'in_progress', days: i + 2,
        },
      });
    }
    console.log('  ✓ seeded tasks (5)');
  }

  // ── HRIS activities log ──
  const actCnt = await rowCount('hris_activities');
  if (actCnt < 15) {
    const events = [
      { type: 'travel_request', title: 'Pengajuan perjalanan dinas disetujui', desc: 'Surabaya — audit cabang' },
      { type: 'project_update', title: 'Proyek PRJ-0001 update progress 45%', desc: 'Renovasi Pet Clinic' },
      { type: 'ir_case', title: 'Kasus IR baru dibuka', desc: 'Investigasi SOP gudang' },
      { type: 'claim_submitted', title: 'Klaim reimbursement diajukan', desc: 'Transport lapangan' },
    ];
    for (const ev of events) {
      await sequelize.query(`
        INSERT INTO hris_activities (tenant_id, activity_type, title, description, actor_name, metadata)
        VALUES (:tenantId, :type, :title, :desc, 'Sistem HRIS', '{}'::jsonb)
      `, { replacements: { tenantId, type: ev.type, title: ev.title, desc: ev.desc } });
    }
    console.log('  ✓ seeded hris_activities (extra)');
  }

  if (await tableExists('recognitions') && (await rowCount('recognitions')) === 0) {
    await sequelize.query(`
      INSERT INTO recognitions (tenant_id, title, description, recognition_type, recipient_id, given_by, given_date, status)
      VALUES (:tenantId, 'Employee of the Month', 'Kinerja outstanding Q1', 'award', :empId, :giver, CURRENT_DATE, 'published')
    `, { replacements: { tenantId, empId: e(0).id, giver: e(1).id } }).catch(() => {});
    console.log('  ✓ seeded recognitions (1)');
  }
}

async function run() {
  await sequelize.authenticate();
  console.log('HRIS Operasional HR — migrate & seed\n');
  console.log('── Migrate ──');
  await migrateTables();
  console.log('\n── Seed ──');
  await seedData();
  console.log('\n✅ Done. Run: node scripts/smoke-test-humanify-ops-hr.js');
  await sequelize.close();
}

run().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});

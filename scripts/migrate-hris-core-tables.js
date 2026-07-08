#!/usr/bin/env node
/**
 * HRIS core tables — KPI, leave, performance, activities, announcements.
 * UUID employee_id (matches live employees schema). Safe to run multiple times.
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function run() {
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ── KPI ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS kpi_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, code VARCHAR(30) NOT NULL, name VARCHAR(200) NOT NULL,
      category VARCHAR(30) DEFAULT 'operations', unit VARCHAR(20) DEFAULT '%',
      data_type VARCHAR(20) DEFAULT 'number', formula_type VARCHAR(30) DEFAULT 'actual_vs_target',
      formula TEXT, default_weight INTEGER DEFAULT 100,
      measurement_frequency VARCHAR(20) DEFAULT 'monthly',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_kpis (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      branch_id UUID, template_id UUID REFERENCES kpi_templates(id) ON DELETE SET NULL,
      period VARCHAR(7) NOT NULL, metric_name VARCHAR(200) NOT NULL,
      category VARCHAR(30) DEFAULT 'operations',
      target DECIMAL(15,2) NOT NULL, actual DECIMAL(15,2) DEFAULT 0,
      unit VARCHAR(20) DEFAULT '%', weight INTEGER DEFAULT 100,
      status VARCHAR(30) DEFAULT 'pending', notes TEXT,
      reviewed_by UUID, reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_employee_kpis_emp ON employee_kpis(employee_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_employee_kpis_period ON employee_kpis(period)`);

  // ── Performance reviews ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS performance_reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      reviewer_id UUID, period VARCHAR(20) NOT NULL,
      overall_score DECIMAL(4,2), status VARCHAR(20) DEFAULT 'draft',
      strengths JSONB DEFAULT '[]', areas_for_improvement JSONB DEFAULT '[]',
      goals JSONB DEFAULT '[]', comments TEXT,
      submitted_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, acknowledged_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Leave ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, code VARCHAR(30) NOT NULL, name VARCHAR(100) NOT NULL,
      category VARCHAR(30) DEFAULT 'annual', max_days_per_year INTEGER DEFAULT 12,
      color VARCHAR(20) DEFAULT '#3B82F6', icon VARCHAR(30) DEFAULT 'calendar',
      is_active BOOLEAN DEFAULT true, sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      leave_type VARCHAR(30) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
      total_days INTEGER DEFAULT 1, reason TEXT, status VARCHAR(20) DEFAULT 'pending',
      approved_by UUID, approved_at TIMESTAMPTZ, rejection_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status)`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_balances (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
      year INTEGER NOT NULL, entitled INTEGER DEFAULT 12, used INTEGER DEFAULT 0,
      pending INTEGER DEFAULT 0, remaining INTEGER DEFAULT 12,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (employee_id, leave_type_id, year)
    )
  `);

  // ── HR Activities log ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      activity_type VARCHAR(50) NOT NULL,
      title VARCHAR(300) NOT NULL, description TEXT,
      entity_type VARCHAR(50), entity_id UUID,
      actor_id UUID, actor_name VARCHAR(100),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hris_activities_tenant ON hris_activities(tenant_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hris_activities_type ON hris_activities(activity_type)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hris_activities_created ON hris_activities(created_at DESC)`);

  // ── Announcements ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_announcements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      title VARCHAR(300) NOT NULL, content TEXT,
      priority VARCHAR(20) DEFAULT 'normal', target_audience VARCHAR(50) DEFAULT 'all',
      published_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
      is_pinned BOOLEAN DEFAULT false, is_active BOOLEAN DEFAULT true,
      created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Overtime ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS overtime_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      request_date DATE NOT NULL, hours DECIMAL(4,1) NOT NULL,
      reason TEXT, status VARCHAR(20) DEFAULT 'pending',
      approved_by UUID, approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Seed KPI templates ──
  const [kt] = await sequelize.query('SELECT COUNT(*)::int AS cnt FROM kpi_templates');
  if (kt[0].cnt === 0) {
    const templates = [
      ['REV_TARGET', 'Target Penjualan', 'sales', 'Rp', 'currency', 40],
      ['CUST_SAT', 'Kepuasan Pelanggan', 'customer', '%', 'percentage', 20],
      ['OPS_EFF', 'Efisiensi Operasional', 'operations', '%', 'percentage', 20],
      ['FIN_ACC', 'Akurasi Keuangan', 'financial', '%', 'percentage', 15],
      ['ATTEND_RATE', 'Tingkat Kehadiran', 'hr', '%', 'percentage', 15],
      ['TRAIN_COMP', 'Penyelesaian Training', 'hr', '%', 'percentage', 10],
      ['QUALITY_SCORE', 'Skor Kualitas', 'quality', '%', 'percentage', 15],
      ['NOO_TARGET', 'Klien Baru (NOO)', 'sales', 'orang', 'count', 25],
    ];
    for (const [code, name, cat, unit, dtype, weight] of templates) {
      await sequelize.query(
        `INSERT INTO kpi_templates (code, name, category, unit, data_type, default_weight, formula, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, '(actual/target)*100', true)
         ON CONFLICT DO NOTHING`,
        { bind: [code, name, cat, unit, dtype, weight] }
      );
    }
    console.log('  ✓ seeded kpi_templates');
  }

  // ── Seed leave types ──
  const [lt] = await sequelize.query('SELECT COUNT(*)::int AS cnt FROM leave_types');
  if (lt[0].cnt === 0) {
    const types = [
      ['annual', 'Cuti Tahunan', 'annual', 12, '#3B82F6'],
      ['sick', 'Cuti Sakit', 'sick', 14, '#EF4444'],
      ['personal', 'Cuti Pribadi', 'personal', 3, '#8B5CF6'],
      ['maternity', 'Cuti Melahirkan', 'special', 90, '#EC4899'],
      ['unpaid', 'Cuti Tanpa Gaji', 'unpaid', 30, '#6B7280'],
    ];
    for (const [code, name, cat, max, color] of types) {
      await sequelize.query(
        `INSERT INTO leave_types (code, name, category, max_days_per_year, color, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        { bind: [code, name, cat, max, color] }
      );
    }
    console.log('  ✓ seeded leave_types');
  }

  // ── Seed sample KPIs for existing employees ──
  const [empRows] = await sequelize.query(
    `SELECT e.id, e.name, e.branch_id, e.tenant_id, e.position, e.department
     FROM employees e WHERE e.is_active = true LIMIT 10`
  );
  const period = new Date().toISOString().substring(0, 7);
  const [kpiCnt] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM employee_kpis WHERE period = $1`, { bind: [period] }
  );
  if (kpiCnt[0].cnt === 0 && empRows.length > 0) {
    const [tpls] = await sequelize.query(`SELECT id, code, name, category, unit, default_weight FROM kpi_templates WHERE is_active = true LIMIT 4`);
    for (const emp of empRows) {
      for (const tpl of tpls) {
        const target = tpl.category === 'sales' ? 500000000 : tpl.category === 'financial' ? 99 : 95;
        const actual = target * (0.75 + Math.random() * 0.35);
        await sequelize.query(
          `INSERT INTO employee_kpis (tenant_id, employee_id, branch_id, template_id, period, metric_name, category, target, actual, unit, weight, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')`,
          { bind: [emp.tenant_id, emp.id, emp.branch_id, tpl.id, period, tpl.name, tpl.category, target, Math.round(actual * 100) / 100, tpl.unit, tpl.default_weight] }
        );
      }
      await sequelize.query(
        `INSERT INTO hris_activities (tenant_id, activity_type, title, description, entity_type, entity_id, actor_name)
         VALUES ($1, 'kpi_assigned', $2, $3, 'employee', $4, 'System')`,
        { bind: [emp.tenant_id, `KPI diassign — ${emp.name}`, `Periode ${period}: ${tpls.length} metrik KPI`, emp.id] }
      );
    }
    console.log(`  ✓ seeded KPIs for ${empRows.length} employees`);
  }

  // ── Seed sample leave requests ──
  const [lrCnt] = await sequelize.query('SELECT COUNT(*)::int AS cnt FROM leave_requests');
  if (lrCnt[0].cnt === 0 && empRows.length >= 2) {
    await sequelize.query(
      `INSERT INTO leave_requests (tenant_id, employee_id, leave_type, start_date, end_date, total_days, reason, status)
       VALUES ($1, $2, 'annual', CURRENT_DATE + 7, CURRENT_DATE + 9, 3, 'Liburan keluarga', 'pending')`,
      { bind: [empRows[0].tenant_id, empRows[0].id] }
    );
    await sequelize.query(
      `INSERT INTO leave_requests (tenant_id, employee_id, leave_type, start_date, end_date, total_days, reason, status)
       VALUES ($1, $2, 'sick', CURRENT_DATE - 2, CURRENT_DATE - 1, 2, 'Demam', 'approved')`,
      { bind: [empRows[1].tenant_id, empRows[1].id] }
    );
    console.log('  ✓ seeded leave_requests');
  }

  console.log('✓ HRIS core tables ready');
  await sequelize.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });

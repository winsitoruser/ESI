#!/usr/bin/env node
/**
 * HRIS extended tables: performance 360°, leave workflow, performance categories.
 * Safe to run multiple times.
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

async function addCol(table, col, def) {
  try {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${def}`);
  } catch { /* ignore */ }
}

async function run() {
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ── Extend performance_reviews ──
  for (const [col, def] of [
    ['employee_name', 'VARCHAR(200)'], ['position', 'VARCHAR(100)'], ['department', 'VARCHAR(100)'],
    ['branch_id', 'UUID'], ['branch_name', 'VARCHAR(200)'],
    ['review_period', 'VARCHAR(20)'], ['review_type', 'VARCHAR(30) DEFAULT \'quarterly\''],
    ['review_date', 'DATE'], ['reviewer_name', 'VARCHAR(200)'],
    ['overall_rating', 'DECIMAL(4,2)'], ['employee_comments', 'TEXT'],
    ['manager_comments', 'TEXT'], ['hr_comments', 'TEXT'],
    ['review_type_360', 'BOOLEAN DEFAULT false'],
  ]) {
    await addCol('performance_reviews', col, def);
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS performance_review_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL, weight INTEGER DEFAULT 20,
      rating DECIMAL(3,1) DEFAULT 0, comments TEXT, sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS performance_review_feedback (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      review_id UUID REFERENCES performance_reviews(id) ON DELETE CASCADE,
      employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
      reviewer_id UUID, reviewer_name VARCHAR(200),
      feedback_type VARCHAR(30) NOT NULL DEFAULT 'peer',
      relationship VARCHAR(50),
      competency VARCHAR(100), rating DECIMAL(3,1) NOT NULL,
      comments TEXT, is_anonymous BOOLEAN DEFAULT false,
      status VARCHAR(20) DEFAULT 'submitted',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_perf_feedback_review ON performance_review_feedback(review_id)`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS performance_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, name VARCHAR(200) NOT NULL,
      categories JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── Leave workflow ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_approval_configs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, name VARCHAR(200) NOT NULL,
      description TEXT, department VARCHAR(100),
      approval_levels JSONB NOT NULL DEFAULT '[]',
      min_days_trigger INTEGER DEFAULT 1,
      max_auto_approve_days INTEGER DEFAULT 0,
      escalation_hours INTEGER DEFAULT 48,
      is_active BOOLEAN DEFAULT true, priority INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS leave_approval_steps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
      step_order INTEGER NOT NULL DEFAULT 1,
      approver_role VARCHAR(50), approver_id UUID,
      status VARCHAR(20) DEFAULT 'waiting',
      comments TEXT, acted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const [col, def] of [
    ['current_approval_step', 'INTEGER DEFAULT 0'],
    ['total_approval_steps', 'INTEGER DEFAULT 0'],
    ['rejection_reason', 'TEXT'],
  ]) {
    await addCol('leave_requests', col, def);
  }

  // ── Seed performance templates ──
  const [ptCnt] = await sequelize.query('SELECT COUNT(*)::int AS cnt FROM performance_templates');
  if (ptCnt[0].cnt === 0) {
    await sequelize.query(`
      INSERT INTO performance_templates (name, categories, is_active) VALUES
      ('Standard Review', '[{"name":"Kualitas Kerja","weight":25},{"name":"Produktivitas","weight":25},{"name":"Inisiatif","weight":20},{"name":"Kerjasama Tim","weight":15},{"name":"Kedisiplinan","weight":15}]', true),
      ('Manager Review', '[{"name":"Leadership","weight":30},{"name":"Strategic Thinking","weight":25},{"name":"Team Development","weight":20},{"name":"Results","weight":25}]', true),
      ('360° Review', '[{"name":"Komunikasi","weight":20},{"name":"Kolaborasi","weight":20},{"name":"Kepemimpinan","weight":20},{"name":"Inovasi","weight":20},{"name":"Integritas","weight":20}]', true)
    `);
    console.log('  ✓ seeded performance_templates');
  }

  // ── Seed leave approval config ──
  const [acCnt] = await sequelize.query('SELECT COUNT(*)::int AS cnt FROM leave_approval_configs');
  if (acCnt[0].cnt === 0) {
    await sequelize.query(`
      INSERT INTO leave_approval_configs (name, description, approval_levels, min_days_trigger, max_auto_approve_days, escalation_hours, is_active, priority)
      VALUES (
        'Default Multi-Level Approval',
        'Atasan langsung → HR Manager untuk cuti > 3 hari',
        '[{"level":1,"role":"manager","title":"Atasan Langsung","required":true},{"level":2,"role":"hr_manager","title":"HR Manager","required":true}]',
        1, 1, 48, true, 10
      )
    `);
    console.log('  ✓ seeded leave_approval_configs');
  }

  // ── Seed sample performance review + 360 feedback (non-blocking) ──
  try {
  const [empRows] = await sequelize.query(`SELECT id, name, position, department::text AS department, branch_id, tenant_id FROM employees WHERE is_active = true LIMIT 1`);
  if (empRows.length > 0) {
    const emp = empRows[0];
    const [br] = await sequelize.query('SELECT name FROM branches WHERE id = $1 LIMIT 1', { bind: [emp.branch_id] });
    const branchName = br[0]?.name || 'HQ';
    const period = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;

    const [existingReview] = await sequelize.query(
      `SELECT id FROM performance_reviews WHERE employee_id = $1 AND review_period = $2 LIMIT 1`,
      { bind: [emp.id, period] }
    );

    let reviewId = existingReview[0]?.id;
    if (!reviewId) {
      const [ins] = await sequelize.query(`
        INSERT INTO performance_reviews (
          tenant_id, employee_id, employee_name, position, department, branch_id, branch_name,
          review_period, review_type, review_date, reviewer_name, overall_rating, overall_score,
          period, status, review_type_360, strengths, areas_for_improvement, goals
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'quarterly',CURRENT_DATE,'HR Manager',4.2,4.2,$8,'submitted',true,
          '["Komunikasi efektif","Ketepatan waktu"]'::jsonb,
          '["Delegasi tugas"]'::jsonb,
          '["Tingkatkan produktivitas tim 15%"]'::jsonb)
        RETURNING id
      `, { bind: [emp.tenant_id, emp.id, emp.name, emp.position, emp.department, emp.branch_id, branchName, period] });
      reviewId = ins[0].id;

      const cats = [
        ['Kualitas Kerja', 25, 4.5], ['Produktivitas', 25, 4.0],
        ['Kerjasama Tim', 20, 4.3], ['Kedisiplinan', 15, 4.0], ['Inisiatif', 15, 3.8],
      ];
      for (let i = 0; i < cats.length; i++) {
        await sequelize.query(
          `INSERT INTO performance_review_categories (review_id, name, weight, rating, sort_order) VALUES ($1,$2,$3,$4,$5)`,
          { bind: [reviewId, cats[i][0], cats[i][1], cats[i][2], i] }
        );
      }
      console.log('  ✓ seeded performance review');
    }

    const [fbCnt] = await sequelize.query('SELECT COUNT(*)::int AS cnt FROM performance_review_feedback WHERE review_id = $1', { bind: [reviewId] });
    if (fbCnt[0].cnt === 0) {
      const feedbacks = [
        ['self', 'Diri Sendiri', 'Komunikasi', 4.0, 'Saya berkomunikasi aktif dengan tim'],
        ['manager', 'Atasan', 'Kepemimpinan', 4.5, 'Menunjukkan inisiatif yang baik'],
        ['peer', 'Rekan Kerja', 'Kolaborasi', 4.2, 'Mudah diajak kerjasama'],
        ['subordinate', 'Bawahan', 'Integritas', 4.8, 'Konsisten dan dapat dipercaya'],
      ];
      for (const [type, rel, comp, rating, comments] of feedbacks) {
        await sequelize.query(`
          INSERT INTO performance_review_feedback (tenant_id, review_id, employee_id, reviewer_name, feedback_type, relationship, competency, rating, comments)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, { bind: [emp.tenant_id, reviewId, emp.id, rel, type, rel, comp, rating, comments] });
      }
      console.log('  ✓ seeded 360° feedback');
    }

    // Seed leave request with approval steps
    const [lrCnt] = await sequelize.query('SELECT COUNT(*)::int AS cnt FROM leave_requests');
    if (lrCnt[0].cnt === 0) {
      const [lr] = await sequelize.query(`
        INSERT INTO leave_requests (tenant_id, employee_id, leave_type, start_date, end_date, total_days, reason, status, current_approval_step, total_approval_steps)
        VALUES ($1, $2, 'annual', CURRENT_DATE + 7, CURRENT_DATE + 9, 3, 'Liburan keluarga', 'pending', 1, 2)
        RETURNING id
      `, { bind: [emp.tenant_id, emp.id] });
      const lrId = lr[0].id;
      await sequelize.query(`
        INSERT INTO leave_approval_steps (leave_request_id, step_order, approver_role, status) VALUES
        ($1, 1, 'manager', 'pending'),
        ($1, 2, 'hr_manager', 'waiting')
      `, { bind: [lrId] });
      console.log('  ✓ seeded leave request with approval workflow');
    }
  }
  } catch (seedErr) {
    console.log('  ⚠ seed skipped:', seedErr.message);
  }

  // ── More branch KPI data from employees ──
  try {
  const period = new Date().toISOString().substring(0, 7);

  // Seed branches if empty (use first available tenant)
  const [branchCnt] = await sequelize.query('SELECT COUNT(*)::int AS cnt FROM branches');
  if (branchCnt[0].cnt === 0) {
    const [tenants] = await sequelize.query('SELECT id FROM tenants ORDER BY created_at LIMIT 1');
    const tenantId = tenants[0]?.id || null;
    const sampleBranches = [
      ['Cabang Pusat Jakarta', 'HQ-001', 'Jakarta'],
      ['Cabang Bandung', 'BR-002', 'Bandung'],
      ['Cabang Surabaya', 'BR-003', 'Surabaya'],
      ['Cabang Medan', 'BR-004', 'Medan'],
      ['Cabang Yogyakarta', 'BR-005', 'Yogyakarta'],
    ];
    for (const [name, code, city] of sampleBranches) {
      await sequelize.query(
        `INSERT INTO branches (name, code, city, tenant_id, is_active) VALUES ($1,$2,$3,$4,true)`,
        { bind: [name, code, city, tenantId] }
      );
    }
    console.log('  ✓ seeded sample branches');
  }

  const [branches] = await sequelize.query('SELECT id, name, code FROM branches LIMIT 5');
  for (const br of branches) {
    const [emps] = await sequelize.query(
      'SELECT id, tenant_id FROM employees WHERE branch_id = $1 AND is_active = true LIMIT 3',
      { bind: [br.id] }
    );
    const [tpls] = await sequelize.query('SELECT id, name, category, unit, default_weight FROM kpi_templates LIMIT 3');
    for (const emp of emps) {
      for (const tpl of tpls) {
        await sequelize.query(`
          INSERT INTO employee_kpis (tenant_id, employee_id, branch_id, template_id, period, metric_name, category, target, actual, unit, weight, status)
          SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active'
          WHERE NOT EXISTS (
            SELECT 1 FROM employee_kpis WHERE employee_id = $2 AND period = $5 AND metric_name = $6
          )
        `, {
          bind: [
            emp.tenant_id, emp.id, br.id, tpl.id, period, tpl.name, tpl.category,
            tpl.category === 'sales' ? 500000000 : 95,
            tpl.category === 'sales' ? 420000000 + Math.random() * 100000000 : 88 + Math.random() * 12,
            tpl.unit, tpl.default_weight,
          ],
        });
      }
    }
  }

  // Assign orphan employees + KPIs to first branch when no branch linked
  if (branches.length > 0) {
    const hqId = branches[0].id;
    await sequelize.query('UPDATE employees SET branch_id = $1 WHERE branch_id IS NULL', { bind: [hqId] });
    await sequelize.query(`
      UPDATE employee_kpis ek SET branch_id = e.branch_id
      FROM employees e WHERE ek.employee_id = e.id AND ek.branch_id IS NULL
    `);
  }

  console.log('✓ HRIS extended tables ready');
  } catch (kpiErr) {
    console.log('  ⚠ KPI seed skipped:', kpiErr.message);
    console.log('✓ HRIS extended tables ready');
  }
  await sequelize.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });

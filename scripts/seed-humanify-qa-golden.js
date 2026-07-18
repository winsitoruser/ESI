#!/usr/bin/env node
/**
 * Seed Humanify QA golden tenant (slug: qa-golden).
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/seed-humanify-qa-golden.js
 *   npm run seed:qa-golden
 */
require('dotenv').config();
const crypto = require('crypto');
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const SLUG = process.env.QA_GOLDEN_SLUG || 'qa-golden';
const COMPANY = process.env.QA_GOLDEN_COMPANY || 'Humanify QA Golden';
const ADMIN_EMAIL = process.env.QA_GOLDEN_EMAIL || 'qa-golden@humanify.test';
const ADMIN_PASSWORD = process.env.QA_GOLDEN_PASSWORD || 'QaGolden1!';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? {}
      : { ssl: { require: true, rejectUnauthorized: false } },
});

async function tableExists(name) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=:name LIMIT 1`,
    { replacements: { name } }
  );
  return rows.length > 0;
}

async function ensureTenant() {
  const [existing] = await sequelize.query(
    `SELECT id, slug, name FROM tenants WHERE slug = :slug LIMIT 1`,
    { replacements: { slug: SLUG } }
  );
  if (existing[0]) return existing[0];

  const id = crypto.randomUUID();
  const cols = new Set();
  const [colRows] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants'`
  );
  (colRows || []).forEach((r) => cols.add(r.column_name));

  const fields = [['id', id], ['slug', SLUG], ['name', COMPANY]];
  if (cols.has('code')) fields.push(['code', SLUG.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'QAGOLDEN']);
  if (cols.has('company_name')) fields.push(['company_name', COMPANY]);
  if (cols.has('status')) fields.push(['status', 'active']);
  if (cols.has('plan')) fields.push(['plan', 'pro']);
  if (cols.has('subscription_plan')) fields.push(['subscription_plan', 'pro']);
  if (cols.has('is_active')) fields.push(['is_active', true]);
  if (cols.has('created_at')) fields.push(['created_at', new Date()]);
  if (cols.has('updated_at')) fields.push(['updated_at', new Date()]);

  const names = fields.map((f) => `"${f[0]}"`).join(', ');
  const placeholders = fields.map((_, i) => `:v${i}`).join(', ');
  const repl = {};
  fields.forEach((f, i) => { repl[`v${i}`] = f[1]; });
  await sequelize.query(`INSERT INTO tenants (${names}) VALUES (${placeholders})`, { replacements: repl });
  console.log(`  ✓ tenant ${SLUG} created (${id})`);
  return { id, slug: SLUG, name: COMPANY };
}

async function ensureEmployee(tenantId, emp) {
  const code = `${SLUG.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${emp.code}`;
  const [exists] = await sequelize.query(
    `SELECT id FROM employees WHERE tenant_id = :tid AND (email = :email OR employee_code = :code) LIMIT 1`,
    { replacements: { tid: tenantId, email: emp.email, code } }
  );
  if (exists[0]) return exists[0].id;

  // Global unique on employee_code / email — skip if another tenant already owns them
  const [globalHit] = await sequelize.query(
    `SELECT id, tenant_id FROM employees WHERE email = :email OR employee_code = :code LIMIT 1`,
    { replacements: { email: emp.email, code } }
  );
  if (globalHit[0]) {
    console.warn(`  ⚠ skip ${emp.email} — already exists (tenant ${globalHit[0].tenant_id})`);
    return globalHit[0].tenant_id === tenantId ? globalHit[0].id : null;
  }

  const id = crypto.randomUUID();
  await sequelize.query(
    `INSERT INTO employees (
      id, tenant_id, employee_code, name, email, position, department,
      status, is_active, hire_date, work_location, employment_category, created_at, updated_at
    ) VALUES (
      :id, :tid, :code, :name, :email, :position, :department,
      'active', true, CURRENT_DATE - INTERVAL '180 days', 'ADMIN_OFFICE', 'permanent', NOW(), NOW()
    )`,
    {
      replacements: {
        id,
        tid: tenantId,
        code,
        name: emp.name,
        email: emp.email,
        position: emp.position,
        department: emp.department,
      },
    }
  );
  return id;
}

async function ensurePendingLeave(tenantId, employeeId, employeeName) {
  if (!(await tableExists('leave_requests'))) return;
  const [exists] = await sequelize.query(
    `SELECT id FROM leave_requests WHERE tenant_id = :tid AND employee_id = :eid AND status = 'pending' LIMIT 1`,
    { replacements: { tid: tenantId, eid: employeeId } }
  );
  if (exists[0]) return;
  try {
    await sequelize.query(
      `INSERT INTO leave_requests (
        tenant_id, employee_id, leave_type, start_date, end_date, total_days, status, reason, created_at, updated_at
      ) VALUES (
        :tid, :eid, 'annual', CURRENT_DATE + 7, CURRENT_DATE + 9, 3, 'pending',
        'QA golden pending leave', NOW(), NOW()
      )`,
      { replacements: { tid: tenantId, eid: employeeId } }
    );
    console.log(`  ✓ pending leave for ${employeeName}`);
  } catch (e) {
    console.warn('  leave seed skipped:', e.message);
  }
}

async function ensureContract(tenantId, employeeId) {
  if (!(await tableExists('employee_contracts'))) return;
  const [exists] = await sequelize.query(
    `SELECT id FROM employee_contracts WHERE tenant_id = :tid AND employee_id = :eid LIMIT 1`,
    { replacements: { tid: tenantId, eid: employeeId } }
  );
  if (exists[0]) return;
  try {
    await sequelize.query(
      `INSERT INTO employee_contracts (
        tenant_id, employee_id, contract_type, start_date, end_date, status, created_at, updated_at
      ) VALUES (
        :tid, :eid, 'PKWT', CURRENT_DATE - 300, CURRENT_DATE + 14, 'active', NOW(), NOW()
      )`,
      { replacements: { tid: tenantId, eid: employeeId } }
    );
  } catch (e) {
    console.warn('  contract seed skipped:', e.message);
  }
}

async function ensurePerformanceReview(tenantId, employeeId, employeeName) {
  if (!(await tableExists('performance_reviews'))) return;
  const [exists] = await sequelize.query(
    `SELECT id FROM performance_reviews WHERE tenant_id = :tid AND employee_id = :eid LIMIT 1`,
    { replacements: { tid: tenantId, eid: employeeId } }
  );
  if (exists[0]) return;
  try {
    await sequelize.query(
      `INSERT INTO performance_reviews (
        tenant_id, employee_id, employee_name, period, review_period, review_type,
        overall_score, overall_rating, status, created_at, updated_at
      ) VALUES (
        :tid, :eid, :name, '2026-H1', '2026-H1', 'mid_year',
        4.2, 4.2, 'draft', NOW(), NOW()
      )`,
      { replacements: { tid: tenantId, eid: employeeId, name: employeeName } }
    );
    console.log(`  ✓ performance review for ${employeeName}`);
  } catch (e) {
    console.warn('  performance seed skipped:', e.message);
  }
}

async function run() {
  await sequelize.authenticate();
  console.log(`🌱 Seeding QA golden tenant (${SLUG})...\n`);

  const tenant = await ensureTenant();
  const employees = [
    { name: 'QA Golden Manager', email: 'manager.qa-golden@humanify.test', position: 'HR Manager', department: 'HR', code: 'QG-001' },
    { name: 'QA Golden Staff', email: 'staff.qa-golden@humanify.test', position: 'Staff', department: 'Operations', code: 'QG-002' },
    { name: 'QA Golden Analyst', email: 'analyst.qa-golden@humanify.test', position: 'Analyst', department: 'Finance', code: 'QG-003' },
  ];

  const ids = [];
  for (const emp of employees) {
    const id = await ensureEmployee(tenant.id, emp);
    if (!id) continue;
    ids.push({ id, ...emp });
    console.log(`  ✓ employee ${emp.code} ${emp.name}`);
  }

  if (ids[1]) await ensurePendingLeave(tenant.id, ids[1].id, ids[1].name);
  if (ids[0]) await ensureContract(tenant.id, ids[0].id);
  if (ids[1]) await ensurePerformanceReview(tenant.id, ids[1].id, ids[1].name);

  console.log('\nDone.');
  console.log(`  Tenant: ${SLUG} (${tenant.id})`);
  console.log(`  Hint login: use existing platform user linked to tenant, or signup then re-point tenant.`);
  console.log(`  Optional env: QA_GOLDEN_EMAIL=${ADMIN_EMAIL} (not auto-created — users table varies by deploy)`);
  await sequelize.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Seed a dedicated Humanify sales-demo tenant + login that already has HR data.
 *
 * Scoped to slug `demo` only — never picks "first tenant" (unsafe on prod).
 * Idempotent. Safe to re-run.
 *
 *   DATABASE_URL=... node scripts/seed-humanify-sales-demo-account.js
 *   npm run seed:demo-account
 *
 * Env:
 *   DEMO_TENANT_SLUG      default demo
 *   DEMO_TENANT_COMPANY   default PT Nusantara Karya Demo
 *   DEMO_TENANT_EMAIL     default demo@humanify.id
 *   DEMO_TENANT_PASSWORD  default DemoHumanify1!
 *   DEMO_TENANT_PLAN      default growth
 */
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const SLUG = String(process.env.DEMO_TENANT_SLUG || 'demo').trim().toLowerCase();
const COMPANY = String(process.env.DEMO_TENANT_COMPANY || 'PT Nusantara Karya Demo').trim();
const EMAIL = String(process.env.DEMO_TENANT_EMAIL || 'demo@humanify.id').trim().toLowerCase();
const PASSWORD = String(process.env.DEMO_TENANT_PASSWORD || 'DemoHumanify1!');
const PLAN = String(process.env.DEMO_TENANT_PLAN || 'growth').trim().toLowerCase();
const OWNER_NAME = String(process.env.DEMO_TENANT_OWNER || 'Andi Pratama');
const PHONE = '+62 812-0000-0101';

if (PASSWORD.length < 8) {
  console.error('DEMO_TENANT_PASSWORD must be at least 8 characters');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? {}
      : { ssl: { require: true, rejectUnauthorized: false } },
});

const colCache = new Map();

async function tableExists(name) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = :name LIMIT 1`,
    { replacements: { name } },
  );
  return rows.length > 0;
}

async function colsOf(table) {
  if (colCache.has(table)) return colCache.get(table);
  const [rows] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = :table`,
    { replacements: { table } },
  );
  const set = new Set((rows || []).map((r) => r.column_name));
  colCache.set(table, set);
  return set;
}

function quoteIdent(name) {
  if (/^[a-z_][a-z0-9_]*$/.test(name)) return name;
  return `"${name.replace(/"/g, '""')}"`;
}

async function insertPicked(table, record) {
  const cols = await colsOf(table);
  const fields = Object.keys(record).filter((k) => cols.has(k) && record[k] !== undefined);
  if (!fields.length) return null;
  const replacements = {};
  const placeholders = fields.map((f, i) => {
    replacements[`v${i}`] = record[f];
    return `:v${i}`;
  });
  const returning = cols.has('id') ? ' RETURNING id' : '';
  const [rows] = await sequelize.query(
    `INSERT INTO ${quoteIdent(table)} (${fields.map(quoteIdent).join(', ')})
     VALUES (${placeholders.join(', ')})${returning}`,
    { replacements },
  );
  return rows?.[0]?.id ?? null;
}

async function columnType(table, column) {
  const [rows] = await sequelize.query(
    `SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = :table AND column_name = :column LIMIT 1`,
    { replacements: { table, column } },
  );
  return rows[0]?.data_type || null;
}

function newIdForType(dataType) {
  if (!dataType) return undefined;
  if (dataType === 'uuid') return crypto.randomUUID();
  return undefined;
}

async function updatePicked(table, record, whereSql, whereRepl) {
  const cols = await colsOf(table);
  const fields = Object.keys(record).filter((k) => cols.has(k) && record[k] !== undefined);
  if (!fields.length) return;
  const replacements = { ...whereRepl };
  const sets = fields.map((f, i) => {
    replacements[`u${i}`] = record[f];
    return `${quoteIdent(f)} = :u${i}`;
  });
  await sequelize.query(
    `UPDATE ${quoteIdent(table)} SET ${sets.join(', ')} WHERE ${whereSql}`,
    { replacements },
  );
}

function jakartaYmd(offsetDays = 0) {
  const ms = Date.now() + offsetDays * 86400000;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function jakartaWeekday(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).getUTCDay();
}

function demoSettings(prev) {
  let parsed = {};
  if (prev && typeof prev === 'object' && !Array.isArray(prev)) parsed = { ...prev };
  else if (typeof prev === 'string') {
    try { parsed = JSON.parse(prev) || {}; } catch { parsed = {}; }
  }
  parsed.product = parsed.product || 'humanify';
  parsed.saas_onboarding = {
    step: 5,
    completed: true,
    completedAt: new Date().toISOString(),
    company: { industry: 'professional_services', employeeRange: '11-50' },
    ...(parsed.saas_onboarding && typeof parsed.saas_onboarding === 'object'
      ? parsed.saas_onboarding
      : {}),
    completed: true,
    step: 5,
  };
  return parsed;
}

async function findDemoTenant() {
  const cols = await colsOf('tenants');
  if (cols.has('slug')) {
    const [rows] = await sequelize.query(
      `SELECT id, name, settings FROM tenants WHERE slug = :slug LIMIT 1`,
      { replacements: { slug: SLUG } },
    );
    if (rows[0]) return rows[0];
  }
  const code = SLUG.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'DEMO';
  if (cols.has('code')) {
    const [rows] = await sequelize.query(
      `SELECT id, name, settings FROM tenants WHERE code = :code LIMIT 1`,
      { replacements: { code } },
    );
    if (rows[0]) return rows[0];
  }
  if (cols.has('contact_email')) {
    const [rows] = await sequelize.query(
      `SELECT id, name, settings FROM tenants WHERE LOWER(TRIM(contact_email)) = :email LIMIT 1`,
      { replacements: { email: EMAIL } },
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

async function writeTenantSettings(id, settingsJson) {
  const cols = await colsOf('tenants');
  if (!cols.has('settings')) return;
  try {
    await sequelize.query(
      `UPDATE tenants SET settings = CAST(:settings AS jsonb) WHERE id = :id`,
      { replacements: { settings: settingsJson, id } },
    );
  } catch {
    await sequelize.query(
      `UPDATE tenants SET settings = CAST(:settings AS json) WHERE id = :id`,
      { replacements: { settings: settingsJson, id } },
    );
  }
}

async function ensureTenant() {
  const existing = await findDemoTenant();
  const settings = JSON.stringify(demoSettings(existing?.settings));

  const patch = {
    name: COMPANY,
    business_name: COMPANY,
    status: 'active',
    is_active: true,
    subscription_plan: PLAN,
    setup_completed: true,
    onboarding_step: 99,
    contact_name: OWNER_NAME,
    contact_email: EMAIL,
    contact_phone: PHONE,
    max_users: 50,
    max_branches: 3,
  };

  if (existing) {
    await updatePicked('tenants', { ...patch, updated_at: new Date() }, 'id = :id', {
      id: existing.id,
    });
    await writeTenantSettings(existing.id, settings);
    console.log(`  ✓ tenant ${SLUG} updated (${existing.id})`);
    return existing.id;
  }

  const id = crypto.randomUUID();
  const code = SLUG.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'DEMO';
  await insertPicked('tenants', {
    id,
    slug: SLUG,
    name: COMPANY,
    code,
    company_name: COMPANY,
    ...patch,
    created_at: new Date(),
    updated_at: new Date(),
  });
  await writeTenantSettings(id, settings);
  console.log(`  ✓ tenant ${SLUG} created (${id})`);
  return id;
}

async function ensureOwner(tenantId) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const [rows] = await sequelize.query(
    `SELECT id, email, tenant_id FROM users WHERE LOWER(TRIM(email)) = :email LIMIT 1`,
    { replacements: { email: EMAIL } },
  );
  const existing = rows[0];

  if (existing && existing.tenant_id && String(existing.tenant_id) !== String(tenantId)) {
    throw new Error(
      `Email ${EMAIL} sudah terikat tenant lain (${existing.tenant_id}). Tidak menimpa akun existing.`,
    );
  }

  const userCols = await colsOf('users');
  const isActiveCol = userCols.has('isActive') ? 'isActive' : userCols.has('is_active') ? 'is_active' : null;
  const createdCol = userCols.has('createdAt') ? 'createdAt' : 'created_at';
  const updatedCol = userCols.has('updatedAt') ? 'updatedAt' : 'updated_at';
  const businessCol = userCols.has('businessName')
    ? 'businessName'
    : userCols.has('business_name')
      ? 'business_name'
      : null;

  const base = {
    name: OWNER_NAME,
    email: EMAIL,
    password: hash,
    role: 'owner',
    tenant_id: tenantId,
    phone: PHONE,
    data_scope: 'all_branches',
  };
  if (isActiveCol) base[isActiveCol] = true;
  if (businessCol) base[businessCol] = COMPANY;
  if (userCols.has('email_verified')) base.email_verified = true;
  if (userCols.has('emailVerified')) base.emailVerified = true;

  if (!existing) {
    base[createdCol] = new Date();
    base[updatedCol] = new Date();
    await insertPicked('users', base);
    console.log(`  ✓ user ${EMAIL} created`);
  } else {
    base[updatedCol] = new Date();
    await updatePicked('users', base, 'id = :id', { id: existing.id });
    console.log(`  ✓ user ${EMAIL} updated (id=${existing.id})`);
  }

  const [again] = await sequelize.query(
    `SELECT id FROM users WHERE LOWER(TRIM(email)) = :email LIMIT 1`,
    { replacements: { email: EMAIL } },
  );
  return again[0].id;
}

async function ensureMembership(userId, tenantId) {
  if (!(await tableExists('saas_company_memberships'))) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS saas_company_memberships (
        id UUID PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        tenant_id UUID NOT NULL,
        role VARCHAR(16) NOT NULL DEFAULT 'owner',
        is_default BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_switched_at TIMESTAMPTZ
      )
    `);
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_co_mem_user_tenant
      ON saas_company_memberships (user_id, tenant_id)
    `);
    colCache.delete('saas_company_memberships');
  }

  const uid = String(userId);
  const [hit] = await sequelize.query(
    `SELECT id FROM saas_company_memberships WHERE user_id = :uid AND tenant_id = :tid LIMIT 1`,
    { replacements: { uid, tid: tenantId } },
  );
  if (hit[0]) {
    await sequelize.query(
      `UPDATE saas_company_memberships
         SET role = 'owner', status = 'active', is_default = true, updated_at = NOW()
       WHERE id = :id`,
      { replacements: { id: hit[0].id } },
    );
  } else {
    await insertPicked('saas_company_memberships', {
      id: crypto.randomUUID(),
      user_id: uid,
      tenant_id: tenantId,
      role: 'owner',
      is_default: true,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
  await sequelize.query(
    `UPDATE saas_company_memberships
        SET is_default = false, updated_at = NOW()
      WHERE user_id = :uid AND tenant_id <> :tid AND is_default = true`,
    { replacements: { uid, tid: tenantId } },
  );
  console.log('  ✓ membership owner (default)');
}

async function ensureBranch(tenantId) {
  if (!(await tableExists('branches'))) return null;
  const code = 'DEMO-HQ';
  const [hit] = await sequelize.query(
    `SELECT id FROM branches WHERE tenant_id = :tid AND code = :code LIMIT 1`,
    { replacements: { tid: tenantId, code } },
  );
  if (hit[0]) return hit[0].id;
  const [global] = await sequelize.query(`SELECT id FROM branches WHERE code = :code LIMIT 1`, {
    replacements: { code },
  });
  if (global[0]) {
    await sequelize.query(`UPDATE branches SET tenant_id = :tid WHERE id = :id AND tenant_id IS NULL`, {
      replacements: { tid: tenantId, id: global[0].id },
    });
    return global[0].id;
  }
  const id = crypto.randomUUID();
  try {
    await insertPicked('branches', {
      id,
      tenant_id: tenantId,
      name: 'Kantor Pusat Jakarta',
      code,
      city: 'Jakarta',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log('  ✓ branch DEMO-HQ');
    return id;
  } catch (e) {
    console.warn('  branch skipped:', e.message);
    return null;
  }
}

const DEMO_EMPLOYEES = [
  { code: '001', name: 'Siti Rahayu', email: 'siti.rahayu', position: 'HR Manager', department: 'HR', salary: 12000000 },
  { code: '002', name: 'Budi Santoso', email: 'budi.santoso', position: 'Finance Manager', department: 'Finance', salary: 11500000 },
  { code: '003', name: 'Dewi Lestari', email: 'dewi.lestari', position: 'Staff HR', department: 'HR', salary: 6500000 },
  { code: '004', name: 'Eko Prasetyo', email: 'eko.prasetyo', position: 'Staff Finance', department: 'Finance', salary: 6200000 },
  { code: '005', name: 'Rina Susanti', email: 'rina.susanti', position: 'Supervisor Operasi', department: 'Operations', salary: 8000000 },
  { code: '006', name: 'Hendra Gunawan', email: 'hendra.gunawan', position: 'Staff Operasi', department: 'Operations', salary: 5500000 },
  { code: '007', name: 'Putri Amelia', email: 'putri.amelia', position: 'Staff Sales', department: 'Sales', salary: 5800000 },
  { code: '008', name: 'Rizky Firmansyah', email: 'rizky.firmansyah', position: 'Staff Sales', department: 'Sales', salary: 5400000 },
  { code: '009', name: 'Lisa Permata', email: 'lisa.permata', position: 'Payroll Officer', department: 'Finance', salary: 7000000 },
  { code: '010', name: 'Ahmad Wijaya', email: 'ahmad.wijaya', position: 'IT Support', department: 'IT', salary: 7500000 },
];

async function ensureEmployees(tenantId, branchId) {
  const mailDomain = `${SLUG.replace(/[^a-z0-9-]/gi, '')}.humanify.test`;
  const prefix = SLUG.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'DEMO';
  const empCols = await colsOf('employees');
  const codeCol = empCols.has('employee_code')
    ? 'employee_code'
    : empCols.has('employee_id')
      ? 'employee_id'
      : null;
  const ids = [];

  for (const emp of DEMO_EMPLOYEES) {
    const email = `${emp.email}@${mailDomain}`;
    const code = `${prefix}-${emp.code}`;
    const orCode = codeCol ? ` OR ${codeCol} = :code` : '';
    const [exists] = await sequelize.query(
      `SELECT id FROM employees WHERE tenant_id = :tid AND (email = :email${orCode}) LIMIT 1`,
      { replacements: { tid: tenantId, email, code } },
    );
    if (exists[0]) {
      ids.push({ id: exists[0].id, ...emp, email, code });
      continue;
    }

    const [globalHit] = await sequelize.query(
      `SELECT id, tenant_id FROM employees WHERE email = :email${orCode} LIMIT 1`,
      { replacements: { email, code } },
    );
    if (globalHit[0]) {
      if (String(globalHit[0].tenant_id) === String(tenantId)) {
        ids.push({ id: globalHit[0].id, ...emp, email, code });
      } else {
        console.warn(`  ⚠ skip ${email} — owned by another tenant`);
      }
      continue;
    }

    const empIdType = await columnType('employees', 'id');
    const id = newIdForType(empIdType);
    const hire = jakartaYmd(-180 - Number(emp.code) * 14);
    const phone = `0812${String(10000000 + Number(emp.code)).slice(-8)}`;
    const record = {
      tenant_id: tenantId,
      employee_code: code,
      employee_id: code,
      name: emp.name,
      email,
      position: emp.position,
      department: emp.department,
      status: 'active',
      is_active: true,
      hire_date: hire,
      join_date: hire,
      work_location: 'ADMIN_OFFICE',
      employment_category: 'permanent',
      branch_id: branchId,
      phone,
      phone_number: phone,
      base_salary: emp.salary,
      created_at: new Date(),
      updated_at: new Date(),
    };
    if (id) record.id = id;
    try {
      const insertedId = await insertPicked('employees', record);
      const rowId = insertedId || id;
      if (!rowId) {
        const [again] = await sequelize.query(
          `SELECT id FROM employees WHERE tenant_id = :tid AND email = :email LIMIT 1`,
          { replacements: { tid: tenantId, email } },
        );
        if (!again[0]) throw new Error('insert succeeded without id');
        ids.push({ id: again[0].id, ...emp, email, code });
      } else {
        ids.push({ id: rowId, ...emp, email, code });
      }
      console.log(`  ✓ employee ${code} ${emp.name}`);
    } catch (e) {
      console.warn(`  employee ${code} skipped:`, e.message);
    }
  }
  return ids;
}

async function ensureAttendance(tenantId, employees) {
  if (!(await tableExists('employee_attendance')) || !employees.length) return 0;
  let added = 0;
  for (let d = 0; d < 10; d++) {
    const dateStr = jakartaYmd(-d);
    const dow = jakartaWeekday(dateStr);
    if (dow === 0 || dow === 6) continue;
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const late = i % 7 === 0 ? 12 : 0;
      const status = i === 9 && d === 1 ? 'absent' : late > 0 ? 'late' : 'present';
      const workHours = status === 'absent' ? 0 : 8;
      try {
        const [ins] = await sequelize.query(
          `
          INSERT INTO employee_attendance (
            tenant_id, employee_id, date, clock_in, clock_out, status, late_minutes, work_hours
          )
          SELECT :tid, :eid, :dt::date,
            CASE WHEN :status = 'absent' THEN NULL
                 ELSE ((:dt::date + TIME '08:00') + make_interval(mins => :late)) END,
            CASE WHEN :status = 'absent' THEN NULL ELSE (:dt::date + TIME '17:00') END,
            :status, :late, :hours
          WHERE NOT EXISTS (
            SELECT 1 FROM employee_attendance WHERE employee_id = :eid AND date = :dt::date
          )
          RETURNING id
          `,
          {
            replacements: {
              tid: tenantId,
              eid: emp.id,
              dt: dateStr,
              status,
              late,
              hours: workHours,
            },
          },
        );
        if (ins.length) added++;
      } catch (e) {
        console.warn('  attendance skipped:', e.message);
        return added;
      }
    }
  }
  console.log(`  ✓ attendance +${added}`);
  return added;
}

async function ensureLeave(tenantId, employees) {
  if (!(await tableExists('leave_requests')) || employees.length < 3) return;
  const samples = [
    { emp: employees[2], type: 'annual', startOff: 7, days: 3, status: 'pending', reason: 'Cuti tahunan keluarga' },
    { emp: employees[5], type: 'sick', startOff: 1, days: 1, status: 'pending', reason: 'Sakit demam' },
    { emp: employees[3], type: 'annual', startOff: -8, days: 2, status: 'approved', reason: 'Cuti sudah disetujui' },
  ];
  for (const s of samples) {
    const start = jakartaYmd(s.startOff);
    const end = jakartaYmd(s.startOff + s.days - 1);
    const [exists] = await sequelize.query(
      `SELECT id FROM leave_requests
        WHERE tenant_id = :tid AND employee_id::text = :eid AND start_date = :start::date
        LIMIT 1`,
      { replacements: { tid: tenantId, eid: String(s.emp.id), start } },
    );
    if (exists[0]) continue;
    try {
      const leaveIdType = await columnType('leave_requests', 'id');
      const rec = {
        tenant_id: tenantId,
        employee_id: s.emp.id,
        leave_type: s.type,
        start_date: start,
        end_date: end,
        total_days: s.days,
        status: s.status,
        reason: s.reason,
        current_approval_step: s.status === 'pending' ? 1 : 1,
        total_approval_steps: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const lid = newIdForType(leaveIdType);
      if (lid) rec.id = lid;
      await insertPicked('leave_requests', rec);
      console.log(`  ✓ leave ${s.status} for ${s.emp.name}`);
    } catch (e) {
      console.warn('  leave skipped:', e.message);
    }
  }
}

async function ensureContractAndReview(tenantId, employees) {
  const mgr = employees[0];
  const staff = employees[2];
  if (mgr && (await tableExists('employee_contracts'))) {
    const [exists] = await sequelize.query(
      `SELECT id FROM employee_contracts WHERE tenant_id = :tid AND employee_id::text = :eid LIMIT 1`,
      { replacements: { tid: tenantId, eid: String(mgr.id) } },
    );
    if (!exists[0]) {
      try {
        await insertPicked('employee_contracts', {
          tenant_id: tenantId,
          employee_id: mgr.id,
          contract_type: 'PKWTT',
          start_date: jakartaYmd(-400),
          end_date: null,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  ✓ contract for ${mgr.name}`);
      } catch (e) {
        console.warn('  contract skipped:', e.message);
      }
    }
  }
  if (staff && (await tableExists('performance_reviews'))) {
    const [exists] = await sequelize.query(
      `SELECT id FROM performance_reviews WHERE tenant_id = :tid AND employee_id::text = :eid LIMIT 1`,
      { replacements: { tid: tenantId, eid: String(staff.id) } },
    );
    if (!exists[0]) {
      try {
        await insertPicked('performance_reviews', {
          tenant_id: tenantId,
          employee_id: staff.id,
          employee_name: staff.name,
          period: '2026-H1',
          review_period: '2026-H1',
          review_type: 'mid_year',
          overall_score: 4.2,
          overall_rating: 4.2,
          status: 'draft',
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  ✓ review for ${staff.name}`);
      } catch (e) {
        console.warn('  review skipped:', e.message);
      }
    }
  }
}

async function ensureSalaries(tenantId, employees) {
  const table = (await tableExists('employee_salaries'))
    ? 'employee_salaries'
    : (await tableExists('employee_salary'))
      ? 'employee_salary'
      : null;
  if (!table) return;
  for (const emp of employees) {
    const [exists] = await sequelize.query(
      `SELECT id FROM ${table} WHERE tenant_id = :tid AND employee_id::text = :eid LIMIT 1`,
      { replacements: { tid: tenantId, eid: String(emp.id) } },
    );
    if (exists[0]) continue;
    try {
      await insertPicked(table, {
        id: newIdForType(await columnType(table, 'id')),
        tenant_id: tenantId,
        employee_id: emp.id,
        pay_type: 'monthly',
        base_salary: emp.salary,
        bpjs_eligible: true,
        tax_eligible: true,
        is_active: true,
        start_date: jakartaYmd(-30),
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch (e) {
      console.warn('  salary skipped:', e.message);
      return;
    }
  }
  console.log('  ✓ salaries');
}

async function run() {
  await sequelize.authenticate();
  console.log(`🌱 Seeding Humanify sales demo (${SLUG})...\n`);

  const tenantId = await ensureTenant();
  const userId = await ensureOwner(tenantId);
  await ensureMembership(userId, tenantId);
  const branchId = await ensureBranch(tenantId);
  const employees = await ensureEmployees(tenantId, branchId);
  await ensureAttendance(tenantId, employees);
  await ensureLeave(tenantId, employees);
  await ensureContractAndReview(tenantId, employees);
  await ensureSalaries(tenantId, employees);

  const [empCount] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM employees WHERE tenant_id = :tid`,
    { replacements: { tid: tenantId } },
  );
  const [attCount] = await sequelize.query(
    (await tableExists('employee_attendance'))
      ? `SELECT COUNT(*)::int AS c FROM employee_attendance WHERE tenant_id = :tid`
      : `SELECT 0::int AS c`,
    { replacements: { tid: tenantId } },
  );

  console.log('\n' + '='.repeat(56));
  console.log('  Humanify demo account siap');
  console.log('='.repeat(56));
  console.log(`  Perusahaan : ${COMPANY}`);
  console.log(`  Slug       : ${SLUG}`);
  console.log(`  Plan       : ${PLAN}`);
  console.log(`  Email      : ${EMAIL}`);
  console.log(`  Password   : ${PASSWORD}`);
  console.log(`  Role       : owner`);
  console.log(`  Karyawan   : ${empCount[0]?.c ?? 0}`);
  console.log(`  Absensi    : ${attCount[0]?.c ?? 0}`);
  const loginUrl = /localhost|127\.0\.0\.1/.test(DATABASE_URL)
    ? 'http://localhost:3010/humanify/login'
    : 'https://humanify.id/humanify/login';
  console.log(`  Login      : ${loginUrl}`);
  console.log('='.repeat(56));

  await sequelize.close();
}

run().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});

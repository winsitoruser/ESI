/**
 * Employee Genealogy — add supervisor_id + work_role columns & seed hierarchy
 * Run: npm run db:employee-genealogy-migrate
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
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

function inferWorkRole(position) {
  const p = (position || '').toLowerCase();
  if (/super\s*admin|ceo|direktur|presiden|chief|founder/i.test(p)) return 'EXECUTIVE';
  if (/manager|manajer|kepala\s*divisi|head\s*of/i.test(p)) return 'MANAGER';
  if (/supervisor|supervis|lead|senior|kepala\s*chef|head\s*chef|kasir\s*senior/i.test(p)) return 'SUPERVISOR';
  return 'STAFF';
}

async function migrate() {
  await sequelize.authenticate();
  console.log('Connected to database\n');

  // Add columns
  await sequelize.query(`
    ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS work_role VARCHAR(20) DEFAULT 'STAFF'
  `);
  console.log('  ✓ supervisor_id, work_role columns');

  try {
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_employees_supervisor_id ON employees(supervisor_id)`);
    console.log('  ✓ index on supervisor_id');
  } catch { /* ignore */ }

  // Load employees
  const [emps] = await sequelize.query(`
    SELECT e.id, e.employee_code, e.name, e.position, e.department, e.branch_id, e.supervisor_id, e.work_role
    FROM employees e
    ORDER BY e.name
  `);

  if (!emps.length) {
    console.log('  ⚠ No employees found — skipping seed');
    await sequelize.close();
    return;
  }

  const byCode = Object.fromEntries(emps.map((e) => [e.employee_code, e]));
  const byId = Object.fromEntries(emps.map((e) => [e.id, e]));

  const findByPosition = (pattern, branchId) =>
    emps.find((e) => pattern.test(e.position) && (!branchId || e.branch_id === branchId));

  const findBM = (branchId) =>
    emps.find((e) => /branch\s*manager/i.test(e.position) && e.branch_id === branchId);

  const superAdmin = emps.find((e) => /super\s*admin/i.test(e.position)) || emps[0];

  const assignments = [];

  for (const emp of emps) {
    const workRole = inferWorkRole(emp.position);
    let supervisorId = null;

    if (emp.id === superAdmin.id) {
      supervisorId = null;
    } else if (/finance\s*manager/i.test(emp.position)) {
      supervisorId = superAdmin.id;
    } else if (/branch\s*manager/i.test(emp.position)) {
      supervisorId = superAdmin.id;
    } else if (/supervisor/i.test(emp.position)) {
      const bm = findBM(emp.branch_id);
      const financeMgr = findByPosition(/finance\s*manager/i, emp.branch_id);
      supervisorId = (bm || financeMgr || superAdmin).id;
    } else if (/kasir\s*senior|head\s*chef/i.test(emp.position)) {
      const sup = findByPosition(/supervisor/i, emp.branch_id);
      const bm = findBM(emp.branch_id);
      supervisorId = (sup || bm || superAdmin).id;
    } else if (/staff|kasir/i.test(emp.position)) {
      const sup = findByPosition(/supervisor|kasir\s*senior/i, emp.branch_id);
      const bm = findBM(emp.branch_id);
      supervisorId = (sup || bm || superAdmin).id;
    } else {
      const bm = findBM(emp.branch_id);
      supervisorId = (bm || superAdmin).id;
    }

    // Only seed if not already set
    if (!emp.supervisor_id) {
      assignments.push({ id: emp.id, supervisorId, workRole, name: emp.name });
    } else {
      assignments.push({ id: emp.id, supervisorId: emp.supervisor_id, workRole: emp.work_role || workRole, name: emp.name, skip: true });
    }
  }

  let updated = 0;
  for (const a of assignments) {
    if (a.skip && a.workRole === byId[a.id]?.work_role) continue;
    await sequelize.query(
      `UPDATE employees SET supervisor_id = :supervisorId, work_role = :workRole, updated_at = NOW() WHERE id = :id`,
      { replacements: { id: a.id, supervisorId: a.supervisorId, workRole: a.workRole } }
    );
    updated++;
    const supName = a.supervisorId ? byId[a.supervisorId]?.name || '?' : '(root)';
    console.log(`  → ${a.name} [${a.workRole}] → atasan: ${supName}`);
  }

  console.log(`\n✓ Genealogy migration complete (${updated} employees updated)`);
  await sequelize.close();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});

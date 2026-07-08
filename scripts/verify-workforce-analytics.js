/**
 * Verify Workforce Analytics integration
 * Run: node scripts/verify-workforce-analytics.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: false });

let passed = 0;
let failed = 0;
const ok = (msg) => { console.log('  ✓', msg); passed++; };
const fail = (msg, e) => { console.log('  ✗', msg, e ? `- ${e}` : ''); failed++; };

async function main() {
  console.log('Verifying Workforce Analytics...\n');

  const tables = ['headcount_plans', 'manpower_budgets', 'termination_requests', 'employees', 'employee_attendance'];
  for (const t of tables) {
    try {
      const [r] = await sequelize.query(
        `SELECT COUNT(*)::int c FROM information_schema.tables WHERE table_name = '${t}'`
      );
      if (r[0].c > 0) ok(`table ${t} exists`);
      else fail(`table ${t} missing`);
    } catch (e) { fail(`table ${t}`, e.message); }
  }

  const HeadcountPlan = require('../models/HeadcountPlan');
  const ManpowerBudget = require('../models/ManpowerBudget');

  const plans = await HeadcountPlan.findAll({ limit: 5 });
  ok(`headcount plans readable (${plans.length} rows)`);
  if (plans[0]) {
    const p = plans[0].toJSON();
    if (p.periodStart && p.name) ok('HeadcountPlan model fields OK');
    else fail('HeadcountPlan model fields missing');
  }

  const budgets = await ManpowerBudget.findAll({ limit: 5 });
  ok(`manpower budgets readable (${budgets.length} rows)`);

  // Test create + delete headcount plan
  const testPlan = await HeadcountPlan.create({
    name: 'QA Test Plan',
    periodStart: '2026-07-01',
    periodEnd: '2026-12-31',
    department: 'QA',
    currentHeadcount: 1,
    plannedHeadcount: 2,
    budgetAmount: 500000,
    status: 'draft',
  });
  if (testPlan.id) ok('create headcount plan');
  else fail('create headcount plan');
  await testPlan.destroy();
  ok('delete headcount plan');

  const testBudget = await ManpowerBudget.create({
    fiscalYear: 2026,
    department: 'QA',
    budgetCategory: 'training',
    plannedAmount: 1000000,
    actualAmount: 250000,
    variance: 750000,
    status: 'draft',
  });
  if (testBudget.id) ok('create manpower budget');
  await testBudget.destroy();
  ok('delete manpower budget');

  // Overview queries
  try {
    const [emp] = await sequelize.query(`SELECT COUNT(*)::int as total FROM employees`);
    ok(`employees count: ${emp[0].total}`);
  } catch (e) { fail('employees query', e.message); }

  try {
    const [att] = await sequelize.query(`
      SELECT COUNT(*)::int as total,
             COUNT(*) FILTER (WHERE status IN ('present','late')) as present,
             COALESCE(
               AVG(work_hours) FILTER (WHERE work_hours IS NOT NULL AND work_hours > 0),
               AVG(EXTRACT(EPOCH FROM (clock_out - clock_in))/3600)
                 FILTER (WHERE clock_out IS NOT NULL AND clock_in IS NOT NULL)
             ) as avg_hours
      FROM employee_attendance WHERE date >= CURRENT_DATE - 30
    `);
    ok(`attendance records (30d): ${att[0].total}, present: ${att[0].present}, avg_hours: ${Number(att[0].avg_hours || 0).toFixed(1)}`);
  } catch (e) { fail('attendance query', e.message); }

  try {
    const [tr] = await sequelize.query(`SELECT COUNT(*)::int as c FROM termination_requests`);
    ok(`termination requests: ${tr[0].c}`);
  } catch (e) { fail('termination query', e.message); }

  // Chart data contract (mirrors workforce-analytics.tsx useMemo)
  try {
    const [depts] = await sequelize.query(`
      SELECT department, COUNT(*)::int as count FROM employees
      WHERE department IS NOT NULL AND department <> ''
      GROUP BY department ORDER BY count DESC LIMIT 10
    `);
    const [trend] = await sequelize.query(`
      SELECT DATE_TRUNC('month', created_at) as month, COUNT(*)::int as hires
      FROM employees WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at) ORDER BY month
    `);
    const [byMonth] = await sequelize.query(`
      SELECT DATE_TRUNC('month', created_at) as month, COUNT(*)::int as count
      FROM termination_requests
      WHERE status IN ('approved','completed') AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at) ORDER BY month
    `);
    const monthKey = (raw) => (raw ? new Date(raw).toISOString().slice(0, 7) : '');
    const hiresMap = new Map();
    trend.forEach((m) => { const k = monthKey(m.month); if (k) hiresMap.set(k, parseInt(m.hires, 10) || 0); });
    const resignMap = new Map();
    byMonth.forEach((m) => { const k = monthKey(m.month); if (k) resignMap.set(k, parseInt(m.count, 10) || 0); });
    const chartMonths = new Set([...hiresMap.keys(), ...resignMap.keys()]);
    if (depts.length > 0) ok(`dashboard doughnut: ${depts.length} departments`);
    else fail('dashboard doughnut: no department data');
    ok(`dashboard area chart: ${chartMonths.size} month(s) merged`);
  } catch (e) { fail('chart contract', e.message); }

  await sequelize.close();
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

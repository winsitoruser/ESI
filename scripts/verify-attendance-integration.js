#!/usr/bin/env node
/**
 * Verify HRIS Attendance DB queries (no HTTP)
 * Run: node scripts/verify-attendance-integration.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const seq = new Sequelize(process.env.DATABASE_URL || process.env.POSTGRES_URL, { dialect: 'postgres', logging: false });
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', m, d ? `- ${d}` : ''); failed++; };

function mapDailyRow(r) {
  return {
    id: r.id,
    employeeId: r.employee_code || r.employee_id,
    employeeName: r.employee_name || 'Unknown',
    branchName: r.branch_name || 'HQ',
    status: r.status,
    clockIn: r.clock_in,
    clockOut: r.clock_out,
  };
}

async function main() {
  console.log('Verifying Attendance integration (DB layer)\n');
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  try {
    const [todayRows] = await seq.query(`
      SELECT ea.id, ea.employee_id, ea.clock_in, ea.clock_out, ea.status,
             e.name as employee_name, e.employee_code,
             COALESCE(b.name, 'HQ') as branch_name
      FROM employee_attendance ea
      LEFT JOIN employees e ON ea.employee_id::text = e.id::text
      LEFT JOIN branches b ON ea.branch_id::text = b.id::text
      WHERE ea.date = :today
      ORDER BY ea.clock_in DESC NULLS LAST
    `, { replacements: { today } });
    if (todayRows.length > 0) ok(`live today: ${todayRows.length} records`);
    else fail('live today: no records');

    const [dailyRows] = await seq.query(`
      SELECT ea.id, ea.employee_id, ea.clock_in, ea.clock_out, ea.status,
             e.name as employee_name, e.employee_code,
             COALESCE(b.name, 'HQ') as branch_name
      FROM employee_attendance ea
      LEFT JOIN employees e ON ea.employee_id::text = e.id::text
      LEFT JOIN branches b ON ea.branch_id::text = b.id::text
      WHERE ea.date = :today
    `, { replacements: { today } });
    const daily = dailyRows.map(mapDailyRow);
    if (daily[0]?.employeeName && daily[0]?.employeeName !== 'Ahmad Wijaya') ok(`daily mapped: ${daily[0].employeeName}`);
    else if (daily.length === 0) fail('daily mapped: empty');
    else fail('daily mapped: still mock-like data');

    const [monthlyRows] = await seq.query(`
      SELECT ea.employee_id, e.name as employee_name, e.employee_code, e.position,
             COALESCE(b.name, 'HQ') as branch_name,
             COUNT(*)::int as total_days,
             COUNT(*) FILTER (WHERE ea.status IN ('present', 'late', 'work_from_home'))::int as present
      FROM employee_attendance ea
      LEFT JOIN employees e ON ea.employee_id::text = e.id::text
      LEFT JOIN branches b ON ea.branch_id::text = b.id::text
      WHERE ea.date >= :startDate AND ea.date <= :endDate
      GROUP BY ea.employee_id, e.name, e.employee_code, e.position, b.name
    `, { replacements: { startDate, endDate } });
    if (monthlyRows.length > 0) ok(`monthly aggregate: ${monthlyRows.length} employees`);
    else fail('monthly aggregate: empty');

    const [tables] = await seq.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('work_shifts','employee_attendance','employees')
    `);
    const names = tables.map((t) => t.table_name);
    if (names.includes('employee_attendance')) ok('employee_attendance table exists');
  } catch (e) {
    fail('query error', e.message);
  }

  await seq.close();
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

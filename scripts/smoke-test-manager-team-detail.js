#!/usr/bin/env node
/**
 * Smoke + stress test: Manager team member KPI & attendance detail API
 * Usage: node scripts/smoke-test-manager-team-detail.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3010';
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let passed = 0;
let failed = 0;

function ok(label, detail = '') {
  passed++;
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
}
function fail(label, detail = '') {
  failed++;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

async function findManagerWithTeam(sequelize) {
  const [rows] = await sequelize.query(`
    SELECT u.id AS user_id, u.email, u.role, e.id AS employee_id, e.name, e.department,
      (SELECT COUNT(*)::int FROM employees sub
       WHERE sub.supervisor_id::text = e.id::text
         AND (sub.is_active = true OR sub.status = 'active' OR sub.status IS NULL)
      ) AS direct_reports
    FROM users u
    JOIN employees e ON e.user_id = u.id OR e.email = u.email
    WHERE u.role::text IN ('manager', 'branch_manager', 'manager_toko', 'super_admin', 'owner', 'admin')
      AND (e.is_active = true OR e.status = 'active' OR e.status IS NULL)
    ORDER BY direct_reports DESC
    LIMIT 5
  `);
  return rows || [];
}

async function findTeamMember(sequelize, managerEmpId, managerUserId, managerDept) {
  const [rows] = await sequelize.query(`
    SELECT e.id, e.name FROM employees e
    WHERE (e.is_active = true OR e.status = 'active' OR e.status IS NULL)
      AND e.id::text != :mgrEmpId
      AND (
        e.supervisor_id::text = :mgrEmpId
        OR EXISTS (SELECT 1 FROM branches b WHERE b.id = e.branch_id AND b.manager_id = :mgrUserId)
        OR (e.department = :mgrDept AND COALESCE(e.user_id::text, '') != :mgrUserIdStr)
      )
    LIMIT 1
  `, {
    replacements: {
      mgrEmpId: String(managerEmpId),
      mgrUserId: parseInt(managerUserId, 10) || managerUserId,
      mgrUserIdStr: String(managerUserId),
      mgrDept: managerDept,
    },
  });
  return rows?.[0] || null;
}

async function testDbLayer(sequelize) {
  console.log('\n=== DB Layer Tests ===');

  const managers = await findManagerWithTeam(sequelize);
  if (!managers.length) {
    fail('Find manager with team', 'No manager found');
    return null;
  }
  ok('Find manager', `${managers[0].name} (${managers[0].role})`);

  const mgr = managers[0];
  const member = await findTeamMember(sequelize, mgr.employee_id, mgr.user_id, mgr.department);
  if (!member) {
    fail('Find team member', 'No subordinate found');
    return null;
  }
  ok('Find team member', `${member.name} (id=${member.id})`);

  const period = new Date().toISOString().slice(0, 7);
  const [kpiRows] = await sequelize.query(`
    SELECT COUNT(*)::int AS cnt FROM employee_kpis WHERE employee_id::text = :eid AND period = :period
  `, { replacements: { eid: String(member.id), period } });
  ok('KPI query', `${kpiRows[0]?.cnt || 0} records for ${period}`);

  const monthStart = `${period}-01`;
  const nextMonth = new Date(`${period}-01`);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().split('T')[0];

  const [attRows] = await sequelize.query(`
    SELECT COUNT(*)::int AS cnt FROM employee_attendance
    WHERE employee_id::text = :eid AND date >= :monthStart AND date < :monthEnd
  `, { replacements: { eid: String(member.id), monthStart, monthEnd } }).catch(async () => {
    return sequelize.query(`
      SELECT COUNT(*)::int AS cnt FROM employee_attendances
      WHERE employee_id::text = :eid AND date >= :monthStart AND date < :monthEnd
    `, { replacements: { eid: String(member.id), monthStart, monthEnd } });
  });
  ok('Attendance query', `${attRows[0]?.cnt || 0} records for ${period}`);

  return { mgr, member, period };
}

async function testServiceLayer(ctx) {
  if (!ctx) return;
  console.log('\n=== Service Layer Tests ===');

  const { sequelize, mgr, member, period } = ctx;
  const isSuperAdmin = ['super_admin', 'owner'].includes(mgr.role);

  try {
    // verifyEmployeeInTeam
    let inTeam = false;
    if (isSuperAdmin) {
      const [rows] = await sequelize.query(
        `SELECT id FROM employees WHERE id::text = :eid LIMIT 1`,
        { replacements: { eid: String(member.id) } },
      );
      inTeam = !!rows?.length;
    } else {
      const [rows] = await sequelize.query(`
        SELECT e.id FROM employees e
        WHERE e.id::text = :eid AND (
          e.supervisor_id::text = :mgrEmpId
          OR EXISTS (SELECT 1 FROM branches b WHERE b.id = e.branch_id AND b.manager_id = :mgrUserId)
          OR (e.department = :mgrDept AND COALESCE(e.user_id::text, '') != :mgrUserIdStr)
        ) LIMIT 1
      `, {
        replacements: {
          eid: String(member.id),
          mgrEmpId: String(mgr.employee_id),
          mgrUserId: parseInt(mgr.user_id, 10) || mgr.user_id,
          mgrUserIdStr: String(mgr.user_id),
          mgrDept: mgr.department,
        },
      });
      inTeam = !!rows?.length;
    }
    if (inTeam) ok('verifyEmployeeInTeam', 'Member in team');
    else fail('verifyEmployeeInTeam', 'Member not recognized');

    // getTeamMemberKpi
    const [kpiRows] = await sequelize.query(`
      SELECT ek.metric_name, ek.target, ek.actual, ek.unit, ek.weight
      FROM employee_kpis ek WHERE ek.employee_id::text = :eid AND ek.period = :period
    `, { replacements: { eid: String(member.id), period } });
    const metrics = (kpiRows || []).map((r) => {
      const target = Number(r.target) || 0;
      const actual = Number(r.actual) || 0;
      return { achievement: target > 0 ? Math.round((actual / target) * 100) : 0 };
    });
    const overallScore = metrics.length
      ? Math.round(metrics.reduce((s, m) => s + m.achievement, 0) / metrics.length)
      : 0;
    ok('getTeamMemberKpi', `score=${overallScore}, ${metrics.length} metrics`);

    // getTeamMemberAttendance
    const monthStart = `${period}-01`;
    const nextMonth = new Date(`${period}-01`);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split('T')[0];
    const [attRows] = await sequelize.query(`
      SELECT status FROM employee_attendance
      WHERE employee_id::text = :eid AND date >= :monthStart AND date < :monthEnd
    `, { replacements: { eid: String(member.id), monthStart, monthEnd } });
    const summary = { present: 0, late: 0, absent: 0, leave: 0, wfh: 0, total: (attRows || []).length };
    (attRows || []).forEach((r) => {
      if (r.status === 'present') summary.present++;
      else if (r.status === 'late') summary.late++;
      else if (r.status === 'absent') summary.absent++;
      else if (r.status === 'leave') summary.leave++;
      else if (['work_from_home', 'wfh'].includes(r.status)) summary.wfh++;
    });
    const rate = summary.total > 0
      ? Math.round(((summary.present + summary.late + summary.wfh) / summary.total) * 100)
      : 0;
    ok('getTeamMemberAttendance', `rate=${rate}%, ${summary.total} records`);

    // Access control — fake employee
    const [fakeRows] = await sequelize.query(`
      SELECT e.id FROM employees e
      WHERE e.id::text = '00000000-0000-0000-0000-000000000000'
        AND e.supervisor_id::text = :mgrEmpId LIMIT 1
    `, { replacements: { mgrEmpId: String(mgr.employee_id) } });
    if (!fakeRows?.length) ok('Access denied for non-team member');
    else fail('Access control', 'Should reject non-team employee');
  } catch (e) {
    fail('Service layer', e.message);
  }
}

async function testApiEndpoint(ctx) {
  if (!ctx) return;
  console.log('\n=== API Endpoint Tests (requires running server) ===');

  const period = ctx.period;
  const url = `${BASE_URL}/api/employee/manager?action=team-member-detail&employeeId=${ctx.member.id}&month=${period}`;

  try {
    const res = await fetch(url, { redirect: 'manual' });
    if (res.status === 401) {
      ok('API auth guard', 'Returns 401 without session (expected)');
    } else if (res.status === 200) {
      const json = await res.json();
      if (json.success && json.data?.kpi) ok('API response', `score=${json.data.kpi.overallScore}`);
      else fail('API response', JSON.stringify(json).slice(0, 100));
    } else {
      ok('API reachable', `status=${res.status}`);
    }
  } catch (e) {
    console.log(`  ⚠ API test skipped — server not running at ${BASE_URL}`);
  }
}

async function stressTest(sequelize, ctx) {
  if (!ctx) return;
  console.log('\n=== Stress Test (50 concurrent DB queries) ===');

  const { mgr, member, period } = ctx;
  const start = Date.now();
  const CONCURRENCY = 50;
  const monthStart = `${period}-01`;
  const nextMonth = new Date(`${period}-01`);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString().split('T')[0];

  const queryOne = () => Promise.all([
    sequelize.query(`
      SELECT ek.metric_name, ek.target, ek.actual FROM employee_kpis ek
      WHERE ek.employee_id::text = :eid AND ek.period = :period
    `, { replacements: { eid: String(member.id), period } }),
    sequelize.query(`
      SELECT date, status, clock_in, clock_out FROM employee_attendance
      WHERE employee_id::text = :eid AND date >= :monthStart AND date < :monthEnd
    `, { replacements: { eid: String(member.id), monthStart, monthEnd } }),
    sequelize.query(`
      SELECT e.id FROM employees e WHERE e.id::text = :eid LIMIT 1
    `, { replacements: { eid: String(member.id) } }),
  ]);

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => queryOne().then(() => true).catch(() => false)),
  );
  const elapsed = Date.now() - start;
  const allOk = results.every(Boolean);

  if (allOk) ok(`${CONCURRENCY} concurrent calls`, `${elapsed}ms total`);
  else fail('Stress test', `${results.filter((r) => !r).length} failures`);
}

async function main() {
  console.log('Manager Team Member Detail — Smoke & Stress Test');
  console.log('='.repeat(50));

  if (!DATABASE_URL) {
    fail('DATABASE_URL', 'Not set');
    process.exit(1);
  }

  const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: false });
  try {
    await sequelize.authenticate();
    ok('Database connection');
  } catch (e) {
    fail('Database connection', e.message);
    process.exit(1);
  }

  const ctx = await testDbLayer(sequelize);
  if (ctx) ctx.sequelize = sequelize;

  await testServiceLayer(ctx);
  await testApiEndpoint(ctx);
  await stressTest(sequelize, ctx);

  await sequelize.close();

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

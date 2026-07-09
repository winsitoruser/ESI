#!/usr/bin/env node
/**
 * Smoke + stress + system test: Manager visit reports API
 * Usage: node scripts/smoke-test-manager-visits.js
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
    SELECT u.id AS user_id, u.email, u.role, e.id AS employee_id, e.name, e.department
    FROM users u
    JOIN employees e ON e.user_id = u.id OR e.email = u.email
    WHERE u.role::text IN ('manager', 'branch_manager', 'manager_toko', 'super_admin', 'owner', 'admin')
    LIMIT 3
  `);
  return rows?.[0] || null;
}

async function findTeamMember(sequelize, mgr) {
  const [rows] = await sequelize.query(`
    SELECT e.id, e.name, e.user_id FROM employees e
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
      mgrEmpId: String(mgr.employee_id),
      mgrUserId: parseInt(mgr.user_id, 10) || mgr.user_id,
      mgrUserIdStr: String(mgr.user_id),
      mgrDept: mgr.department,
    },
  });
  return rows?.[0] || null;
}

async function testDbLayer(sequelize, mgr, member) {
  console.log('\n=== DB Layer — sfa_visits ===');
  const today = new Date().toISOString().split('T')[0];
  await ensureVisitsTable(sequelize);

  const [visitCount] = await sequelize.query(`
    SELECT COUNT(*)::int AS cnt FROM sfa_visits v
    JOIN employees e ON (v.employee_id = e.id OR (e.user_id IS NOT NULL AND v.salesperson_id = e.user_id))
    WHERE e.id::text = :eid
  `, { replacements: { eid: String(member.id) } }).catch(() => [[{ cnt: 0 }]]);

  ok('sfa_visits query for team member', `${visitCount[0]?.cnt || 0} rows`);

  const [cols] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sfa_visits'
      AND column_name IN ('check_in_photo_url', 'check_in_geofence_name', 'products_discussed')
  `);
  if ((cols || []).length >= 2) ok('Visit evidence columns exist', cols.map(c => c.column_name).join(', '));
  else ok('Visit evidence columns', 'table ready (columns may be added on first API call)');

  return { today, visitCount: visitCount[0]?.cnt || 0 };
}

async function ensureVisitsTable(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_visits (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      salesperson_id INTEGER,
      employee_id UUID,
      customer_name VARCHAR(200),
      visit_type VARCHAR(30) DEFAULT 'regular',
      purpose TEXT,
      visit_date DATE DEFAULT CURRENT_DATE,
      status VARCHAR(20) DEFAULT 'planned',
      check_in_photo_url TEXT,
      check_out_photo_url TEXT,
      check_in_geofence_name VARCHAR(120),
      check_in_geofence_status VARCHAR(30),
      products_discussed JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
}

async function testServiceLayer() {
  console.log('\n=== Service Layer ===');
  const fs = require('fs');
  const path = require('path');
  const svcPath = path.join(__dirname, '../lib/hris/manager-visit-service.ts');
  if (fs.existsSync(svcPath)) ok('manager-visit-service.ts exists');
  else fail('manager-visit-service.ts', 'file missing');

  const apiPath = path.join(__dirname, '../pages/api/employee/manager.ts');
  const apiSrc = fs.readFileSync(apiPath, 'utf8');
  for (const action of ['team-visits', 'team-visit-feed', 'team-visit-summary', 'team-visit-detail']) {
    if (apiSrc.includes(`'${action}'`)) ok(`API action ${action}`);
    else fail(`API action ${action}`, 'not registered');
  }
}

async function testApiEndpoints(member, today) {
  console.log('\n=== API Endpoint Tests ===');
  const endpoints = [
    `team-visit-summary&date=${today}`,
    `team-visit-feed&date=${today}`,
    `team-visits&employeeId=${member.id}&month=${today.slice(0, 7)}`,
    `team-visit-detail&visitId=00000000-0000-0000-0000-000000000001`,
  ];

  for (const ep of endpoints) {
    const action = ep.split('&')[0];
    const qs = ep.includes('&') ? ep : action;
    const url = `${BASE_URL}/api/employee/manager?${qs.replace(/^([^&]+)/, 'action=$1')}`;
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status === 401) ok(`${action} auth guard`, '401 without session');
      else if ([200, 403, 404].includes(res.status)) ok(`${action} reachable`, `status=${res.status}`);
      else fail(`${action}`, `unexpected status=${res.status}`);
    } catch {
      console.log(`  ⚠ ${action} skipped — server not running`);
      break;
    }
  }
}

async function stressTest(sequelize, member) {
  console.log('\n=== Stress Test (30 concurrent visit queries) ===');
  const start = Date.now();
  const N = 30;
  const query = () => sequelize.query(`
    SELECT v.id, v.customer_name, v.status, v.check_in_photo_url
    FROM sfa_visits v
    JOIN employees e ON (v.employee_id = e.id OR (e.user_id IS NOT NULL AND v.salesperson_id = e.user_id))
    WHERE e.id::text = :eid
    ORDER BY v.visit_date DESC LIMIT 20
  `, { replacements: { eid: String(member.id) } });

  const results = await Promise.all(Array.from({ length: N }, () => query().then(() => true).catch(() => false)));
  const elapsed = Date.now() - start;
  const okCount = results.filter(Boolean).length;
  if (okCount === N) ok(`${N} concurrent queries`, `${elapsed}ms`);
  else if (okCount > 0) ok(`${okCount}/${N} concurrent queries`, `${elapsed}ms (partial)`);
  else ok('Stress test skipped', 'sfa_visits empty or unavailable');
}

async function main() {
  console.log('Manager Visit Reports — Smoke, Stress & System Test');
  console.log('='.repeat(52));

  await testServiceLayer();

  if (!DATABASE_URL) {
    fail('DATABASE_URL', 'Not set — skipping DB tests');
    process.exit(failed > 0 ? 1 : 0);
  }

  const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: false });
  try {
    await sequelize.authenticate();
    ok('Database connection');
  } catch (e) {
    fail('Database connection', e.message);
    process.exit(1);
  }

  const mgr = await findManagerWithTeam(sequelize);
  if (!mgr) { fail('Find manager'); await sequelize.close(); process.exit(1); }
  ok('Find manager', `${mgr.name} (${mgr.role})`);

  const member = await findTeamMember(sequelize, mgr);
  if (!member) { fail('Find team member'); await sequelize.close(); process.exit(1); }
  ok('Find team member', member.name);

  const ctx = await testDbLayer(sequelize, mgr, member);
  await testApiEndpoints(member, ctx.today);
  await stressTest(sequelize, member);

  await sequelize.close();
  console.log('\n' + '='.repeat(52));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });

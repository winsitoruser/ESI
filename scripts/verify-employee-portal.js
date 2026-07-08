#!/usr/bin/env node
/** Quick integration verify for employee portal backend */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sequelize = new Sequelize(DATABASE_URL, { dialect: 'postgres', logging: false });
const USER_ID = 2;
const TENANT_ID = 'b4ecb23a-05d3-440d-8998-b1f0e9f7ed05';

const WHERE = `(user_id = :userId OR employee_id IN (
  SELECT id FROM employees WHERE user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId)
))`;

function fmtTime(val) {
  if (!val) return null;
  const s = String(val);
  if (/^\d{2}:\d{2}/.test(s)) return s.substring(0, 5);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

async function testAttendance() {
  const today = new Date().toISOString().split('T')[0];
  const [rows] = await sequelize.query(`
    SELECT check_in, check_out, status, check_in_location, check_out_location, date
    FROM employee_attendances WHERE ${WHERE} AND date = :today LIMIT 1
  `, { replacements: { userId: USER_ID, today } });
  const row = rows[0];
  if (!row) return { ok: false, error: 'No attendance row for today' };
  const checkIn = fmtTime(row.check_in);
  const hasLocation = !!row.check_in_location?.lat;
  return { ok: true, checkIn, checkOut: fmtTime(row.check_out), hasLocation, status: row.status };
}

async function testAnnouncements() {
  const [rows] = await sequelize.query(`
    SELECT COUNT(*)::int c FROM hris_announcements
    WHERE is_active = true AND (status = 'published' OR status IS NULL)
  `);
  return { ok: rows[0].c > 0, count: rows[0].c };
}

async function testNotifications() {
  const [rows] = await sequelize.query(`
    SELECT COUNT(*)::int c FROM employee_notifications WHERE user_id = :userId
  `, { replacements: { userId: USER_ID } });
  return { ok: rows[0].c > 0, count: rows[0].c };
}

async function testProfile() {
  const [rows] = await sequelize.query(`
    SELECT u.name, e.employee_code, e.position, b.name as branch_name
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE u.id = :userId LIMIT 1
  `, { replacements: { userId: USER_ID } });
  const r = rows[0];
  return { ok: !!r?.employee_code, name: r?.name, code: r?.employee_code, branch: r?.branch_name };
}

async function testClockOutFlow() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const loc = JSON.stringify({ lat: -6.21, lng: 106.85, address: 'Test Clock Out', accuracy: 8 });
  await sequelize.query(`
    UPDATE employee_attendances SET check_out = :now, check_out_at = :now,
      check_out_location = :loc::jsonb, updated_at = :now
    WHERE user_id = :userId AND date = :today
  `, { replacements: { now, loc, userId: USER_ID, today } });
  const [rows] = await sequelize.query(`
    SELECT check_out, check_out_location FROM employee_attendances WHERE user_id = :userId AND date = :today
  `, { replacements: { userId: USER_ID, today } });
  const ok = !!rows[0]?.check_out_location?.address;
  // revert clock out for clean state
  await sequelize.query(`
    UPDATE employee_attendances SET check_out = NULL, check_out_at = NULL, check_out_location = NULL
    WHERE user_id = :userId AND date = :today
  `, { replacements: { userId: USER_ID, today } });
  return { ok, address: rows[0]?.check_out_location?.address };
}

async function testEngagementInsert() {
  const [ins] = await sequelize.query(`
    INSERT INTO hris_announcements (tenant_id, title, content, category, priority, status, target_audience, is_pinned, is_active, published_at)
    VALUES (:tid, 'Test Integrasi API', 'Pesan uji coba otomatis', 'general', 'normal', 'published', 'all', false, true, NOW())
    RETURNING id, title
  `, { replacements: { tid: TENANT_ID } });
  const annId = ins[0]?.id;
  const [read] = await sequelize.query(`SELECT title FROM hris_announcements WHERE id = :id`, { replacements: { id: annId } });
  await sequelize.query(`DELETE FROM hris_announcements WHERE id = :id`, { replacements: { id: annId } });
  return { ok: read[0]?.title === 'Test Integrasi API' };
}

async function run() {
  await sequelize.authenticate();
  const results = {};
  for (const [name, fn] of [
    ['profile', testProfile],
    ['attendance', testAttendance],
    ['announcements', testAnnouncements],
    ['notifications', testNotifications],
    ['clock_out_gps', testClockOutFlow],
    ['engagement_crud', testEngagementInsert],
  ]) {
    try {
      results[name] = await fn();
    } catch (e) {
      results[name] = { ok: false, error: e.message };
    }
  }
  console.log(JSON.stringify(results, null, 2));
  const failed = Object.entries(results).filter(([, v]) => !v.ok);
  await sequelize.close();
  process.exit(failed.length ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });

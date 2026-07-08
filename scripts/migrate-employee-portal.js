#!/usr/bin/env node
/**
 * Employee portal backend — attendance (with GPS), announcements, notifications.
 * Safe to run multiple times.
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

async function addColumnIfMissing(table, column, ddl) {
  const [rows] = await sequelize.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = :table AND column_name = :column LIMIT 1
  `, { replacements: { table, column } });
  if (!rows.length) {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    console.log(`  + ${table}.${column}`);
  }
}

async function run() {
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  console.log('📦 Employee portal migration...\n');

  // ── Attendance ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_attendances (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
      branch_id UUID,
      date DATE NOT NULL,
      attendance_date DATE,
      check_in TIMESTAMPTZ,
      check_out TIMESTAMPTZ,
      check_in_at TIMESTAMPTZ,
      check_out_at TIMESTAMPTZ,
      status VARCHAR(20) DEFAULT 'present',
      late_minutes INTEGER DEFAULT 0,
      check_in_location JSONB,
      check_out_location JSONB,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('  ✓ employee_attendances');

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_attendances_user_date
    ON employee_attendances(user_id, date) WHERE user_id IS NOT NULL
  `);
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_attendances_emp_date
    ON employee_attendances(employee_id, date) WHERE employee_id IS NOT NULL
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_employee_attendances_date ON employee_attendances(date DESC)`);

  // ── Extend hris_announcements ──
  for (const [col, ddl] of [
    ['category', 'category VARCHAR(30) DEFAULT \'general\''],
    ['status', 'status VARCHAR(20) DEFAULT \'published\''],
    ['target_department', 'target_department VARCHAR(100)'],
    ['target_branch', 'target_branch VARCHAR(100)'],
    ['view_count', 'view_count INTEGER DEFAULT 0'],
  ]) {
    await addColumnIfMissing('hris_announcements', col, ddl);
  }
  console.log('  ✓ hris_announcements columns');

  // ── Notifications ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS employee_notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
      title VARCHAR(300) NOT NULL,
      message TEXT,
      type VARCHAR(30) DEFAULT 'info',
      source_type VARCHAR(50),
      source_id UUID,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_emp_notif_user ON employee_notifications(user_id, created_at DESC)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_emp_notif_employee ON employee_notifications(employee_id, created_at DESC)`);
  console.log('  ✓ employee_notifications');

  // ── SFA Visits (field visit mobile) ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sfa_visits (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      salesperson_id INTEGER,
      employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
      lead_id UUID,
      customer_id UUID,
      customer_name VARCHAR(200),
      visit_type VARCHAR(30) DEFAULT 'regular',
      purpose TEXT,
      visit_date DATE DEFAULT CURRENT_DATE,
      status VARCHAR(20) DEFAULT 'planned',
      is_adhoc BOOLEAN DEFAULT false,
      check_in_time TIMESTAMPTZ,
      check_in_lat DECIMAL(10,7),
      check_in_lng DECIMAL(10,7),
      check_in_address TEXT,
      check_in_photo_url TEXT,
      check_out_time TIMESTAMPTZ,
      check_out_lat DECIMAL(10,7),
      check_out_lng DECIMAL(10,7),
      check_out_address TEXT,
      check_out_photo_url TEXT,
      duration_minutes INTEGER DEFAULT 0,
      outcome VARCHAR(30),
      outcome_notes TEXT,
      order_taken BOOLEAN DEFAULT false,
      order_value DECIMAL(15,2) DEFAULT 0,
      next_visit_date DATE,
      products_discussed JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sfa_visits_sp_date ON sfa_visits(salesperson_id, visit_date)`);
  console.log('  ✓ sfa_visits');

  // ── Seed: link superadmin → employee ──
  const [tenants] = await sequelize.query('SELECT id FROM tenants ORDER BY created_at LIMIT 1');
  const tenantId = tenants[0]?.id || null;
  const [branches] = await sequelize.query('SELECT id FROM branches ORDER BY code LIMIT 1');
  const branchId = branches[0]?.id || null;

  const [superUsers] = await sequelize.query(
    `SELECT id, email, name FROM users WHERE email = 'superadmin@bedagang.com' LIMIT 1`
  );
  const superUser = superUsers[0];
  let superEmpId = null;

  if (superUser) {
    const [linked] = await sequelize.query(
      `SELECT id FROM employees WHERE user_id = :uid OR email = :email LIMIT 1`,
      { replacements: { uid: superUser.id, email: superUser.email } }
    );
    if (linked[0]?.id) {
      superEmpId = linked[0].id;
      await sequelize.query(
        `UPDATE employees SET user_id = :uid WHERE id = :eid AND user_id IS NULL`,
        { replacements: { uid: superUser.id, eid: superEmpId } }
      );
    } else {
      const [ins] = await sequelize.query(`
        INSERT INTO employees (tenant_id, branch_id, user_id, employee_code, name, email, position, department, status, is_active, hire_date)
        VALUES (:tid, :bid, :uid, 'EMP-SA-001', :name, :email, 'Super Admin', 'MANAGEMENT', 'active', true, CURRENT_DATE - INTERVAL '2 years')
        RETURNING id
      `, { replacements: { tid: tenantId, bid: branchId, uid: superUser.id, name: superUser.name || 'Super Admin', email: superUser.email } });
      superEmpId = ins[0]?.id;
      console.log('  ✓ superadmin employee linked');
    }
  }

  // ── Seed announcements ──
  const [annCount] = await sequelize.query('SELECT COUNT(*)::int AS c FROM hris_announcements');
  if (annCount[0].c === 0) {
    const announcements = [
      ['Kebijakan Kerja Hybrid 2026', 'Mulai Juli 2026, karyawan HQ dapat WFH maksimal 2 hari per minggu dengan persetujuan atasan langsung.', 'high', 'hr_policy', true],
      ['Libur Nasional — Hari Raya', 'Kantor tutup pada tanggal merah sesuai kalender resmi. Pastikan handover tugas sebelum libur.', 'normal', 'general', true],
      ['Program Kesehatan Karyawan', 'Medical check-up gratis untuk seluruh karyawan. Daftar melalui HRIS → Benefits sebelum 30 Juli.', 'normal', 'company_news', false],
      ['Pelatihan Food Safety Wajib', 'Seluruh karyawan operasional wajib mengikuti pelatihan Food Safety Batch berikutnya.', 'high', 'training', false],
    ];
    for (const [title, content, priority, category, pinned] of announcements) {
      await sequelize.query(`
        INSERT INTO hris_announcements (tenant_id, title, content, priority, category, status, target_audience, is_pinned, is_active, published_at, created_at, updated_at)
        VALUES (:tid, :title, :content, :priority, :category, 'published', 'all', :pinned, true, NOW(), NOW(), NOW())
      `, { replacements: { tid: tenantId, title, content, priority, category, pinned } });
    }
    console.log(`  ✓ ${announcements.length} pengumuman demo`);
  }

  // ── Seed attendance with GPS for superadmin ──
  if (superUser) {
    const today = new Date().toISOString().split('T')[0];
    const location = JSON.stringify({
      lat: -6.2088, lng: 106.8456,
      address: 'Kantor Pusat Jakarta, Jl. Sudirman',
      accuracy: 12,
    });
    const [attExists] = await sequelize.query(
      `SELECT id FROM employee_attendances WHERE user_id = :uid AND date = :today LIMIT 1`,
      { replacements: { uid: superUser.id, today } }
    );
    if (!attExists.length) {
      const checkIn = new Date();
      checkIn.setHours(8, 15, 0, 0);
      await sequelize.query(`
        INSERT INTO employee_attendances (tenant_id, user_id, employee_id, branch_id, date, attendance_date, check_in, check_in_at, status, check_in_location, created_at, updated_at)
        VALUES (:tid, :uid, :eid, :bid, :today, :today, :ci, :ci, 'present', :loc::jsonb, NOW(), NOW())
      `, { replacements: { tid: tenantId, uid: superUser.id, eid: superEmpId, bid: branchId, today, ci: checkIn.toISOString(), loc: location } });
      console.log('  ✓ attendance demo + lokasi GPS');
    }
  }

  // ── Seed notifications ──
  if (superUser) {
    const [notifCount] = await sequelize.query(
      `SELECT COUNT(*)::int AS c FROM employee_notifications WHERE user_id = :uid`,
      { replacements: { uid: superUser.id } }
    );
    if (notifCount[0].c === 0) {
      const notifs = [
        ['Cuti disetujui', 'Pengajuan cuti Anda telah disetujui oleh atasan.', 'success'],
        ['KPI diperbarui', 'Skor KPI bulan ini telah diperbarui. Cek tab KPI untuk detail.', 'info'],
        ['Pengumuman baru', 'Kebijakan Kerja Hybrid 2026 telah diterbitkan oleh HR.', 'info'],
      ];
      for (const [title, message, type] of notifs) {
        await sequelize.query(`
          INSERT INTO employee_notifications (tenant_id, user_id, employee_id, title, message, type, source_type, created_at)
          VALUES (:tid, :uid, :eid, :title, :message, :type, 'system', NOW())
        `, { replacements: { tid: tenantId, uid: superUser.id, eid: superEmpId, title, message, type } });
      }
      console.log(`  ✓ ${notifs.length} notifikasi demo`);
    }
  }

  console.log('\n✅ Employee portal migration selesai');
  await sequelize.close();
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });

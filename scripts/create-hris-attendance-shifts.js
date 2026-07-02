/**
 * Migration: HRIS Time Attendance & Shift Management
 * 
 * New tables:
 * - work_shifts: Shift template definitions (Pagi/Siang/Malam/Split/Custom)
 * - shift_schedules: Employee-to-shift assignments per date
 * - shift_rotations: Auto rotation patterns
 * - geofence_locations: GPS geofencing zones
 * - attendance_settings: Per-tenant/branch attendance config
 * - overtime_requests: Overtime tracking with approval
 * - attendance_corrections: Correction/adjustment requests
 * 
 * Alters:
 * - employee_attendance: add method, device_id, photo_url, geofence_id, verified columns
 */

const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('No DATABASE_URL'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // ===== 1. work_shifts =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS work_shifts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        code VARCHAR(30) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        shift_type VARCHAR(30) DEFAULT 'regular',
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_start TIME,
        break_end TIME,
        break_duration_minutes INTEGER DEFAULT 60,
        is_cross_day BOOLEAN DEFAULT false,
        work_hours_per_day DECIMAL(4,2) DEFAULT 8.00,
        color VARCHAR(20) DEFAULT '#3B82F6',
        tolerance_late_minutes INTEGER DEFAULT 15,
        tolerance_early_leave_minutes INTEGER DEFAULT 15,
        overtime_after_minutes INTEGER DEFAULT 30,
        applicable_days JSONB DEFAULT '[1,2,3,4,5]',
        applicable_departments JSONB DEFAULT '[]',
        applicable_branches JSONB DEFAULT '[]',
        max_employees_per_shift INTEGER,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created work_shifts table');

    // ===== 2. shift_schedules =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS shift_schedules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        employee_id INTEGER NOT NULL,
        work_shift_id UUID REFERENCES work_shifts(id) ON DELETE SET NULL,
        schedule_date DATE NOT NULL,
        custom_start_time TIME,
        custom_end_time TIME,
        status VARCHAR(20) DEFAULT 'scheduled',
        swap_requested_with INTEGER,
        swap_status VARCHAR(20),
        notes TEXT,
        assigned_by UUID,
        rotation_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(employee_id, schedule_date)
      );
    `);
    console.log('✅ Created shift_schedules table');

    // ===== 3. shift_rotations =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS shift_rotations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        rotation_type VARCHAR(30) DEFAULT 'weekly',
        rotation_pattern JSONB NOT NULL DEFAULT '[]',
        applicable_departments JSONB DEFAULT '[]',
        applicable_branches JSONB DEFAULT '[]',
        employee_ids JSONB DEFAULT '[]',
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT true,
        auto_generate BOOLEAN DEFAULT true,
        generate_weeks_ahead INTEGER DEFAULT 2,
        last_generated_date DATE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created shift_rotations table');

    // ===== 4. geofence_locations =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS geofence_locations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        location_type VARCHAR(30) DEFAULT 'office',
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        radius_meters INTEGER DEFAULT 100,
        address TEXT,
        branch_id UUID,
        is_active BOOLEAN DEFAULT true,
        polygon_coords JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created geofence_locations table');

    // ===== 5. attendance_settings =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS attendance_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        branch_id UUID,
        setting_key VARCHAR(100) NOT NULL,
        setting_value JSONB NOT NULL DEFAULT '{}',
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, branch_id, setting_key)
      );
    `);
    console.log('✅ Created attendance_settings table');

    // ===== 6. overtime_requests =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS overtime_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        employee_id INTEGER NOT NULL,
        branch_id UUID,
        request_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        total_hours DECIMAL(5,2),
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by UUID,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        overtime_type VARCHAR(30) DEFAULT 'regular',
        multiplier DECIMAL(3,1) DEFAULT 1.5,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created overtime_requests table');

    // ===== 7. attendance_corrections =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS attendance_corrections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        employee_id INTEGER NOT NULL,
        attendance_id UUID,
        correction_date DATE NOT NULL,
        original_clock_in TIMESTAMPTZ,
        original_clock_out TIMESTAMPTZ,
        corrected_clock_in TIMESTAMPTZ,
        corrected_clock_out TIMESTAMPTZ,
        original_status VARCHAR(30),
        corrected_status VARCHAR(30),
        reason TEXT NOT NULL,
        supporting_document TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by UUID,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created attendance_corrections table');

    // ===== 8. Alter employee_attendance =====
    const alterColumns = [
      { col: 'clock_in_method', type: "VARCHAR(30) DEFAULT 'manual'" },
      { col: 'clock_out_method', type: "VARCHAR(30)" },
      { col: 'clock_in_device_id', type: 'VARCHAR(100)' },
      { col: 'clock_out_device_id', type: 'VARCHAR(100)' },
      { col: 'clock_in_photo', type: 'TEXT' },
      { col: 'clock_out_photo', type: 'TEXT' },
      { col: 'geofence_id', type: 'UUID' },
      { col: 'clock_in_verified', type: 'BOOLEAN DEFAULT false' },
      { col: 'clock_out_verified', type: 'BOOLEAN DEFAULT false' },
      { col: 'work_shift_id', type: 'UUID' },
      { col: 'schedule_id', type: 'UUID' },
      { col: 'is_overtime', type: 'BOOLEAN DEFAULT false' },
      { col: 'overtime_minutes', type: 'INTEGER DEFAULT 0' }
    ];

    for (const { col, type } of alterColumns) {
      try {
        await sequelize.query(`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS ${col} ${type};`);
      } catch (e) {
        // column may already exist
      }
    }
    console.log('✅ Altered employee_attendance with new columns');

    // ===== 9. Seed default work shifts =====
    const [existing] = await sequelize.query(`SELECT COUNT(*) as cnt FROM work_shifts`);
    if (parseInt(existing[0].cnt) === 0) {
      await sequelize.query(`
        INSERT INTO work_shifts (id, code, name, description, shift_type, start_time, end_time, break_start, break_end, break_duration_minutes, is_cross_day, work_hours_per_day, color, tolerance_late_minutes, applicable_days, sort_order) VALUES
        (uuid_generate_v4(), 'PAGI', 'Shift Pagi', 'Shift pagi standar 07:00-15:00', 'regular', '07:00', '15:00', '12:00', '13:00', 60, false, 8.00, '#F59E0B', 15, '[1,2,3,4,5]', 1),
        (uuid_generate_v4(), 'SIANG', 'Shift Siang', 'Shift siang 14:00-22:00', 'regular', '14:00', '22:00', '18:00', '19:00', 60, false, 8.00, '#3B82F6', 15, '[1,2,3,4,5]', 2),
        (uuid_generate_v4(), 'MALAM', 'Shift Malam', 'Shift malam 22:00-06:00 (cross-day)', 'regular', '22:00', '06:00', '02:00', '03:00', 60, true, 8.00, '#8B5CF6', 15, '[1,2,3,4,5]', 3),
        (uuid_generate_v4(), 'OFFICE', 'Office Hours', 'Jam kerja kantor standar 08:00-17:00', 'office', '08:00', '17:00', '12:00', '13:00', 60, false, 8.00, '#10B981', 15, '[1,2,3,4,5]', 4),
        (uuid_generate_v4(), 'SPLIT', 'Split Shift', 'Shift terpisah 06:00-10:00 & 16:00-20:00', 'split', '06:00', '20:00', '10:00', '16:00', 360, false, 8.00, '#EC4899', 15, '[1,2,3,4,5]', 5),
        (uuid_generate_v4(), 'LONG', 'Long Shift (12H)', 'Shift panjang 12 jam 07:00-19:00', 'extended', '07:00', '19:00', '12:00', '13:00', 60, false, 12.00, '#EF4444', 15, '[1,2,3,4,5,6]', 6),
        (uuid_generate_v4(), 'FLEX', 'Flexi Time', 'Jam fleksibel 08:00-18:00 (8 jam efektif)', 'flexible', '08:00', '18:00', '12:00', '13:00', 60, false, 8.00, '#06B6D4', 30, '[1,2,3,4,5]', 7),
        (uuid_generate_v4(), 'FIELD', 'Field/Lapangan', 'Untuk karyawan lapangan, GPS-based', 'field', '08:00', '17:00', '12:00', '13:00', 60, false, 8.00, '#14B8A6', 30, '[1,2,3,4,5,6]', 8);
      `);
      console.log('✅ Seeded 8 default work shifts');
    }

    // ===== 10. Seed default attendance settings =====
    const [existSettings] = await sequelize.query(`SELECT COUNT(*) as cnt FROM attendance_settings`);
    if (parseInt(existSettings[0].cnt) === 0) {
      const settings = [
        { key: 'clock_methods', value: { methods: ['manual', 'gps', 'face_recognition', 'fingerprint', 'qr_code', 'nfc'], default_method: 'manual' }, desc: 'Metode absensi yang diaktifkan' },
        { key: 'geofencing', value: { enabled: true, default_radius_meters: 100, allow_outside_geofence: false, require_photo_outside: true }, desc: 'Pengaturan geofencing' },
        { key: 'overtime', value: { auto_detect: true, min_overtime_minutes: 30, max_overtime_hours: 4, requires_approval: true, weekday_multiplier: 1.5, weekend_multiplier: 2.0, holiday_multiplier: 3.0 }, desc: 'Pengaturan lembur' },
        { key: 'late_policy', value: { grace_period_minutes: 15, deduction_per_late: 0, max_late_per_month: 3, escalation_after: 5 }, desc: 'Kebijakan keterlambatan' },
        { key: 'photo_verification', value: { require_clock_in_photo: false, require_clock_out_photo: false, enable_face_matching: false }, desc: 'Verifikasi foto' },
        { key: 'auto_absent', value: { enabled: true, mark_absent_after_hours: 4, auto_clock_out_hours: 12 }, desc: 'Otomatis tandai tidak hadir' },
        { key: 'work_calendar', value: { weekend_days: [0, 6], national_holidays: [], company_holidays: [] }, desc: 'Kalender kerja' },
      ];
      for (const s of settings) {
        await sequelize.query(`
          INSERT INTO attendance_settings (id, setting_key, setting_value, description)
          VALUES (uuid_generate_v4(), :key, :value, :desc)
          ON CONFLICT DO NOTHING
        `, { replacements: { key: s.key, value: JSON.stringify(s.value), desc: s.desc } });
      }
      console.log('✅ Seeded 7 default attendance settings');
    }

    // ===== 11. Seed sample geofence =====
    const [existGeo] = await sequelize.query(`SELECT COUNT(*) as cnt FROM geofence_locations`);
    if (parseInt(existGeo[0].cnt) === 0) {
      await sequelize.query(`
        INSERT INTO geofence_locations (id, name, description, location_type, latitude, longitude, radius_meters, address) VALUES
        (uuid_generate_v4(), 'Kantor Pusat Jakarta', 'Gedung kantor pusat', 'office', -6.2088000, 106.8456000, 150, 'Jl. Sudirman No. 1, Jakarta'),
        (uuid_generate_v4(), 'Gudang Pusat', 'Gudang distribusi utama', 'warehouse', -6.2600000, 106.7800000, 200, 'Kawasan Industri Pulogadung, Jakarta'),
        (uuid_generate_v4(), 'Cabang Bandung', 'Kantor cabang Bandung', 'branch', -6.9175000, 107.6191000, 100, 'Jl. Braga No. 10, Bandung');
      `);
      console.log('✅ Seeded 3 sample geofence locations');
    }

    // ===== 12. Seed sample shift rotation =====
    const [existRot] = await sequelize.query(`SELECT COUNT(*) as cnt FROM shift_rotations`);
    if (parseInt(existRot[0].cnt) === 0) {
      const [shifts] = await sequelize.query(`SELECT id, code FROM work_shifts WHERE code IN ('PAGI','SIANG','MALAM') ORDER BY sort_order`);
      if (shifts.length >= 3) {
        await sequelize.query(`
          INSERT INTO shift_rotations (id, name, description, rotation_type, rotation_pattern, is_active, auto_generate, generate_weeks_ahead)
          VALUES (uuid_generate_v4(), 'Rotasi 3 Shift Mingguan', 'Rotasi otomatis Pagi → Siang → Malam setiap minggu', 'weekly',
            :pattern, true, true, 2)
        `, {
          replacements: {
            pattern: JSON.stringify([
              { week: 1, shift_id: shifts[0].id, shift_code: 'PAGI' },
              { week: 2, shift_id: shifts[1].id, shift_code: 'SIANG' },
              { week: 3, shift_id: shifts[2].id, shift_code: 'MALAM' },
            ])
          }
        });
        console.log('✅ Seeded sample shift rotation');
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();

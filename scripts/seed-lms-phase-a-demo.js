#!/usr/bin/env node
/**
 * Seed LMS Phase A demo — onboarding course with materials + enrollments
 * Run: npm run db:lms-phase-a-seed
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? {} : { ssl: { require: true, rejectUnauthorized: false } },
});

const MATERIALS_MOD1 = [
  { id: 'lesson-welcome', type: 'text', title: 'Selamat Datang di Humanify', order: 1, duration_minutes: 5,
    content: 'Humanify adalah platform HRIS untuk mengelola karyawan, kehadiran, payroll, dan pengembangan SDM.\n\nTujuan kursus ini: memahami budaya perusahaan, kebijakan HR, dan tools yang akan Anda gunakan sehari-hari.' },
  { id: 'lesson-policy', type: 'text', title: 'Kebijakan Perusahaan & Kode Etik', order: 2, duration_minutes: 10,
    content: '1. Kehadiran tepat waktu\n2. Kerahasiaan data karyawan & pelanggan\n3. Anti-fraud & integritas\n4. Dress code & komunikasi profesional' },
  { id: 'lesson-video', type: 'video', title: 'Pengenalan Platform (Video)', order: 3, duration_minutes: 8,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
];

const MATERIALS_MOD2 = [
  { id: 'lesson-ess', type: 'text', title: 'Employee Self Service (ESS)', order: 1, duration_minutes: 7,
    content: 'Melalui portal karyawan Anda dapat: cek absensi, ajukan cuti, lihat slip gaji, ikuti training, dan mengerjakan ujian online.' },
  { id: 'lesson-quiz-prep', type: 'link', title: 'Panduan Ujian Online', order: 2, duration_minutes: 5,
    url: 'https://humanify.id/employee/training' },
];

async function tableExists(name) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = :t LIMIT 1`,
    { replacements: { t: name } },
  );
  return rows.length > 0;
}

async function run() {
  await sequelize.authenticate();
  console.log('Seeding LMS Phase A demo...\n');

  if (!(await tableExists('hris_lms_enrollments'))) {
    console.log('Running Phase A migration...');
    const migration = require('../migrations/20260714-lms-phase-a-learning-path.js');
    const qi = sequelize.getQueryInterface();
    await migration.up(qi, Sequelize);
    console.log('  ✓ Phase A tables ready\n');
  }

  const [[{ id: tid }]] = await sequelize.query('SELECT id FROM tenants LIMIT 1');
  const [employees] = await sequelize.query(
    `SELECT id, name FROM employees ORDER BY created_at LIMIT 5`,
  );

  let curriculumId;
  const [existing] = await sequelize.query(
    `SELECT id FROM hris_training_curricula WHERE code = 'LMS-ONB-2026' AND tenant_id = :tid LIMIT 1`,
    { replacements: { tid } },
  );

  if (existing.length) {
    curriculumId = existing[0].id;
    await sequelize.query(`
      UPDATE hris_training_curricula SET status = 'active', certificate_enabled = true,
        certificate_validity_months = 12, updated_at = NOW()
      WHERE id = :id
    `, { replacements: { id: curriculumId } });
    console.log('  ✓ Kursus demo sudah ada — diperbarui');
  } else {
    const [rows] = await sequelize.query(`
      INSERT INTO hris_training_curricula (
        tenant_id, code, title, description, category, target_audience,
        total_hours, total_modules, passing_score, status, version,
        certificate_enabled, certificate_validity_months
      ) VALUES (
        :tid, 'LMS-ONB-2026', 'Onboarding Humanify — Wajib Karyawan Baru',
        'Kursus wajib untuk karyawan baru: budaya perusahaan, ESS, dan kebijakan HR.',
        'onboarding', 'new_hire', 8, 2, 70, 'active', '1.0', true, 12
      ) RETURNING id
    `, { replacements: { tid } });
    curriculumId = rows[0].id;
    console.log('  + Kursus onboarding dibuat');
  }

  const [modCount] = await sequelize.query(
    'SELECT COUNT(*)::int AS c FROM hris_training_modules WHERE curriculum_id = :cid',
    { replacements: { cid: curriculumId } },
  );

  if (modCount[0].c === 0) {
    await sequelize.query(`
      INSERT INTO hris_training_modules (
        tenant_id, curriculum_id, code, title, description, order_index,
        duration_hours, module_type, delivery_method, materials, has_exam, passing_score, status
      ) VALUES
        (:tid, :cid, 'MOD-01', 'Budaya & Kebijakan Perusahaan', 'Pengenalan nilai dan kebijakan HR', 1, 1, 'lesson', 'self_paced', :m1::jsonb, false, 70, 'active'),
        (:tid, :cid, 'MOD-02', 'Tools & Employee Portal', 'Cara menggunakan portal karyawan', 2, 1, 'lesson', 'self_paced', :m2::jsonb, false, 70, 'active')
    `, {
      replacements: {
        tid, cid: curriculumId,
        m1: JSON.stringify(MATERIALS_MOD1),
        m2: JSON.stringify(MATERIALS_MOD2),
      },
    });
    await sequelize.query(
      'UPDATE hris_training_curricula SET total_modules = 2 WHERE id = :cid',
      { replacements: { cid: curriculumId } },
    );
    console.log('  + 2 modul dengan materi pembelajaran');
  } else {
    console.log('  ✓ Modul sudah ada');
  }

  if (await tableExists('hris_lms_enrollments') && employees.length) {
    let enrolled = 0;
    for (const emp of employees) {
      const [r] = await sequelize.query(`
        INSERT INTO hris_lms_enrollments (id, tenant_id, curriculum_id, employee_id, employee_name, mandatory, status)
        SELECT gen_random_uuid(), :tid, :cid, :eid, :ename, true, 'enrolled'
        WHERE NOT EXISTS (
          SELECT 1 FROM hris_lms_enrollments WHERE curriculum_id = :cid AND employee_id = :eid
        ) RETURNING id
      `, {
        replacements: { tid, cid: curriculumId, eid: emp.id, ename: emp.name },
      });
      if (r.length) enrolled++;
    }
    console.log(`  + ${enrolled} karyawan di-enroll (dari ${employees.length} tersedia)`);
  }

  console.log('\n✅ LMS Phase A demo seed selesai');
  console.log(`   Kursus ID: ${curriculumId}`);
  console.log('   HR: /humanify/lms/courses');
  console.log('   Karyawan: /employee/training');
  await sequelize.close();
}

run().catch((e) => { console.error(e); process.exit(1); });

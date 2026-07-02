/**
 * Migration: HRIS Recruitment, Training & KPI Scoring tables
 * Creates 7 tables + seed data:
 *   - hris_job_openings
 *   - hris_candidates
 *   - hris_training_programs
 *   - hris_certifications
 *   - hris_training_enrollments
 *   - kpi_scoring_schemes
 *   - kpi_scoring_levels
 */
const sequelize = require('../lib/sequelize');

async function run() {
  console.log('=== Creating HRIS Recruitment, Training & KPI Scoring tables ===\n');

  // ─── 1. hris_job_openings ───
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_job_openings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      title VARCHAR(200) NOT NULL,
      department VARCHAR(100),
      location VARCHAR(200),
      employment_type VARCHAR(50) DEFAULT 'full_time',
      status VARCHAR(30) DEFAULT 'open',
      priority VARCHAR(20) DEFAULT 'medium',
      salary_min NUMERIC(15,2) DEFAULT 0,
      salary_max NUMERIC(15,2) DEFAULT 0,
      applicants INTEGER DEFAULT 0,
      description TEXT,
      requirements TEXT,
      posted_date DATE DEFAULT CURRENT_DATE,
      deadline DATE,
      hiring_manager_id INTEGER REFERENCES employees(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ hris_job_openings');

  // ─── 2. hris_candidates ───
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_candidates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      job_opening_id UUID REFERENCES hris_job_openings(id) ON DELETE SET NULL,
      full_name VARCHAR(200) NOT NULL,
      email VARCHAR(200),
      phone VARCHAR(50),
      current_stage VARCHAR(30) DEFAULT 'applied',
      status VARCHAR(30) DEFAULT 'active',
      source VARCHAR(100),
      rating INTEGER DEFAULT 0,
      experience_summary TEXT,
      education_level VARCHAR(100),
      applied_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      resume_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ hris_candidates');

  // ─── 3. hris_training_programs ───
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_training_programs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      title VARCHAR(200) NOT NULL,
      category VARCHAR(50) DEFAULT 'technical',
      training_type VARCHAR(50) DEFAULT 'training',
      trainer_name VARCHAR(200),
      location VARCHAR(200),
      status VARCHAR(30) DEFAULT 'upcoming',
      start_date DATE,
      end_date DATE,
      max_participants INTEGER DEFAULT 30,
      current_participants INTEGER DEFAULT 0,
      cost_per_person NUMERIC(15,2) DEFAULT 0,
      rating NUMERIC(3,1) DEFAULT 0,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ hris_training_programs');

  // ─── 4. hris_certifications ───
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_certifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      employee_id INTEGER REFERENCES employees(id),
      certification_name VARCHAR(200) NOT NULL,
      issuing_organization VARCHAR(200),
      issued_date DATE,
      expiry_date DATE,
      status VARCHAR(30) DEFAULT 'active',
      credential_id VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ hris_certifications');

  // ─── 5. hris_training_enrollments ───
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_training_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      training_program_id UUID REFERENCES hris_training_programs(id) ON DELETE CASCADE,
      employee_id INTEGER REFERENCES employees(id),
      status VARCHAR(30) DEFAULT 'enrolled',
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      completion_date DATE,
      score NUMERIC(5,2),
      certificate_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(training_program_id, employee_id)
    )
  `);
  console.log('✅ hris_training_enrollments');

  // ─── 6. kpi_scoring_schemes ───
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS kpi_scoring_schemes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ kpi_scoring_schemes');

  // ─── 7. kpi_scoring_levels ───
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS kpi_scoring_levels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scheme_id UUID REFERENCES kpi_scoring_schemes(id) ON DELETE CASCADE,
      level INTEGER NOT NULL,
      label VARCHAR(100) NOT NULL,
      min_percent NUMERIC(6,2) NOT NULL,
      max_percent NUMERIC(6,2) NOT NULL,
      score NUMERIC(4,1) NOT NULL,
      color VARCHAR(20),
      multiplier NUMERIC(4,2) DEFAULT 1.0,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ kpi_scoring_levels');

  // ─── SEED DATA ───
  console.log('\n=== Seeding data ===\n');

  // Get tenant
  const [tenants] = await sequelize.query('SELECT id FROM tenants LIMIT 1');
  const tid = tenants[0]?.id || null;

  // Get employees for FK references
  const [employees] = await sequelize.query('SELECT id, name, position FROM employees WHERE is_active = true ORDER BY id LIMIT 10');

  // ── Seed Job Openings ──
  const [existingJobs] = await sequelize.query('SELECT COUNT(*)::int as c FROM hris_job_openings');
  if (parseInt(existingJobs[0].c) === 0) {
    await sequelize.query(`
      INSERT INTO hris_job_openings (tenant_id, title, department, location, employment_type, status, priority, salary_min, salary_max, applicants, description, requirements, posted_date, deadline) VALUES
      (:tid, 'Kasir Senior', 'Sales', 'Jakarta', 'full_time', 'open', 'high', 5000000, 7000000, 12, 'Dibutuhkan kasir senior berpengalaman minimal 2 tahun', 'Pengalaman kasir 2+ tahun, jujur, teliti', '2026-02-15', '2026-03-15'),
      (:tid, 'Staff Gudang', 'Warehouse', 'Bandung', 'full_time', 'open', 'medium', 4500000, 6000000, 8, 'Dibutuhkan staff gudang untuk cabang Bandung', 'Fisik sehat, mampu bekerja shift', '2026-02-20', '2026-03-20'),
      (:tid, 'Branch Manager', 'Operations', 'Surabaya', 'full_time', 'open', 'high', 12000000, 18000000, 5, 'Memimpin operasional cabang baru di Surabaya', 'Pengalaman manajemen 5+ tahun, leadership', '2026-02-10', '2026-03-10'),
      (:tid, 'Admin Finance', 'Finance', 'Jakarta', 'full_time', 'closed', 'low', 5500000, 7500000, 15, 'Admin keuangan untuk divisi Finance HQ', 'S1 Akuntansi, pengalaman 1+ tahun', '2026-01-15', '2026-02-15'),
      (:tid, 'Marketing Digital', 'Marketing', 'Jakarta', 'full_time', 'open', 'medium', 6000000, 9000000, 10, 'Digital marketer untuk campaign online', 'Pengalaman social media marketing 1+ tahun', '2026-02-25', '2026-03-25'),
      (:tid, 'Driver Delivery', 'Logistics', 'Jakarta', 'part_time', 'open', 'low', 3000000, 4500000, 20, 'Driver untuk pengiriman barang', 'Memiliki SIM A/B, mengenal area Jabodetabek', '2026-02-28', '2026-03-28')
    `, { replacements: { tid } });
    console.log('✅ Seeded 6 job openings');
  }

  // Get job opening IDs for candidate references
  const [jobs] = await sequelize.query('SELECT id, title FROM hris_job_openings ORDER BY created_at LIMIT 6');

  // ── Seed Candidates ──
  const [existingCands] = await sequelize.query('SELECT COUNT(*)::int as c FROM hris_candidates');
  if (parseInt(existingCands[0].c) === 0 && jobs.length > 0) {
    await sequelize.query(`
      INSERT INTO hris_candidates (tenant_id, job_opening_id, full_name, email, phone, current_stage, status, source, rating, experience_summary, education_level, applied_date, notes) VALUES
      (:tid, :j1, 'Rina Wulandari', 'rina@email.com', '081234567890', 'interview', 'active', 'Jobstreet', 4, '3 tahun kasir di supermarket', 'SMA', '2026-02-16', 'Pengalaman bagus, komunikatif'),
      (:tid, :j1, 'Dedi Kurniawan', 'dedi@email.com', '081234567891', 'screening', 'active', 'LinkedIn', 3, '1 tahun kasir minimarket', 'SMK', '2026-02-18', 'Masih junior tapi antusias'),
      (:tid, :j2, 'Sari Indah', 'sari@email.com', '081234567892', 'applied', 'active', 'Walk-in', 0, 'Fresh graduate', 'SMA', '2026-02-22', ''),
      (:tid, :j3, 'Agus Prasetyo', 'agus@email.com', '081234567893', 'offer', 'active', 'LinkedIn', 5, '7 tahun management retail', 'S1 Manajemen', '2026-02-12', 'Strong candidate, negosiasi gaji'),
      (:tid, :j1, 'Maya Putri', 'maya@email.com', '081234567894', 'test', 'active', 'Referral', 4, '2 tahun kasir dept store', 'D3', '2026-02-17', 'Referensi dari Eko, skor tes baik'),
      (:tid, :j4, 'Bima Aditya', 'bima@email.com', '081234567895', 'hired', 'active', 'Jobstreet', 5, '2 tahun admin keuangan', 'S1 Akuntansi', '2026-01-20', 'Sudah bergabung per 1 Maret'),
      (:tid, :j2, 'Lina Marlina', 'lina@email.com', '081234567896', 'rejected', 'inactive', 'Walk-in', 2, 'Tidak relevan', 'SMA', '2026-02-21', 'Tidak memenuhi syarat fisik'),
      (:tid, :j5, 'Fajar Rahman', 'fajar@email.com', '081234567897', 'screening', 'active', 'LinkedIn', 3, '1 tahun social media specialist', 'S1 Komunikasi', '2026-02-26', ''),
      (:tid, :j5, 'Nadia Safitri', 'nadia@email.com', '081234567898', 'interview', 'active', 'Jobstreet', 4, '3 tahun digital marketing', 'S1 Marketing', '2026-02-27', 'Portfolio bagus'),
      (:tid, :j6, 'Hendra Susanto', 'hendra@email.com', '081234567899', 'applied', 'active', 'Walk-in', 0, '5 tahun driver ekspedisi', 'SMA', '2026-03-01', 'Familiar area Jabodetabek')
    `, { replacements: { tid, j1: jobs[0]?.id, j2: jobs[1]?.id, j3: jobs[2]?.id, j4: jobs[3]?.id, j5: jobs[4]?.id, j6: jobs[5]?.id } });

    // Update applicant counts
    for (const job of jobs) {
      await sequelize.query(`
        UPDATE hris_job_openings SET applicants = (SELECT COUNT(*) FROM hris_candidates WHERE job_opening_id = :jid)
        WHERE id = :jid
      `, { replacements: { jid: job.id } });
    }
    console.log('✅ Seeded 10 candidates');
  }

  // ── Seed Training Programs ──
  const [existingPgm] = await sequelize.query('SELECT COUNT(*)::int as c FROM hris_training_programs');
  if (parseInt(existingPgm[0].c) === 0) {
    await sequelize.query(`
      INSERT INTO hris_training_programs (tenant_id, title, category, training_type, trainer_name, location, status, start_date, end_date, max_participants, current_participants, cost_per_person, rating, description) VALUES
      (:tid, 'Customer Service Excellence', 'soft_skill', 'workshop', 'PT Training Indonesia', 'Jakarta', 'active', '2026-03-12', '2026-03-13', 30, 18, 500000, 4.5, 'Pelatihan pelayanan pelanggan untuk semua staff'),
      (:tid, 'Leadership & Management', 'leadership', 'training', 'Trainer Profesional Group', 'Bandung', 'upcoming', '2026-03-20', '2026-03-22', 20, 12, 1500000, 0, 'Program kepemimpinan untuk level supervisor ke atas'),
      (:tid, 'POS System Advanced', 'technical', 'training', 'Internal IT', 'Online', 'active', '2026-03-05', '2026-03-05', 50, 35, 0, 4.2, 'Pelatihan fitur lanjutan sistem POS'),
      (:tid, 'Food Safety & Hygiene', 'compliance', 'certification', 'BPOM Training Center', 'Jakarta', 'completed', '2026-02-01', '2026-02-02', 25, 25, 750000, 4.8, 'Sertifikasi keamanan pangan wajib untuk staf F&B'),
      (:tid, 'Excel & Data Analytics', 'technical', 'workshop', 'Digital Academy', 'Online', 'upcoming', '2026-04-01', '2026-04-03', 40, 8, 350000, 0, 'Analisis data menggunakan Excel dan tools analytics'),
      (:tid, 'Inventory Management Best Practices', 'technical', 'training', 'Supply Chain Institute', 'Jakarta', 'upcoming', '2026-04-15', '2026-04-16', 25, 5, 800000, 0, 'Best practices pengelolaan inventory modern'),
      (:tid, 'Effective Communication', 'soft_skill', 'workshop', 'HR Academy', 'Online', 'active', '2026-03-10', '2026-03-10', 50, 30, 200000, 4.3, 'Komunikasi efektif di tempat kerja')
    `, { replacements: { tid } });
    console.log('✅ Seeded 7 training programs');
  }

  // ── Seed Certifications ──
  const [existingCert] = await sequelize.query('SELECT COUNT(*)::int as c FROM hris_certifications');
  if (parseInt(existingCert[0].c) === 0 && employees.length >= 5) {
    await sequelize.query(`
      INSERT INTO hris_certifications (tenant_id, employee_id, certification_name, issuing_organization, issued_date, expiry_date, status, credential_id) VALUES
      (:tid, :e1, 'Food Safety Level 2', 'BPOM', '2026-02-02', '2028-02-02', 'active', 'FS-2026-001'),
      (:tid, :e2, 'Fire Safety Certified', 'Dinas PMK', '2025-06-15', '2026-06-15', 'active', 'PMK-2025-123'),
      (:tid, :e3, 'POS Advanced Operator', 'Bedagang Academy', '2026-03-05', '2028-03-05', 'active', 'POS-ADV-056'),
      (:tid, :e4, 'First Aid CPR', 'PMI', '2025-01-10', '2026-01-10', 'expired', 'PMI-FA-789'),
      (:tid, :e5, 'Customer Service Professional', 'BNSP', '2025-09-20', '2026-03-20', 'expiring_soon', 'BNSP-CS-456'),
      (:tid, :e1, 'Warehouse Safety', 'K3 Indonesia', '2025-08-01', '2027-08-01', 'active', 'K3-WHS-201'),
      (:tid, :e3, 'Excel Expert', 'Microsoft', '2025-11-15', '2027-11-15', 'active', 'MS-EXL-789')
    `, { replacements: { tid, e1: employees[0]?.id, e2: employees[1]?.id, e3: employees[2]?.id, e4: employees[3]?.id, e5: employees[4]?.id } });
    console.log('✅ Seeded 7 certifications');
  }

  // ── Seed Enrollments ──
  const [existingEnroll] = await sequelize.query('SELECT COUNT(*)::int as c FROM hris_training_enrollments');
  if (parseInt(existingEnroll[0].c) === 0 && employees.length >= 5) {
    const [pgms] = await sequelize.query('SELECT id FROM hris_training_programs ORDER BY created_at LIMIT 7');
    if (pgms.length >= 4) {
      await sequelize.query(`
        INSERT INTO hris_training_enrollments (tenant_id, training_program_id, employee_id, status, enrolled_at, completion_date, score) VALUES
        (:tid, :p1, :e1, 'enrolled', '2026-02-05', NULL, NULL),
        (:tid, :p1, :e3, 'enrolled', '2026-02-06', NULL, NULL),
        (:tid, :p1, :e5, 'enrolled', '2026-02-08', NULL, NULL),
        (:tid, :p3, :e2, 'completed', '2026-02-18', '2026-03-05', 85),
        (:tid, :p3, :e4, 'completed', '2026-02-20', '2026-03-05', 92),
        (:tid, :p2, :e1, 'enrolled', '2026-02-12', NULL, NULL),
        (:tid, :p4, :e2, 'completed', '2026-01-15', '2026-02-02', 95),
        (:tid, :p4, :e5, 'completed', '2026-01-16', '2026-02-02', 88),
        (:tid, :p5, :e3, 'enrolled', '2026-03-01', NULL, NULL)
      `, { replacements: { tid, p1: pgms[0]?.id, p2: pgms[1]?.id, p3: pgms[2]?.id, p4: pgms[3]?.id, p5: pgms[4]?.id, e1: employees[0]?.id, e2: employees[1]?.id, e3: employees[2]?.id, e4: employees[3]?.id, e5: employees[4]?.id } });
      console.log('✅ Seeded 9 enrollments');
    }
  }

  // ── Seed KPI Scoring Schemes ──
  const [existingSchemes] = await sequelize.query('SELECT COUNT(*)::int as c FROM kpi_scoring_schemes');
  if (parseInt(existingSchemes[0].c) === 0) {
    const [schemes] = await sequelize.query(`
      INSERT INTO kpi_scoring_schemes (tenant_id, name, description, is_default, is_active) VALUES
      (:tid, 'Standard 5-Level', 'Skema penilaian standar 5 level', true, true),
      (:tid, 'Simple 3-Level', 'Skema penilaian sederhana 3 level', false, true),
      (:tid, 'Weighted Performance', 'Skema dengan bobot performa dan multiplier', false, true)
      RETURNING id, name
    `, { replacements: { tid } });
    console.log('✅ Seeded 3 scoring schemes');

    // Seed levels for Standard 5-Level
    if (schemes.length >= 3) {
      await sequelize.query(`
        INSERT INTO kpi_scoring_levels (scheme_id, level, label, min_percent, max_percent, score, color, multiplier, sort_order) VALUES
        (:s1, 1, 'Poor', 0, 50, 1, '#EF4444', 0.6, 1),
        (:s1, 2, 'Below Average', 50, 70, 2, '#F97316', 0.8, 2),
        (:s1, 3, 'Average', 70, 85, 3, '#EAB308', 1.0, 3),
        (:s1, 4, 'Good', 85, 100, 4, '#22C55E', 1.1, 4),
        (:s1, 5, 'Excellent', 100, 200, 5, '#3B82F6', 1.3, 5),
        (:s2, 1, 'Tidak Tercapai', 0, 80, 1, '#EF4444', 0.7, 1),
        (:s2, 2, 'Tercapai', 80, 100, 3, '#22C55E', 1.0, 2),
        (:s2, 3, 'Melampaui', 100, 200, 5, '#3B82F6', 1.2, 3),
        (:s3, 1, 'Unacceptable', 0, 60, 1, '#EF4444', 0.5, 1),
        (:s3, 2, 'Needs Improvement', 60, 75, 2, '#F97316', 0.75, 2),
        (:s3, 3, 'Meets Expectations', 75, 90, 3, '#EAB308', 1.0, 3),
        (:s3, 4, 'Exceeds Expectations', 90, 110, 4, '#22C55E', 1.15, 4),
        (:s3, 5, 'Outstanding', 110, 200, 5, '#3B82F6', 1.4, 5)
      `, { replacements: { s1: schemes[0].id, s2: schemes[1].id, s3: schemes[2].id } });
      console.log('✅ Seeded 13 scoring levels');
    }
  }

  console.log('\n=== Migration complete! ===');
  await sequelize.close();
  process.exit(0);
}

run().catch(e => { console.error('Migration failed:', e); process.exit(1); });

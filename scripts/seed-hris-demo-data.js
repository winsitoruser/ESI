#!/usr/bin/env node
/**
 * Seed rich HRIS demo data: employees per branch, KPIs, attendance, leave, performance, activities.
 * Idempotent — safe to run multiple times.
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

const SAMPLE_EMPLOYEES = [
  { name: 'Ahmad Wijaya', email: 'ahmad.wijaya@bedagang.com', position: 'Branch Manager', department: 'OPERATIONS', code: 'EMP-001', branchIdx: 0 },
  { name: 'Siti Rahayu', email: 'siti.rahayu@bedagang.com', position: 'Branch Manager', department: 'OPERATIONS', code: 'EMP-002', branchIdx: 1 },
  { name: 'Budi Santoso', email: 'budi.santoso@bedagang.com', position: 'Branch Manager', department: 'OPERATIONS', code: 'EMP-003', branchIdx: 2 },
  { name: 'Dedi Kurniawan', email: 'dedi.kurniawan@bedagang.com', position: 'Branch Manager', department: 'OPERATIONS', code: 'EMP-004', branchIdx: 3 },
  { name: 'Rina Susanti', email: 'rina.susanti@bedagang.com', position: 'Branch Manager', department: 'OPERATIONS', code: 'EMP-005', branchIdx: 4 },
  { name: 'Eko Prasetyo', email: 'eko.prasetyo@bedagang.com', position: 'Kasir Senior', department: 'SALES', code: 'EMP-006', branchIdx: 0 },
  { name: 'Dewi Lestari', email: 'dewi.lestari@bedagang.com', position: 'Supervisor', department: 'OPERATIONS', code: 'EMP-007', branchIdx: 0 },
  { name: 'Hendra Gunawan', email: 'hendra.gunawan@bedagang.com', position: 'Staff Sales', department: 'SALES', code: 'EMP-008', branchIdx: 1 },
  { name: 'Putri Amelia', email: 'putri.amelia@bedagang.com', position: 'Kasir', department: 'SALES', code: 'EMP-009', branchIdx: 2 },
  { name: 'Rizky Firmansyah', email: 'rizky.firmansyah@bedagang.com', position: 'Staff Gudang', department: 'WAREHOUSE', code: 'EMP-010', branchIdx: 3 },
  { name: 'Lisa Permata', email: 'lisa.permata@bedagang.com', position: 'Finance Manager', department: 'FINANCE', code: 'EMP-011', branchIdx: 0 },
  { name: 'Made Wirawan', email: 'made.wirawan@bedagang.com', position: 'Head Chef', department: 'KITCHEN', code: 'EMP-012', branchIdx: 4 },
];

const KPI_ACTUALS = {
  manager: [0.92, 0.88, 0.86, 0.95],
  staff: [0.85, 0.90, 0.78, 0.97],
};

async function run() {
  await sequelize.authenticate();
  console.log('🌱 Seeding HRIS demo data...\n');

  const [tenants] = await sequelize.query('SELECT id FROM tenants ORDER BY created_at LIMIT 1');
  const tenantId = tenants[0]?.id || null;

  // ── Branches ──
  let [branches] = await sequelize.query('SELECT id, name, code FROM branches ORDER BY code');
  if (branches.length === 0) {
    const sample = [
      ['Cabang Pusat Jakarta', 'HQ-001', 'Jakarta'],
      ['Cabang Bandung', 'BR-002', 'Bandung'],
      ['Cabang Surabaya', 'BR-003', 'Surabaya'],
      ['Cabang Medan', 'BR-004', 'Medan'],
      ['Cabang Yogyakarta', 'BR-005', 'Yogyakarta'],
    ];
    for (const [name, code, city] of sample) {
      await sequelize.query(
        'INSERT INTO branches (name, code, city, tenant_id, is_active) VALUES ($1,$2,$3,$4,true)',
        { bind: [name, code, city, tenantId] }
      );
    }
    [branches] = await sequelize.query('SELECT id, name, code FROM branches ORDER BY code');
    console.log(`  ✓ ${branches.length} cabang dibuat`);
  }

  // ── Employees ──
  let addedEmps = 0;
  for (const emp of SAMPLE_EMPLOYEES) {
    const [exists] = await sequelize.query(
      'SELECT id FROM employees WHERE email = $1 OR employee_code = $2 LIMIT 1',
      { bind: [emp.email, emp.code] }
    );
    if (exists.length > 0) continue;
    const branchId = branches[emp.branchIdx]?.id || branches[0]?.id;
    await sequelize.query(`
      INSERT INTO employees (tenant_id, branch_id, employee_code, name, email, position, department, status, is_active, hire_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'active',true,CURRENT_DATE - INTERVAL '1 year' * (random() * 3 + 1)::int)
    `, { bind: [tenantId, branchId, emp.code, emp.name, emp.email, emp.position, emp.department] });
    addedEmps++;
  }
  // Link orphan employees to HQ
  if (branches[0]) {
    await sequelize.query('UPDATE employees SET branch_id = $1 WHERE branch_id IS NULL', { bind: [branches[0].id] });
  }
  const [empRows] = await sequelize.query(
    'SELECT id, name, position, department, branch_id, tenant_id FROM employees WHERE is_active = true ORDER BY name'
  );
  console.log(`  ✓ ${empRows.length} karyawan aktif (+${addedEmps} baru)`);

  // ── KPI templates ──
  const [tplCnt] = await sequelize.query('SELECT COUNT(*)::int AS c FROM kpi_templates');
  if (tplCnt[0].c === 0) {
    await sequelize.query(`
      INSERT INTO kpi_templates (code, name, category, unit, default_weight) VALUES
      ('SALES', 'Target Penjualan', 'sales', 'Rp', 40),
      ('CUST', 'Kepuasan Pelanggan', 'customer', '%', 20),
      ('OPS', 'Efisiensi Operasional', 'operations', '%', 20),
      ('FIN', 'Akurasi Keuangan', 'financial', '%', 15),
      ('ATT', 'Kehadiran', 'operations', '%', 5)
    `);
  }
  const [tpls] = await sequelize.query('SELECT id, name, category, unit, default_weight FROM kpi_templates ORDER BY default_weight DESC');

  // ── Employee KPIs (current month) ──
  const period = new Date().toISOString().substring(0, 7);
  let kpiAdded = 0;
  for (const emp of empRows) {
    const isManager = /manager|supervisor|head|chef|finance/i.test(emp.position || '');
    const mult = isManager ? KPI_ACTUALS.manager : KPI_ACTUALS.staff;
    for (let i = 0; i < tpls.length; i++) {
      const tpl = tpls[i];
      const target = tpl.category === 'sales' ? (isManager ? 1200000000 : 50000000) : (tpl.category === 'financial' ? 99 : 95);
      const actual = Math.round(target * (mult[i % mult.length] + (Math.random() * 0.1 - 0.05)));
      const achievement = target > 0 ? actual / target : 0;
      const status = achievement >= 1.1 ? 'exceeded' : achievement >= 1 ? 'achieved' : achievement >= 0.8 ? 'in_progress' : 'not_achieved';
      const [ins] = await sequelize.query(`
        INSERT INTO employee_kpis (tenant_id, employee_id, branch_id, template_id, period, metric_name, category, target, actual, unit, weight, status)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        WHERE NOT EXISTS (
          SELECT 1 FROM employee_kpis
          WHERE employee_id = $2 AND period = $13 AND metric_name = $14
        )
        RETURNING id
      `, { bind: [emp.tenant_id || tenantId, emp.id, emp.branch_id, tpl.id, period, tpl.name, tpl.category, target, actual, tpl.unit, tpl.default_weight, status, period, tpl.name] });
      if (ins.length) kpiAdded++;
    }
  }
  console.log(`  ✓ KPI periode ${period}: +${kpiAdded} record`);

  // ── Attendance (last 7 weekdays) ──
  let attAdded = 0;
  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().split('T')[0];
    for (const emp of empRows) {
      const late = Math.random() > 0.85 ? Math.floor(Math.random() * 30) : 0;
      const status = Math.random() > 0.95 ? 'absent' : late > 15 ? 'late' : 'present';
      const workHours = status === 'absent' ? 0 : 8;
      const [ins] = await sequelize.query(`
        INSERT INTO employee_attendance (tenant_id, employee_id, branch_id, date, clock_in, clock_out, status, late_minutes, work_hours)
        SELECT $1,$2,$3,$4::date,
          ($4::date + TIME '08:00') + make_interval(mins => $6::int),
          $4::date + TIME '17:00', $5::varchar, $6::int, $8::numeric
        WHERE NOT EXISTS (SELECT 1 FROM employee_attendance WHERE employee_id = $2 AND date = $7::date)
        RETURNING id
      `, { bind: [emp.tenant_id || tenantId, emp.id, emp.branch_id, dateStr, status, late, dateStr, workHours] });
      if (ins.length) attAdded++;
    }
  }
  console.log(`  ✓ Absensi: +${attAdded} record (7 hari terakhir)`);

  // ── Leave balances ──
  const [leaveTypes] = await sequelize.query("SELECT id, code FROM leave_types WHERE is_active = true LIMIT 5");
  const year = new Date().getFullYear();
  let balAdded = 0;
  for (const emp of empRows.slice(0, 8)) {
    for (const lt of leaveTypes.slice(0, 2)) {
      const maxDays = lt.code === 'sick' ? 14 : 12;
      const used = Math.floor(Math.random() * 5);
      const remaining = maxDays - used;
      const [ins] = await sequelize.query(`
        INSERT INTO leave_balances (tenant_id, employee_id, leave_type_id, year, entitled, used, remaining)
        SELECT $1,$2,$3,$4,$5::int,$6::int,$7::int
        WHERE NOT EXISTS (SELECT 1 FROM leave_balances WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4)
        RETURNING id
      `, { bind: [emp.tenant_id || tenantId, emp.id, lt.id, year, maxDays, used, remaining] });
      if (ins.length) balAdded++;
    }
  }
  console.log(`  ✓ Saldo cuti: +${balAdded} record`);

  // ── Leave requests with workflow ──
  const leaveSamples = [
    { empIdx: 1, type: 'annual', days: 3, offset: 7, status: 'pending' },
    { empIdx: 2, type: 'sick', days: 2, offset: 1, status: 'pending' },
    { empIdx: 5, type: 'personal', days: 1, offset: 14, status: 'pending' },
    { empIdx: 3, type: 'annual', days: 5, offset: -5, status: 'approved' },
    { empIdx: 7, type: 'sick', days: 1, offset: -2, status: 'approved' },
  ];
  let lrAdded = 0;
  for (const ls of leaveSamples) {
    const emp = empRows[ls.empIdx];
    if (!emp) continue;
    const start = new Date(); start.setDate(start.getDate() + ls.offset);
    const end = new Date(start); end.setDate(end.getDate() + ls.days - 1);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const [exists] = await sequelize.query(
      'SELECT id FROM leave_requests WHERE employee_id = $1 AND start_date = $2 LIMIT 1',
      { bind: [emp.id, startStr] }
    );
    if (exists.length) continue;
    const [lr] = await sequelize.query(`
      INSERT INTO leave_requests (tenant_id, employee_id, leave_type, start_date, end_date, total_days, reason, status, current_approval_step, total_approval_steps)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,2) RETURNING id
    `, {
      bind: [
        emp.tenant_id || tenantId, emp.id, ls.type, startStr, endStr, ls.days,
        ls.type === 'sick' ? 'Sakit demam' : ls.type === 'personal' ? 'Keperluan pribadi' : 'Liburan keluarga',
        ls.status, ls.status === 'pending' ? 1 : 2,
      ],
    });
    const lrId = lr[0].id;
    if (ls.status === 'pending') {
      await sequelize.query(`
        INSERT INTO leave_approval_steps (leave_request_id, step_order, approver_role, status) VALUES
        ($1, 1, 'manager', 'pending'), ($1, 2, 'hr_manager', 'waiting')
      `, { bind: [lrId] });
    } else {
      await sequelize.query(`
        INSERT INTO leave_approval_steps (leave_request_id, step_order, approver_role, status, acted_at) VALUES
        ($1, 1, 'manager', 'approved', NOW()), ($1, 2, 'hr_manager', 'approved', NOW())
      `, { bind: [lrId] });
    }
    lrAdded++;
  }
  console.log(`  ✓ Pengajuan cuti: +${lrAdded} record`);

  // ── Performance reviews + 360° ──
  const reviewPeriod = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;
  let revAdded = 0;
  for (const emp of empRows.slice(0, 5)) {
    const [br] = await sequelize.query('SELECT name FROM branches WHERE id = $1', { bind: [emp.branch_id] });
    const [exists] = await sequelize.query(
      'SELECT id FROM performance_reviews WHERE employee_id = $1 AND (review_period = $2 OR period = $2) LIMIT 1',
      { bind: [emp.id, reviewPeriod] }
    );
    if (exists.length) continue;
    const rating = 3.5 + Math.random() * 1.5;
    const [rev] = await sequelize.query(`
      INSERT INTO performance_reviews (
        tenant_id, employee_id, employee_name, position, department, branch_id, branch_name,
        review_period, review_type, review_date, reviewer_name, overall_rating, overall_score, period, status, review_type_360,
        strengths, areas_for_improvement, goals
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'quarterly',CURRENT_DATE,'HR Manager',$9,$9,$8,'submitted',true,
        '["Komunikasi baik","Tepat waktu"]'::jsonb, '["Delegasi"]'::jsonb, '["Tingkatkan produktivitas 10%"]'::jsonb)
      RETURNING id
    `, { bind: [emp.tenant_id || tenantId, emp.id, emp.name, emp.position, emp.department, emp.branch_id, br[0]?.name || 'HQ', reviewPeriod, Math.round(rating * 10) / 10] });
    const reviewId = rev[0].id;
    const cats = [['Kualitas Kerja', 25], ['Produktivitas', 25], ['Kerjasama Tim', 20], ['Kedisiplinan', 15], ['Inisiatif', 15]];
    for (let i = 0; i < cats.length; i++) {
      await sequelize.query(
        'INSERT INTO performance_review_categories (review_id, name, weight, rating, sort_order) VALUES ($1,$2,$3,$4,$5)',
        { bind: [reviewId, cats[i][0], cats[i][1], Math.round(rating * 10) / 10, i] }
      );
    }
    const fbTypes = [['self', 'Diri Sendiri'], ['manager', 'Atasan'], ['peer', 'Rekan Kerja']];
    for (const [type, rel] of fbTypes) {
      await sequelize.query(`
        INSERT INTO performance_review_feedback (tenant_id, review_id, employee_id, reviewer_name, feedback_type, relationship, competency, rating, comments)
        VALUES ($1,$2,$3,$4,$5,$6,'Komunikasi',$7,'Feedback ${type} untuk ${emp.name}')
      `, { bind: [emp.tenant_id || tenantId, reviewId, emp.id, rel, type, rel, Math.round(rating * 10) / 10] });
    }
    revAdded++;
  }
  console.log(`  ✓ Evaluasi kinerja: +${revAdded} review (+360°)`);

  // ── HRIS activities ──
  const activitySamples = [
    ['employee_joined', 'Karyawan baru bergabung', 'Onboarding selesai'],
    ['leave_request', 'Pengajuan cuti baru', 'Menunggu approval atasan'],
    ['kpi_assigned', 'KPI bulanan ditetapkan', `Periode ${period}`],
    ['performance_review', 'Evaluasi kinerja disubmit', reviewPeriod],
    ['attendance', 'Rekap absensi harian', 'Data absensi tersinkronisasi'],
    ['payroll', 'Payroll diproses', 'Gaji bulan berjalan'],
  ];
  let actAdded = 0;
  for (let i = 0; i < activitySamples.length; i++) {
    const [type, title, desc] = activitySamples[i];
    const [ins] = await sequelize.query(`
      INSERT INTO hris_activities (tenant_id, activity_type, title, description, actor_name, created_at)
      SELECT $1,$2,$3,$4,'HR System', NOW() - ($5 || ' hours')::interval
      WHERE NOT EXISTS (
        SELECT 1 FROM hris_activities WHERE activity_type = $6 AND title = $7
      )
      RETURNING id
    `, { bind: [tenantId, type, title, desc, String(i * 4 + 1), type, title] });
    if (ins.length) actAdded++;
  }
  console.log(`  ✓ Aktivitas HR: +${actAdded} record`);

  // ── Summary ──
  const counts = {};
  for (const t of ['employees', 'employee_kpis', 'employee_attendance', 'leave_requests', 'performance_reviews', 'performance_review_feedback', 'hris_activities']) {
    const [r] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
    counts[t] = r[0].c;
  }
  console.log('\n✅ HRIS demo data siap:');
  console.log(`   Karyawan: ${counts.employees} | KPI: ${counts.employee_kpis} | Absensi: ${counts.employee_attendance}`);
  console.log(`   Cuti: ${counts.leave_requests} | Review: ${counts.performance_reviews} | 360°: ${counts.performance_review_feedback}`);
  console.log(`   Aktivitas: ${counts.hris_activities}`);

  await sequelize.close();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });

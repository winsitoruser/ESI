#!/usr/bin/env node
/**
 * Seed recruitment, training, development & scoring demo data
 * Run: npm run db:recruitment-training-seed
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

async function run() {
  await sequelize.authenticate();
  console.log('Seeding recruitment & training demo data...\n');

  // Base recruitment/training/kpi seed
  require('child_process').execSync('node scripts/create-hris-recruitment-training-kpi.js', { stdio: 'inherit' });

  const [[{ id: tid }]] = await sequelize.query('SELECT id FROM tenants LIMIT 1');
  const [employees] = await sequelize.query(
    `SELECT id, name FROM employees WHERE COALESCE(status, 'active') ILIKE 'active%' OR is_active = true ORDER BY created_at LIMIT 10`
  ).catch(() => sequelize.query('SELECT id, name FROM employees ORDER BY created_at LIMIT 10'));

  // ── Training Development: curricula, modules, batches ──
  const [[{ c: curCount }]] = await sequelize.query(
    'SELECT COUNT(*)::int AS c FROM hris_training_curricula'
  );
  const [[{ c: batchCount }]] = await sequelize.query(
    'SELECT COUNT(*)::int AS c FROM hris_training_batches'
  );

  let curricula = [];
  if (parseInt(curCount) === 0) {
    const [rows] = await sequelize.query(`
      INSERT INTO hris_training_curricula (id, tenant_id, code, title, description, category, target_audience, total_hours, total_modules, passing_score, status, version)
      VALUES
        (gen_random_uuid(), :tid, 'CUR-OUT-001', 'Outsourcing Pet Care Specialist', 'Kurikulum pelatihan tenaga outsourcing pet care', 'outsourcing', 'new_hire', 120, 8, 75, 'active', '1.0'),
        (gen_random_uuid(), :tid, 'CUR-ONB-001', 'Onboarding Karyawan Baru', 'Program onboarding 2 minggu', 'onboarding', 'new_hire', 40, 5, 70, 'active', '1.0'),
        (gen_random_uuid(), :tid, 'CUR-TECH-001', 'Technical POS & Inventory', 'Pelatihan teknis sistem operasional', 'technical', 'existing_employee', 24, 4, 80, 'active', '1.0')
      RETURNING id, code, title
    `, { replacements: { tid } });
    curricula = rows;

    for (const cur of curricula) {
      await sequelize.query(`
        INSERT INTO hris_training_modules (id, tenant_id, curriculum_id, code, title, description, order_index, duration_hours, module_type, delivery_method, has_exam, passing_score, status)
        VALUES
          (gen_random_uuid(), :tid, :cid, :code || '-M1', 'Pengenalan & SOP', 'Modul dasar', 1, 8, 'lesson', 'classroom', false, null, 'active'),
          (gen_random_uuid(), :tid, :cid, :code || '-M2', 'Praktik Lapangan', 'Hands-on training', 2, 16, 'practical', 'field', true, 75, 'active'),
          (gen_random_uuid(), :tid, :cid, :code || '-M3', 'Ujian Akhir', 'Assessment kompetensi', 3, 4, 'exam', 'online', true, 75, 'active')
      `, { replacements: { tid, cid: cur.id, code: cur.code } });
    }
  } else {
    const [rows] = await sequelize.query(
      'SELECT id, code, title FROM hris_training_curricula ORDER BY created_at'
    );
    curricula = rows;
  }

  if (parseInt(batchCount) === 0 && curricula.length > 0) {
    const outsourcingCur = curricula.find((c) => c.code === 'CUR-OUT-001') || curricula[0];
    const [pgms] = await sequelize.query('SELECT id FROM hris_training_programs LIMIT 1');
    const programId = pgms[0]?.id || null;

    const [batches] = await sequelize.query(`
      INSERT INTO hris_training_batches (id, tenant_id, curriculum_id, program_id, batch_code, batch_name, batch_type, start_date, end_date, max_participants, current_participants, instructor, location, client_company, status)
      VALUES
        (gen_random_uuid(), :tid, :cid, :pid, 'BATCH-2026-001', 'Outsourcing Batch 1 - PetCare Co', 'outsourcing', '2026-03-01', '2026-04-15', 25, 18, 'Budi Santoso', 'Jakarta', 'PetCare Partner A', 'in_progress'),
        (gen_random_uuid(), :tid, :cid, :pid, 'BATCH-2026-002', 'Outsourcing Batch 2 - VetAssist', 'outsourcing', '2026-04-01', '2026-05-15', 20, 5, 'Siti Rahayu', 'Bandung', 'VetAssist Partner', 'registration'),
        (gen_random_uuid(), :tid, :cid2, :pid, 'BATCH-ONB-001', 'Onboarding Maret 2026', 'onboarding', '2026-03-10', '2026-03-24', 30, 12, 'HR Team', 'Online', null, 'in_progress')
      RETURNING id, batch_code, batch_type
    `, { replacements: { tid, cid: outsourcingCur?.id, cid2: curricula[1]?.id || curricula[0]?.id, pid: programId } });

    const outBatch = batches.find((b) => b.batch_type === 'outsourcing');
    if (outBatch && employees.length >= 3) {
      await sequelize.query(`
        INSERT INTO hris_training_graduations (id, tenant_id, batch_id, employee_id, employee_name, graduation_status, final_score, attendance_rate, exam_score_avg, practical_score, ready_for_placement)
        VALUES
          (gen_random_uuid(), :tid, :bid, :e1, :n1, 'in_progress', 72, 90, 70, 75, false),
          (gen_random_uuid(), :tid, :bid, :e2, :n2, 'passed', 88, 95, 85, 90, true),
          (gen_random_uuid(), :tid, :bid, :e3, :n3, 'passed', 82, 88, 80, 85, true)
      `, {
        replacements: {
          tid, bid: outBatch.id,
          e1: employees[0].id, n1: employees[0].name,
          e2: employees[1].id, n2: employees[1].name,
          e3: employees[2].id, n3: employees[2].name,
        },
      });

      await sequelize.query(`
        INSERT INTO hris_training_placements (id, tenant_id, batch_id, employee_id, employee_name, placement_type, client_company, position, start_date, status)
        VALUES
          (gen_random_uuid(), :tid, :bid, :e2, :n2, 'outsourcing_deployment', 'PetCare Partner A', 'Pet Care Specialist', '2026-04-01', 'active'),
          (gen_random_uuid(), :tid, :bid, :e3, :n3, 'outsourcing_deployment', 'PetCare Partner A', 'Pet Care Specialist', '2026-03-15', 'completed')
      `, {
        replacements: {
          tid, bid: outBatch.id,
          e2: employees[1].id, n2: employees[1].name,
          e3: employees[2].id, n3: employees[2].name,
        },
      });
    }
    console.log('  ✓ training-development seed');
  }

  const [[{ c: gradCount }]] = await sequelize.query(
    'SELECT COUNT(*)::int AS c FROM hris_training_graduations'
  );
  if (parseInt(gradCount) === 0) {
    const [batches] = await sequelize.query(
      `SELECT id FROM hris_training_batches WHERE batch_type = 'outsourcing' ORDER BY created_at LIMIT 1`
    );
    if (batches[0] && employees.length >= 3) {
      await sequelize.query(`
        INSERT INTO hris_training_graduations (id, tenant_id, batch_id, employee_id, employee_name, graduation_status, final_score, attendance_rate, exam_score_avg, practical_score, ready_for_placement)
        VALUES
          (gen_random_uuid(), :tid, :bid, :e1, :n1, 'in_progress', 72, 90, 70, 75, false),
          (gen_random_uuid(), :tid, :bid, :e2, :n2, 'passed', 88, 95, 85, 90, true),
          (gen_random_uuid(), :tid, :bid, :e3, :n3, 'passed', 82, 88, 80, 85, true)
      `, {
        replacements: {
          tid, bid: batches[0].id,
          e1: employees[0].id, n1: employees[0].name,
          e2: employees[1].id, n2: employees[1].name,
          e3: employees[2].id, n3: employees[2].name,
        },
      });
      await sequelize.query(`
        INSERT INTO hris_training_placements (id, tenant_id, batch_id, employee_id, employee_name, placement_type, client_company, position, start_date, status)
        VALUES
          (gen_random_uuid(), :tid, :bid, :e2, :n2, 'outsourcing_deployment', 'PetCare Partner A', 'Pet Care Specialist', '2026-04-01', 'active'),
          (gen_random_uuid(), :tid, :bid, :e3, :n3, 'outsourcing_deployment', 'PetCare Partner A', 'Pet Care Specialist', '2026-03-15', 'completed')
      `, {
        replacements: {
          tid, bid: batches[0].id,
          e2: employees[1].id, n2: employees[1].name,
          e3: employees[2].id, n3: employees[2].name,
        },
      });
      console.log('  ✓ graduations & placements seed');
    }
  }

  // ── Training Scoring ──
  const [[{ c: cfgCount }]] = await sequelize.query(
    'SELECT COUNT(*)::int AS c FROM hris_training_scoring_configs'
  );
  const [[{ c: scoreCount }]] = await sequelize.query(
    'SELECT COUNT(*)::int AS c FROM hris_training_participant_scores'
  );

  if (parseInt(cfgCount) === 0) {
    const [curricula] = await sequelize.query(
      'SELECT id, title FROM hris_training_curricula ORDER BY created_at LIMIT 1'
    );
    const curId = curricula[0]?.id;
    if (curId) {
      const [configs] = await sequelize.query(`
        INSERT INTO hris_training_scoring_configs (id, tenant_id, curriculum_id, config_name, weight_exam, weight_attendance, weight_practical, weight_assignment, weight_attitude, passing_score, is_default, status)
        VALUES (gen_random_uuid(), :tid, :cid, 'Standard Outsourcing Score', 30, 15, 25, 15, 15, 75, true, 'active')
        RETURNING id
      `, { replacements: { tid, cid: curId } });

      await sequelize.query(`
        INSERT INTO hris_training_competencies (id, tenant_id, curriculum_id, code, name, description, weight, order_index, status)
        VALUES
          (gen_random_uuid(), :tid, :cid, 'COMP-01', 'Technical Knowledge', 'Pengetahuan teknis dasar', 25, 1, 'active'),
          (gen_random_uuid(), :tid, :cid, 'COMP-02', 'Practical Skills', 'Keterampilan praktik lapangan', 30, 2, 'active'),
          (gen_random_uuid(), :tid, :cid, 'COMP-03', 'Communication', 'Komunikasi dengan klien', 20, 3, 'active'),
          (gen_random_uuid(), :tid, :cid, 'COMP-04', 'Attitude & Discipline', 'Sikap dan kedisiplinan', 25, 4, 'active')
      `, { replacements: { tid, cid: curId } });

      const [batches] = await sequelize.query(
        `SELECT id FROM hris_training_batches WHERE batch_type = 'outsourcing' LIMIT 1`
      );
      const [grads] = await sequelize.query(
        'SELECT id, batch_id, employee_name FROM hris_training_graduations LIMIT 2'
      );
      if (configs[0] && batches[0] && grads.length) {
        for (const g of grads) {
          await sequelize.query(`
            INSERT INTO hris_training_participant_scores (id, tenant_id, batch_id, graduation_id, scoring_config_id, employee_id, exam_score, attendance_score, practical_score, assignment_score, attitude_score, weighted_score, grade, is_passed)
            VALUES (gen_random_uuid(), :tid, :bid, :gid, :cfg, :eid, 82, 90, 85, 78, 88, 84.5, 'B+', true)
          `, { replacements: { tid, bid: g.batch_id || batches[0].id, gid: g.id, cfg: configs[0].id, eid: employees[0]?.id } });
        }
      }
      console.log('  ✓ training-scoring seed');
    }
  } else if (parseInt(scoreCount) === 0) {
    const [configs] = await sequelize.query('SELECT id FROM hris_training_scoring_configs LIMIT 1');
    const [batches] = await sequelize.query(
      `SELECT id FROM hris_training_batches WHERE batch_type = 'outsourcing' LIMIT 1`
    );
    const [grads] = await sequelize.query(
      'SELECT id, batch_id FROM hris_training_graduations LIMIT 2'
    );
    if (configs[0] && batches[0] && grads.length) {
      for (const g of grads) {
        await sequelize.query(`
          INSERT INTO hris_training_participant_scores (id, tenant_id, batch_id, graduation_id, scoring_config_id, employee_id, exam_score, attendance_score, practical_score, assignment_score, attitude_score, weighted_score, grade, is_passed)
          VALUES (gen_random_uuid(), :tid, :bid, :gid, :cfg, :eid, 82, 90, 85, 78, 88, 84.5, 'B+', true)
        `, { replacements: { tid, bid: g.batch_id || batches[0].id, gid: g.id, cfg: configs[0].id, eid: employees[0]?.id } });
      }
      console.log('  ✓ participant scores seed');
    }
  }

  await sequelize.close();
  console.log('\n✅ Recruitment & training seed complete');
}

run().catch((e) => { console.error('❌', e.message); process.exit(1); });

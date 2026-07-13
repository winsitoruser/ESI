#!/usr/bin/env node
/**
 * Seed LMS Phase B demo — adaptive blueprint + psychometric exam with proctoring
 * Run: node scripts/seed-lms-phase-b-demo.js
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

async function main() {
  const [tenants] = await sequelize.query(`SELECT id FROM tenants LIMIT 1`);
  const tenantId = tenants[0]?.id;
  if (!tenantId) { console.error('No tenant'); process.exit(1); }

  const [users] = await sequelize.query(`SELECT id FROM users WHERE email LIKE '%humanify%' OR email LIKE '%superadmin%' LIMIT 1`);
  const userId = users[0]?.id || null;

  const sections = JSON.stringify([
    { category: 'numerical', count: 3, difficulty: 'medium' },
    { category: 'verbal', count: 3, difficulty: 'medium' },
    { category: 'integrity', count: 4, psychometric_type: 'integrity' },
  ]);

  const [bp] = await sequelize.query(`
    INSERT INTO hris_lms_exam_blueprints (id, tenant_id, title, psychometric_type, sections, total_questions, created_by)
    VALUES (gen_random_uuid(), :tid, 'Demo Blueprint Kognitif+Integritas', 'cognitive', :sections::jsonb, 10, NULL)
    ON CONFLICT DO NOTHING
    RETURNING id
  `, { replacements: { tid: tenantId, sections } }).catch(() => [[]]);

  const blueprintId = bp[0]?.id;
  if (blueprintId) console.log('Blueprint:', blueprintId);

  const [exam] = await sequelize.query(`
    INSERT INTO hris_training_exams (tenant_id, title, description, exam_type, exam_scope, total_questions, total_score,
      passing_score, duration_minutes, max_attempts, shuffle_questions, anti_cheat_enabled, proctor_enabled,
      psychometric_type, status, created_by)
  VALUES (:tid, 'Psikotes Demo Phase B', 'Ujian demo blueprint adaptif + proctoring', 'online', 'psychometric', 0, 100,
      70, 45, 2, true, true, true, 'cognitive', 'open', NULL)
    RETURNING id
  `, { replacements: { tid: tenantId } });

  const examId = exam[0]?.id;
  if (!examId) { console.log('Exam creation skipped'); return; }
  console.log('Exam:', examId);

  if (blueprintId) {
    await sequelize.query(`UPDATE hris_training_exams SET blueprint_id = :bid WHERE id = :eid`, {
      replacements: { bid: blueprintId, eid: examId },
    });
  }

  const categories = ['numerical', 'verbal', 'integrity'];
  for (const cat of categories) {
    const [qs] = await sequelize.query(`
      SELECT id FROM hris_lms_question_bank
      WHERE tenant_id = :tid AND (category = :cat OR psychometric_type = :cat)
      LIMIT 5
    `, { replacements: { tid: tenantId, cat } });
    let num = 1;
    for (const q of qs) {
      await sequelize.query(`
        INSERT INTO hris_training_exam_questions (exam_id, question_bank_id, question_number, question_text, question_type, options, correct_answer, score, difficulty)
        SELECT :eid, qb.id, :num, qb.question_text, qb.question_type, qb.options, qb.correct_answer, qb.score, qb.difficulty
        FROM hris_lms_question_bank qb WHERE qb.id = :qid
        ON CONFLICT DO NOTHING
      `, { replacements: { eid: examId, num, qid: q.id } }).catch(async () => {
        const [row] = await sequelize.query(`SELECT * FROM hris_lms_question_bank WHERE id = :qid`, { replacements: { qid: q.id } });
        if (!row[0]) return;
        const qb = row[0];
        await sequelize.query(`
          INSERT INTO hris_training_exam_questions (exam_id, question_number, question_text, question_type, options, correct_answer, score, difficulty)
          VALUES (:eid, :num, :text, :qt, :opts::jsonb, :ans, :score, :diff)
        `, {
          replacements: {
            eid: examId, num, text: qb.question_text, qt: qb.question_type || 'multiple_choice',
            opts: JSON.stringify(qb.options || []), ans: qb.correct_answer, score: qb.score || 1, diff: qb.difficulty || 'medium',
          },
        });
      });
      num++;
    }
  }

  await sequelize.query(`
    UPDATE hris_training_exams SET total_questions = (SELECT COUNT(*) FROM hris_training_exam_questions WHERE exam_id = :eid) WHERE id = :eid
  `, { replacements: { eid: examId } });

  console.log('Phase B seed done. Open exam at /employee/training');
  await sequelize.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

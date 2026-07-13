/**
 * Employee LMS API — training, exams, progress for logged-in employees
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { gradeExam, computeIntegrityScore } from '../../../lib/hris/lms/grading';

const sequelize = require('../../../lib/sequelize');

async function resolveEmployee(session: any) {
  const userId = session.user?.id;
  const tenantId = session.user?.tenantId || null;
  const [rows] = await sequelize.query(
    `SELECT id, full_name, email, department_id FROM employees WHERE user_id = :uid LIMIT 1`,
    { replacements: { uid: userId } },
  );
  if (rows.length) return { ...rows[0], tenantId };
  const [byEmail] = await sequelize.query(
    `SELECT id, full_name, email, department_id FROM employees WHERE email = :email LIMIT 1`,
    { replacements: { email: session.user?.email } },
  );
  return byEmail[0] ? { ...byEmail[0], tenantId } : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const emp = await resolveEmployee(session);
    if (!emp) return res.status(404).json({ error: 'Data karyawan tidak ditemukan' });

    const { action } = req.query;
    const tenantId = emp.tenantId;
    const empId = emp.id;
    const empName = emp.full_name;

    if (req.method === 'GET') {
      if (action === 'dashboard') {
        const [exams] = await sequelize.query(`
          SELECT e.*, s.scheduled_start, s.scheduled_end,
            (SELECT COUNT(*)::int FROM hris_training_exam_results r WHERE r.exam_id = e.id AND r.employee_id = :empid) as my_attempts,
            (SELECT r.is_passed FROM hris_training_exam_results r WHERE r.exam_id = e.id AND r.employee_id = :empid ORDER BY r.created_at DESC LIMIT 1) as last_passed
          FROM hris_training_exams e
          LEFT JOIN hris_lms_test_schedules s ON s.exam_id = e.id AND s.status IN ('scheduled','open')
          WHERE e.tenant_id = :tid AND e.status IN ('open','scheduled')
          ORDER BY e.exam_date DESC NULLS LAST
        `, { replacements: { tid: tenantId, empid: empId } }).catch(() => [[]]);

        const [progress] = await sequelize.query(`
          SELECT p.*, c.title as curriculum_title, m.title as module_title
          FROM hris_lms_course_progress p
          LEFT JOIN hris_training_curricula c ON p.curriculum_id = c.id
          LEFT JOIN hris_training_modules m ON p.module_id = m.id
          WHERE p.employee_id = :empid ORDER BY p.last_accessed_at DESC NULLS LAST LIMIT 20
        `, { replacements: { empid: empId } }).catch(() => [[]]);

        const [competencies] = await sequelize.query(`
          SELECT * FROM hris_lms_competency_history WHERE employee_id = :empid ORDER BY certified_at DESC LIMIT 10
        `, { replacements: { empid: empId } }).catch(() => [[]]);

        const [results] = await sequelize.query(`
          SELECT r.*, e.title as exam_title, e.psychometric_type
          FROM hris_training_exam_results r
          LEFT JOIN hris_training_exams e ON r.exam_id = e.id
          WHERE r.employee_id = :empid ORDER BY r.submitted_at DESC NULLS LAST LIMIT 15
        `, { replacements: { empid: empId } });

        return res.json({ success: true, data: { exams, progress, competencies, results, employee: { id: empId, name: empName } } });
      }

      if (action === 'exam-detail') {
        const { exam_id } = req.query;
        const [exams] = await sequelize.query('SELECT * FROM hris_training_exams WHERE id = :eid AND tenant_id = :tid', { replacements: { eid: exam_id, tid: tenantId } });
        if (!exams.length) return res.status(404).json({ error: 'Ujian tidak ditemukan' });
        const exam = exams[0];
        if (!['open', 'in_progress'].includes(exam.status)) {
          return res.status(400).json({ error: 'Ujian belum dibuka atau sudah ditutup' });
        }
        const [questions] = await sequelize.query(`
          SELECT id, question_number, question_text, question_type, options, score, difficulty
          FROM hris_training_exam_questions WHERE exam_id = :eid
          ORDER BY ${exam.shuffle_questions ? 'RANDOM()' : 'question_number ASC'}
        `, { replacements: { eid: exam_id } });
        const safeQuestions = questions.map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options.map((o: any) => ({ label: o.label, text: o.text })) : q.options,
        }));
        const [attempts] = await sequelize.query(
          'SELECT COUNT(*)::int as count FROM hris_training_exam_results WHERE exam_id = :eid AND employee_id = :empid',
          { replacements: { eid: exam_id, empid: empId } },
        );
        return res.json({
          success: true,
          data: {
            exam,
            questions: safeQuestions,
            can_attempt: (attempts[0]?.count || 0) < exam.max_attempts,
            attempts_used: attempts[0]?.count || 0,
          },
        });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'start-exam') {
        const { exam_id } = req.body;
        const [attempts] = await sequelize.query(
          'SELECT COUNT(*)::int as count FROM hris_training_exam_results WHERE exam_id = :eid AND employee_id = :empid',
          { replacements: { eid: exam_id, empid: empId } },
        );
        const [exam] = await sequelize.query('SELECT * FROM hris_training_exams WHERE id = :eid', { replacements: { eid: exam_id } });
        if (!exam.length) return res.status(404).json({ error: 'Ujian tidak ditemukan' });
        if ((attempts[0]?.count || 0) >= exam[0].max_attempts) {
          return res.status(400).json({ error: 'Batas percobaan sudah habis' });
        }
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_exam_results (tenant_id, exam_id, employee_id, employee_name, batch_id, attempt_number, started_at, status)
          VALUES (:tid, :eid, :empid, :name, :bid, :attempt, NOW(), 'in_progress') RETURNING *
        `, {
          replacements: {
            tid: tenantId, eid: exam_id, empid: empId, name: empName,
            bid: exam[0].batch_id || null, attempt: (attempts[0]?.count || 0) + 1,
          },
        });
        const resultId = rows[0].id;
        try {
          await sequelize.query(`
            INSERT INTO hris_lms_exam_sessions (tenant_id, result_id, exam_id, employee_id, started_at, ip_address, user_agent, status)
            VALUES (:tid, :rid, :eid, :empid, NOW(), :ip, :ua, 'active')
          `, {
            replacements: {
              tid: tenantId, rid: resultId, eid: exam_id, empid: empId,
              ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
              ua: req.headers['user-agent'] || null,
            },
          });
        } catch { /* table may not exist yet */ }
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'exam-event') {
        const { result_id, event_type } = req.body;
        const fieldMap: Record<string, string> = {
          tab_switch: 'tab_switch_count',
          fullscreen_exit: 'fullscreen_exit_count',
          copy_paste: 'copy_paste_count',
          idle_warning: 'idle_warnings',
        };
        const field = fieldMap[event_type];
        if (!field || !result_id) return res.status(400).json({ error: 'Invalid event' });
        try {
          await sequelize.query(`
            UPDATE hris_lms_exam_sessions SET ${field} = ${field} + 1, updated_at = NOW()
            WHERE result_id = :rid AND employee_id = :empid AND status = 'active'
          `, { replacements: { rid: result_id, empid: empId } });
        } catch { /* ignore */ }
        return res.json({ success: true });
      }

      if (action === 'submit-exam') {
        const { result_id, answers } = req.body;
        const [results] = await sequelize.query(
          'SELECT * FROM hris_training_exam_results WHERE id = :rid AND employee_id = :empid',
          { replacements: { rid: result_id, empid: empId } },
        );
        if (!results.length) return res.status(404).json({ error: 'Hasil ujian tidak ditemukan' });
        if (results[0].status !== 'in_progress') return res.status(400).json({ error: 'Ujian sudah dikumpulkan' });

        const examId = results[0].exam_id;
        const [exam] = await sequelize.query('SELECT * FROM hris_training_exams WHERE id = :eid', { replacements: { eid: examId } });
        const [questions] = await sequelize.query(
          'SELECT * FROM hris_training_exam_questions WHERE exam_id = :eid ORDER BY question_number',
          { replacements: { eid: examId } },
        );

        const graded = gradeExam(questions, answers || []);
        const passing = Number(exam[0]?.passing_score) || 70;
        const isPassed = !graded.needsManual && graded.pct >= passing;
        const status = graded.needsManual ? 'submitted' : 'graded';

        let integrityScore = 100;
        try {
          const [sess] = await sequelize.query(
            'SELECT * FROM hris_lms_exam_sessions WHERE result_id = :rid',
            { replacements: { rid: result_id } },
          );
          if (sess.length) {
            integrityScore = computeIntegrityScore(sess[0]);
            const flagged = integrityScore < 70 || sess[0].tab_switch_count > 5;
            await sequelize.query(`
              UPDATE hris_lms_exam_sessions SET ended_at = NOW(), integrity_score = :score,
                status = :st, updated_at = NOW() WHERE result_id = :rid
            `, { replacements: { score: integrityScore, st: flagged ? 'flagged' : 'submitted', rid: result_id } });
          }
        } catch { /* ignore */ }

        await sequelize.query(`
          UPDATE hris_training_exam_results SET score = :score, max_score = :max, percentage = :pct,
            correct_count = :correct, answered_count = :answered, answers = :ans::jsonb,
            is_passed = :pass, status = :st, submitted_at = NOW(),
            metadata = :meta::jsonb
          WHERE id = :rid
        `, {
          replacements: {
            score: graded.totalScore, max: graded.maxScore, pct: graded.pct,
            correct: graded.totalCorrect, answered: graded.totalAnswered,
            ans: JSON.stringify(graded.gradedAnswers), pass: isPassed, st: status, rid: result_id,
            meta: JSON.stringify({ needs_manual: graded.needsManual, integrity_score: integrityScore }),
          },
        });

        if (isPassed && exam[0]?.psychometric_type) {
          try {
            await sequelize.query(`
              INSERT INTO hris_lms_competency_history (tenant_id, employee_id, employee_name, competency_code, competency_name, level, score, source_type, source_id, certified_at)
              VALUES (:tid, :empid, :name, :code, :cname, :lvl, :score, 'psychometric', :sid, NOW())
            `, {
              replacements: {
                tid: tenantId, empid: empId, name: empName,
                code: `PSYCHO_${exam[0].psychometric_type}`.toUpperCase(),
                cname: `Psikotes ${exam[0].psychometric_type}`,
                lvl: graded.pct >= 85 ? 'advanced' : graded.pct >= passing ? 'intermediate' : 'beginner',
                score: graded.pct, sid: result_id,
              },
            });
          } catch { /* ignore */ }
        }

        return res.json({
          success: true,
          data: {
            score: graded.totalScore, percentage: graded.pct, is_passed: isPassed,
            needs_manual: graded.needsManual, integrity_score: integrityScore,
          },
        });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[Employee LMS]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

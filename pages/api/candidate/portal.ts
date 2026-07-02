/**
 * Candidate Portal - Data API
 * 
 * All endpoints require Bearer token from candidate auth
 * 
 * GET ?action=dashboard        - Candidate dashboard overview
 * GET ?action=my-batches       - Batches the candidate is enrolled in
 * GET ?action=my-modules       - Learning modules for candidate's curricula
 * GET ?action=my-schedules     - Upcoming schedules
 * GET ?action=my-exams         - Available exams
 * GET ?action=my-results       - Exam results
 * GET ?action=my-graduation    - Graduation status & scores
 * GET ?action=my-placement     - Placement info
 * GET ?action=exam-detail      - Get exam with questions for taking
 * GET ?action=my-scores        - Detailed score breakdown
 * POST ?action=start-exam      - Start an exam attempt
 * POST ?action=submit-exam     - Submit exam answers
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { jwtVerify } from 'jose';

const sequelize = require('../../../lib/sequelize');

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'candidate-portal-secret-key');

async function getCandidateFromToken(req: NextApiRequest): Promise<any | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.substring(7);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch { return null; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const candidate = await getCandidateFromToken(req);
    if (!candidate) return res.status(401).json({ error: 'Silakan login terlebih dahulu' });

    const { action } = req.query;
    const method = req.method;
    const candidateId = candidate.id;
    const tenantId = candidate.tenantId;
    const employeeId = candidate.employeeId;

    // Resolve the employee ID — candidate might use employeeId or candidateAccountId
    const empId = employeeId || candidateId;

    // ══════════════════════════════════════
    // GET endpoints
    // ══════════════════════════════════════
    if (method === 'GET') {

      // ── Dashboard ──
      if (action === 'dashboard') {
        const [batches] = await sequelize.query(`
          SELECT COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE g.graduation_status='in_progress')::int as active,
            COUNT(*) FILTER (WHERE g.graduation_status='passed')::int as passed
          FROM hris_training_graduations g WHERE g.employee_id = :eid AND g.tenant_id = :tid
        `, { replacements: { eid: empId, tid: tenantId } });

        const [exams] = await sequelize.query(`
          SELECT COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE r.is_passed=true)::int as passed,
            COALESCE(AVG(r.score), 0)::decimal(5,2) as avg_score
          FROM hris_training_exam_results r WHERE r.employee_id = :eid AND r.tenant_id = :tid
        `, { replacements: { eid: empId, tid: tenantId } });

        const [upcoming] = await sequelize.query(`
          SELECT COUNT(*)::int as total
          FROM hris_training_schedules s
          JOIN hris_training_batches b ON s.batch_id = b.id
          JOIN hris_training_graduations g ON g.batch_id = b.id AND g.employee_id = :eid
          WHERE s.tenant_id = :tid AND s.session_date >= CURRENT_DATE AND s.status = 'scheduled'
        `, { replacements: { eid: empId, tid: tenantId } });

        const [placements] = await sequelize.query(`
          SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status='active')::int as active
          FROM hris_training_placements WHERE employee_id = :eid AND tenant_id = :tid
        `, { replacements: { eid: empId, tid: tenantId } });

        // Get latest scores
        const [scores] = await sequelize.query(`
          SELECT ps.weighted_score, ps.grade, ps.grade_label, ps.is_passed,
                 ps.exam_score, ps.attendance_score, ps.practical_score, ps.assignment_score, ps.attitude_score
          FROM hris_training_participant_scores ps
          WHERE ps.employee_id = :eid AND ps.tenant_id = :tid
          ORDER BY ps.created_at DESC LIMIT 1
        `, { replacements: { eid: empId, tid: tenantId } });

        return res.json({
          success: true,
          data: {
            batches: batches[0] || { total: 0, active: 0, passed: 0 },
            exams: exams[0] || { total: 0, passed: 0, avg_score: 0 },
            upcoming_schedules: upcoming[0]?.total || 0,
            placements: placements[0] || { total: 0, active: 0 },
            latest_score: scores[0] || null,
            candidate_name: candidate.name,
            candidate_email: candidate.email,
          }
        });
      }

      // ── My Batches ──
      if (action === 'my-batches') {
        const [rows] = await sequelize.query(`
          SELECT g.*, b.batch_name, b.batch_code, b.batch_type, b.start_date as batch_start,
                 b.end_date as batch_end, b.instructor, b.location as batch_location, b.status as batch_status,
                 c.title as curriculum_title, c.code as curriculum_code, c.total_hours, c.total_modules
          FROM hris_training_graduations g
          JOIN hris_training_batches b ON g.batch_id = b.id
          LEFT JOIN hris_training_curricula c ON g.curriculum_id = c.id
          WHERE g.employee_id = :eid AND g.tenant_id = :tid
          ORDER BY b.start_date DESC
        `, { replacements: { eid: empId, tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      // ── My Modules ──
      if (action === 'my-modules') {
        const { batch_id } = req.query;
        let batchFilter = '';
        const repl: any = { eid: empId, tid: tenantId };
        if (batch_id) {
          batchFilter = 'AND g.batch_id = :bid';
          repl.bid = batch_id;
        }
        const [rows] = await sequelize.query(`
          SELECT DISTINCT m.*, c.title as curriculum_title
          FROM hris_training_modules m
          JOIN hris_training_curricula c ON m.curriculum_id = c.id
          JOIN hris_training_graduations g ON g.curriculum_id = c.id AND g.employee_id = :eid ${batchFilter}
          WHERE m.tenant_id = :tid AND m.status = 'active'
          ORDER BY m.order_index ASC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      // ── My Schedules ──
      if (action === 'my-schedules') {
        const [rows] = await sequelize.query(`
          SELECT s.*, b.batch_name, b.batch_code, m.title as module_title
          FROM hris_training_schedules s
          JOIN hris_training_batches b ON s.batch_id = b.id
          JOIN hris_training_graduations g ON g.batch_id = b.id AND g.employee_id = :eid
          LEFT JOIN hris_training_modules m ON s.module_id = m.id
          WHERE s.tenant_id = :tid
          ORDER BY s.session_date ASC, s.start_time ASC
        `, { replacements: { eid: empId, tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      // ── My Exams (available) ──
      if (action === 'my-exams') {
        const [rows] = await sequelize.query(`
          SELECT e.*, c.title as curriculum_title, m.title as module_title, b.batch_name,
            (SELECT COUNT(*)::int FROM hris_training_exam_results r WHERE r.exam_id = e.id AND r.employee_id = :eid) as my_attempts,
            (SELECT r.score FROM hris_training_exam_results r WHERE r.exam_id = e.id AND r.employee_id = :eid ORDER BY r.attempt_number DESC LIMIT 1) as my_last_score,
            (SELECT r.is_passed FROM hris_training_exam_results r WHERE r.exam_id = e.id AND r.employee_id = :eid ORDER BY r.attempt_number DESC LIMIT 1) as my_passed
          FROM hris_training_exams e
          JOIN hris_training_batches b ON e.batch_id = b.id
          JOIN hris_training_graduations g ON g.batch_id = b.id AND g.employee_id = :eid
          LEFT JOIN hris_training_curricula c ON e.curriculum_id = c.id
          LEFT JOIN hris_training_modules m ON e.module_id = m.id
          WHERE e.tenant_id = :tid AND e.status IN ('open', 'scheduled', 'in_progress')
          ORDER BY e.exam_date ASC NULLS LAST
        `, { replacements: { eid: empId, tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      // ── Exam Detail (for taking the exam) ──
      if (action === 'exam-detail') {
        const { exam_id } = req.query;
        if (!exam_id) return res.status(400).json({ error: 'exam_id required' });

        const [exams] = await sequelize.query(
          'SELECT * FROM hris_training_exams WHERE id = :eid AND tenant_id = :tid',
          { replacements: { eid: exam_id, tid: tenantId } }
        );
        if (!exams.length) return res.status(404).json({ error: 'Ujian tidak ditemukan' });

        const exam = exams[0];
        if (!['open', 'in_progress'].includes(exam.status)) {
          return res.status(400).json({ error: 'Ujian belum dibuka atau sudah ditutup' });
        }

        // Get questions (hide correct_answer for candidate)
        const [questions] = await sequelize.query(`
          SELECT id, question_number, question_text, question_type, options, score, difficulty
          FROM hris_training_exam_questions WHERE exam_id = :eid
          ORDER BY ${exam.shuffle_questions ? 'RANDOM()' : 'question_number ASC'}
        `, { replacements: { eid: exam_id } });

        // Strip correct answers from options for MC
        const safeQuestions = questions.map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options.map((o: any) => ({ label: o.label, text: o.text })) : q.options
        }));

        // Check attempt count
        const [attempts] = await sequelize.query(
          'SELECT COUNT(*)::int as count FROM hris_training_exam_results WHERE exam_id = :eid AND employee_id = :empid',
          { replacements: { eid: exam_id, empid: empId } }
        );

        return res.json({
          success: true,
          data: {
            exam: {
              id: exam.id, title: exam.title, description: exam.description,
              exam_type: exam.exam_type, total_questions: exam.total_questions,
              duration_minutes: exam.duration_minutes, passing_score: exam.passing_score,
              max_attempts: exam.max_attempts,
            },
            questions: safeQuestions,
            attempts_used: attempts[0]?.count || 0,
            can_attempt: (attempts[0]?.count || 0) < exam.max_attempts,
          }
        });
      }

      // ── My Results ──
      if (action === 'my-results') {
        const [rows] = await sequelize.query(`
          SELECT r.*, e.title as exam_title, e.exam_type, e.passing_score as exam_passing_score, e.exam_scope,
                 b.batch_name
          FROM hris_training_exam_results r
          LEFT JOIN hris_training_exams e ON r.exam_id = e.id
          LEFT JOIN hris_training_batches b ON r.batch_id = b.id
          WHERE r.employee_id = :eid AND r.tenant_id = :tid
          ORDER BY r.submitted_at DESC NULLS LAST
        `, { replacements: { eid: empId, tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      // ── My Graduation ──
      if (action === 'my-graduation') {
        const [rows] = await sequelize.query(`
          SELECT g.*, b.batch_name, b.batch_code, b.batch_type, c.title as curriculum_title
          FROM hris_training_graduations g
          LEFT JOIN hris_training_batches b ON g.batch_id = b.id
          LEFT JOIN hris_training_curricula c ON g.curriculum_id = c.id
          WHERE g.employee_id = :eid AND g.tenant_id = :tid
          ORDER BY g.created_at DESC
        `, { replacements: { eid: empId, tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      // ── My Scores (detailed breakdown) ──
      if (action === 'my-scores') {
        const [rows] = await sequelize.query(`
          SELECT ps.*, b.batch_name, b.batch_code,
                 sc.config_name, sc.weight_exam, sc.weight_attendance, sc.weight_practical,
                 sc.weight_assignment, sc.weight_attitude, sc.passing_score as config_passing_score,
                 sc.grade_scale
          FROM hris_training_participant_scores ps
          LEFT JOIN hris_training_batches b ON ps.batch_id = b.id
          LEFT JOIN hris_training_scoring_configs sc ON ps.scoring_config_id = sc.id
          WHERE ps.employee_id = :eid AND ps.tenant_id = :tid
          ORDER BY ps.created_at DESC
        `, { replacements: { eid: empId, tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      // ── My Placement ──
      if (action === 'my-placement') {
        const [rows] = await sequelize.query(`
          SELECT p.*, b.batch_name, b.batch_code, g.graduation_status, g.final_score
          FROM hris_training_placements p
          LEFT JOIN hris_training_batches b ON p.batch_id = b.id
          LEFT JOIN hris_training_graduations g ON p.graduation_id = g.id
          WHERE p.employee_id = :eid AND p.tenant_id = :tid
          ORDER BY p.created_at DESC
        `, { replacements: { eid: empId, tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      return res.status(400).json({ error: `Unknown GET action: ${action}` });
    }

    // ══════════════════════════════════════
    // POST endpoints
    // ══════════════════════════════════════
    if (method === 'POST') {

      // ── Start Exam ──
      if (action === 'start-exam') {
        const { exam_id } = req.body;
        if (!exam_id) return res.status(400).json({ error: 'exam_id required' });

        // Check attempt limit
        const [attempts] = await sequelize.query(
          'SELECT COUNT(*)::int as count FROM hris_training_exam_results WHERE exam_id = :eid AND employee_id = :empid',
          { replacements: { eid: exam_id, empid: empId } }
        );
        const [exam] = await sequelize.query('SELECT max_attempts, batch_id FROM hris_training_exams WHERE id = :eid', { replacements: { eid: exam_id } });
        if (!exam.length) return res.status(404).json({ error: 'Ujian tidak ditemukan' });
        if ((attempts[0]?.count || 0) >= exam[0].max_attempts) {
          return res.status(400).json({ error: 'Batas percobaan sudah habis' });
        }

        // Create result record with status in_progress
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_exam_results (tenant_id, exam_id, employee_id, employee_name, batch_id, attempt_number, started_at, status)
          VALUES (:tid, :eid, :empid, :name, :bid, :attempt, NOW(), 'in_progress')
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, eid: exam_id, empid: empId, name: candidate.name,
            bid: exam[0].batch_id || null, attempt: (attempts[0]?.count || 0) + 1
          }
        });

        // Log activity
        await sequelize.query(
          `INSERT INTO hris_candidate_activity_logs (candidate_account_id, activity_type, entity_type, entity_id)
           VALUES (:aid, 'start_exam', 'exam', :eid)`,
          { replacements: { aid: candidateId, eid: exam_id } }
        );

        return res.status(201).json({ success: true, data: rows[0] });
      }

      // ── Submit Exam ──
      if (action === 'submit-exam') {
        const { result_id, answers } = req.body;
        if (!result_id || !answers) return res.status(400).json({ error: 'result_id dan answers diperlukan' });

        // Get the result record
        const [results] = await sequelize.query(
          'SELECT * FROM hris_training_exam_results WHERE id = :rid AND employee_id = :empid',
          { replacements: { rid: result_id, empid: empId } }
        );
        if (!results.length) return res.status(404).json({ error: 'Hasil ujian tidak ditemukan' });
        if (results[0].status !== 'in_progress') return res.status(400).json({ error: 'Ujian sudah dikumpulkan' });

        // Get exam and questions for grading
        const examId = results[0].exam_id;
        const [exam] = await sequelize.query('SELECT * FROM hris_training_exams WHERE id = :eid', { replacements: { eid: examId } });
        const [questions] = await sequelize.query(
          'SELECT * FROM hris_training_exam_questions WHERE exam_id = :eid ORDER BY question_number',
          { replacements: { eid: examId } }
        );

        // Auto-grade MC and TF questions
        let totalScore = 0;
        let totalCorrect = 0;
        let totalAnswered = 0;
        const gradedAnswers: any[] = [];

        for (const q of questions) {
          const userAnswer = answers.find((a: any) => a.question_id === q.id);
          if (!userAnswer) {
            gradedAnswers.push({ questionId: q.id, answer: null, score: 0, isCorrect: false });
            continue;
          }
          totalAnswered++;

          let isCorrect = false;
          let earnedScore = 0;

          if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
            // Auto-grade: check if answer matches correct
            const correctOpt = Array.isArray(q.options) ? q.options.find((o: any) => o.isCorrect) : null;
            isCorrect = correctOpt ? userAnswer.answer === correctOpt.label : userAnswer.answer === q.correct_answer;
            earnedScore = isCorrect ? Number(q.score) : 0;
          } else if (q.question_type === 'short_answer') {
            isCorrect = q.correct_answer && userAnswer.answer?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
            earnedScore = isCorrect ? Number(q.score) : 0;
          } else {
            // Essay/practical - needs manual grading, assign 0 for now
            earnedScore = 0;
          }

          if (isCorrect) totalCorrect++;
          totalScore += earnedScore;
          gradedAnswers.push({ questionId: q.id, answer: userAnswer.answer, score: earnedScore, isCorrect });
        }

        // Calculate percentage score
        const maxPossible = questions.reduce((sum: number, q: any) => sum + Number(q.score), 0);
        const percentScore = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
        const passingScore = Number(exam[0]?.passing_score || 70);
        const isPassed = percentScore >= passingScore;

        // Check if there are essay questions that need manual grading
        const hasEssay = questions.some((q: any) => q.question_type === 'essay' || q.question_type === 'practical');
        const finalStatus = hasEssay ? 'submitted' : 'graded';

        const [updated] = await sequelize.query(`
          UPDATE hris_training_exam_results SET
            score = :score, total_correct = :correct, total_answered = :answered,
            is_passed = :passed, submitted_at = NOW(), graded_at = ${hasEssay ? 'NULL' : 'NOW()'},
            answers = :answers::jsonb, status = :status, updated_at = NOW()
          WHERE id = :rid RETURNING *
        `, {
          replacements: {
            rid: result_id, score: Math.round(percentScore * 100) / 100,
            correct: totalCorrect, answered: totalAnswered, passed: isPassed,
            answers: JSON.stringify(gradedAnswers), status: finalStatus
          }
        });

        // Log activity
        await sequelize.query(
          `INSERT INTO hris_candidate_activity_logs (candidate_account_id, activity_type, entity_type, entity_id, details)
           VALUES (:aid, 'submit_exam', 'exam', :eid, :details::jsonb)`,
          { replacements: { aid: candidateId, eid: examId, details: JSON.stringify({ score: percentScore, passed: isPassed }) } }
        );

        return res.json({
          success: true,
          data: {
            ...updated[0],
            score_percentage: Math.round(percentScore * 100) / 100,
            total_correct: totalCorrect,
            total_questions: questions.length,
            needs_manual_grading: hasEssay,
          }
        });
      }

      return res.status(400).json({ error: `Unknown POST action: ${action}` });
    }

    return res.status(405).json({ error: `Method ${method} not allowed` });
  } catch (error: any) {
    console.error('[candidate portal API]', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

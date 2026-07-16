/**
 * Humanify LMS API — unified Learning Management System
 * Question bank, tests, psychometric, schedules, grading, reports, competency
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { gradeExam, computeIntegrityScore } from '../../../../lib/hris/lms/grading';

const sequelize = require('../../../../lib/sequelize');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function asUuid(v: unknown): string | null {
  const s = v != null ? String(v) : '';
  return UUID_RE.test(s) ? s : null;
}

async function tableExists(name: string): Promise<boolean> {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = :t LIMIT 1`,
    { replacements: { t: name } },
  );
  return rows.length > 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;
    const userId = asUuid((session.user as any).id);
    const { action } = req.query;
    const method = req.method;

    const hasLms = await tableExists('hris_lms_question_bank');

    // ═══ GET ═══
    if (method === 'GET') {
      if (action === 'dashboard') {
        const stats: any = { questionBank: 0, exams: 0, schedules: 0, results: 0, competencies: 0, passRate: 0 };
        if (hasLms) {
          const [qb] = await sequelize.query(`SELECT COUNT(*)::int as c FROM hris_lms_question_bank WHERE tenant_id = :tid`, { replacements: { tid: tenantId } });
          stats.questionBank = qb[0]?.c || 0;
          const [sch] = await sequelize.query(`SELECT COUNT(*)::int as c FROM hris_lms_test_schedules WHERE tenant_id = :tid`, { replacements: { tid: tenantId } });
          stats.schedules = sch[0]?.c || 0;
          const [comp] = await sequelize.query(`SELECT COUNT(*)::int as c FROM hris_lms_competency_history WHERE tenant_id = :tid`, { replacements: { tid: tenantId } });
          stats.competencies = comp[0]?.c || 0;
        }
        const [ex] = await sequelize.query(`SELECT COUNT(*)::int as c FROM hris_training_exams WHERE tenant_id = :tid`, { replacements: { tid: tenantId } });
        stats.exams = ex[0]?.c || 0;
        const [resultStats] = await sequelize.query(`
          SELECT COUNT(*)::int as total,
            COALESCE(AVG(CASE WHEN is_passed=true THEN 1 ELSE 0 END)*100,0)::decimal(5,2) as pass_rate
          FROM hris_training_exam_results WHERE tenant_id = :tid
        `, { replacements: { tid: tenantId } });
        stats.results = resultStats[0]?.total || 0;
        stats.passRate = Number(resultStats[0]?.pass_rate) || 0;

        const [psycho] = await sequelize.query(`
          SELECT psychometric_type, COUNT(*)::int as count FROM hris_training_exams
          WHERE tenant_id = :tid AND psychometric_type IS NOT NULL
          GROUP BY psychometric_type
        `, { replacements: { tid: tenantId } }).catch(() => [[]]);
        return res.json({ success: true, data: { ...stats, psychometric: psycho } });
      }

      if (action === 'question-bank') {
        if (!hasLms) return res.json({ success: true, data: [] });
        const { category, psychometric_type, search, status } = req.query;
        let where = 'WHERE tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (category) { where += ' AND category = :cat'; repl.cat = category; }
        if (psychometric_type) { where += ' AND psychometric_type = :pt'; repl.pt = psychometric_type; }
        if (status) { where += ' AND status = :st'; repl.st = status; }
        if (search) { where += ' AND (question_text ILIKE :q OR code ILIKE :q)'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`SELECT * FROM hris_lms_question_bank ${where} ORDER BY created_at DESC`, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      if (action === 'tests' || action === 'exams') {
        const { psychometric_type, status, search } = req.query;
        let where = 'WHERE e.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (psychometric_type) { where += ' AND e.psychometric_type = :pt'; repl.pt = psychometric_type; }
        if (status) { where += ' AND e.status = :st'; repl.st = status; }
        if (search) { where += ' AND e.title ILIKE :q'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`
          SELECT e.*,
            (SELECT COUNT(*)::int FROM hris_training_exam_questions q WHERE q.exam_id = e.id) as question_count,
            (SELECT COUNT(*)::int FROM hris_training_exam_results r WHERE r.exam_id = e.id) as attempt_count
          FROM hris_training_exams e ${where} ORDER BY e.created_at DESC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      if (action === 'exam-questions') {
        const { exam_id } = req.query;
        if (!exam_id) return res.status(400).json({ error: 'exam_id required' });
        const [rows] = await sequelize.query(
          'SELECT * FROM hris_training_exam_questions WHERE exam_id = :eid ORDER BY question_number',
          { replacements: { eid: exam_id } },
        );
        return res.json({ success: true, data: rows });
      }

      if (action === 'schedules') {
        if (!hasLms) return res.json({ success: true, data: [] });
        const [rows] = await sequelize.query(`
          SELECT s.*, e.title as exam_title, e.exam_type, e.psychometric_type
          FROM hris_lms_test_schedules s
          LEFT JOIN hris_training_exams e ON s.exam_id = e.id
          WHERE s.tenant_id = :tid ORDER BY s.scheduled_start DESC
        `, { replacements: { tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      if (action === 'results' || action === 'grading-queue') {
        const { exam_id, status, needs_manual } = req.query;
        let where = 'WHERE r.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (exam_id) { where += ' AND r.exam_id = :eid'; repl.eid = exam_id; }
        if (status) { where += ' AND r.status = :st'; repl.st = status; }
        if (needs_manual === 'true') { where += ` AND r.metadata->>'needs_manual' = 'true'`; }
        const [rows] = await sequelize.query(`
          SELECT r.*, e.title as exam_title, e.psychometric_type, e.passing_score
          FROM hris_training_exam_results r
          LEFT JOIN hris_training_exams e ON r.exam_id = e.id
          ${where} ORDER BY r.submitted_at DESC NULLS LAST, r.created_at DESC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      if (action === 'exam-sessions') {
        if (!hasLms) return res.json({ success: true, data: [] });
        const { exam_id, flagged } = req.query;
        let where = 'WHERE s.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (exam_id) { where += ' AND s.exam_id = :eid'; repl.eid = exam_id; }
        if (flagged === 'true') { where += ` AND (s.tab_switch_count > 3 OR s.copy_paste_count > 0 OR s.status = 'flagged')`; }
        const [rows] = await sequelize.query(`
          SELECT s.*, e.title as exam_title, r.employee_name, r.score
          FROM hris_lms_exam_sessions s
          LEFT JOIN hris_training_exams e ON s.exam_id = e.id
          LEFT JOIN hris_training_exam_results r ON s.result_id = r.id
          ${where} ORDER BY s.started_at DESC LIMIT 200
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      if (action === 'competency-history') {
        if (!hasLms) return res.json({ success: true, data: [] });
        const { employee_id, search } = req.query;
        let where = 'WHERE tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (employee_id) { where += ' AND employee_id = :eid'; repl.eid = employee_id; }
        if (search) { where += ' AND (employee_name ILIKE :q OR competency_name ILIKE :q)'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`SELECT * FROM hris_lms_competency_history ${where} ORDER BY certified_at DESC NULLS LAST`, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      if (action === 'reports') {
        const [byExam] = await sequelize.query(`
          SELECT e.id, e.title, e.psychometric_type,
            COUNT(r.id)::int as attempts,
            COALESCE(AVG(r.score),0)::decimal(5,2) as avg_score,
            COUNT(*) FILTER (WHERE r.is_passed=true)::int as passed
          FROM hris_training_exams e
          LEFT JOIN hris_training_exam_results r ON r.exam_id = e.id
          WHERE e.tenant_id = :tid GROUP BY e.id, e.title, e.psychometric_type ORDER BY attempts DESC
        `, { replacements: { tid: tenantId } });
        const [byMonth] = await sequelize.query(`
          SELECT TO_CHAR(submitted_at, 'YYYY-MM') as month, COUNT(*)::int as count,
            COALESCE(AVG(score),0)::decimal(5,2) as avg_score
          FROM hris_training_exam_results WHERE tenant_id = :tid AND submitted_at IS NOT NULL
          GROUP BY 1 ORDER BY 1 DESC LIMIT 12
        `, { replacements: { tid: tenantId } });
        const [topComp] = hasLms ? await sequelize.query(`
          SELECT competency_name, COUNT(*)::int as count FROM hris_lms_competency_history
          WHERE tenant_id = :tid GROUP BY competency_name ORDER BY count DESC LIMIT 10
        `, { replacements: { tid: tenantId } }) : [[]];
        return res.json({ success: true, data: { byExam, byMonth, topCompetencies: topComp } });
      }

      if (action === 'curricula' || action === 'modules' || action === 'batches') {
        // Delegate to training-development data
        const map: Record<string, string> = {
          curricula: 'SELECT * FROM hris_training_curricula WHERE tenant_id = :tid ORDER BY created_at DESC',
          modules: 'SELECT m.*, c.title as curriculum_title FROM hris_training_modules m LEFT JOIN hris_training_curricula c ON m.curriculum_id = c.id WHERE m.tenant_id = :tid ORDER BY m.order_index',
          batches: 'SELECT b.*, c.title as curriculum_title FROM hris_training_batches b LEFT JOIN hris_training_curricula c ON b.curriculum_id = c.id WHERE b.tenant_id = :tid ORDER BY b.start_date DESC',
        };
        const [rows] = await sequelize.query(map[action as string], { replacements: { tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      if (action === 'lms-users') {
        const [rows] = await sequelize.query(`
          SELECT u.id, u.email, u.name, u.role, e.id as employee_id, e.full_name as employee_name,
            (SELECT COUNT(*)::int FROM hris_training_exam_results r WHERE r.employee_id = e.id) as exam_attempts,
            (SELECT COUNT(*)::int FROM hris_lms_competency_history ch WHERE ch.employee_id = e.id) as competencies
          FROM users u
          LEFT JOIN employees e ON e.user_id = u.id
          WHERE u.tenant_id = :tid
          ORDER BY u.name LIMIT 500
        `, { replacements: { tid: tenantId } }).catch(() => [[]]);
        return res.json({ success: true, data: rows });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    // ═══ POST ═══
    if (method === 'POST') {
      if (action === 'create-question') {
        if (!hasLms) return res.status(503).json({ error: 'LMS tables not migrated' });
        const b = req.body;
        const code = b.code || `QB-${Date.now().toString(36).toUpperCase()}`;
        const [rows] = await sequelize.query(`
          INSERT INTO hris_lms_question_bank (tenant_id, code, category, psychometric_type, question_type, question_text, options, correct_answer, score, difficulty, tags, explanation, status, created_by)
          VALUES (:tid, :code, :cat, :pt, :qt, :text, :opts::jsonb, :ans, :score, :diff, :tags::jsonb, :exp, :st, :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, code, cat: b.category || 'general', pt: b.psychometric_type || null,
            qt: b.question_type || 'multiple_choice', text: b.question_text, opts: JSON.stringify(b.options || []),
            ans: b.correct_answer || null, score: b.score || 1, diff: b.difficulty || 'medium',
            tags: JSON.stringify(b.tags || []), exp: b.explanation || null, st: b.status || 'active', uid: userId,
          },
        });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'import-questions-to-exam') {
        const { exam_id, question_ids } = req.body;
        if (!exam_id || !Array.isArray(question_ids)) return res.status(400).json({ error: 'exam_id and question_ids required' });
        const [existing] = await sequelize.query('SELECT COALESCE(MAX(question_number),0)::int as mx FROM hris_training_exam_questions WHERE exam_id = :eid', { replacements: { eid: exam_id } });
        let num = (existing[0]?.mx || 0) + 1;
        for (const qid of question_ids) {
          const [qb] = await sequelize.query('SELECT * FROM hris_lms_question_bank WHERE id = :id AND tenant_id = :tid', { replacements: { id: qid, tid: tenantId } });
          if (!qb.length) continue;
          const q = qb[0];
          await sequelize.query(`
            INSERT INTO hris_training_exam_questions (exam_id, question_number, question_text, question_type, options, correct_answer, score, difficulty, explanation)
            VALUES (:eid, :num, :text, :qt, :opts::jsonb, :ans, :score, :diff, :exp)
          `, {
            replacements: {
              eid: exam_id, num, text: q.question_text, qt: q.question_type,
              opts: JSON.stringify(q.options || []), ans: q.correct_answer, score: q.score,
              diff: q.difficulty, exp: q.explanation,
            },
          });
          num++;
        }
        await sequelize.query('UPDATE hris_training_exams SET total_questions = (SELECT COUNT(*) FROM hris_training_exam_questions WHERE exam_id = :eid) WHERE id = :eid', { replacements: { eid: exam_id } });
        return res.json({ success: true });
      }

      if (action === 'create-test') {
        const b = req.body;
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_exams (tenant_id, curriculum_id, module_id, batch_id, title, description, exam_type, exam_scope,
            total_questions, total_score, passing_score, duration_minutes, max_attempts, shuffle_questions, shuffle_options,
            anti_cheat_enabled, fullscreen_required, manual_grading_required, psychometric_type, proctor_enabled, status, created_by)
          VALUES (:tid, :cid, :mid, :bid, :title, :desc, :etype, :escope, 0, :tscore, :pscore, :dur, :maxa, :shuffle, :shuffleo,
            :anticheat, :fullscreen, :manual, :psycho, :proctor, :st, :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, cid: b.curriculum_id || null, mid: b.module_id || null, bid: b.batch_id || null,
            title: b.title, desc: b.description || null, etype: b.exam_type || 'online', escope: b.exam_scope || 'competency',
            tscore: b.total_score || 100, pscore: b.passing_score || 70, dur: b.duration_minutes || 60,
            maxa: b.max_attempts || 1, shuffle: b.shuffle_questions ?? true, shuffleo: b.shuffle_options ?? false,
            anticheat: b.anti_cheat_enabled ?? true, fullscreen: b.fullscreen_required ?? false,
            manual: b.manual_grading_required ?? false, psycho: b.psychometric_type || null,
            proctor: b.proctor_enabled ?? false,
            st: b.status || 'draft', uid: userId,
          },
        });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'create-exam-question') {
        const b = req.body;
        const [mx] = await sequelize.query('SELECT COALESCE(MAX(question_number),0)::int as mx FROM hris_training_exam_questions WHERE exam_id = :eid', { replacements: { eid: b.exam_id } });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_exam_questions (exam_id, question_number, question_text, question_type, options, correct_answer, score, difficulty, explanation)
          VALUES (:eid, :num, :text, :qt, :opts::jsonb, :ans, :score, :diff, :exp) RETURNING *
        `, {
          replacements: {
            eid: b.exam_id, num: (mx[0]?.mx || 0) + 1, text: b.question_text, qt: b.question_type || 'multiple_choice',
            opts: JSON.stringify(b.options || []), ans: b.correct_answer, score: b.score || 1,
            diff: b.difficulty || 'medium', exp: b.explanation,
          },
        });
        await sequelize.query('UPDATE hris_training_exams SET total_questions = total_questions + 1 WHERE id = :eid', { replacements: { eid: b.exam_id } });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'create-schedule') {
        if (!hasLms) return res.status(503).json({ error: 'LMS tables not migrated' });
        const b = req.body;
        const [rows] = await sequelize.query(`
          INSERT INTO hris_lms_test_schedules (tenant_id, exam_id, title, scheduled_start, scheduled_end, target_type, target_ids, location, proctor_id, status, created_by)
          VALUES (:tid, :eid, :title, :start, :end, :tt, :tids::jsonb, :loc, :proctor, :st, :uid) RETURNING *
        `, {
          replacements: {
            tid: tenantId, eid: b.exam_id, title: b.title, start: b.scheduled_start, end: b.scheduled_end,
            tt: b.target_type || 'all', tids: JSON.stringify(b.target_ids || []), loc: b.location || null,
            proctor: b.proctor_id || null, st: b.status || 'scheduled', uid: userId,
          },
        });
        if (b.open_exam) {
          await sequelize.query(`UPDATE hris_training_exams SET status = 'open' WHERE id = :eid`, { replacements: { eid: b.exam_id } });
        }
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'manual-grade') {
        const { result_id, scores, feedback } = req.body;
        const [results] = await sequelize.query('SELECT * FROM hris_training_exam_results WHERE id = :rid AND tenant_id = :tid', { replacements: { rid: result_id, tid: tenantId } });
        if (!results.length) return res.status(404).json({ error: 'Result not found' });
        const r = results[0];
        const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : (r.answers || []);
        let total = Number(r.score) || 0;
        for (const s of scores || []) {
          const idx = answers.findIndex((a: any) => a.questionId === s.question_id);
          if (idx >= 0) { answers[idx].score = s.score; answers[idx].manualGraded = true; }
          total += Number(s.score) || 0;
        }
        const [exam] = await sequelize.query('SELECT passing_score FROM hris_training_exams WHERE id = :eid', { replacements: { eid: r.exam_id } });
        const passing = Number(exam[0]?.passing_score) || 70;
        const isPassed = total >= passing;
        await sequelize.query(`
          UPDATE hris_training_exam_results SET score = :score, answers = :ans::jsonb, is_passed = :pass,
            status = 'graded', graded_at = NOW(), graded_by = :uid, feedback = :fb,
            metadata = COALESCE(metadata,'{}'::jsonb) || '{"needs_manual":false}'::jsonb
          WHERE id = :rid
        `, { replacements: { score: total, ans: JSON.stringify(answers), pass: isPassed, uid: userId, fb: feedback || null, rid: result_id } });
        return res.json({ success: true, data: { score: total, is_passed: isPassed } });
      }

      if (action === 'record-competency') {
        if (!hasLms) return res.status(503).json({ error: 'LMS tables not migrated' });
        const b = req.body;
        const [rows] = await sequelize.query(`
          INSERT INTO hris_lms_competency_history (tenant_id, employee_id, employee_name, competency_code, competency_name, level, score, source_type, source_id, certified_at, expires_at, certificate_id, metadata)
          VALUES (:tid, :eid, :ename, :code, :name, :lvl, :score, :st, :sid, :cert, :exp, :cid, :meta::jsonb) RETURNING *
        `, {
          replacements: {
            tid: tenantId, eid: b.employee_id, ename: b.employee_name, code: b.competency_code, name: b.competency_name,
            lvl: b.level, score: b.score, st: b.source_type || 'manual', sid: b.source_id || null,
            cert: b.certified_at || new Date(), exp: b.expires_at || null, cid: b.certificate_id || null,
            meta: JSON.stringify(b.metadata || {}),
          },
        });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'open-exam' || action === 'close-exam') {
        const { exam_id } = req.body;
        const st = action === 'open-exam' ? 'open' : 'closed';
        await sequelize.query('UPDATE hris_training_exams SET status = :st, updated_by = :uid WHERE id = :eid AND tenant_id = :tid', { replacements: { st, uid: userId, eid: exam_id, tid: tenantId } });
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    // ═══ PUT ═══
    if (method === 'PUT') {
      if (action === 'update-question') {
        const { id, ...b } = req.body;
        await sequelize.query(`
          UPDATE hris_lms_question_bank SET category = COALESCE(:cat, category), psychometric_type = :pt,
            question_type = COALESCE(:qt, question_type), question_text = COALESCE(:text, question_text),
            options = COALESCE(:opts::jsonb, options), correct_answer = :ans, score = COALESCE(:score, score),
            difficulty = COALESCE(:diff, difficulty), tags = COALESCE(:tags::jsonb, tags), explanation = :exp,
            status = COALESCE(:st, status), updated_by = :uid, updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid
        `, {
          replacements: {
            id, tid: tenantId, cat: b.category, pt: b.psychometric_type, qt: b.question_type, text: b.question_text,
            opts: b.options ? JSON.stringify(b.options) : null, ans: b.correct_answer, score: b.score,
            diff: b.difficulty, tags: b.tags ? JSON.stringify(b.tags) : null, exp: b.explanation, st: b.status, uid: userId,
          },
        });
        return res.json({ success: true });
      }

      if (action === 'update-test') {
        const { id, ...b } = req.body;
        await sequelize.query(`
          UPDATE hris_training_exams SET title = COALESCE(:title, title), description = :desc,
            passing_score = COALESCE(:pscore, passing_score), duration_minutes = COALESCE(:dur, duration_minutes),
            max_attempts = COALESCE(:maxa, max_attempts), shuffle_questions = COALESCE(:shuffle, shuffle_questions),
            shuffle_options = COALESCE(:shuffleo, shuffle_options), anti_cheat_enabled = COALESCE(:anticheat, anti_cheat_enabled),
            fullscreen_required = COALESCE(:fullscreen, fullscreen_required), psychometric_type = :psycho,
            status = COALESCE(:st, status), updated_by = :uid, updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid
        `, {
          replacements: {
            id, tid: tenantId, title: b.title, desc: b.description, pscore: b.passing_score, dur: b.duration_minutes,
            maxa: b.max_attempts, shuffle: b.shuffle_questions, shuffleo: b.shuffle_options, anticheat: b.anti_cheat_enabled,
            fullscreen: b.fullscreen_required, psycho: b.psychometric_type, st: b.status, uid: userId,
          },
        });
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    // ═══ DELETE ═══
    if (method === 'DELETE') {
      const { id } = req.query;
      if (action === 'delete-question' && id) {
        await sequelize.query('DELETE FROM hris_lms_question_bank WHERE id = :id AND tenant_id = :tid', { replacements: { id, tid: tenantId } });
        return res.json({ success: true });
      }
      if (action === 'delete-test' && id) {
        await sequelize.query('DELETE FROM hris_training_exam_questions WHERE exam_id = :id', { replacements: { id } });
        await sequelize.query('DELETE FROM hris_training_exams WHERE id = :id AND tenant_id = :tid', { replacements: { id, tid: tenantId } });
        return res.json({ success: true });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[LMS API]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

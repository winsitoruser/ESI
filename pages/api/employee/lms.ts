/**
 * Employee LMS API — training, exams, progress for logged-in employees
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { gradeExam, computeIntegrityScore } from '../../../lib/hris/lms/grading';
import { calcCurriculumProgress, parseMaterials } from '../../../lib/hris/lms/course-service';
import { issueCourseCertificate } from '../../../lib/hris/lms/certificate-issue';
import { buildPsychometricReport } from '../../../lib/hris/lms/psychometric-report';
import { shouldFlagSession } from '../../../lib/hris/lms/proctoring';

const sequelize = require('../../../lib/sequelize');

async function resolveEmployee(session: any) {
  const userId = session.user?.id;
  const tenantId = session.user?.tenantId || null;
  const [rows] = await sequelize.query(
    `SELECT id, name AS full_name, email, department_id FROM employees WHERE user_id = :uid LIMIT 1`,
    { replacements: { uid: userId } },
  );
  if (rows.length) return { ...rows[0], tenantId };
  const [byEmail] = await sequelize.query(
    `SELECT id, name AS full_name, email, department_id FROM employees WHERE email = :email LIMIT 1`,
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

      if (action === 'my-courses') {
        const [courses] = await sequelize.query(`
          SELECT en.*, c.title, c.description, c.code, c.category, c.total_modules, c.certificate_enabled,
            (SELECT COUNT(*)::int FROM hris_training_modules m WHERE m.curriculum_id = c.id) as module_count
          FROM hris_lms_enrollments en
          JOIN hris_training_curricula c ON c.id = en.curriculum_id
          WHERE en.employee_id = :empid AND c.status = 'active'
          ORDER BY en.mandatory DESC, en.due_date ASC NULLS LAST
        `, { replacements: { empid: empId } }).catch(() => [[]]);
        return res.json({ success: true, data: courses });
      }

      if (action === 'course-detail') {
        const { curriculum_id } = req.query;
        const [curricula] = await sequelize.query(
          'SELECT * FROM hris_training_curricula WHERE id = :id AND status = :st',
          { replacements: { id: curriculum_id, st: 'active' } },
        );
        if (!curricula.length) return res.status(404).json({ error: 'Kursus tidak ditemukan' });
        const [modules] = await sequelize.query(
          'SELECT * FROM hris_training_modules WHERE curriculum_id = :id ORDER BY order_index',
          { replacements: { id: curriculum_id } },
        );
        const [progRows] = await sequelize.query(
          'SELECT * FROM hris_lms_course_progress WHERE employee_id = :empid AND curriculum_id = :cid',
          { replacements: { empid: empId, cid: curriculum_id } },
        ).catch(() => [[]]);
        const completedLessons = new Set<string>();
        for (const p of progRows) {
          const meta = typeof p.metadata === 'object' ? p.metadata : {};
          (meta.completed_lessons || []).forEach((id: string) => completedLessons.add(id));
          if (p.status === 'completed' && p.module_id) completedLessons.add(`module:${p.module_id}`);
          if (p.lesson_id) completedLessons.add(p.lesson_id);
        }
        const progressPct = calcCurriculumProgress(modules, completedLessons);
        const modulesWithProgress = modules.map((m: any) => {
          const lessons = parseMaterials(m.materials);
          const done = lessons.filter((l) => completedLessons.has(l.id)).length;
          return {
            ...m,
            materials: lessons,
            lessons_total: lessons.length,
            lessons_done: done,
            progress_pct: lessons.length ? Math.round((done / lessons.length) * 100) : (completedLessons.has(`module:${m.id}`) ? 100 : 0),
          };
        });
        return res.json({
          success: true,
          data: {
            curriculum: curricula[0],
            modules: modulesWithProgress,
            progress_pct: progressPct,
            completed_lessons: Array.from(completedLessons),
          },
        });
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
            proctor_enabled: !!exam.proctor_enabled,
          },
        });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'start-exam') {
        const { exam_id, device_fingerprint } = req.body;
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
        const proctorOn = !!exam[0].proctor_enabled;
        try {
          await sequelize.query(`
            INSERT INTO hris_lms_exam_sessions (id, tenant_id, result_id, exam_id, employee_id, started_at, ip_address, user_agent, device_fingerprint, proctor_enabled, status)
            VALUES (gen_random_uuid(), :tid, :rid, :eid, :empid, NOW(), :ip, :ua, :fp, :proctor, 'active')
          `, {
            replacements: {
              tid: tenantId, rid: resultId, eid: exam_id, empid: empId,
              ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
              ua: req.headers['user-agent'] || null,
              fp: device_fingerprint || null,
              proctor: proctorOn,
            },
          });
        } catch {
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
          } catch { /* ignore */ }
        }
        return res.json({ success: true, data: { ...rows[0], proctor_enabled: proctorOn } });
      }

      if (action === 'proctor-snapshot') {
        const { result_id, exam_id, image_data, snapshot_type } = req.body;
        if (!result_id || !image_data) return res.status(400).json({ error: 'result_id dan image_data diperlukan' });
        try {
          await sequelize.query(`
            INSERT INTO hris_lms_proctor_snapshots (id, tenant_id, result_id, exam_id, employee_id, snapshot_type, image_data, captured_at)
            VALUES (gen_random_uuid(), :tid, :rid, :eid, :empid, :st, :img, NOW())
          `, {
            replacements: {
              tid: tenantId, rid: result_id, eid: exam_id, empid: empId,
              st: snapshot_type || 'periodic',
              img: String(image_data).slice(0, 500000),
            },
          });
        } catch { /* table may not exist */ }
        return res.json({ success: true });
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
        let snapshotCount = 0;
        try {
          const [sess] = await sequelize.query(
            'SELECT * FROM hris_lms_exam_sessions WHERE result_id = :rid',
            { replacements: { rid: result_id } },
          );
          const [snapC] = await sequelize.query(
            'SELECT COUNT(*)::int AS c FROM hris_lms_proctor_snapshots WHERE result_id = :rid',
            { replacements: { rid: result_id } },
          ).catch(() => [[{ c: 0 }]]);
          snapshotCount = snapC[0]?.c || 0;
          if (sess.length) {
            integrityScore = computeIntegrityScore(sess[0]);
            const flagged = shouldFlagSession({
              ...sess[0],
              integrity_score: integrityScore,
              snapshot_count: snapshotCount,
              proctor_enabled: sess[0].proctor_enabled,
            });
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

        if (exam[0]?.psychometric_type) {
          try {
            const report = buildPsychometricReport(
              exam[0].psychometric_type,
              graded.pct,
              graded.gradedAnswers,
              questions,
              passing,
            );
            await sequelize.query(`
              INSERT INTO hris_lms_psychometric_reports (id, tenant_id, result_id, exam_id, employee_id, employee_name, psychometric_type, overall_score, dimensions, interpretation, recommendations, risk_level)
              VALUES (gen_random_uuid(), :tid, :rid, :eid, :empid, :name, :pt, :score, :dim::jsonb, :interp, :rec::jsonb, :risk)
            `, {
              replacements: {
                tid: tenantId, rid: result_id, eid: examId, empid: empId, name: empName,
                pt: exam[0].psychometric_type, score: graded.pct,
                dim: JSON.stringify(report.dimensions), interp: report.interpretation,
                rec: JSON.stringify(report.recommendations), risk: report.risk_level,
              },
            });
          } catch { /* ignore */ }
        }

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
            const { syncCompetencyToKpi } = await import('../../../lib/hris/lms/integrations');
            await syncCompetencyToKpi({
              tenantId, employeeId: empId, employeeName: empName,
              competencyCode: `PSYCHO_${exam[0].psychometric_type}`.toUpperCase(),
              competencyName: `Psikotes ${exam[0].psychometric_type}`,
              score: graded.pct,
            });
          } catch { /* ignore */ }
        }

        try {
          const { notifyLmsExamResult } = await import('../../../lib/hris/lms/notifications');
          const { triggerLmsWebhook } = await import('../../../lib/hris/lms/integrations');
          await notifyLmsExamResult({
            tenantId, employeeId: empId, examTitle: exam[0]?.title || 'Ujian',
            examId, passed: isPassed, percentage: graded.pct,
          });
          if (isPassed) {
            await triggerLmsWebhook('lms.exam_passed', empId, empName, {
              exam_id: examId, result_id, percentage: graded.pct,
            });
          }
        } catch { /* ignore */ }

        return res.json({
          success: true,
          data: {
            score: graded.totalScore, percentage: graded.pct, is_passed: isPassed,
            needs_manual: graded.needsManual, integrity_score: integrityScore,
          },
        });
      }

      if (action === 'complete-lesson') {
        const { curriculum_id, module_id, lesson_id, time_spent_seconds } = req.body;
        const [existing] = await sequelize.query(`
          SELECT * FROM hris_lms_course_progress
          WHERE employee_id = :empid AND curriculum_id = :cid AND module_id = :mid LIMIT 1
        `, { replacements: { empid: empId, cid: curriculum_id, mid: module_id } }).catch(() => [[]]);

        const meta = existing[0]?.metadata || {};
        const completed: string[] = Array.isArray(meta.completed_lessons) ? [...meta.completed_lessons] : [];
        if (lesson_id && !completed.includes(lesson_id)) completed.push(lesson_id);

        const [modules] = await sequelize.query(
          'SELECT * FROM hris_training_modules WHERE curriculum_id = :cid ORDER BY order_index',
          { replacements: { cid: curriculum_id } },
        );
        const mod = modules.find((m: any) => m.id === module_id);
        const lessons = parseMaterials(mod?.materials);
        const allDone = lessons.length > 0 && lessons.every((l) => completed.includes(l.id));
        const modulePct = lessons.length ? (lessons.filter((l) => completed.includes(l.id)).length / lessons.length) * 100 : 100;
        const overallPct = calcCurriculumProgress(modules, new Set(completed));

        if (existing.length) {
          await sequelize.query(`
            UPDATE hris_lms_course_progress SET
              lesson_id = :lid, progress_pct = :pct, status = :st,
              time_spent_seconds = time_spent_seconds + :ts,
              metadata = :meta::jsonb, last_accessed_at = NOW(), updated_at = NOW()
            WHERE id = :id
          `, {
            replacements: {
              id: existing[0].id, lid: lesson_id, pct: modulePct,
              st: allDone ? 'completed' : 'in_progress', ts: time_spent_seconds || 0,
              meta: JSON.stringify({ ...meta, completed_lessons: completed }),
            },
          });
        } else {
          await sequelize.query(`
            INSERT INTO hris_lms_course_progress (
              tenant_id, employee_id, curriculum_id, module_id, lesson_id,
              progress_pct, status, time_spent_seconds, metadata, last_accessed_at
            ) VALUES (:tid, :empid, :cid, :mid, :lid, :pct, :st, :ts, :meta::jsonb, NOW())
          `, {
            replacements: {
              tid: tenantId, empid: empId, cid: curriculum_id, mid: module_id, lid: lesson_id,
              pct: modulePct, st: allDone ? 'completed' : 'in_progress', ts: time_spent_seconds || 0,
              meta: JSON.stringify({ completed_lessons: completed }),
            },
          });
        }

        await sequelize.query(`
          UPDATE hris_lms_enrollments SET progress_pct = :pct, status = :st, updated_at = NOW()
          WHERE employee_id = :empid AND curriculum_id = :cid
        `, {
          replacements: {
            pct: overallPct, empid: empId, cid: curriculum_id,
            st: overallPct >= 100 ? 'completed' : 'in_progress',
          },
        }).catch(() => {});

        return res.json({ success: true, data: { progress_pct: overallPct, module_complete: allDone } });
      }

      if (action === 'complete-course') {
        const { curriculum_id } = req.body;
        const [curricula] = await sequelize.query(
          'SELECT * FROM hris_training_curricula WHERE id = :id',
          { replacements: { id: curriculum_id } },
        );
        if (!curricula.length) return res.status(404).json({ error: 'Kursus tidak ditemukan' });
        const c = curricula[0];

        await sequelize.query(`
          UPDATE hris_lms_enrollments SET status = 'completed', progress_pct = 100, completed_at = NOW()
          WHERE employee_id = :empid AND curriculum_id = :cid
        `, { replacements: { empid: empId, cid: curriculum_id } }).catch(() => {});

        let certificate = null;
        if (c.certificate_enabled !== false) {
          certificate = await issueCourseCertificate({
            tenantId,
            employeeId: empId,
            employeeName: empName,
            curriculumId: curriculum_id,
            curriculumTitle: c.title,
            curriculumCode: c.code,
            validityMonths: c.certificate_validity_months,
          });
        }

        try {
          const { notifyLmsCertificate } = await import('../../../lib/hris/lms/notifications');
          const { triggerLmsWebhook, createTrainingAllowance, syncCompetencyToKpi } = await import('../../../lib/hris/lms/integrations');
          if (certificate) {
            await notifyLmsCertificate({
              tenantId, employeeId: empId, curriculumTitle: c.title,
              certificateId: certificate.id,
              verifyUrl: `/verify/cert/${certificate.verifyToken}`,
            });
            await triggerLmsWebhook('lms.certificate_issued', empId, empName, {
              curriculum_id, certificate_id: certificate.id,
            });
          }
          await triggerLmsWebhook('lms.course_completed', empId, empName, { curriculum_id });
          await syncCompetencyToKpi({
            tenantId, employeeId: empId, employeeName: empName,
            competencyCode: `COURSE_${(c.code || 'CRS').toUpperCase()}`,
            competencyName: c.title,
            score: 100,
          });
          if (c.training_allowance_amount && Number(c.training_allowance_amount) > 0) {
            await createTrainingAllowance({
              tenantId, employeeId: empId, employeeName: empName,
              amount: Number(c.training_allowance_amount),
              reason: `Tunjangan pelatihan: ${c.title}`,
              sourceId: curriculum_id,
            });
          }
        } catch { /* ignore */ }

        return res.json({
          success: true,
          data: {
            certificate,
            verify_url: certificate ? `/verify/cert/${certificate.verifyToken}` : null,
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

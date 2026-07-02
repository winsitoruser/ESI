/**
 * HRIS Training - Scoring & Weighting Configuration API
 * 
 * GET  ?action=configs          - List scoring configs
 * GET  ?action=competencies     - List competencies
 * GET  ?action=participant-scores - List participant scores
 * GET  ?action=score-summary    - Score summary per batch
 * POST ?action=create-config    - Create scoring config
 * POST ?action=create-competency - Create competency
 * POST ?action=calculate-scores - Auto-calculate weighted scores for a batch
 * POST ?action=save-score       - Save/update individual participant score
 * POST ?action=create-candidate-account - Create candidate portal account (admin)
 * PUT  ?action=update-config    - Update scoring config
 * PUT  ?action=update-score     - Update participant score
 * DELETE ?action=delete-config  - Delete scoring config
 * DELETE ?action=delete-competency - Delete competency
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import bcrypt from 'bcryptjs';

const sequelize = require('../../../../lib/sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;
    const userId = (session.user as any).id || null;
    const { action } = req.query;
    const method = req.method;

    // ══════════════════════════════════════
    // GET
    // ══════════════════════════════════════
    if (method === 'GET') {

      if (action === 'configs') {
        const { curriculum_id } = req.query;
        let where = 'WHERE sc.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (curriculum_id) { where += ' AND sc.curriculum_id = :cid'; repl.cid = curriculum_id; }
        const [rows] = await sequelize.query(`
          SELECT sc.*, c.title as curriculum_title, c.code as curriculum_code
          FROM hris_training_scoring_configs sc
          LEFT JOIN hris_training_curricula c ON sc.curriculum_id = c.id
          ${where} ORDER BY sc.is_default DESC, sc.created_at DESC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      if (action === 'competencies') {
        const { curriculum_id } = req.query;
        let where = 'WHERE cp.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (curriculum_id) { where += ' AND cp.curriculum_id = :cid'; repl.cid = curriculum_id; }
        const [rows] = await sequelize.query(`
          SELECT cp.*, c.title as curriculum_title
          FROM hris_training_competencies cp
          LEFT JOIN hris_training_curricula c ON cp.curriculum_id = c.id
          ${where} ORDER BY cp.order_index ASC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      if (action === 'participant-scores') {
        const { batch_id, graduation_id } = req.query;
        let where = 'WHERE ps.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (batch_id) { where += ' AND ps.batch_id = :bid'; repl.bid = batch_id; }
        if (graduation_id) { where += ' AND ps.graduation_id = :gid'; repl.gid = graduation_id; }
        const [rows] = await sequelize.query(`
          SELECT ps.*, g.employee_name, g.graduation_status, g.batch_id,
                 b.batch_name, b.batch_code, sc.config_name,
                 sc.weight_exam, sc.weight_attendance, sc.weight_practical, sc.weight_assignment, sc.weight_attitude
          FROM hris_training_participant_scores ps
          LEFT JOIN hris_training_graduations g ON ps.graduation_id = g.id
          LEFT JOIN hris_training_batches b ON ps.batch_id = b.id
          LEFT JOIN hris_training_scoring_configs sc ON ps.scoring_config_id = sc.id
          ${where} ORDER BY ps.weighted_score DESC NULLS LAST
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      if (action === 'score-summary') {
        const { batch_id } = req.query;
        if (!batch_id) return res.status(400).json({ error: 'batch_id required' });
        const [summary] = await sequelize.query(`
          SELECT 
            COUNT(*)::int as total_participants,
            COUNT(*) FILTER (WHERE ps.is_passed = true)::int as passed,
            COUNT(*) FILTER (WHERE ps.is_passed = false)::int as failed,
            COALESCE(AVG(ps.weighted_score), 0)::decimal(5,2) as avg_score,
            COALESCE(MAX(ps.weighted_score), 0)::decimal(5,2) as max_score,
            COALESCE(MIN(ps.weighted_score), 0)::decimal(5,2) as min_score,
            COALESCE(AVG(ps.exam_score), 0)::decimal(5,2) as avg_exam,
            COALESCE(AVG(ps.attendance_score), 0)::decimal(5,2) as avg_attendance,
            COALESCE(AVG(ps.practical_score), 0)::decimal(5,2) as avg_practical,
            COALESCE(AVG(ps.assignment_score), 0)::decimal(5,2) as avg_assignment,
            COALESCE(AVG(ps.attitude_score), 0)::decimal(5,2) as avg_attitude
          FROM hris_training_participant_scores ps
          WHERE ps.batch_id = :bid AND ps.tenant_id = :tid
        `, { replacements: { bid: batch_id, tid: tenantId } });

        // Grade distribution
        const [grades] = await sequelize.query(`
          SELECT grade, COUNT(*)::int as count
          FROM hris_training_participant_scores
          WHERE batch_id = :bid AND tenant_id = :tid AND grade IS NOT NULL
          GROUP BY grade ORDER BY grade
        `, { replacements: { bid: batch_id, tid: tenantId } });

        return res.json({ success: true, data: { summary: summary[0], grade_distribution: grades } });
      }

      if (action === 'candidate-accounts') {
        const { status, search } = req.query;
        let where = 'WHERE ca.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (status) { where += ' AND ca.status = :st'; repl.st = status; }
        if (search) { where += ' AND (ca.name ILIKE :q OR ca.email ILIKE :q)'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`
          SELECT ca.id, ca.tenant_id, ca.employee_id, ca.candidate_id, ca.email, ca.name, ca.phone,
                 ca.id_number, ca.education, ca.status, ca.email_verified, ca.last_login_at, ca.created_at
          FROM hris_candidate_accounts ca ${where}
          ORDER BY ca.created_at DESC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      return res.status(400).json({ error: `Unknown GET action: ${action}` });
    }

    // ══════════════════════════════════════
    // POST
    // ══════════════════════════════════════
    if (method === 'POST') {
      const body = req.body;

      if (action === 'create-config') {
        if (!body.config_name) return res.status(400).json({ error: 'config_name required' });
        // Validate weights sum to 100
        const totalWeight = (Number(body.weight_exam) || 40) + (Number(body.weight_attendance) || 15) +
          (Number(body.weight_practical) || 25) + (Number(body.weight_assignment) || 10) + (Number(body.weight_attitude) || 10);
        if (Math.abs(totalWeight - 100) > 0.01) {
          return res.status(400).json({ error: `Total bobot harus 100%. Saat ini: ${totalWeight}%` });
        }

        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_scoring_configs (tenant_id, curriculum_id, config_name, passing_score,
            weight_exam, weight_attendance, weight_practical, weight_assignment, weight_attitude,
            grade_scale, competency_assessment, min_attendance_rate, allow_remedial, max_remedial_attempts,
            remedial_passing_score, is_default, status, created_by)
          VALUES (:tid, :cid, :name, :pass, :wExam, :wAtt, :wPract, :wAssign, :wAttitude,
            :gradeScale::jsonb, :compAssess, :minAtt, :remedial, :maxRemedial, :remedialPass, :isDefault, 'active', :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, cid: body.curriculum_id || null, name: body.config_name,
            pass: body.passing_score || 70,
            wExam: body.weight_exam || 40, wAtt: body.weight_attendance || 15,
            wPract: body.weight_practical || 25, wAssign: body.weight_assignment || 10,
            wAttitude: body.weight_attitude || 10,
            gradeScale: JSON.stringify(body.grade_scale || [
              { grade: 'A', label: 'Sangat Baik', min_score: 90, max_score: 100, color: '#16a34a' },
              { grade: 'B', label: 'Baik', min_score: 80, max_score: 89.99, color: '#2563eb' },
              { grade: 'C', label: 'Cukup', min_score: 70, max_score: 79.99, color: '#eab308' },
              { grade: 'D', label: 'Kurang', min_score: 60, max_score: 69.99, color: '#f97316' },
              { grade: 'E', label: 'Tidak Lulus', min_score: 0, max_score: 59.99, color: '#dc2626' }
            ]),
            compAssess: body.competency_assessment || false,
            minAtt: body.min_attendance_rate || 80,
            remedial: body.allow_remedial !== false,
            maxRemedial: body.max_remedial_attempts || 2,
            remedialPass: body.remedial_passing_score || 70,
            isDefault: body.is_default || false,
            uid: userId
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      if (action === 'create-competency') {
        if (!body.name || !body.code) return res.status(400).json({ error: 'code and name required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_competencies (tenant_id, curriculum_id, code, name, description, category, weight, passing_level, order_index, status)
          VALUES (:tid, :cid, :code, :name, :desc, :cat, :weight, :level, :idx, 'active')
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, cid: body.curriculum_id || null, code: body.code, name: body.name,
            desc: body.description || '', cat: body.category || 'technical',
            weight: body.weight || 1, level: body.passing_level || 3, idx: body.order_index || 0
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      // ── Calculate weighted scores for all participants in a batch ──
      if (action === 'calculate-scores') {
        const { batch_id, scoring_config_id } = body;
        if (!batch_id || !scoring_config_id) return res.status(400).json({ error: 'batch_id and scoring_config_id required' });

        // Get scoring config
        const [configs] = await sequelize.query('SELECT * FROM hris_training_scoring_configs WHERE id = :id', { replacements: { id: scoring_config_id } });
        if (!configs.length) return res.status(404).json({ error: 'Scoring config not found' });
        const cfg = configs[0];
        const gradeScale = Array.isArray(cfg.grade_scale) ? cfg.grade_scale : JSON.parse(cfg.grade_scale || '[]');

        // Get all graduations in this batch
        const [graduations] = await sequelize.query(
          'SELECT * FROM hris_training_graduations WHERE batch_id = :bid AND tenant_id = :tid',
          { replacements: { bid: batch_id, tid: tenantId } }
        );

        let processed = 0;
        for (const grad of graduations) {
          // Get exam average for this participant
          const [examAvg] = await sequelize.query(`
            SELECT COALESCE(AVG(score), 0)::decimal(5,2) as avg_score
            FROM hris_training_exam_results
            WHERE employee_id = :eid AND batch_id = :bid AND status IN ('graded', 'submitted') AND tenant_id = :tid
          `, { replacements: { eid: grad.employee_id, bid: batch_id, tid: tenantId } });

          const examScore = Number(examAvg[0]?.avg_score || 0);
          const attendanceScore = Number(grad.attendance_rate || 0);
          const practicalScore = Number(grad.practical_score || 0);

          // Check if participant score already exists
          const [existing] = await sequelize.query(
            'SELECT id FROM hris_training_participant_scores WHERE graduation_id = :gid AND employee_id = :eid',
            { replacements: { gid: grad.id, eid: grad.employee_id } }
          );

          // Get existing assignment/attitude scores if available
          let assignmentScore = 0;
          let attitudeScore = 0;
          if (existing.length) {
            const [ex] = await sequelize.query(
              'SELECT assignment_score, attitude_score FROM hris_training_participant_scores WHERE id = :id',
              { replacements: { id: existing[0].id } }
            );
            assignmentScore = Number(ex[0]?.assignment_score || 0);
            attitudeScore = Number(ex[0]?.attitude_score || 0);
          }

          // Calculate weighted score
          const weightedScore =
            (examScore * Number(cfg.weight_exam) / 100) +
            (attendanceScore * Number(cfg.weight_attendance) / 100) +
            (practicalScore * Number(cfg.weight_practical) / 100) +
            (assignmentScore * Number(cfg.weight_assignment) / 100) +
            (attitudeScore * Number(cfg.weight_attitude) / 100);

          // Determine grade
          let grade = 'E';
          let gradeLabel = 'Tidak Lulus';
          for (const g of gradeScale) {
            if (weightedScore >= Number(g.min_score) && weightedScore <= Number(g.max_score)) {
              grade = g.grade;
              gradeLabel = g.label;
              break;
            }
          }

          const isPassed = weightedScore >= Number(cfg.passing_score);

          // Get exam details
          const [examDetails] = await sequelize.query(`
            SELECT r.exam_id, e.title, r.score, r.is_passed
            FROM hris_training_exam_results r
            LEFT JOIN hris_training_exams e ON r.exam_id = e.id
            WHERE r.employee_id = :eid AND r.batch_id = :bid AND r.tenant_id = :tid
            ORDER BY r.attempt_number DESC
          `, { replacements: { eid: grad.employee_id, bid: batch_id, tid: tenantId } });

          if (existing.length) {
            await sequelize.query(`
              UPDATE hris_training_participant_scores SET
                scoring_config_id = :cfgId, exam_score = :exam, attendance_score = :att,
                practical_score = :pract, weighted_score = :weighted, grade = :grade,
                grade_label = :gradeLabel, is_passed = :passed, exam_details = :details::jsonb,
                graded_by = :uid, graded_at = NOW(), updated_at = NOW()
              WHERE id = :id
            `, {
              replacements: {
                id: existing[0].id, cfgId: scoring_config_id,
                exam: examScore, att: attendanceScore, pract: practicalScore,
                weighted: Math.round(weightedScore * 100) / 100,
                grade, gradeLabel, passed: isPassed,
                details: JSON.stringify(examDetails), uid: userId
              }
            });
          } else {
            await sequelize.query(`
              INSERT INTO hris_training_participant_scores (tenant_id, graduation_id, batch_id, employee_id, scoring_config_id,
                exam_score, attendance_score, practical_score, assignment_score, attitude_score,
                weighted_score, grade, grade_label, is_passed, exam_details, graded_by, graded_at)
              VALUES (:tid, :gid, :bid, :eid, :cfgId, :exam, :att, :pract, :assign, :attitude,
                :weighted, :grade, :gradeLabel, :passed, :details::jsonb, :uid, NOW())
            `, {
              replacements: {
                tid: tenantId, gid: grad.id, bid: batch_id, eid: grad.employee_id,
                cfgId: scoring_config_id, exam: examScore, att: attendanceScore,
                pract: practicalScore, assign: assignmentScore, attitude: attitudeScore,
                weighted: Math.round(weightedScore * 100) / 100,
                grade, gradeLabel, passed: isPassed,
                details: JSON.stringify(examDetails), uid: userId
              }
            });
          }

          // Update graduation record
          await sequelize.query(`
            UPDATE hris_training_graduations SET
              final_score = :score, exam_score_avg = :examAvg,
              graduation_status = CASE WHEN :passed THEN 'passed' ELSE 'failed' END,
              ready_for_placement = :passed, updated_by = :uid, updated_at = NOW()
            WHERE id = :gid
          `, {
            replacements: {
              gid: grad.id, score: Math.round(weightedScore * 100) / 100,
              examAvg: examScore, passed: isPassed, uid: userId
            }
          });

          processed++;
        }

        return res.json({ success: true, message: `${processed} peserta berhasil dinilai`, processed });
      }

      if (action === 'save-score') {
        if (!body.graduation_id || !body.employee_id) return res.status(400).json({ error: 'graduation_id and employee_id required' });

        const [existing] = await sequelize.query(
          'SELECT id FROM hris_training_participant_scores WHERE graduation_id = :gid AND employee_id = :eid',
          { replacements: { gid: body.graduation_id, eid: body.employee_id } }
        );

        if (existing.length) {
          const [rows] = await sequelize.query(`
            UPDATE hris_training_participant_scores SET
              exam_score = COALESCE(:exam, exam_score), attendance_score = COALESCE(:att, attendance_score),
              practical_score = COALESCE(:pract, practical_score), assignment_score = COALESCE(:assign, assignment_score),
              attitude_score = COALESCE(:attitude, attitude_score), remarks = COALESCE(:remarks, remarks),
              competency_scores = COALESCE(:compScores::jsonb, competency_scores),
              graded_by = :uid, graded_at = NOW(), updated_at = NOW()
            WHERE id = :id RETURNING *
          `, {
            replacements: {
              id: existing[0].id, exam: body.exam_score ?? null, att: body.attendance_score ?? null,
              pract: body.practical_score ?? null, assign: body.assignment_score ?? null,
              attitude: body.attitude_score ?? null, remarks: body.remarks || null,
              compScores: body.competency_scores ? JSON.stringify(body.competency_scores) : null,
              uid: userId
            }
          });
          return res.json({ success: true, data: rows[0] });
        } else {
          const [rows] = await sequelize.query(`
            INSERT INTO hris_training_participant_scores (tenant_id, graduation_id, batch_id, employee_id,
              exam_score, attendance_score, practical_score, assignment_score, attitude_score, remarks, graded_by, graded_at)
            VALUES (:tid, :gid, :bid, :eid, :exam, :att, :pract, :assign, :attitude, :remarks, :uid, NOW())
            RETURNING *
          `, {
            replacements: {
              tid: tenantId, gid: body.graduation_id, bid: body.batch_id, eid: body.employee_id,
              exam: body.exam_score || 0, att: body.attendance_score || 0,
              pract: body.practical_score || 0, assign: body.assignment_score || 0,
              attitude: body.attitude_score || 0, remarks: body.remarks || null, uid: userId
            }
          });
          return res.json({ success: true, data: rows[0] });
        }
      }

      // ── Create Candidate Account (admin creates for participant) ──
      if (action === 'create-candidate-account') {
        if (!body.email || !body.password || !body.name) {
          return res.status(400).json({ error: 'email, password, dan name wajib diisi' });
        }
        const [existing] = await sequelize.query(
          'SELECT id FROM hris_candidate_accounts WHERE email = :email',
          { replacements: { email: body.email.toLowerCase().trim() } }
        );
        if (existing.length) return res.status(409).json({ error: 'Email sudah terdaftar' });

        const hashedPassword = await bcrypt.hash(body.password, 12);
        const [rows] = await sequelize.query(`
          INSERT INTO hris_candidate_accounts (tenant_id, employee_id, candidate_id, email, password, name, phone, id_number, education, status, created_by)
          VALUES (:tid, :eid, :cid, :email, :pwd, :name, :phone, :idNum, :edu, 'active', :uid)
          RETURNING id, tenant_id, email, name, phone, status, created_at
        `, {
          replacements: {
            tid: tenantId, eid: body.employee_id || null, cid: body.candidate_id || null,
            email: body.email.toLowerCase().trim(), pwd: hashedPassword,
            name: body.name, phone: body.phone || null,
            idNum: body.id_number || null, edu: body.education || null, uid: userId
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      return res.status(400).json({ error: `Unknown POST action: ${action}` });
    }

    // ══════════════════════════════════════
    // PUT
    // ══════════════════════════════════════
    if (method === 'PUT') {
      const body = req.body;
      if (!body.id) return res.status(400).json({ error: 'id required' });

      if (action === 'update-config') {
        if (body.weight_exam !== undefined || body.weight_attendance !== undefined || body.weight_practical !== undefined || body.weight_assignment !== undefined || body.weight_attitude !== undefined) {
          const totalWeight = (Number(body.weight_exam) || 0) + (Number(body.weight_attendance) || 0) +
            (Number(body.weight_practical) || 0) + (Number(body.weight_assignment) || 0) + (Number(body.weight_attitude) || 0);
          if (totalWeight > 0 && Math.abs(totalWeight - 100) > 0.01) {
            return res.status(400).json({ error: `Total bobot harus 100%. Saat ini: ${totalWeight}%` });
          }
        }
        const [rows] = await sequelize.query(`
          UPDATE hris_training_scoring_configs SET
            config_name = COALESCE(:name, config_name), passing_score = COALESCE(:pass, passing_score),
            weight_exam = COALESCE(:wExam, weight_exam), weight_attendance = COALESCE(:wAtt, weight_attendance),
            weight_practical = COALESCE(:wPract, weight_practical), weight_assignment = COALESCE(:wAssign, weight_assignment),
            weight_attitude = COALESCE(:wAttitude, weight_attitude),
            min_attendance_rate = COALESCE(:minAtt, min_attendance_rate),
            allow_remedial = COALESCE(:remedial, allow_remedial),
            max_remedial_attempts = COALESCE(:maxRemedial, max_remedial_attempts),
            status = COALESCE(:status, status), updated_by = :uid, updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid RETURNING *
        `, {
          replacements: {
            id: body.id, tid: tenantId, name: body.config_name || null,
            pass: body.passing_score ?? null, wExam: body.weight_exam ?? null,
            wAtt: body.weight_attendance ?? null, wPract: body.weight_practical ?? null,
            wAssign: body.weight_assignment ?? null, wAttitude: body.weight_attitude ?? null,
            minAtt: body.min_attendance_rate ?? null, remedial: body.allow_remedial ?? null,
            maxRemedial: body.max_remedial_attempts ?? null, status: body.status || null, uid: userId
          }
        });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-score') {
        const [rows] = await sequelize.query(`
          UPDATE hris_training_participant_scores SET
            exam_score = COALESCE(:exam, exam_score), attendance_score = COALESCE(:att, attendance_score),
            practical_score = COALESCE(:pract, practical_score), assignment_score = COALESCE(:assign, assignment_score),
            attitude_score = COALESCE(:attitude, attitude_score), remarks = COALESCE(:remarks, remarks),
            graded_by = :uid, graded_at = NOW(), updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid RETURNING *
        `, {
          replacements: {
            id: body.id, tid: tenantId, exam: body.exam_score ?? null,
            att: body.attendance_score ?? null, pract: body.practical_score ?? null,
            assign: body.assignment_score ?? null, attitude: body.attitude_score ?? null,
            remarks: body.remarks || null, uid: userId
          }
        });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, data: rows[0] });
      }

      return res.status(400).json({ error: `Unknown PUT action: ${action}` });
    }

    // ══════════════════════════════════════
    // DELETE
    // ══════════════════════════════════════
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });

      const tableMap: Record<string, string> = {
        'delete-config': 'hris_training_scoring_configs',
        'delete-competency': 'hris_training_competencies',
      };
      const table = tableMap[action as string];
      if (!table) return res.status(400).json({ error: `Unknown DELETE action: ${action}` });
      await sequelize.query(`DELETE FROM ${table} WHERE id = :id AND tenant_id = :tid`, { replacements: { id, tid: tenantId } });
      return res.json({ success: true, message: 'Deleted successfully' });
    }

    return res.status(405).json({ error: `Method ${method} not allowed` });
  } catch (error: any) {
    console.error('[training-scoring API]', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

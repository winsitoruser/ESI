/**
 * LMS Analytics API — department heatmap, skill gaps, L&D metrics
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const sequelize = require('../../../../lib/sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { action } = req.query;

    if (action === 'overview') {
      const [training] = await sequelize.query(`
        SELECT COUNT(*)::int AS enrollments,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
          COALESCE(AVG(progress_pct),0)::decimal(5,2) AS avg_progress
        FROM hris_lms_enrollments WHERE tenant_id = :tid
      `, { replacements: { tid: tenantId } }).catch(() => [[{ enrollments: 0, completed: 0, avg_progress: 0 }]]);

      const [exams] = await sequelize.query(`
        SELECT COUNT(*)::int AS attempts,
          COUNT(*) FILTER (WHERE is_passed = true)::int AS passed,
          COALESCE(AVG(score),0)::decimal(5,2) AS avg_score
        FROM hris_training_exam_results WHERE tenant_id = :tid
      `, { replacements: { tid: tenantId } });

      const [proctor] = await sequelize.query(`
        SELECT COUNT(*)::int AS flagged FROM hris_lms_exam_sessions
        WHERE tenant_id = :tid AND status = 'flagged'
      `, { replacements: { tid: tenantId } }).catch(() => [[{ flagged: 0 }]]);

      return res.json({
        success: true,
        data: {
          training: training[0],
          exams: exams[0],
          proctor_flagged: proctor[0]?.flagged || 0,
        },
      });
    }

    if (action === 'department-heatmap') {
      const [rows] = await sequelize.query(`
        SELECT COALESCE(e.department, 'Unknown') AS department,
          COUNT(DISTINCT en.employee_id)::int AS enrolled,
          COUNT(DISTINCT en.employee_id) FILTER (WHERE en.status = 'completed')::int AS completed,
          COALESCE(AVG(en.progress_pct),0)::decimal(5,2) AS avg_progress,
          COUNT(DISTINCT r.employee_id)::int AS exam_takers,
          COALESCE(AVG(r.score),0)::decimal(5,2) AS avg_exam_score
        FROM hris_lms_enrollments en
        LEFT JOIN employees e ON e.id = en.employee_id
        LEFT JOIN hris_training_exam_results r ON r.employee_id = en.employee_id AND r.tenant_id = en.tenant_id
        WHERE en.tenant_id = :tid
        GROUP BY COALESCE(e.department, 'Unknown')
        ORDER BY enrolled DESC
      `, { replacements: { tid: tenantId } }).catch(() => [[]]);

      return res.json({ success: true, data: rows });
    }

    if (action === 'competency-gaps') {
      const [rows] = await sequelize.query(`
        SELECT ch.competency_name, ch.competency_code,
          COUNT(*)::int AS holders,
          COALESCE(AVG(ch.score),0)::decimal(5,2) AS avg_score,
          (SELECT COUNT(*)::int FROM employees WHERE tenant_id = :tid) AS total_employees
        FROM hris_lms_competency_history ch
        WHERE ch.tenant_id = :tid
        GROUP BY ch.competency_name, ch.competency_code
        ORDER BY holders ASC
      `, { replacements: { tid: tenantId } }).catch(() => [[]]);

      return res.json({ success: true, data: rows });
    }

    if (action === 'psychometric-reports') {
      const [rows] = await sequelize.query(`
        SELECT pr.*, e.title AS exam_title
        FROM hris_lms_psychometric_reports pr
        LEFT JOIN hris_training_exams e ON e.id = pr.exam_id
        WHERE pr.tenant_id = :tid
        ORDER BY pr.created_at DESC LIMIT 100
      `, { replacements: { tid: tenantId } }).catch(() => [[]]);
      return res.json({ success: true, data: rows });
    }

    if (action === 'proctor-review') {
      const [sessions] = await sequelize.query(`
        SELECT s.*, e.title AS exam_title, r.employee_name, r.score,
          (SELECT COUNT(*)::int FROM hris_lms_proctor_snapshots ps WHERE ps.result_id = s.result_id) AS snapshot_count
        FROM hris_lms_exam_sessions s
        LEFT JOIN hris_training_exams e ON e.id = s.exam_id
        LEFT JOIN hris_training_exam_results r ON r.id = s.result_id
        WHERE s.tenant_id = :tid
        ORDER BY s.started_at DESC LIMIT 50
      `, { replacements: { tid: tenantId } }).catch(() => [[]]);

      const { result_id } = req.query;
      if (result_id) {
        const [snaps] = await sequelize.query(
          'SELECT id, snapshot_type, captured_at, LEFT(image_data, 80) AS preview FROM hris_lms_proctor_snapshots WHERE result_id = :rid ORDER BY captured_at',
          { replacements: { rid: result_id } },
        ).catch(() => [[]]);
        return res.json({ success: true, data: { sessions, snapshots: snaps } });
      }
      return res.json({ success: true, data: sessions });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err: any) {
    console.error('[LMS Analytics]', err);
    return res.status(500).json({ error: err.message });
  }
}

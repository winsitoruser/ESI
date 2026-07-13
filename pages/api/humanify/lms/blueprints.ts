/**
 * LMS Exam Blueprints API
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { selectQuestionsFromBlueprint } from '../../../../lib/hris/lms/blueprint';

const sequelize = require('../../../../lib/sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;
    const userId = (session.user as any).id;
    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'list') {
        const [rows] = await sequelize.query(
          'SELECT * FROM hris_lms_exam_blueprints WHERE tenant_id = :tid ORDER BY created_at DESC',
          { replacements: { tid: tenantId } },
        ).catch(() => [[]]);
        return res.json({ success: true, data: rows });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'create') {
        const b = req.body;
        const [rows] = await sequelize.query(`
          INSERT INTO hris_lms_exam_blueprints (id, tenant_id, exam_id, title, psychometric_type, total_questions, sections, passing_score, status, created_by)
          VALUES (gen_random_uuid(), :tid, :eid, :title, :pt, :tq, :sec::jsonb, :pass, :st, :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, eid: b.exam_id || null, title: b.title,
            pt: b.psychometric_type || null, tq: b.total_questions || 20,
            sec: JSON.stringify(b.sections || []), pass: b.passing_score || 70,
            st: b.status || 'active', uid: userId,
          },
        });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'apply-to-exam') {
        const { blueprint_id, exam_id } = req.body;
        const [bps] = await sequelize.query(
          'SELECT * FROM hris_lms_exam_blueprints WHERE id = :id AND tenant_id = :tid',
          { replacements: { id: blueprint_id, tid: tenantId } },
        );
        if (!bps.length) return res.status(404).json({ error: 'Blueprint tidak ditemukan' });

        const bp = bps[0];
        const sections = typeof bp.sections === 'string' ? JSON.parse(bp.sections) : (bp.sections || []);
        const questions = await selectQuestionsFromBlueprint(sequelize, tenantId, sections);

        await sequelize.query('DELETE FROM hris_training_exam_questions WHERE exam_id = :eid', { replacements: { eid: exam_id } });
        for (const q of questions) {
          await sequelize.query(`
            INSERT INTO hris_training_exam_questions (exam_id, question_number, question_text, question_type, options, correct_answer, score, difficulty)
            VALUES (:eid, :num, :text, :qt, :opts::jsonb, :ans, :score, :diff)
          `, {
            replacements: {
              eid: exam_id, num: q.question_number, text: q.question_text, qt: q.question_type,
              opts: JSON.stringify(q.options || []), ans: q.correct_answer, score: q.score, diff: q.difficulty,
            },
          });
        }
        await sequelize.query(`
          UPDATE hris_training_exams SET blueprint_id = :bid, total_questions = :tq, psychometric_type = COALESCE(psychometric_type, :pt), updated_at = NOW()
          WHERE id = :eid AND tenant_id = :tid
        `, {
          replacements: { bid: blueprint_id, tq: questions.length, pt: bp.psychometric_type, eid: exam_id, tid: tenantId },
        });
        return res.json({ success: true, data: { questions_imported: questions.length } });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[LMS Blueprints]', err);
    return res.status(500).json({ error: err.message });
  }
}

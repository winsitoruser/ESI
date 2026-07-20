/**
 * LMS AI Assistant API — generate questions, summaries, recommendations
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { assertLmsLabApi } from '@/lib/humanify/assert-lms-lab';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  generateQuestionsFromSop,
  summarizePsychometricForManager,
  recommendLearningPaths,
} from '../../../../lib/hris/lms/ai-assist';

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!assertLmsLabApi(req, res)) return;

    const tenantId = (session.user as any).tenantId || null;
    const { action } = req.query;

    if (req.method === 'POST') {
      if (action === 'generate-questions') {
        const { sop_text, count, category } = req.body;
        if (!sop_text || sop_text.length < 50) {
          return res.status(400).json({ error: 'SOP text minimal 50 karakter' });
        }
        const questions = generateQuestionsFromSop(sop_text, { count: count || 5, category });
        return res.json({ success: true, data: { questions } });
      }

      if (action === 'summarize-psychometric') {
        const { report_id } = req.body;
        const [rows] = await sequelize.query(
          'SELECT * FROM hris_lms_psychometric_reports WHERE id = :id AND tenant_id = :tid LIMIT 1',
          { replacements: { id: report_id, tid: tenantId } },
        );
        if (!rows.length) return res.status(404).json({ error: 'Laporan tidak ditemukan' });
        const summary = summarizePsychometricForManager(rows[0]);
        return res.json({ success: true, data: { summary, report: rows[0] } });
      }

      if (action === 'recommend-paths') {
        const [gaps] = await sequelize.query(`
          SELECT ch.competency_name, ch.competency_code, COUNT(*)::int AS holders,
            (SELECT COUNT(*)::int FROM employees WHERE tenant_id = :tid) AS total_employees
          FROM hris_lms_competency_history ch
          WHERE ch.tenant_id = :tid
          GROUP BY ch.competency_name, ch.competency_code
          ORDER BY holders ASC LIMIT 10
        `, { replacements: { tid: tenantId } }).catch(() => [[]]);
        const recommendations = recommendLearningPaths(gaps);
        return res.json({ success: true, data: { gaps, recommendations } });
      }

      if (action === 'import-to-bank') {
        const { questions } = req.body;
        if (!Array.isArray(questions) || !questions.length) {
          return res.status(400).json({ error: 'questions array required' });
        }
        let imported = 0;
        for (const q of questions) {
          await sequelize.query(`
            INSERT INTO hris_lms_question_bank (
              tenant_id, question_text, question_type, options, correct_answer, score, difficulty, category, status
            ) VALUES (:tid, :text, :qt, :opts::jsonb, :ans, 1, :diff, :cat, 'active')
          `, {
            replacements: {
              tid: tenantId,
              text: q.question_text,
              qt: q.question_type || 'multiple_choice',
              opts: JSON.stringify(q.options || []),
              ans: q.correct_answer,
              diff: q.difficulty || 'medium',
              cat: q.category || 'sop',
            },
          });
          imported++;
        }
        return res.json({ success: true, data: { imported } });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[LMS AI]', err);
    return res.status(500).json({ error: err.message });
  }
}

export default withHQAuth(handler, { module: 'hris' });

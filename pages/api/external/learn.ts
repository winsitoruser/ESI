/**
 * External learner portal API — token-based access (no login)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getExternalLearnerByToken } from '../../../lib/hris/lms/academy';

const sequelize = require('../../../lib/sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, action } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token required' });
    }

    const learner = await getExternalLearnerByToken(token);
    if (!learner) return res.status(404).json({ error: 'Undangan tidak valid atau sudah kedaluwarsa' });

    if (action === 'curriculum') {
      if (!learner.curriculum_id) return res.json({ success: true, data: { learner, modules: [] } });
      const [modules] = await sequelize.query(
        'SELECT id, title, description, materials FROM hris_training_modules WHERE curriculum_id = :cid ORDER BY module_order',
        { replacements: { cid: learner.curriculum_id } },
      );
      return res.json({
        success: true,
        data: {
          learner: {
            full_name: learner.full_name,
            email: learner.email,
            learner_type: learner.learner_type,
            academy_name: learner.academy_name,
            primary_color: learner.primary_color,
          },
          curriculum: {
            title: learner.curriculum_title,
            description: learner.curriculum_description,
          },
          modules,
        },
      });
    }

    if (action === 'exam') {
      if (!learner.exam_id) return res.status(404).json({ error: 'Tidak ada ujian ditugaskan' });
      const [exam] = await sequelize.query(
        'SELECT id, title, description, duration_minutes, passing_score FROM hris_training_exams WHERE id = :eid',
        { replacements: { eid: learner.exam_id } },
      );
      return res.json({ success: true, data: { learner, exam: exam[0] } });
    }

    return res.json({
      success: true,
      data: {
        full_name: learner.full_name,
        email: learner.email,
        academy_name: learner.academy_name,
        primary_color: learner.primary_color,
        logo_url: learner.logo_url,
        curriculum_title: learner.curriculum_title,
        exam_title: learner.exam_title,
        welcome_message: learner.welcome_message,
      },
    });
  } catch (err: any) {
    console.error('[External Learn]', err);
    return res.status(500).json({ error: err.message });
  }
}

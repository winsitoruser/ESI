import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { resolveEmployeeContext } from '../../../lib/employee-portal';
import { ensureEngagementTables } from '../../../lib/hris/ensure-engagement-tables';

let sequelize: any;
try {
  sequelize = require('../../../lib/sequelize');
} catch {
  /* dev */
}

function mapSurveyRow(r: any, responded: boolean) {
  const questions = Array.isArray(r.questions)
    ? r.questions
    : typeof r.questions === 'string'
      ? JSON.parse(r.questions || '[]')
      : [];
  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    surveyType: r.survey_type || 'engagement',
    status: r.status,
    startDate: r.start_date ? String(r.start_date).split('T')[0] : null,
    endDate: r.end_date ? String(r.end_date).split('T')[0] : null,
    isAnonymous: r.is_anonymous ?? true,
    isMandatory: r.is_mandatory ?? false,
    questions,
    totalResponses: Number(r.total_responses || 0),
    responded,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!sequelize) {
      return res.status(503).json({ success: false, error: 'Database tidak tersedia' });
    }

    await ensureEngagementTables(sequelize);

    const userId = String(session.user.id || '');
    const sessionTenantId = String((session.user as any).tenantId || '') || null;
    const ctx = await resolveEmployeeContext(sequelize, userId, sessionTenantId);
    if (!ctx.employeeId) {
      return res.status(404).json({
        success: false,
        error: 'Data karyawan tidak ditemukan. Hubungi HR untuk menghubungkan akun Anda.',
      });
    }

    const employeeId = Number(ctx.employeeId);
    const tenantId = sessionTenantId || (ctx.tenantId ? String(ctx.tenantId) : null);
    if (!tenantId) {
      return res.status(403).json({ success: false, error: 'Tenant context required' });
    }

    if (req.method === 'GET') {
      const [surveys] = await sequelize.query(`
        SELECT s.*,
          EXISTS(
            SELECT 1 FROM survey_responses sr
            WHERE sr.survey_id = s.id AND sr.employee_id = :employeeId
          ) AS responded
        FROM surveys s
        WHERE s.status = 'active'
          AND (s.start_date IS NULL OR s.start_date <= NOW())
          AND (s.end_date IS NULL OR s.end_date >= NOW())
          AND s.tenant_id = :tenantId::uuid
        ORDER BY s.is_mandatory DESC, s.created_at DESC
        LIMIT 50
      `, { replacements: { employeeId, tenantId } });

      const data = (surveys as any[]).map((r) => mapSurveyRow(r, !!r.responded));
      return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { surveyId, answers } = req.body || {};
      if (!surveyId || !Array.isArray(answers)) {
        return res.status(400).json({ success: false, error: 'surveyId dan answers wajib diisi' });
      }

      const [existing] = await sequelize.query(
        `SELECT id FROM survey_responses WHERE survey_id = :surveyId AND employee_id = :employeeId LIMIT 1`,
        { replacements: { surveyId, employeeId } }
      );
      if ((existing as any[]).length > 0) {
        return res.status(409).json({ success: false, error: 'Anda sudah mengisi survei ini' });
      }

      const [surveyRows] = await sequelize.query(
        `SELECT id, status, is_anonymous FROM surveys WHERE id = :surveyId AND tenant_id = :tenantId::uuid LIMIT 1`,
        { replacements: { surveyId, tenantId } }
      );
      const survey = (surveyRows as any[])[0];
      if (!survey || survey.status !== 'active') {
        return res.status(400).json({ success: false, error: 'Survei tidak aktif atau tidak ditemukan' });
      }

      const [inserted] = await sequelize.query(`
        INSERT INTO survey_responses (survey_id, employee_id, respondent_id, answers, is_anonymous, submitted_at)
        VALUES (:surveyId, :employeeId, :employeeId, :answers::jsonb, :isAnonymous, NOW())
        RETURNING id, submitted_at
      `, {
        replacements: {
          surveyId,
          employeeId,
          answers: JSON.stringify(answers),
          isAnonymous: survey.is_anonymous ?? true,
        },
      });

      await sequelize.query(
        `UPDATE surveys SET total_responses = COALESCE(total_responses, 0) + 1, updated_at = NOW() WHERE id = :surveyId`,
        { replacements: { surveyId } }
      );

      return res.json({
        success: true,
        data: { id: inserted[0]?.id, submittedAt: inserted[0]?.submitted_at },
        message: 'Terima kasih — respons survei Anda telah tersimpan',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('[employee/surveys]', error?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
}

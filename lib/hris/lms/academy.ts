/**
 * Academy settings & external learner management
 */
import { generateAccessToken } from './integrations';

let sequelize: any;
try { sequelize = require('../../sequelize'); } catch {}

export async function getAcademySettings(tenantId: string | null) {
  if (!sequelize || !tenantId) return null;
  const [rows] = await sequelize.query(
    'SELECT * FROM hris_lms_academy_settings WHERE tenant_id = :tid LIMIT 1',
    { replacements: { tid: tenantId } },
  ).catch(() => [[]]);
  return rows[0] || null;
}

export async function upsertAcademySettings(tenantId: string | null, data: {
  slug?: string;
  academy_name?: string;
  logo_url?: string;
  primary_color?: string;
  welcome_message?: string;
}) {
  if (!sequelize || !tenantId) return null;
  const slug = (data.slug || 'academy').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80);
  const [rows] = await sequelize.query(`
    INSERT INTO hris_lms_academy_settings (id, tenant_id, slug, academy_name, logo_url, primary_color, welcome_message, updated_at)
    VALUES (gen_random_uuid(), :tid, :slug, :name, :logo, :color, :welcome, NOW())
    ON CONFLICT (tenant_id) DO UPDATE SET
      slug = COALESCE(:slug, hris_lms_academy_settings.slug),
      academy_name = COALESCE(:name, hris_lms_academy_settings.academy_name),
      logo_url = COALESCE(:logo, hris_lms_academy_settings.logo_url),
      primary_color = COALESCE(:color, hris_lms_academy_settings.primary_color),
      welcome_message = COALESCE(:welcome, hris_lms_academy_settings.welcome_message),
      updated_at = NOW()
    RETURNING *
  `, {
    replacements: {
      tid: tenantId,
      slug,
      name: data.academy_name || 'Humanify Academy',
      logo: data.logo_url || null,
      color: data.primary_color || '#4f46e5',
      welcome: data.welcome_message || null,
    },
  });
  return rows[0];
}

export async function inviteExternalLearner(tenantId: string | null, data: {
  email: string;
  full_name: string;
  learner_type?: string;
  curriculum_id?: string;
  exam_id?: string;
  candidate_id?: string;
}) {
  if (!sequelize || !tenantId) return null;
  const token = generateAccessToken();
  const [rows] = await sequelize.query(`
    INSERT INTO hris_lms_external_learners (
      id, tenant_id, email, full_name, learner_type, curriculum_id, exam_id, candidate_id, access_token, status
    ) VALUES (
      gen_random_uuid(), :tid, :email, :name, :lt, :cid, :eid, :cand, :token, 'invited'
    ) RETURNING *
  `, {
    replacements: {
      tid: tenantId,
      email: data.email,
      name: data.full_name,
      lt: data.learner_type || 'external',
      cid: data.curriculum_id || null,
      eid: data.exam_id || null,
      cand: data.candidate_id || null,
      token,
    },
  });
  const learner = rows[0];
  if (learner) {
    learner.invite_url = `/learn/${token}`;
  }
  return learner;
}

export async function getExternalLearnerByToken(token: string) {
  if (!sequelize || !token) return null;
  const [rows] = await sequelize.query(`
    SELECT el.*, c.title AS curriculum_title, c.description AS curriculum_description,
      e.title AS exam_title, a.academy_name, a.primary_color, a.logo_url
    FROM hris_lms_external_learners el
    LEFT JOIN hris_training_curricula c ON c.id = el.curriculum_id
    LEFT JOIN hris_training_exams e ON e.id = el.exam_id
    LEFT JOIN hris_lms_academy_settings a ON a.tenant_id = el.tenant_id
    WHERE el.access_token = :token AND el.status != 'revoked'
    LIMIT 1
  `, { replacements: { token } });
  if (!rows.length) return null;
  await sequelize.query(
    `UPDATE hris_lms_external_learners SET accessed_at = NOW(), status = 'active' WHERE access_token = :token AND accessed_at IS NULL`,
    { replacements: { token } },
  ).catch(() => {});
  return rows[0];
}

export async function listExternalLearners(tenantId: string | null) {
  if (!sequelize) return [];
  const [rows] = await sequelize.query(`
    SELECT el.*, c.title AS curriculum_title, e.title AS exam_title
    FROM hris_lms_external_learners el
    LEFT JOIN hris_training_curricula c ON c.id = el.curriculum_id
    LEFT JOIN hris_training_exams e ON e.id = el.exam_id
    WHERE el.tenant_id = :tid
    ORDER BY el.invited_at DESC LIMIT 100
  `, { replacements: { tid: tenantId } }).catch(() => [[]]);
  return rows;
}

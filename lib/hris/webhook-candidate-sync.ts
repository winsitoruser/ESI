/**
 * Webhook candidate sync — upsert applicants from external job boards
 */
import type { RecruitmentChannel } from './recruitment-integrations';

let sequelize: any;
try { sequelize = require('../../lib/sequelize'); } catch {}

export interface WebhookCandidatePayload {
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  job_opening_id?: string;
  job_title?: string;
  source?: string;
  experience_summary?: string;
  education_level?: string;
  resume_url?: string;
  notes?: string;
  rating?: number;
}

export interface WebhookSyncResult {
  id: string;
  action: 'created' | 'updated' | 'skipped';
  candidateName: string;
  provider: string;
}

const PROVIDER_SOURCE: Record<string, string> = {
  dealls: 'dealls',
  linkedin: 'linkedin',
  indeed: 'indeed',
  google_jobs: 'google_jobs',
  whatsapp: 'whatsapp',
  jobstreet: 'jobstreet',
};

export async function upsertCandidateFromWebhook(
  provider: string,
  payload: WebhookCandidatePayload,
  tenantId: string | null,
): Promise<WebhookSyncResult> {
  if (!sequelize) {
    return { id: 'mock', action: 'skipped', candidateName: payload.full_name || payload.name || 'Unknown', provider };
  }

  const name = payload.full_name || payload.name;
  if (!name) throw new Error('full_name or name required');

  const source = PROVIDER_SOURCE[provider] || provider || 'other';
  const email = payload.email || null;

  // Find existing by email
  let existing: any = null;
  if (email) {
    const [rows] = await sequelize.query(`
      SELECT id FROM hris_candidates
      WHERE email = :email AND (tenant_id = :tid OR tenant_id IS NULL OR :tid IS NULL)
      LIMIT 1
    `, { replacements: { email, tid: tenantId } });
    existing = rows[0];
  }

  // Resolve job_opening_id from title if not provided
  let jobOpeningId = payload.job_opening_id || null;
  if (!jobOpeningId && payload.job_title) {
    const [jobs] = await sequelize.query(`
      SELECT id FROM hris_job_openings
      WHERE title ILIKE :title AND status = 'open'
        AND (tenant_id = :tid OR tenant_id IS NULL OR :tid IS NULL)
      LIMIT 1
    `, { replacements: { title: `%${payload.job_title}%`, tid: tenantId } });
    jobOpeningId = jobs[0]?.id || null;
  }

  if (existing) {
    await sequelize.query(`
      UPDATE hris_candidates SET
        full_name = :name, phone = COALESCE(:phone, phone),
        experience_summary = COALESCE(:exp, experience_summary),
        education_level = COALESCE(:edu, education_level),
        resume_url = COALESCE(:resume, resume_url),
        notes = COALESCE(:notes, notes), source = :source, updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id: existing.id, name, phone: payload.phone || null,
        exp: payload.experience_summary || null, edu: payload.education_level || null,
        resume: payload.resume_url || null, notes: payload.notes || null, source,
      },
    });
    return { id: existing.id, action: 'updated', candidateName: name, provider };
  }

  const [inserted] = await sequelize.query(`
    INSERT INTO hris_candidates (tenant_id, job_opening_id, full_name, name, email, phone,
      current_stage, status, source, rating, experience_summary, education_level,
      resume_url, notes, applied_date)
    VALUES (:tid, :jid, :name, :name, :email, :phone, 'applied', 'active', :source,
      :rating, :exp, :edu, :resume, :notes, CURRENT_DATE)
    RETURNING id
  `, {
    replacements: {
      tid: tenantId, jid: jobOpeningId, name, email, phone: payload.phone || null,
      source, rating: payload.rating || 0, exp: payload.experience_summary || null,
      edu: payload.education_level || null, resume: payload.resume_url || null,
      notes: payload.notes || null,
    },
  });

  const newId = inserted[0]?.id;
  if (jobOpeningId && newId) {
    await sequelize.query(`
      UPDATE hris_job_openings SET applicants = (
        SELECT COUNT(*) FROM hris_candidates WHERE job_opening_id = :jid
      ) WHERE id = :jid
    `, { replacements: { jid: jobOpeningId } });
  }

  return { id: newId, action: 'created', candidateName: name, provider };
}

export function validateWebhookSignature(
  provider: string,
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  // No provider secret configured — accept inbound webhooks (configure *_WEBHOOK_SECRET in production)
  if (!secret) return true;
  if (!signature || signature.length === 0) return false;
  // HMAC validation placeholder — implement per provider when secrets are set
  return signature.length > 0;
}

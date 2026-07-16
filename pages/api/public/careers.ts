/**
 * Public careers API — multi-tenant scoped
 * GET  ?tenant=<slug> | ?tenantId=<uuid>  — list open jobs for that company
 * GET  ?tenant=<slug>&slug=<jobSlug> | &id=<jobId>
 * POST apply with tenant in body or query
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { resolveTenantById, resolveTenantBySlug } from '@/lib/saas/tenant-slug';
import { getTenantBranding } from '@/lib/saas/humanify-branding';
import { extractTenantSlugFromHost } from '@/lib/saas/tenant-host';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

function jobSlugify(title: string, id: string) {
  const base = String(title || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base}-${String(id).slice(0, 8)}`;
}

function mapJob(row: any, tenantSlug?: string) {
  return {
    id: row.id,
    slug: jobSlugify(row.title, row.id),
    title: row.title,
    department: row.department,
    location: row.location,
    employmentType: row.employment_type,
    priority: row.priority,
    salaryMin: row.salary_min ? Number(row.salary_min) : null,
    salaryMax: row.salary_max ? Number(row.salary_max) : null,
    applicants: row.applicants || 0,
    description: row.description,
    requirements: row.requirements,
    postedDate: row.posted_date,
    deadline: row.deadline,
    created_at: row.created_at,
    tenantId: row.tenant_id,
    tenantSlug: tenantSlug || null,
  };
}

async function resolveTenant(req: NextApiRequest) {
  const q = req.query;
  const body = req.body || {};
  const slug = String(q.tenant || q.tenantSlug || body.tenant || body.tenantSlug || '').trim();
  const tenantId = String(q.tenantId || body.tenantId || '').trim();
  const hostSlug = extractTenantSlugFromHost(req.headers.host);

  if (slug) return resolveTenantBySlug(slug);
  if (tenantId) return resolveTenantById(tenantId);
  if (hostSlug) return resolveTenantBySlug(hostSlug);

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) {
    return res.status(503).json({ success: false, error: 'Careers portal unavailable' });
  }

  try {
    const tenant = await resolveTenant(req);
    if (!tenant) {
      return res.status(400).json({
        success: false,
        error: 'TENANT_REQUIRED',
        message: 'Sertakan ?tenant=<slug-perusahaan> untuk portal karir multi-tenant.',
      });
    }
    if (tenant.status === 'suspended' || tenant.isActive === false) {
      return res.status(403).json({ success: false, error: 'Tenant tidak aktif' });
    }

    if (req.method === 'GET') {
      const { id, slug } = req.query;

      if (id || slug) {
        let row: any = null;
        if (id) {
          const [rows] = await sequelize.query(
            `SELECT * FROM hris_job_openings
             WHERE id = $1 AND status = 'open'
               AND tenant_id = $2
             LIMIT 1`,
            { bind: [id, tenant.id] },
          );
          row = rows?.[0];
          // Prefer exact tenant match; reject if row.tenant_id is other tenant
          if (row?.tenant_id && String(row.tenant_id) !== String(tenant.id)) {
            row = null;
          }
        } else if (slug) {
          const [rows] = await sequelize.query(
            `SELECT * FROM hris_job_openings
             WHERE status = 'open' AND tenant_id = $1
             ORDER BY posted_date DESC NULLS LAST`,
            { bind: [tenant.id] },
          );
          row = (rows || []).find((r: any) => jobSlugify(r.title, r.id) === slug);
        }
        if (!row) return res.status(404).json({ success: false, error: 'Lowongan tidak ditemukan' });
        const branding = await getTenantBranding(tenant.id);
        return res.json({
          success: true,
          data: mapJob(row, tenant.slug),
          tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, branding },
        });
      }

      const [rows] = await sequelize.query(`
        SELECT * FROM hris_job_openings
        WHERE status = 'open'
          AND tenant_id = $1
          AND (deadline IS NULL OR deadline >= CURRENT_DATE)
        ORDER BY priority DESC NULLS LAST, posted_date DESC NULLS LAST
        LIMIT 50
      `, { bind: [tenant.id] });

      const branding = await getTenantBranding(tenant.id);
      return res.json({
        success: true,
        data: (rows || []).map((r: any) => mapJob(r, tenant.slug)),
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, branding },
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.name || !body.email) {
        return res.status(400).json({ success: false, error: 'Nama dan email wajib diisi' });
      }
      if (!body.jobId) {
        return res.status(400).json({ success: false, error: 'jobId wajib diisi' });
      }

      const [jobs] = await sequelize.query(
        `SELECT id, tenant_id FROM hris_job_openings
         WHERE id = $1 AND status = 'open' AND tenant_id = $2
         LIMIT 1`,
        { bind: [body.jobId, tenant.id] },
      );
      if (!jobs?.[0]) return res.status(404).json({ success: false, error: 'Lowongan tidak tersedia' });

      const [rows] = await sequelize.query(`
        INSERT INTO hris_candidates (
          tenant_id, job_opening_id, full_name, email, phone, current_stage, status,
          source, experience_summary, education_level, notes, applied_date
        ) VALUES (
          $1, $2, $3, $4, $5, 'applied', 'active', 'careers_portal', $6, $7, $8, CURRENT_DATE
        ) RETURNING id, full_name, email, current_stage, applied_date
      `, {
        bind: [
          tenant.id,
          body.jobId,
          body.name,
          body.email,
          body.phone || null,
          body.experience || body.coverLetter || '',
          body.education || '',
          body.coverLetter || '',
        ],
      });

      await sequelize.query(`
        UPDATE hris_job_openings SET applicants = (
          SELECT COUNT(*)::int FROM hris_candidates WHERE job_opening_id = $1
        ), updated_at = NOW() WHERE id = $1 AND tenant_id = $2
      `, { bind: [body.jobId, tenant.id] });

      return res.status(201).json({
        success: true,
        data: rows?.[0],
        message: 'Lamaran berhasil dikirim. Tim HR akan menghubungi Anda.',
        tenant: { slug: tenant.slug, name: tenant.name },
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch {}

const DEFAULT_TENANT = process.env.TENANT_DEFAULT_ID || null;

function slugify(title: string, id: string) {
  const base = String(title || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base}-${String(id).slice(0, 8)}`;
}

function mapJob(row: any) {
  return {
    id: row.id,
    slug: slugify(row.title, row.id),
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
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!sequelize) {
    return res.status(503).json({ success: false, error: 'Careers portal unavailable' });
  }

  try {
    if (req.method === 'GET') {
      const { id, slug } = req.query;

      if (id || slug) {
        let row: any = null;
        if (id) {
          const [rows] = await sequelize.query(
            `SELECT * FROM hris_job_openings WHERE id = $1 AND status = 'open' LIMIT 1`,
            { bind: [id] },
          );
          row = rows?.[0];
        } else if (slug) {
          const [rows] = await sequelize.query(
            `SELECT * FROM hris_job_openings WHERE status = 'open' ORDER BY posted_date DESC`,
          );
          row = (rows || []).find((r: any) => slugify(r.title, r.id) === slug);
        }
        if (!row) return res.status(404).json({ success: false, error: 'Lowongan tidak ditemukan' });
        return res.json({ success: true, data: mapJob(row) });
      }

      const [rows] = await sequelize.query(`
        SELECT * FROM hris_job_openings
        WHERE status = 'open'
          AND (deadline IS NULL OR deadline >= CURRENT_DATE)
        ORDER BY priority DESC, posted_date DESC
        LIMIT 50
      `);
      return res.json({ success: true, data: (rows || []).map(mapJob) });
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
        `SELECT id FROM hris_job_openings WHERE id = $1 AND status = 'open' LIMIT 1`,
        { bind: [body.jobId] },
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
          DEFAULT_TENANT,
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
        ), updated_at = NOW() WHERE id = $1
      `, { bind: [body.jobId] });

      return res.status(201).json({
        success: true,
        data: rows?.[0],
        message: 'Lamaran berhasil dikirim. Tim HR akan menghubungi Anda.',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}

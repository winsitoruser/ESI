/**
 * HRIS Recruitment API - Real DB
 * 
 * GET    ?action=openings          - List all job openings
 * GET    ?action=candidates        - List all candidates
 * GET    ?action=pipeline          - Get pipeline stats
 * GET    ?action=analytics         - Get recruitment analytics
 * POST   ?action=create-opening    - Create a new job opening
 * POST   ?action=create-candidate  - Add a new candidate
 * PUT    ?action=update-opening    - Update a job opening
 * PUT    ?action=update-candidate  - Update candidate (stage, status, etc.)
 * DELETE ?action=delete-opening    - Delete a job opening
 * DELETE ?action=delete-candidate  - Delete a candidate
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
    const { action } = req.query;
    const method = req.method;

    // ── GET ──
    if (method === 'GET') {
      if (action === 'openings') {
        const { status, department, search } = req.query;
        let where = 'WHERE (o.tenant_id = :tid OR o.tenant_id IS NULL)';
        const repl: any = { tid: tenantId };
        if (status && status !== 'all') { where += ' AND o.status = :status'; repl.status = status; }
        if (department && department !== 'all') { where += ' AND o.department = :dept'; repl.dept = department; }
        if (search) { where += ' AND (o.title ILIKE :q OR o.department ILIKE :q OR o.location ILIKE :q)'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`SELECT o.* FROM hris_job_openings o ${where} ORDER BY o.created_at DESC`, { replacements: repl });
        return res.json({ success: true, data: rows, total: rows.length });
      }

      if (action === 'candidates') {
        const { job_id, stage, status, search } = req.query;
        let where = 'WHERE (c.tenant_id = :tid OR c.tenant_id IS NULL)';
        const repl: any = { tid: tenantId };
        if (job_id) { where += ' AND c.job_opening_id = :jid'; repl.jid = job_id; }
        if (stage && stage !== 'all') { where += ' AND c.current_stage = :stage'; repl.stage = stage; }
        if (status && status !== 'all') { where += ' AND c.status = :status'; repl.status = status; }
        if (search) { where += ' AND (c.full_name ILIKE :q OR c.email ILIKE :q)'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`
          SELECT c.*, jo.title as position
          FROM hris_candidates c
          LEFT JOIN hris_job_openings jo ON c.job_opening_id = jo.id
          ${where} ORDER BY c.applied_date DESC
        `, { replacements: repl });
        return res.json({ success: true, data: rows, total: rows.length });
      }

      if (action === 'pipeline') {
        const stages = ['applied', 'screening', 'test', 'interview', 'offer', 'hired', 'rejected'];
        const [rows] = await sequelize.query(`
          SELECT c.current_stage, COUNT(*)::int as count
          FROM hris_candidates c
          WHERE (c.tenant_id = :tid OR c.tenant_id IS NULL)
          GROUP BY c.current_stage
        `, { replacements: { tid: tenantId } });
        const countMap: Record<string, number> = {};
        rows.forEach((r: any) => { countMap[r.current_stage] = r.count; });
        const pipeline = stages.map(stage => ({ stage, count: countMap[stage] || 0 }));
        return res.json({ success: true, data: pipeline });
      }

      if (action === 'analytics') {
        const [candStats] = await sequelize.query(`
          SELECT
            COUNT(*)::int as total_applicants,
            COUNT(*) FILTER (WHERE current_stage = 'hired')::int as hired,
            COUNT(DISTINCT source) as source_count
          FROM hris_candidates WHERE (tenant_id = :tid OR tenant_id IS NULL)
        `, { replacements: { tid: tenantId } });
        const [jobStats] = await sequelize.query(`
          SELECT COUNT(*) FILTER (WHERE status = 'open')::int as open_positions
          FROM hris_job_openings WHERE (tenant_id = :tid OR tenant_id IS NULL)
        `, { replacements: { tid: tenantId } });
        const [sourceRows] = await sequelize.query(`
          SELECT COALESCE(source, 'Other') as source, COUNT(*)::int as count
          FROM hris_candidates WHERE (tenant_id = :tid OR tenant_id IS NULL)
          GROUP BY source ORDER BY count DESC
        `, { replacements: { tid: tenantId } });

        const total = candStats[0]?.total_applicants || 0;
        const hired = candStats[0]?.hired || 0;
        return res.json({
          success: true,
          data: {
            totalApplicants: total,
            hired,
            openPositions: jobStats[0]?.open_positions || 0,
            acceptanceRate: total > 0 ? Math.round(hired / total * 100) : 0,
            avgTimeToHire: 21,
            sourceStats: sourceRows
          }
        });
      }

      // Default: summary counts
      const [summary] = await sequelize.query(`
        SELECT
          (SELECT COUNT(*)::int FROM hris_job_openings WHERE tenant_id = :tid OR tenant_id IS NULL) as openings,
          (SELECT COUNT(*)::int FROM hris_candidates WHERE tenant_id = :tid OR tenant_id IS NULL) as candidates
      `, { replacements: { tid: tenantId } });
      return res.json({ success: true, data: summary[0] });
    }

    // ── POST ──
    if (method === 'POST') {
      const body = req.body;
      if (action === 'create-opening') {
        if (!body.title) return res.status(400).json({ error: 'title is required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_job_openings (tenant_id, title, department, location, employment_type, status, priority,
            salary_min, salary_max, description, requirements, posted_date, deadline)
          VALUES (:tid, :title, :dept, :loc, :type, 'open', :priority,
            :salMin, :salMax, :desc, :reqs, CURRENT_DATE, :deadline)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, title: body.title, dept: body.department || '', loc: body.location || '',
            type: body.type || 'full_time', priority: body.priority || 'medium',
            salMin: body.salary_min || 0, salMax: body.salary_max || 0,
            desc: body.description || '', reqs: body.requirements || '',
            deadline: body.deadline || null
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      if (action === 'create-candidate') {
        if (!body.name) return res.status(400).json({ error: 'name is required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_candidates (tenant_id, job_opening_id, full_name, email, phone,
            current_stage, status, source, rating, experience_summary, education_level, applied_date, notes)
          VALUES (:tid, :jid, :name, :email, :phone,
            :stage, 'active', :source, :rating, :exp, :edu, CURRENT_DATE, :notes)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, jid: body.job_id || null, name: body.name, email: body.email || '',
            phone: body.phone || '', stage: body.stage || 'applied', source: body.source || 'Other',
            rating: body.rating || 0, exp: body.experience || '', edu: body.education || '',
            notes: body.notes || ''
          }
        });
        // Update applicant count
        if (body.job_id) {
          await sequelize.query(`
            UPDATE hris_job_openings SET applicants = (SELECT COUNT(*) FROM hris_candidates WHERE job_opening_id = :jid)
            WHERE id = :jid
          `, { replacements: { jid: body.job_id } });
        }
        return res.status(201).json({ success: true, data: rows[0] });
      }
      return res.status(400).json({ error: 'Unknown POST action' });
    }

    // ── PUT ──
    if (method === 'PUT') {
      const body = req.body;
      if (action === 'update-opening') {
        if (!body.id) return res.status(400).json({ error: 'id is required' });
        const [rows] = await sequelize.query(`
          UPDATE hris_job_openings SET
            title = COALESCE(:title, title), department = COALESCE(:dept, department),
            location = COALESCE(:loc, location), status = COALESCE(:status, status),
            priority = COALESCE(:priority, priority),
            salary_min = COALESCE(:salMin, salary_min), salary_max = COALESCE(:salMax, salary_max),
            description = COALESCE(:desc, description), requirements = COALESCE(:reqs, requirements),
            deadline = COALESCE(:deadline, deadline), updated_at = NOW()
          WHERE id = :id RETURNING *
        `, {
          replacements: {
            id: body.id, title: body.title || null, dept: body.department || null,
            loc: body.location || null, status: body.status || null, priority: body.priority || null,
            salMin: body.salary_min ?? null, salMax: body.salary_max ?? null,
            desc: body.description || null, reqs: body.requirements || null,
            deadline: body.deadline || null
          }
        });
        if (rows.length === 0) return res.status(404).json({ error: 'Opening not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-candidate') {
        if (!body.id) return res.status(400).json({ error: 'id is required' });
        const [rows] = await sequelize.query(`
          UPDATE hris_candidates SET
            current_stage = COALESCE(:stage, current_stage),
            status = COALESCE(:status, status),
            rating = COALESCE(:rating, rating),
            notes = COALESCE(:notes, notes),
            updated_at = NOW()
          WHERE id = :id RETURNING *
        `, {
          replacements: {
            id: body.id, stage: body.stage || null, status: body.status || null,
            rating: body.rating ?? null, notes: body.notes || null
          }
        });
        if (rows.length === 0) return res.status(404).json({ error: 'Candidate not found' });
        return res.json({ success: true, data: rows[0] });
      }
      return res.status(400).json({ error: 'Unknown PUT action' });
    }

    // ── DELETE ──
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id is required' });
      if (action === 'delete-opening') {
        await sequelize.query('UPDATE hris_candidates SET job_opening_id = NULL WHERE job_opening_id = :id', { replacements: { id } });
        await sequelize.query('DELETE FROM hris_job_openings WHERE id = :id', { replacements: { id } });
        return res.json({ success: true, message: 'Lowongan berhasil dihapus' });
      }
      if (action === 'delete-candidate') {
        const [deleted] = await sequelize.query('DELETE FROM hris_candidates WHERE id = :id RETURNING job_opening_id', { replacements: { id } });
        if (deleted[0]?.job_opening_id) {
          await sequelize.query(`
            UPDATE hris_job_openings SET applicants = (SELECT COUNT(*) FROM hris_candidates WHERE job_opening_id = :jid)
            WHERE id = :jid
          `, { replacements: { jid: deleted[0].job_opening_id } });
        }
        return res.json({ success: true, message: 'Kandidat berhasil dihapus' });
      }
      return res.status(400).json({ error: 'Unknown DELETE action' });
    }

    return res.status(405).json({ error: `Method ${method} not allowed` });
  } catch (error: any) {
    console.error('[recruitment API]', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

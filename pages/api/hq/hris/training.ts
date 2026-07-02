/**
 * HRIS Training & Certification API - Real DB
 * 
 * GET    ?action=programs           - List all training programs
 * GET    ?action=certifications     - List all employee certifications
 * GET    ?action=schedule           - Get upcoming training schedule
 * GET    ?action=enrollments        - Get enrollments
 * GET    ?action=analytics          - Get training analytics
 * POST   ?action=create-program     - Create a new training program
 * POST   ?action=create-cert        - Add a certification record
 * POST   ?action=enroll             - Enroll employee in a program
 * PUT    ?action=update-program     - Update a training program
 * PUT    ?action=update-cert        - Update a certification record
 * PUT    ?action=update-enrollment  - Update enrollment status
 * DELETE ?action=delete-program     - Delete a training program
 * DELETE ?action=delete-cert        - Delete a certification record
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
      if (action === 'programs') {
        const { category, status, search } = req.query;
        let where = 'WHERE (p.tenant_id = :tid OR p.tenant_id IS NULL)';
        const repl: any = { tid: tenantId };
        if (category && category !== 'all') { where += ' AND p.category = :cat'; repl.cat = category; }
        if (status && status !== 'all') { where += ' AND p.status = :st'; repl.st = status; }
        if (search) { where += ' AND (p.title ILIKE :q OR p.trainer_name ILIKE :q)'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`SELECT p.* FROM hris_training_programs p ${where} ORDER BY p.start_date DESC`, { replacements: repl });
        return res.json({ success: true, data: rows, total: rows.length });
      }

      if (action === 'certifications') {
        const { employee_id, status } = req.query;
        let where = 'WHERE (c.tenant_id = :tid OR c.tenant_id IS NULL)';
        const repl: any = { tid: tenantId };
        if (employee_id) { where += ' AND c.employee_id = :eid'; repl.eid = employee_id; }
        if (status && status !== 'all') { where += ' AND c.status = :st'; repl.st = status; }
        const [rows] = await sequelize.query(`
          SELECT c.*, e.name as employee_name
          FROM hris_certifications c
          LEFT JOIN employees e ON c.employee_id = e.id
          ${where} ORDER BY c.expiry_date ASC
        `, { replacements: repl });
        return res.json({ success: true, data: rows, total: rows.length });
      }

      if (action === 'schedule') {
        const [rows] = await sequelize.query(`
          SELECT * FROM hris_training_programs
          WHERE status IN ('active', 'upcoming') AND (tenant_id = :tid OR tenant_id IS NULL)
          ORDER BY start_date ASC
        `, { replacements: { tid: tenantId } });
        return res.json({ success: true, data: rows });
      }

      if (action === 'enrollments') {
        const { program_id } = req.query;
        let where = 'WHERE (te.tenant_id = :tid OR te.tenant_id IS NULL)';
        const repl: any = { tid: tenantId };
        if (program_id) { where += ' AND te.training_program_id = :pid'; repl.pid = program_id; }
        const [rows] = await sequelize.query(`
          SELECT te.*, e.name as employee_name, tp.title as program_title
          FROM hris_training_enrollments te
          LEFT JOIN employees e ON te.employee_id = e.id
          LEFT JOIN hris_training_programs tp ON te.training_program_id = tp.id
          ${where} ORDER BY te.enrolled_at DESC
        `, { replacements: repl });
        return res.json({ success: true, data: rows, total: rows.length });
      }

      if (action === 'analytics') {
        const [pgmStats] = await sequelize.query(`
          SELECT
            COUNT(*)::int as total_programs,
            COUNT(*) FILTER (WHERE status = 'active')::int as active_programs,
            COALESCE(SUM(cost_per_person * current_participants), 0)::bigint as total_budget
          FROM hris_training_programs WHERE (tenant_id = :tid OR tenant_id IS NULL)
        `, { replacements: { tid: tenantId } });
        const [enrollStats] = await sequelize.query(`
          SELECT
            COUNT(*)::int as total_enrolled,
            COUNT(*) FILTER (WHERE status = 'completed')::int as total_completed
          FROM hris_training_enrollments WHERE (tenant_id = :tid OR tenant_id IS NULL)
        `, { replacements: { tid: tenantId } });
        const [certStats] = await sequelize.query(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'active')::int as active_certs,
            COUNT(*) FILTER (WHERE status = 'expiring_soon')::int as expiring_certs,
            COUNT(*) FILTER (WHERE status = 'expired')::int as expired_certs
          FROM hris_certifications WHERE (tenant_id = :tid OR tenant_id IS NULL)
        `, { replacements: { tid: tenantId } });

        const totalEnrolled = enrollStats[0]?.total_enrolled || 0;
        const totalCompleted = enrollStats[0]?.total_completed || 0;
        return res.json({
          success: true,
          data: {
            totalPrograms: pgmStats[0]?.total_programs || 0,
            activePrograms: pgmStats[0]?.active_programs || 0,
            totalEnrolled,
            totalCompleted,
            completionRate: totalEnrolled > 0 ? Math.round(totalCompleted / totalEnrolled * 100) : 0,
            activeCerts: certStats[0]?.active_certs || 0,
            expiringCerts: certStats[0]?.expiring_certs || 0,
            expiredCerts: certStats[0]?.expired_certs || 0,
            totalBudget: parseInt(pgmStats[0]?.total_budget) || 0
          }
        });
      }

      // Default: summary counts
      const [summary] = await sequelize.query(`
        SELECT
          (SELECT COUNT(*)::int FROM hris_training_programs WHERE tenant_id = :tid OR tenant_id IS NULL) as programs,
          (SELECT COUNT(*)::int FROM hris_certifications WHERE tenant_id = :tid OR tenant_id IS NULL) as certifications,
          (SELECT COUNT(*)::int FROM hris_training_enrollments WHERE tenant_id = :tid OR tenant_id IS NULL) as enrollments
      `, { replacements: { tid: tenantId } });
      return res.json({ success: true, data: summary[0] });
    }

    // ── POST ──
    if (method === 'POST') {
      const body = req.body;
      if (action === 'create-program') {
        if (!body.title) return res.status(400).json({ error: 'title is required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_programs (tenant_id, title, category, training_type, trainer_name,
            location, status, start_date, end_date, max_participants, cost_per_person, description)
          VALUES (:tid, :title, :cat, :type, :trainer, :loc, :status,
            :startDate, :endDate, :maxPart, :cost, :desc)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, title: body.title, cat: body.category || 'technical',
            type: body.type || 'training', trainer: body.trainer || '', loc: body.location || '',
            status: body.status || 'upcoming', startDate: body.start_date || null,
            endDate: body.end_date || null, maxPart: body.max_participants || 30,
            cost: body.cost_per_person || 0, desc: body.description || ''
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      if (action === 'create-cert') {
        if (!body.employee_id || !body.cert_name) return res.status(400).json({ error: 'employee_id and cert_name are required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_certifications (tenant_id, employee_id, certification_name, issuing_organization,
            issued_date, expiry_date, status, credential_id)
          VALUES (:tid, :eid, :name, :issuer, :issuedDate, :expiryDate, :status, :credId)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, eid: body.employee_id, name: body.cert_name,
            issuer: body.issuer || '', issuedDate: body.issued_date || null,
            expiryDate: body.expiry_date || null, status: body.status || 'active',
            credId: body.cert_number || null
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      if (action === 'enroll') {
        const { program_id, employee_id } = body;
        if (!program_id || !employee_id) return res.status(400).json({ error: 'program_id and employee_id are required' });
        // Check capacity
        const [pgm] = await sequelize.query('SELECT max_participants, current_participants FROM hris_training_programs WHERE id = :pid', { replacements: { pid: program_id } });
        if (pgm.length === 0) return res.status(404).json({ error: 'Program not found' });
        if (pgm[0].max_participants && (pgm[0].current_participants || 0) >= pgm[0].max_participants) {
          return res.status(400).json({ error: 'Program sudah penuh' });
        }
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_enrollments (tenant_id, training_program_id, employee_id, status, enrolled_at)
          VALUES (:tid, :pid, :eid, 'enrolled', NOW())
          RETURNING *
        `, { replacements: { tid: tenantId, pid: program_id, eid: employee_id } });
        await sequelize.query('UPDATE hris_training_programs SET current_participants = COALESCE(current_participants, 0) + 1 WHERE id = :pid', { replacements: { pid: program_id } });
        return res.status(201).json({ success: true, data: rows[0] });
      }
      return res.status(400).json({ error: 'Unknown POST action' });
    }

    // ── PUT ──
    if (method === 'PUT') {
      const body = req.body;
      if (action === 'update-program') {
        if (!body.id) return res.status(400).json({ error: 'id is required' });
        const [rows] = await sequelize.query(`
          UPDATE hris_training_programs SET
            title = COALESCE(:title, title), category = COALESCE(:cat, category),
            training_type = COALESCE(:type, training_type), status = COALESCE(:status, status),
            trainer_name = COALESCE(:trainer, trainer_name), location = COALESCE(:loc, location),
            start_date = COALESCE(:startDate, start_date), end_date = COALESCE(:endDate, end_date),
            max_participants = COALESCE(:maxPart, max_participants),
            cost_per_person = COALESCE(:cost, cost_per_person),
            description = COALESCE(:desc, description), updated_at = NOW()
          WHERE id = :id RETURNING *
        `, {
          replacements: {
            id: body.id, title: body.title || null, cat: body.category || null,
            type: body.type || null, status: body.status || null, trainer: body.trainer || null,
            loc: body.location || null, startDate: body.start_date || null,
            endDate: body.end_date || null, maxPart: body.max_participants ?? null,
            cost: body.cost_per_person ?? null, desc: body.description || null
          }
        });
        if (rows.length === 0) return res.status(404).json({ error: 'Program not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-cert') {
        if (!body.id) return res.status(400).json({ error: 'id is required' });
        const [rows] = await sequelize.query(`
          UPDATE hris_certifications SET
            certification_name = COALESCE(:name, certification_name),
            status = COALESCE(:status, status),
            expiry_date = COALESCE(:expiryDate, expiry_date),
            issuing_organization = COALESCE(:issuer, issuing_organization),
            updated_at = NOW()
          WHERE id = :id RETURNING *
        `, {
          replacements: {
            id: body.id, name: body.cert_name || null, status: body.status || null,
            expiryDate: body.expiry_date || null, issuer: body.issuer || null
          }
        });
        if (rows.length === 0) return res.status(404).json({ error: 'Certification not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-enrollment') {
        if (!body.id) return res.status(400).json({ error: 'id is required' });
        const [rows] = await sequelize.query(`
          UPDATE hris_training_enrollments SET
            status = COALESCE(:status, status),
            completion_date = COALESCE(:completionDate, completion_date),
            score = COALESCE(:score, score),
            updated_at = NOW()
          WHERE id = :id RETURNING *
        `, {
          replacements: {
            id: body.id, status: body.status || null,
            completionDate: body.completion_date || null, score: body.score ?? null
          }
        });
        if (rows.length === 0) return res.status(404).json({ error: 'Enrollment not found' });
        return res.json({ success: true, data: rows[0] });
      }
      return res.status(400).json({ error: 'Unknown PUT action' });
    }

    // ── DELETE ──
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id is required' });
      if (action === 'delete-program') {
        await sequelize.query('DELETE FROM hris_training_enrollments WHERE training_program_id = :id', { replacements: { id } });
        await sequelize.query('DELETE FROM hris_training_programs WHERE id = :id', { replacements: { id } });
        return res.json({ success: true, message: 'Program pelatihan berhasil dihapus' });
      }
      if (action === 'delete-cert') {
        await sequelize.query('DELETE FROM hris_certifications WHERE id = :id', { replacements: { id } });
        return res.json({ success: true, message: 'Sertifikasi berhasil dihapus' });
      }
      return res.status(400).json({ error: 'Unknown DELETE action' });
    }

    return res.status(405).json({ error: `Method ${method} not allowed` });
  } catch (error: any) {
    console.error('[training API]', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

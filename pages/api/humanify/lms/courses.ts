/**
 * LMS Courses API — curricula, modules, materials, enrollments
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { parseMaterials } from '../../../../lib/hris/lms/course-service';
import { enforceHumanifyPlanFeature } from '@/lib/saas/assert-feature';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

const sequelize = require('../../../../lib/sequelize');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function asUuid(v: unknown): string | null {
  const s = v != null ? String(v) : '';
  return UUID_RE.test(s) ? s : null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await enforceHumanifyPlanFeature(req, res, session))) return;

    const tenantId = (session.user as any).tenantId || null;
    const userId = asUuid((session.user as any).id);
    const { action } = req.query;
    const method = req.method;

    if (method === 'GET') {
      if (action === 'list') {
        const [rows] = await sequelize.query(`
          SELECT c.*,
            (SELECT COUNT(*)::int FROM hris_training_modules m WHERE m.curriculum_id = c.id) as module_count,
            (SELECT COUNT(*)::int FROM hris_lms_enrollments e WHERE e.curriculum_id = c.id) as enrollment_count
          FROM hris_training_curricula c
          WHERE c.tenant_id = :tid ORDER BY c.created_at DESC
        `, { replacements: { tid: tenantId } }).catch(() => [[]]);
        return res.json({ success: true, data: rows });
      }

      if (action === 'detail') {
        const { id } = req.query;
        const [curricula] = await sequelize.query(
          'SELECT * FROM hris_training_curricula WHERE id = :id AND tenant_id = :tid',
          { replacements: { id, tid: tenantId } },
        );
        if (!curricula.length) return res.status(404).json({ error: 'Kursus tidak ditemukan' });
        const [modules] = await sequelize.query(
          'SELECT * FROM hris_training_modules WHERE curriculum_id = :id ORDER BY order_index',
          { replacements: { id } },
        );
        const [enrollments] = await sequelize.query(`
          SELECT e.* FROM hris_lms_enrollments e
          WHERE e.curriculum_id = :id AND e.tenant_id = :tid ORDER BY e.enrolled_at DESC
        `, { replacements: { id, tid: tenantId } }).catch(() => [[]]);
        return res.json({
          success: true,
          data: { curriculum: curricula[0], modules, enrollments },
        });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (method === 'POST') {
      if (action === 'create-course') {
        const b = req.body;
        const code = b.code || `CRS-${Date.now().toString(36).toUpperCase()}`;
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_curricula (
            tenant_id, code, title, description, category, target_audience,
            total_hours, passing_score, status, certificate_enabled, certificate_validity_months, created_by
          ) VALUES (:tid, :code, :title, :desc, :cat, :aud, :hours, :pass, :st, :cert, :valid, :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, code, title: b.title, desc: b.description || null,
            cat: b.category || 'general', aud: b.target_audience || 'existing_employee',
            hours: b.total_hours || 0, pass: b.passing_score || 70, st: b.status || 'draft',
            cert: b.certificate_enabled !== false, valid: b.certificate_validity_months || 12,
            uid: userId,
          },
        });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'create-module') {
        const b = req.body;
        if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
        const [owned] = await sequelize.query(
          'SELECT id FROM hris_training_curricula WHERE id = :cid AND tenant_id = :tid LIMIT 1',
          { replacements: { cid: b.curriculum_id, tid: tenantId } },
        );
        if (!owned?.length) return res.status(404).json({ error: 'Curriculum not found' });
        const [mx] = await sequelize.query(
          'SELECT COALESCE(MAX(order_index),0)::int as mx FROM hris_training_modules WHERE curriculum_id = :cid AND tenant_id = :tid',
          { replacements: { cid: b.curriculum_id, tid: tenantId } },
        );
        const materials = parseMaterials(b.materials || []);
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_modules (
            tenant_id, curriculum_id, code, title, description, order_index,
            duration_hours, module_type, delivery_method, materials, has_exam, passing_score
          ) VALUES (:tid, :cid, :code, :title, :desc, :ord, :dur, :mt, :dm, :mat::jsonb, :exam, :pass)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, cid: b.curriculum_id,
            code: b.code || `MOD-${(mx[0]?.mx || 0) + 1}`,
            title: b.title, desc: b.description || null,
            ord: (mx[0]?.mx || 0) + 1, dur: b.duration_hours || 1,
            mt: b.module_type || 'lesson', dm: b.delivery_method || 'self_paced',
            mat: JSON.stringify(materials), exam: b.has_exam || false, pass: b.passing_score || 70,
          },
        });
        await sequelize.query(
          'UPDATE hris_training_curricula SET total_modules = (SELECT COUNT(*) FROM hris_training_modules WHERE curriculum_id = :cid) WHERE id = :cid',
          { replacements: { cid: b.curriculum_id } },
        );
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'add-material') {
        const { module_id, material } = req.body;
        if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
        const [mods] = await sequelize.query(
          'SELECT materials FROM hris_training_modules WHERE id = :id AND tenant_id = :tid',
          { replacements: { id: module_id, tid: tenantId } },
        );
        if (!mods.length) return res.status(404).json({ error: 'Modul tidak ditemukan' });
        const list = parseMaterials(mods[0].materials);
        const newMat = {
          id: material.id || `lesson-${Date.now()}`,
          type: material.type || 'text',
          title: material.title,
          url: material.url,
          content: material.content,
          duration_minutes: material.duration_minutes || 5,
          order: list.length + 1,
        };
        list.push(newMat);
        await sequelize.query(
          'UPDATE hris_training_modules SET materials = :mat::jsonb, updated_at = NOW() WHERE id = :id AND tenant_id = :tid',
          { replacements: { mat: JSON.stringify(list), id: module_id, tid: tenantId } },
        );
        return res.json({ success: true, data: newMat });
      }

      if (action === 'enroll') {
        const { curriculum_id, employee_ids, mandatory, due_date } = req.body;
        if (!curriculum_id || !Array.isArray(employee_ids)) {
          return res.status(400).json({ error: 'curriculum_id dan employee_ids diperlukan' });
        }
        if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
        const [curOwned] = await sequelize.query(
          'SELECT id, title FROM hris_training_curricula WHERE id = :id AND tenant_id = :tid LIMIT 1',
          { replacements: { id: curriculum_id, tid: tenantId } },
        );
        if (!curOwned?.length) return res.status(404).json({ error: 'Curriculum not found' });
        let count = 0;
        for (const eid of employee_ids) {
          const [emp] = await sequelize.query(
            'SELECT name FROM employees WHERE id = :id AND tenant_id = :tid LIMIT 1',
            { replacements: { id: eid, tid: tenantId } },
          );
          if (!emp?.length) continue;
          const [r] = await sequelize.query(`
            INSERT INTO hris_lms_enrollments (id, tenant_id, curriculum_id, employee_id, employee_name, mandatory, due_date, status)
            SELECT gen_random_uuid(), :tid, :cid, :eid, :name, :mand, :due, 'enrolled'
            WHERE NOT EXISTS (SELECT 1 FROM hris_lms_enrollments WHERE curriculum_id = :cid AND employee_id = :eid AND tenant_id = :tid)
            RETURNING id
          `, {
            replacements: {
              tid: tenantId, cid: curriculum_id, eid,
              name: emp[0]?.name || null, mand: mandatory || false, due: due_date || null,
            },
          });
          if (r.length) {
            count++;
            try {
              const { notifyLmsEnrolled } = await import('../../../../lib/hris/lms/notifications');
              const { triggerLmsWebhook } = await import('../../../../lib/hris/lms/integrations');
              await notifyLmsEnrolled({
                tenantId,
                employeeId: eid,
                curriculumTitle: curOwned[0]?.title || 'Kursus',
                curriculumId: curriculum_id,
                dueDate: due_date || null,
              });
              await triggerLmsWebhook('lms.enrolled', eid, emp[0]?.name || '', {
                curriculum_id, mandatory: mandatory || false,
              });
            } catch { /* ignore */ }
          }
        }
        return res.json({ success: true, data: { enrolled: count } });
      }

      if (action === 'publish') {
        const { curriculum_id } = req.body;
        await sequelize.query(
          `UPDATE hris_training_curricula SET status = 'active', updated_at = NOW() WHERE id = :id AND tenant_id = :tid`,
          { replacements: { id: curriculum_id, tid: tenantId } },
        );
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (method === 'PUT' && action === 'update-module') {
      const { id, title, description, materials } = req.body;
      if (!tenantId) return res.status(403).json({ error: 'NO_TENANT' });
      const [, meta] = await sequelize.query(`
        UPDATE hris_training_modules SET
          title = COALESCE(:title, title),
          description = COALESCE(:moduledesc, description),
          materials = COALESCE(CAST(:mat AS jsonb), materials),
          updated_at = NOW()
        WHERE id = :id AND tenant_id = :tid
      `, {
        replacements: {
          id,
          tid: tenantId,
          title: title ?? null,
          moduledesc: description ?? null,
          mat: materials != null ? JSON.stringify(parseMaterials(materials)) : null,
        },
      });
      if ((meta as any)?.rowCount === 0) return res.status(404).json({ error: 'Modul tidak ditemukan' });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[LMS Courses API]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });

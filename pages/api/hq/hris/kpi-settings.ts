/**
 * KPI Settings API - Real DB
 *
 * GET  ?type=templates[&category=]  - List KPI templates
 * GET  ?type=scoring                - List scoring schemes with levels
 * GET  ?type=scheme&id=             - Get single scheme with levels
 * GET  (no type)                    - Full settings overview
 * POST ?type=template               - Create KPI template
 * POST ?type=scheme                 - Create scoring scheme
 * POST ?type=level                  - Add scoring level to scheme
 * PUT  ?type=template               - Update KPI template
 * PUT  ?type=scheme                 - Update scoring scheme
 * PUT  ?type=level                  - Update scoring level
 * DELETE ?type=template&id=         - Delete KPI template
 * DELETE ?type=scheme&id=           - Delete scoring scheme
 * DELETE ?type=level&id=            - Delete scoring level
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';

const sequelize = require('../../../../lib/sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;
    const { type } = req.query;
    const method = req.method;

    // ── GET ──
    if (method === 'GET') {
      if (type === 'templates') {
        const { category } = req.query;
        let where = 'WHERE (tenant_id = :tid OR tenant_id IS NULL)';
        const repl: any = { tid: tenantId };
        if (category && category !== 'all') { where += ' AND category = :cat'; repl.cat = category; }
        const [rows] = await sequelize.query(`SELECT * FROM kpi_templates ${where} ORDER BY category, name`, { replacements: repl });
        return res.status(HttpStatus.OK).json(successResponse({ templates: rows }));
      }

      if (type === 'scoring') {
        const [schemes] = await sequelize.query(`
          SELECT s.*, (SELECT COUNT(*)::int FROM kpi_scoring_levels WHERE scheme_id = s.id) as level_count
          FROM kpi_scoring_schemes s
          WHERE (s.tenant_id = :tid OR s.tenant_id IS NULL)
          ORDER BY s.is_default DESC, s.name
        `, { replacements: { tid: tenantId } });
        // Attach levels to each scheme
        for (const scheme of schemes) {
          const [levels] = await sequelize.query(
            'SELECT * FROM kpi_scoring_levels WHERE scheme_id = :sid ORDER BY sort_order, min_percent',
            { replacements: { sid: scheme.id } }
          );
          scheme.levels = levels;
        }
        return res.status(HttpStatus.OK).json(successResponse({ scoringSchemes: schemes }));
      }

      if (type === 'scheme') {
        const { id } = req.query;
        if (!id) return res.status(400).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'id is required'));
        const [schemes] = await sequelize.query('SELECT * FROM kpi_scoring_schemes WHERE id = :id', { replacements: { id } });
        if (schemes.length === 0) return res.status(404).json(errorResponse(ErrorCodes.NOT_FOUND, 'Scheme not found'));
        const [levels] = await sequelize.query('SELECT * FROM kpi_scoring_levels WHERE scheme_id = :sid ORDER BY sort_order, min_percent', { replacements: { sid: id } });
        return res.status(HttpStatus.OK).json(successResponse({ ...schemes[0], levels }));
      }

      // Default: full overview
      const [templates] = await sequelize.query('SELECT * FROM kpi_templates WHERE (tenant_id = :tid OR tenant_id IS NULL) ORDER BY category, name', { replacements: { tid: tenantId } });
      const [schemes] = await sequelize.query(`
        SELECT s.* FROM kpi_scoring_schemes s
        WHERE (s.tenant_id = :tid OR s.tenant_id IS NULL) ORDER BY s.is_default DESC, s.name
      `, { replacements: { tid: tenantId } });
      for (const scheme of schemes) {
        const [levels] = await sequelize.query('SELECT * FROM kpi_scoring_levels WHERE scheme_id = :sid ORDER BY sort_order', { replacements: { sid: scheme.id } });
        scheme.levels = levels;
      }
      const [summaryRow] = await sequelize.query(`
        SELECT
          COUNT(*)::int as total_templates,
          COUNT(*) FILTER (WHERE is_active = true)::int as active_templates,
          COALESCE(SUM(weight), 0)::int as total_weight
        FROM kpi_templates WHERE (tenant_id = :tid OR tenant_id IS NULL)
      `, { replacements: { tid: tenantId } });
      return res.status(HttpStatus.OK).json(successResponse({
        templates,
        scoringSchemes: schemes,
        summary: summaryRow[0]
      }));
    }

    // ── POST ──
    if (method === 'POST') {
      const body = req.body;

      if (type === 'template') {
        if (!body.name || !body.category) {
          return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'name and category are required'));
        }
        const [rows] = await sequelize.query(`
          INSERT INTO kpi_templates (tenant_id, name, description, category, weight, target_type, default_target,
            min_value, max_value, is_active, applicable_to)
          VALUES (:tid, :name, :desc, :cat, :weight, :targetType, :defaultTarget, :minVal, :maxVal, true, :applicableTo)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, name: body.name, desc: body.description || '',
            cat: body.category, weight: body.weight || 10,
            targetType: body.targetType || 'percentage', defaultTarget: body.defaultTarget || 100,
            minVal: body.minValue || 0, maxVal: body.maxValue || 100,
            applicableTo: JSON.stringify(body.applicableTo || ['all'])
          }
        });
        return res.status(HttpStatus.CREATED).json(successResponse(rows[0], undefined, 'KPI template created'));
      }

      if (type === 'scheme') {
        if (!body.name) return res.status(400).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'name is required'));
        const [rows] = await sequelize.query(`
          INSERT INTO kpi_scoring_schemes (tenant_id, name, description, is_default, is_active)
          VALUES (:tid, :name, :desc, :isDefault, true)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, name: body.name, desc: body.description || '',
            isDefault: body.is_default || false
          }
        });
        // If creating with levels
        if (body.levels && Array.isArray(body.levels)) {
          for (const lvl of body.levels) {
            await sequelize.query(`
              INSERT INTO kpi_scoring_levels (scheme_id, level, label, min_percent, max_percent, score, color, multiplier, sort_order)
              VALUES (:sid, :level, :label, :minP, :maxP, :score, :color, :mult, :sort)
            `, {
              replacements: {
                sid: rows[0].id, level: lvl.level, label: lvl.label,
                minP: lvl.min_percent, maxP: lvl.max_percent, score: lvl.score,
                color: lvl.color || '#666', mult: lvl.multiplier || 1.0, sort: lvl.sort_order || lvl.level
              }
            });
          }
        }
        return res.status(HttpStatus.CREATED).json(successResponse(rows[0], undefined, 'Scoring scheme created'));
      }

      if (type === 'level') {
        if (!body.scheme_id || !body.label) return res.status(400).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'scheme_id and label required'));
        const [rows] = await sequelize.query(`
          INSERT INTO kpi_scoring_levels (scheme_id, level, label, min_percent, max_percent, score, color, multiplier, sort_order)
          VALUES (:sid, :level, :label, :minP, :maxP, :score, :color, :mult, :sort)
          RETURNING *
        `, {
          replacements: {
            sid: body.scheme_id, level: body.level || 1, label: body.label,
            minP: body.min_percent || 0, maxP: body.max_percent || 100,
            score: body.score || 1, color: body.color || '#666',
            mult: body.multiplier || 1.0, sort: body.sort_order || 0
          }
        });
        return res.status(HttpStatus.CREATED).json(successResponse(rows[0], undefined, 'Scoring level added'));
      }

      return res.status(400).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Unknown POST type'));
    }

    // ── PUT ──
    if (method === 'PUT') {
      const body = req.body;
      if (!body.id) return res.status(400).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'id is required'));

      if (type === 'template') {
        const [rows] = await sequelize.query(`
          UPDATE kpi_templates SET
            name = COALESCE(:name, name), description = COALESCE(:desc, description),
            category = COALESCE(:cat, category), weight = COALESCE(:weight, weight),
            target_type = COALESCE(:targetType, target_type), default_target = COALESCE(:defaultTarget, default_target),
            min_value = COALESCE(:minVal, min_value), max_value = COALESCE(:maxVal, max_value),
            is_active = COALESCE(:isActive, is_active), updated_at = NOW()
          WHERE id = :id RETURNING *
        `, {
          replacements: {
            id: body.id, name: body.name || null, desc: body.description || null,
            cat: body.category || null, weight: body.weight ?? null,
            targetType: body.targetType || null, defaultTarget: body.defaultTarget ?? null,
            minVal: body.minValue ?? null, maxVal: body.maxValue ?? null,
            isActive: body.isActive ?? null
          }
        });
        if (rows.length === 0) return res.status(404).json(errorResponse(ErrorCodes.NOT_FOUND, 'Template not found'));
        return res.status(HttpStatus.OK).json(successResponse(rows[0], undefined, 'Template updated'));
      }

      if (type === 'scheme') {
        const [rows] = await sequelize.query(`
          UPDATE kpi_scoring_schemes SET
            name = COALESCE(:name, name), description = COALESCE(:desc, description),
            is_default = COALESCE(:isDefault, is_default), is_active = COALESCE(:isActive, is_active),
            updated_at = NOW()
          WHERE id = :id RETURNING *
        `, {
          replacements: {
            id: body.id, name: body.name || null, desc: body.description || null,
            isDefault: body.is_default ?? null, isActive: body.is_active ?? null
          }
        });
        if (rows.length === 0) return res.status(404).json(errorResponse(ErrorCodes.NOT_FOUND, 'Scheme not found'));
        return res.status(HttpStatus.OK).json(successResponse(rows[0], undefined, 'Scheme updated'));
      }

      if (type === 'level') {
        const [rows] = await sequelize.query(`
          UPDATE kpi_scoring_levels SET
            label = COALESCE(:label, label), min_percent = COALESCE(:minP, min_percent),
            max_percent = COALESCE(:maxP, max_percent), score = COALESCE(:score, score),
            color = COALESCE(:color, color), multiplier = COALESCE(:mult, multiplier),
            sort_order = COALESCE(:sort, sort_order)
          WHERE id = :id RETURNING *
        `, {
          replacements: {
            id: body.id, label: body.label || null,
            minP: body.min_percent ?? null, maxP: body.max_percent ?? null,
            score: body.score ?? null, color: body.color || null,
            mult: body.multiplier ?? null, sort: body.sort_order ?? null
          }
        });
        if (rows.length === 0) return res.status(404).json(errorResponse(ErrorCodes.NOT_FOUND, 'Level not found'));
        return res.status(HttpStatus.OK).json(successResponse(rows[0], undefined, 'Level updated'));
      }

      return res.status(400).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Unknown PUT type'));
    }

    // ── DELETE ──
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'id is required'));

      if (type === 'template') {
        await sequelize.query('DELETE FROM kpi_templates WHERE id = :id', { replacements: { id } });
        return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Template deleted'));
      }
      if (type === 'scheme') {
        await sequelize.query('DELETE FROM kpi_scoring_levels WHERE scheme_id = :id', { replacements: { id } });
        await sequelize.query('DELETE FROM kpi_scoring_schemes WHERE id = :id', { replacements: { id } });
        return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Scheme deleted'));
      }
      if (type === 'level') {
        await sequelize.query('DELETE FROM kpi_scoring_levels WHERE id = :id', { replacements: { id } });
        return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Level deleted'));
      }
      return res.status(400).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Unknown DELETE type'));
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${method} Not Allowed`));
  } catch (error: any) {
    console.error('[kpi-settings API]', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Internal server error'));
  }
}

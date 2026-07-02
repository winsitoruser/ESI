/**
 * KPI Templates API - Real DB
 *
 * GET  [?category=]  - List templates + scoring schemes + categories
 * POST               - Create template
 * PUT                - Update template
 * DELETE ?id=        - Delete template
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { KPI_CATEGORIES, STANDARD_SCORING_LEVELS } from '../../../../lib/hq/kpi-calculator';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';

const sequelize = require('../../../../lib/sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;

    switch (req.method) {
      case 'GET':
        return getTemplates(req, res, tenantId);
      case 'POST':
        return createTemplate(req, res, tenantId);
      case 'PUT':
        return updateTemplate(req, res, tenantId);
      case 'DELETE':
        return deleteTemplate(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error: any) {
    console.error('[kpi-templates API]', error.message);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Internal server error')
    );
  }
}

async function getTemplates(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { category } = req.query;

  let where = 'WHERE (t.tenant_id = :tid OR t.tenant_id IS NULL)';
  const repl: any = { tid: tenantId };
  if (category && category !== 'all') { where += ' AND t.category = :cat'; repl.cat = category; }

  const [templates] = await sequelize.query(`
    SELECT t.id, t.code, t.name, t.description, t.category, t.unit,
      t.data_type as "dataType", t.formula_type as "formulaType", t.formula,
      t.scoring_method as "scoringMethod", t.scoring_scale as "scoringScale",
      t.default_target as "defaultTarget", t.default_weight as "defaultWeight",
      t.measurement_frequency as "measurementFrequency",
      t.applicable_to as "applicableTo", t.parameters, t.is_active as "isActive",
      t.created_at, t.updated_at
    FROM kpi_templates t ${where}
    ORDER BY t.category, t.name
  `, { replacements: repl });

  // Fetch scoring schemes from DB
  const [schemes] = await sequelize.query(`
    SELECT s.id, s.name, s.description, s.is_default as "isDefault", s.is_active as "isActive"
    FROM kpi_scoring_schemes s
    WHERE (s.tenant_id = :tid OR s.tenant_id IS NULL) AND s.is_active = true
    ORDER BY s.is_default DESC, s.name
  `, { replacements: { tid: tenantId } });

  for (const scheme of schemes) {
    const [levels] = await sequelize.query(`
      SELECT level, label, min_percent as "minPercent", max_percent as "maxPercent",
        score, color, multiplier, sort_order as "sortOrder"
      FROM kpi_scoring_levels WHERE scheme_id = :sid ORDER BY sort_order, min_percent
    `, { replacements: { sid: scheme.id } });
    scheme.levels = levels;
  }

  // Build summary
  const byCategory = Object.keys(KPI_CATEGORIES).map(cat => ({
    category: cat,
    count: templates.filter((t: any) => t.category === cat).length
  }));

  return res.status(HttpStatus.OK).json(
    successResponse({
      templates,
      categories: KPI_CATEGORIES,
      scoringSchemes: schemes,
      standardLevels: STANDARD_SCORING_LEVELS,
      summary: {
        totalTemplates: templates.length,
        byCategory
      }
    })
  );
}

async function createTemplate(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const body = req.body;

  if (!body.code || !body.name || !body.category) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Code, name, and category are required')
    );
  }

  // Check for duplicate code
  const [existing] = await sequelize.query(
    'SELECT id FROM kpi_templates WHERE code = :code AND (tenant_id = :tid OR tenant_id IS NULL)',
    { replacements: { code: body.code, tid: tenantId } }
  );
  if (existing.length > 0) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Template code already exists')
    );
  }

  const [rows] = await sequelize.query(`
    INSERT INTO kpi_templates (tenant_id, code, name, description, category, unit, data_type,
      formula_type, formula, default_weight, measurement_frequency, applicable_to, parameters, is_active)
    VALUES (:tid, :code, :name, :desc, :cat, :unit, :dataType, :formulaType, :formula,
      :defaultWeight, :freq, :applicableTo, :params, true)
    RETURNING *
  `, {
    replacements: {
      tid: tenantId, code: body.code, name: body.name, desc: body.description || '',
      cat: body.category, unit: body.unit || '%', dataType: body.dataType || 'number',
      formulaType: body.formulaType || 'simple', formula: body.formula || '(actual / target) * 100',
      defaultWeight: body.defaultWeight || 100, freq: body.measurementFrequency || 'monthly',
      applicableTo: JSON.stringify(body.applicableTo || ['all']),
      params: JSON.stringify(body.parameters || [])
    }
  });

  return res.status(HttpStatus.CREATED).json(
    successResponse(rows[0], undefined, 'KPI template created successfully')
  );
}

async function updateTemplate(req: NextApiRequest, res: NextApiResponse, tenantId: string | null) {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Template ID is required')
    );
  }

  const [rows] = await sequelize.query(`
    UPDATE kpi_templates SET
      name = COALESCE(:name, name), description = COALESCE(:desc, description),
      category = COALESCE(:cat, category), unit = COALESCE(:unit, unit),
      data_type = COALESCE(:dataType, data_type), formula_type = COALESCE(:formulaType, formula_type),
      formula = COALESCE(:formula, formula), default_weight = COALESCE(:defaultWeight, default_weight),
      measurement_frequency = COALESCE(:freq, measurement_frequency),
      is_active = COALESCE(:isActive, is_active), updated_at = NOW()
    WHERE id = :id RETURNING *
  `, {
    replacements: {
      id, name: updates.name || null, desc: updates.description || null,
      cat: updates.category || null, unit: updates.unit || null,
      dataType: updates.dataType || null, formulaType: updates.formulaType || null,
      formula: updates.formula || null, defaultWeight: updates.defaultWeight ?? null,
      freq: updates.measurementFrequency || null, isActive: updates.isActive ?? null
    }
  });

  if (rows.length === 0) {
    return res.status(HttpStatus.NOT_FOUND).json(
      errorResponse(ErrorCodes.NOT_FOUND, 'Template not found')
    );
  }

  return res.status(HttpStatus.OK).json(
    successResponse(rows[0], undefined, 'KPI template updated successfully')
  );
}

async function deleteTemplate(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Template ID is required')
    );
  }

  const [deleted] = await sequelize.query('DELETE FROM kpi_templates WHERE id = :id RETURNING id', { replacements: { id } });
  if (deleted.length === 0) {
    return res.status(HttpStatus.NOT_FOUND).json(
      errorResponse(ErrorCodes.NOT_FOUND, 'Template not found')
    );
  }

  return res.status(HttpStatus.OK).json(
    successResponse(null, undefined, 'KPI template deleted successfully')
  );
}

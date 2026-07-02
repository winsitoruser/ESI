import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../../lib/api/response';
import { withHQAuth } from '../../../../../lib/middleware/withHQAuth';
import { getTemplatesFromTenant, saveTemplatesToTenant } from '../index';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
      errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
    );
  }

  try {
    const session: any = (req as any).session;
    const tenantId: string | null = session?.user?.tenantId || null;
    if (!tenantId) {
      return res.status(HttpStatus.FORBIDDEN).json(
        errorResponse(ErrorCodes.FORBIDDEN, 'No tenant associated with this user')
      );
    }

    const { id } = req.query;
    const templateId = String(id);
    const { branchIds, overwrite } = req.body || {};

    if (!Array.isArray(branchIds) || branchIds.length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, 'branchIds (array) is required')
      );
    }

    const templates = await getTemplatesFromTenant(tenantId);
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      return res.status(HttpStatus.NOT_FOUND).json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Template not found')
      );
    }

    const { Branch } = require('../../../../../models');
    const branches = await Branch.findAll({ where: { id: branchIds, tenantId } });

    if (branches.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json(
        errorResponse(ErrorCodes.NOT_FOUND, 'No matching branches found')
      );
    }

    const appliedIds: string[] = [];
    for (const b of branches) {
      const current = (b.settings && typeof b.settings === 'object') ? b.settings : {};
      const merged = overwrite
        ? { ...current, [template.category]: { ...(template.settings || {}) } }
        : { ...current, [template.category]: { ...((current as any)[template.category] || {}), ...(template.settings || {}) } };
      await b.update({ settings: merged });
      appliedIds.push(b.id);
    }

    const nextTemplates = templates.map(t =>
      t.id === templateId
        ? { ...t, appliedBranches: appliedIds.length, updatedAt: new Date().toISOString() }
        : t
    );
    await saveTemplatesToTenant(tenantId, nextTemplates);

    return res.status(HttpStatus.OK).json(
      successResponse(
        { templateId, appliedBranches: appliedIds.length, branchIds: appliedIds },
        undefined,
        `Template diterapkan ke ${appliedIds.length} cabang`
      )
    );
  } catch (error: any) {
    console.error('[branch-settings/apply] error:', error?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error?.message || 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'branches' });

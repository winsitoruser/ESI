import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTemplatesFromTenant, saveTemplatesToTenant } from './index';

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const templates = await getTemplatesFromTenant(tenantId);
    const idx = templates.findIndex(t => t.id === templateId);

    if (req.method === 'GET') {
      if (idx === -1) {
        return res.status(HttpStatus.NOT_FOUND).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Template not found')
        );
      }
      return res.status(HttpStatus.OK).json(successResponse({ template: templates[idx] }));
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (idx === -1) {
        return res.status(HttpStatus.NOT_FOUND).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Template not found')
        );
      }
      const existing = templates[idx];
      const body = req.body || {};
      const updated = {
        ...existing,
        name: typeof body.name === 'string' ? body.name : existing.name,
        description: typeof body.description === 'string' ? body.description : existing.description,
        category: typeof body.category === 'string' ? body.category : existing.category,
        industry: typeof body.industry === 'string' ? body.industry : existing.industry,
        settings: body.settings && typeof body.settings === 'object' ? body.settings : existing.settings,
        isDefault: typeof body.isDefault === 'boolean' ? body.isDefault : existing.isDefault,
        updatedAt: new Date().toISOString(),
      };
      const next = [...templates];
      next[idx] = updated;
      await saveTemplatesToTenant(tenantId, next);
      return res.status(HttpStatus.OK).json(successResponse({ template: updated }, undefined, 'Template updated'));
    }

    if (req.method === 'DELETE') {
      if (idx === -1) {
        return res.status(HttpStatus.NOT_FOUND).json(
          errorResponse(ErrorCodes.NOT_FOUND, 'Template not found')
        );
      }
      if (templates[idx].isDefault) {
        return res.status(HttpStatus.CONFLICT).json(
          errorResponse(ErrorCodes.CONFLICT, 'Cannot delete default template')
        );
      }
      const next = templates.filter(t => t.id !== templateId);
      await saveTemplatesToTenant(tenantId, next);
      return res.status(HttpStatus.OK).json(successResponse({ id: templateId }, undefined, 'Template deleted'));
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
      errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
    );
  } catch (error: any) {
    console.error('[branch-settings/[id]] error:', error?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error?.message || 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'branches' });

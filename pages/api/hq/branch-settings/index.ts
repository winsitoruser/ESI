import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

interface BranchSettingTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry?: string;
  settings: Record<string, any>;
  appliedBranches: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const SETTINGS_KEY = 'branchSettingTemplates';

const DEFAULT_TEMPLATES: BranchSettingTemplate[] = [
  {
    id: 'tpl-operations-default',
    name: 'Template Standar Retail',
    description: 'Pengaturan default untuk cabang retail',
    category: 'operations',
    industry: 'retail',
    settings: {
      openingTime: '08:00',
      closingTime: '21:00',
      maxCashInDrawer: 5000000,
      autoLogoutMinutes: 30,
      requireManagerApproval: true,
    },
    appliedBranches: 0,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-notifications-default',
    name: 'Notifikasi Default',
    description: 'Pengaturan notifikasi standar untuk semua cabang',
    category: 'notifications',
    industry: 'general',
    settings: {
      lowStockAlert: true,
      lowStockThreshold: 10,
      dailyReportEmail: true,
      voidAlertToManager: true,
      salesTargetAlert: true,
    },
    appliedBranches: 0,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-security-default',
    name: 'Keamanan Standar',
    description: 'Pengaturan keamanan default untuk semua cabang',
    category: 'security',
    industry: 'general',
    settings: {
      requirePinForVoid: true,
      requirePinForDiscount: true,
      maxLoginAttempts: 5,
      sessionTimeout: 30,
      twoFactorRequired: false,
    },
    appliedBranches: 0,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function loadTenant(tenantId: string) {
  const { Tenant } = require('../../../../models');
  const tenant = await Tenant.findByPk(tenantId);
  return tenant;
}

export async function getTemplatesFromTenant(tenantId: string): Promise<BranchSettingTemplate[]> {
  const tenant = await loadTenant(tenantId);
  if (!tenant) return [];
  const settings = (tenant.settings && typeof tenant.settings === 'object') ? tenant.settings : {};
  const list = Array.isArray(settings[SETTINGS_KEY]) ? settings[SETTINGS_KEY] : null;
  if (list && list.length) return list as BranchSettingTemplate[];
  await tenant.update({ settings: { ...settings, [SETTINGS_KEY]: DEFAULT_TEMPLATES } });
  return DEFAULT_TEMPLATES;
}

export async function saveTemplatesToTenant(tenantId: string, templates: BranchSettingTemplate[]) {
  const tenant = await loadTenant(tenantId);
  if (!tenant) throw new Error('Tenant not found');
  const settings = (tenant.settings && typeof tenant.settings === 'object') ? tenant.settings : {};
  await tenant.update({ settings: { ...settings, [SETTINGS_KEY]: templates } });
}

function resolveTenantId(req: NextApiRequest): string | null {
  const session: any = (req as any).session;
  return session?.user?.tenantId || null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return res.status(HttpStatus.FORBIDDEN).json(
        errorResponse(ErrorCodes.FORBIDDEN, 'No tenant associated with this user')
      );
    }

    switch (req.method) {
      case 'GET': {
        const { category, industry, search } = req.query;
        let templates = await getTemplatesFromTenant(tenantId);
        if (category && category !== 'all') templates = templates.filter(t => t.category === category);
        if (industry && industry !== 'all') templates = templates.filter(t => !t.industry || t.industry === industry || t.industry === 'general');
        if (search && typeof search === 'string' && search.trim()) {
          const q = search.toLowerCase();
          templates = templates.filter(t => t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
        }
        return res.status(HttpStatus.OK).json(
          successResponse({ templates }, { total: templates.length })
        );
      }
      case 'POST': {
        const { name, description, category, industry, settings, isDefault } = req.body || {};
        if (!name || !category) {
          return res.status(HttpStatus.BAD_REQUEST).json(
            errorResponse(ErrorCodes.VALIDATION_ERROR, 'Name and category are required')
          );
        }
        const templates = await getTemplatesFromTenant(tenantId);
        const now = new Date().toISOString();
        const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newTemplate: BranchSettingTemplate = {
          id,
          name,
          description: description || '',
          category,
          industry: industry || 'general',
          settings: settings && typeof settings === 'object' ? settings : {},
          appliedBranches: 0,
          isDefault: !!isDefault,
          createdAt: now,
          updatedAt: now,
        };
        const updated = [...templates, newTemplate];
        await saveTemplatesToTenant(tenantId, updated);
        return res.status(HttpStatus.CREATED).json(
          successResponse({ template: newTemplate }, undefined, 'Template created successfully')
        );
      }
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error: any) {
    console.error('[branch-settings] error:', error?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error?.message || 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'branches' });

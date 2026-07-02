import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

/**
 * GET /api/modules/status
 * Returns the list of enabled modules for the current tenant.
 * Used by frontend pages to conditionally show/hide module-specific UI.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user as any).role;
    const tenantId = (session.user as any).tenantId;

    // Super admin and owner have all modules enabled
    if (userRole === 'super_admin' || userRole === 'owner') {
      return res.json({
        success: true,
        enabledModules: [
          { code: 'crm', name: 'CRM' },
          { code: 'sfa', name: 'SFA' },
          { code: 'helpdesk', name: 'Help Desk' },
          { code: 'marketing', name: 'Marketing' },
        ],
        allEnabled: true
      });
    }

    if (!tenantId) {
      // No tenant = return all modules as enabled (dev/setup mode)
      return res.json({
        success: true,
        enabledModules: [
          { code: 'crm', name: 'CRM' },
          { code: 'sfa', name: 'SFA' },
          { code: 'helpdesk', name: 'Help Desk' },
          { code: 'marketing', name: 'Marketing' },
        ],
        allEnabled: true
      });
    }

    // Try to fetch from TenantModule table
    let TenantModule: any, Module: any;
    try {
      const db = require('../../../models');
      TenantModule = db.TenantModule;
      Module = db.Module;
    } catch {
      // Models not available — return all enabled
      return res.json({
        success: true,
        enabledModules: [
          { code: 'crm', name: 'CRM' },
          { code: 'sfa', name: 'SFA' },
          { code: 'helpdesk', name: 'Help Desk' },
          { code: 'marketing', name: 'Marketing' },
        ],
        allEnabled: true
      });
    }

    if (!TenantModule || !Module) {
      return res.json({
        success: true,
        enabledModules: [
          { code: 'crm', name: 'CRM' },
          { code: 'sfa', name: 'SFA' },
          { code: 'helpdesk', name: 'Help Desk' },
          { code: 'marketing', name: 'Marketing' },
        ],
        allEnabled: true
      });
    }

    const enabledRows = await TenantModule.findAll({
      where: { tenantId, isEnabled: true },
      include: [{ model: Module, as: 'module', where: { isActive: true } }]
    });

    const enabledModules = enabledRows.map((row: any) => ({
      code: row.module?.code?.toLowerCase() || '',
      name: row.module?.name || ''
    }));

    return res.json({
      success: true,
      enabledModules,
      allEnabled: false
    });
  } catch (error: any) {
    console.error('Module status error:', error);
    // On error, return all modules as enabled to not block users
    return res.json({
      success: true,
      enabledModules: [
        { code: 'crm', name: 'CRM' },
        { code: 'sfa', name: 'SFA' },
        { code: 'marketing', name: 'Marketing' },
      ],
      allEnabled: true
    });
  }
}

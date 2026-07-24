import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const db = require('../../../models');

function degradedConfig(session: any, reason?: string) {
  const role = session?.user?.role || '';
  const isSuperAdmin = role === 'super_admin' || role === 'owner';
  return {
    success: true,
    degraded: true,
    reason: reason || undefined,
    isSuperAdmin,
    businessType: isSuperAdmin ? (role === 'super_admin' ? 'super_admin' : 'owner') : null,
    businessTypeName: isSuperAdmin
      ? (role === 'super_admin' ? 'Super Administrator' : 'Owner - Full Access')
      : null,
    modules: [] as any[],
    tenant: null as any,
    needsOnboarding: false,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let session: any = null;
  try {
    session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { User, Tenant, BusinessType, TenantModule, Module } = db;

    // Humanify SaaS DB may lack Bedagang `business_types` — never nest that include.
    const user = await User.findOne({
      where: { email: session.user.email },
      include: [{
        model: Tenant,
        as: 'tenant',
        required: false,
      }],
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // SUPER ADMIN or OWNER - Return all modules (best-effort)
    if (user.role === 'super_admin' || user.role === 'owner') {
      let modules: any[] = [];
      try {
        const allModules = await Module.findAll({
          where: { isActive: true },
          order: [['sortOrder', 'ASC']],
        });
        modules = allModules.map((m: any) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          description: m.description,
          icon: m.icon,
          route: m.route,
          sortOrder: m.sortOrder,
          isCore: m.isCore,
          isEnabled: true,
        }));
      } catch {
        // modules table may be absent on Humanify-only DBs
      }

      return res.status(200).json({
        success: true,
        isSuperAdmin: true,
        businessType: user.role === 'super_admin' ? 'super_admin' : 'owner',
        businessTypeName: user.role === 'super_admin' ? 'Super Administrator' : 'Owner - Full Access',
        modules,
        tenant: user.tenant || null,
        needsOnboarding: false,
      });
    }

    if (!user.tenant) {
      return res.status(200).json({
        success: true,
        businessType: null,
        businessTypeName: null,
        modules: [],
        tenant: null,
        needsOnboarding: true,
      });
    }

    let businessType: any = null;
    try {
      const btId = user.tenant.businessTypeId || user.tenant.business_type_id;
      if (btId && BusinessType) {
        businessType = await BusinessType.findByPk(btId);
      }
    } catch {
      businessType = null;
    }

    if (!businessType) {
      return res.status(200).json({
        success: true,
        businessType: null,
        businessTypeName: null,
        modules: [],
        tenant: {
          id: user.tenant.id,
          name: user.tenant.businessName || user.tenant.name,
          setupCompleted: user.tenant.setupCompleted ?? true,
        },
        needsOnboarding: !(user.tenant.setupCompleted ?? true),
      });
    }

    let modules: any[] = [];
    try {
      const tenantModules = await TenantModule.findAll({
        where: {
          tenantId: user.tenant.id,
          isEnabled: true,
        },
        include: [{
          model: Module,
          as: 'module',
        }],
        order: [[{ model: Module, as: 'module' }, 'sortOrder', 'ASC']],
      });

      modules = tenantModules.map((tm: any) => ({
        id: tm.module.id,
        code: tm.module.code,
        name: tm.module.name,
        description: tm.module.description,
        icon: tm.module.icon,
        route: tm.module.route,
        sortOrder: tm.module.sortOrder,
        isCore: tm.module.isCore,
        isEnabled: tm.isEnabled,
      }));
    } catch {
      modules = [];
    }

    return res.status(200).json({
      success: true,
      businessType: businessType.code,
      businessTypeName: businessType.name,
      modules,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.businessName,
        address: user.tenant.businessAddress,
        phone: user.tenant.businessPhone,
        email: user.tenant.businessEmail,
        setupCompleted: user.tenant.setupCompleted,
        onboardingStep: user.tenant.onboardingStep,
      },
      needsOnboarding: !user.tenant.setupCompleted,
    });
  } catch (error: any) {
    console.warn('Business config error: (table may not exist):', error?.message, error?.original?.message || '');
    // Soft-fail so ESS/Humanify portals are not flooded with HTTP 500 noise.
    return res.status(200).json(degradedConfig(session, error?.original?.message || error?.message));
  }
}

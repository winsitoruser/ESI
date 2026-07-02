import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

const db = require('@/models');

interface ModuleAccessResult {
  hasAccess: boolean;
  error?: string;
}

export async function checkModuleAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  moduleCode: string
): Promise<ModuleAccessResult> {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return { hasAccess: false, error: 'Unauthorized' };
    }

    const { User, Tenant, TenantModule, Module } = db;
    
    // Get user with tenant
    const user = await User.findOne({
      where: { email: session.user.email },
      include: [{
        model: Tenant,
        as: 'tenant'
      }]
    });

    if (!user) {
      return { hasAccess: false, error: 'User not found' };
    }

    // SUPER ADMIN BYPASS - Full access to all modules
    if (user.role === 'super_admin') {
      return { hasAccess: true };
    }

    if (!user.tenant) {
      return { hasAccess: false, error: 'Tenant not found' };
    }

    // Get module by code
    const module = await Module.findOne({ 
      where: { code: moduleCode } 
    });
    
    if (!module) {
      return { hasAccess: false, error: 'Module not found' };
    }

    // Check if tenant has this module enabled
    const tenantModule = await TenantModule.findOne({
      where: {
        tenantId: user.tenant.id,
        moduleId: module.id,
        isEnabled: true
      }
    });

    if (!tenantModule) {
      return { 
        hasAccess: false, 
        error: `Module '${moduleCode}' is not enabled for this tenant` 
      };
    }

    return { hasAccess: true };

  } catch (error) {
    console.error('Module access check error:', error);
    return { 
      hasAccess: false, 
      error: 'Failed to check module access' 
    };
  }
}

// Helper function to create a middleware wrapper
export function withModuleAccess(moduleCode: string) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void
  ) => {
    const accessCheck = await checkModuleAccess(req, res, moduleCode);
    
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: accessCheck.error || 'Access denied'
      });
    }
    
    return next();
  };
}

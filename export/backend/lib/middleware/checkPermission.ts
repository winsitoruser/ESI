import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

const User = require('@/models/User');
const Role = require('@/models/Role');

export interface PermissionCheckResult {
  authorized: boolean;
  user?: any;
  permissions?: Record<string, boolean>;
  error?: string;
}

/**
 * Check if user has specific permission
 */
export async function checkPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredPermission: string
): Promise<PermissionCheckResult> {
  try {
    // Get session
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.email) {
      return {
        authorized: false,
        error: 'Unauthorized: No active session'
      };
    }

    // Get user with role details
    const user = await User.findOne({
      where: { email: session.user.email },
      include: [{
        model: Role,
        as: 'roleDetails',
        attributes: ['id', 'name', 'description', 'permissions']
      }]
    });

    if (!user) {
      return {
        authorized: false,
        error: 'User not found'
      };
    }

    // Get permissions from role
    const permissions = user.roleDetails?.permissions || {};

    // Check if user has required permission
    if (!permissions[requiredPermission]) {
      return {
        authorized: false,
        user,
        permissions,
        error: `Forbidden: Missing permission '${requiredPermission}'`
      };
    }

    return {
      authorized: true,
      user,
      permissions
    };

  } catch (error: any) {
    console.error('Permission check error:', error);
    return {
      authorized: false,
      error: 'Internal server error during permission check'
    };
  }
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(permission: string) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => void
  ) => {
    const result = await checkPermission(req, res, permission);

    if (!result.authorized) {
      return res.status(result.error?.includes('Unauthorized') ? 401 : 403).json({
        success: false,
        error: result.error
      });
    }

    // Attach user and permissions to request for later use
    (req as any).user = result.user;
    (req as any).permissions = result.permissions;

    next();
  };
}

/**
 * Check if user has any of the required permissions
 */
export async function checkAnyPermission(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredPermissions: string[]
): Promise<PermissionCheckResult> {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.email) {
      return {
        authorized: false,
        error: 'Unauthorized: No active session'
      };
    }

    const user = await User.findOne({
      where: { email: session.user.email },
      include: [{
        model: Role,
        as: 'roleDetails',
        attributes: ['id', 'name', 'description', 'permissions']
      }]
    });

    if (!user) {
      return {
        authorized: false,
        error: 'User not found'
      };
    }

    const permissions = user.roleDetails?.permissions || {};

    // Check if user has any of the required permissions
    const hasAnyPermission = requiredPermissions.some(perm => permissions[perm]);

    if (!hasAnyPermission) {
      return {
        authorized: false,
        user,
        permissions,
        error: `Forbidden: Missing any of permissions: ${requiredPermissions.join(', ')}`
      };
    }

    return {
      authorized: true,
      user,
      permissions
    };

  } catch (error: any) {
    console.error('Permission check error:', error);
    return {
      authorized: false,
      error: 'Internal server error during permission check'
    };
  }
}

/**
 * Check if user has all of the required permissions
 */
export async function checkAllPermissions(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredPermissions: string[]
): Promise<PermissionCheckResult> {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.email) {
      return {
        authorized: false,
        error: 'Unauthorized: No active session'
      };
    }

    const user = await User.findOne({
      where: { email: session.user.email },
      include: [{
        model: Role,
        as: 'roleDetails',
        attributes: ['id', 'name', 'description', 'permissions']
      }]
    });

    if (!user) {
      return {
        authorized: false,
        error: 'User not found'
      };
    }

    const permissions = user.roleDetails?.permissions || {};

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(perm => permissions[perm]);

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(perm => !permissions[perm]);
      return {
        authorized: false,
        user,
        permissions,
        error: `Forbidden: Missing permissions: ${missingPermissions.join(', ')}`
      };
    }

    return {
      authorized: true,
      user,
      permissions
    };

  } catch (error: any) {
    console.error('Permission check error:', error);
    return {
      authorized: false,
      error: 'Internal server error during permission check'
    };
  }
}

/**
 * Helper to get user permissions
 */
export async function getUserPermissions(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<Record<string, boolean>> {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user?.email) {
      return {};
    }

    const user = await User.findOne({
      where: { email: session.user.email },
      include: [{
        model: Role,
        as: 'roleDetails',
        attributes: ['permissions']
      }]
    });

    return user?.roleDetails?.permissions || {};

  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {};
  }
}

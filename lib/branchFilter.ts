import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Model types that support branch filtering
type BranchFilterableModel = 
  | 'PosTransaction'
  | 'StockMovement'
  | 'FinanceTransaction'
  | 'Production'
  | 'Shift'
  | 'ProductPrice'
  | 'KitchenOrder'
  | 'Reservation'
  | 'Table'
  | 'Warehouse'
  | 'Supplier';

// Models that should be filtered by tenant instead of branch
type TenantFilterableModel = 
  | 'User'
  | 'Branch'
  | 'Tenant'
  | 'Product'
  | 'Recipe'
  | 'Category'
  | 'Customer'
  | 'Employee';

export interface BranchFilterOptions {
  model: BranchFilterableModel | TenantFilterableModel;
  includeInactive?: boolean;
  bypassForRole?: string[]; // Roles that bypass branch filtering
}

/**
 * Middleware to automatically add branch/tenant filtering to API queries
 */
export async function applyBranchFilter(
  req: NextApiRequest,
  res: NextApiResponse,
  options: BranchFilterOptions
): Promise<{ whereClause: any; hasAccess: boolean }> {
  const session = await getServerSession(req, res, authOptions);
  
  // Default return for no session
  if (!session || !session.user) {
    return { whereClause: {}, hasAccess: false };
  }

  const { role, branchId, tenantId } = session.user;
  
  // Super Admin bypasses all filters
  if (role === 'super_admin') {
    return { whereClause: {}, hasAccess: true };
  }

  // Check if user's role bypasses branch filtering
  if (options.bypassForRole && options.bypassForRole.includes(role)) {
    return { whereClause: {}, hasAccess: true };
  }

  // Determine filter type based on model
  const tenantModels: TenantFilterableModel[] = [
    'User', 'Branch', 'Tenant', 'Product', 'Recipe', 
    'Category', 'Customer', 'Employee'
  ];

  if (tenantModels.includes(options.model as TenantFilterableModel)) {
    // Tenant-level filtering
    if (!tenantId) {
      return { whereClause: {}, hasAccess: false };
    }
    
    return {
      whereClause: { tenant_id: tenantId },
      hasAccess: true
    };
  } else {
    // Branch-level filtering
    if (!branchId) {
      return { whereClause: {}, hasAccess: false };
    }

    const fieldMap: Record<BranchFilterableModel, string> = {
      'PosTransaction': 'branchId',
      'StockMovement': 'branchId',
      'FinanceTransaction': 'branchId',
      'Production': 'branchId',
      'Shift': 'branchId',
      'ProductPrice': 'branchId',
      'KitchenOrder': 'tenantId', // Kitchen orders use tenantId for now
      'Reservation': 'branchId',
      'Table': 'branchId',
      'Warehouse': 'branchId',
      'Supplier': 'tenantId' // Suppliers can be shared across branches
    };

    const fieldName = fieldMap[options.model as BranchFilterableModel];
    
    // For ProductPrice, allow null (default prices) OR specific branch
    if (options.model === 'ProductPrice') {
      return {
        whereClause: {
          [fieldName]: { [require('sequelize').Op.or]: [null, branchId] }
        },
        hasAccess: true
      };
    }

    return {
      whereClause: { [fieldName]: branchId },
      hasAccess: true
    };
  }
}

/**
 * Helper to wrap API handlers with branch filtering
 */
export function withBranchFilter(
  options: BranchFilterableModel | BranchFilterOptions,
  handler: (req: NextApiRequest, res: NextApiResponse, filter: any) => Promise<void>
) {
  const filterOptions = typeof options === 'string' 
    ? { model: options } 
    : options;

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const filter = await applyBranchFilter(req, res, filterOptions);
    
    if (!filter.hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - insufficient permissions'
      });
    }

    return handler(req, res, filter);
  };
}

/**
 * Get accessible branches for a user
 */
export async function getUserBranches(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string[]> {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return [];
  }

  const { role, branchId, tenantId } = session.user;
  
  // Super Admin sees all branches
  if (role === 'super_admin') {
    const db = require('@/models');
    const branches = await db.Branch.findAll({
      attributes: ['id'],
      where: { isActive: true }
    });
    return branches.map((b: any) => b.id);
  }

  // Other roles see their assigned branch
  return branchId ? [branchId] : [];
}

/**
 * Check if user can access specific branch
 */
export async function canAccessBranch(
  req: NextApiRequest,
  res: NextApiResponse,
  branchId: string
): Promise<boolean> {
  const accessibleBranches = await getUserBranches(req, res);
  return accessibleBranches.includes(branchId);
}

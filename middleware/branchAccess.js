/**
 * Branch Access Middleware
 * 
 * Validates that users have proper access to specific branches.
 * Ensures branch belongs to user's tenant and user has permission.
 * 
 * Usage:
 * - Apply to branch-specific routes
 * - Validates branch ownership
 * - Checks user permissions for branch operations
 */

const getDb = () => require('../models');

/**
 * Validate branch access for current user
 */
async function validateBranchAccess(req, res, next) {
  try {
    const db = getDb();
    const branchId = req.params.id || req.params.branchId || req.body.branchId;
    
    if (!branchId) {
      return res.status(400).json({ 
        error: 'Branch ID required',
        code: 'BRANCH_ID_REQUIRED'
      });
    }
    
    // Get branch with tenant
    const branch = await db.Branch.findByPk(branchId, {
      include: [{
        model: db.Tenant,
        as: 'tenant',
        attributes: ['id', 'code', 'name']
      }]
    });
    
    if (!branch) {
      return res.status(404).json({ 
        error: 'Branch not found',
        code: 'BRANCH_NOT_FOUND'
      });
    }
    
    // Super admin can access all branches
    if (req.isSuperAdmin) {
      req.branch = branch;
      return next();
    }
    
    // Check if branch belongs to user's tenant
    if (branch.tenantId !== req.tenantId) {
      return res.status(403).json({ 
        error: 'Branch does not belong to your tenant',
        code: 'BRANCH_ACCESS_DENIED'
      });
    }
    
    // Check if branch is active
    if (!branch.isActive) {
      return res.status(403).json({ 
        error: 'Branch is not active',
        code: 'BRANCH_INACTIVE'
      });
    }
    
    // Inject branch into request
    req.branch = branch;
    req.branchId = branchId;
    
    next();
  } catch (error) {
    console.error('Branch access middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Check if user is assigned to specific branch
 */
async function requireBranchAssignment(req, res, next) {
  try {
    const db = getDb();
    
    // Super admin and owners can access all branches in their tenant
    if (req.isSuperAdmin || req.userRole === 'owner') {
      return next();
    }
    
    const user = await db.User.findByPk(req.userId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if user is assigned to this branch
    if (user.assignedBranchId !== req.branchId) {
      return res.status(403).json({ 
        error: 'You are not assigned to this branch',
        code: 'BRANCH_NOT_ASSIGNED'
      });
    }
    
    next();
  } catch (error) {
    console.error('Branch assignment check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Check if user is branch manager
 */
async function requireBranchManager(req, res, next) {
  try {
    const db = getDb();
    
    // Super admin can manage all branches
    if (req.isSuperAdmin) {
      return next();
    }
    
    const branch = req.branch || await db.Branch.findByPk(req.branchId);
    
    if (!branch) {
      return res.status(404).json({ 
        error: 'Branch not found',
        code: 'BRANCH_NOT_FOUND'
      });
    }
    
    // Check if user is the branch manager
    if (branch.managerId !== req.userId) {
      return res.status(403).json({ 
        error: 'Branch manager access required',
        code: 'MANAGER_ACCESS_REQUIRED'
      });
    }
    
    next();
  } catch (error) {
    console.error('Branch manager check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Get all branches accessible by user
 */
async function getUserBranches(userId, tenantId, isSuperAdmin) {
  const db = getDb();
  
  if (isSuperAdmin) {
    // Super admin can access all branches
    return await db.Branch.findAll({
      where: tenantId ? { tenantId } : {},
      include: [{
        model: db.Tenant,
        as: 'tenant',
        attributes: ['id', 'code', 'name']
      }]
    });
  }
  
  const user = await db.User.findByPk(userId, {
    include: [{
      model: db.Branch,
      as: 'managedBranches'
    }]
  });
  
  if (!user) {
    return [];
  }
  
  // If user is owner, return all branches in tenant
  if (user.role === 'owner') {
    return await db.Branch.findAll({
      where: { tenantId },
      include: [{
        model: db.Tenant,
        as: 'tenant',
        attributes: ['id', 'code', 'name']
      }]
    });
  }
  
  // If user is manager, return managed branches
  if (user.managedBranches && user.managedBranches.length > 0) {
    return user.managedBranches;
  }
  
  // Otherwise, return only assigned branch
  if (user.assignedBranchId) {
    const branch = await db.Branch.findByPk(user.assignedBranchId, {
      include: [{
        model: db.Tenant,
        as: 'tenant',
        attributes: ['id', 'code', 'name']
      }]
    });
    return branch ? [branch] : [];
  }
  
  return [];
}

/**
 * Add branch filter to where clause based on user access
 */
async function addBranchFilter(where = {}, req) {
  if (req.isSuperAdmin && !req.branchId) {
    // Super admin without specific branch - no filter
    return where;
  }
  
  const branches = await getUserBranches(req.userId, req.tenantId, req.isSuperAdmin);
  const branchIds = branches.map(b => b.id);
  
  if (branchIds.length === 0) {
    // User has no branch access - return impossible condition
    return {
      ...where,
      id: null
    };
  }
  
  if (branchIds.length === 1) {
    return {
      ...where,
      branchId: branchIds[0]
    };
  }
  
  return {
    ...where,
    branchId: { [require('sequelize').Op.in]: branchIds }
  };
}

module.exports = {
  validateBranchAccess,
  requireBranchAssignment,
  requireBranchManager,
  getUserBranches,
  addBranchFilter
};

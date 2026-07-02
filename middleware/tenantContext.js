/**
 * Tenant Context Middleware
 * 
 * Automatically injects tenant context into requests based on authenticated user.
 * Ensures all queries are filtered by tenant to prevent cross-tenant data access.
 * 
 * Usage:
 * - Apply to all HQ and tenant-specific routes
 * - Extracts tenantId from authenticated user
 * - Validates tenant access
 * - Injects req.tenantId for use in controllers
 */

const getDb = () => require('../models');

/**
 * Extract tenant from authenticated user
 */
async function tenantContext(req, res, next) {
  try {
    const db = getDb();
    
    // Get user from session/token
    // This assumes you're using NextAuth or similar
    let userId = null;
    
    // Try to get from NextAuth session
    if (req.session?.user?.id) {
      userId = req.session.user.id;
    }
    
    // Try to get from custom auth header
    if (!userId && req.headers['x-user-id']) {
      userId = req.headers['x-user-id'];
    }
    
    // Try to get from query (for testing only, remove in production)
    if (!userId && req.query.userId && process.env.NODE_ENV === 'development') {
      userId = req.query.userId;
    }
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Get user with tenant information
    const user = await db.User.findByPk(userId, {
      include: [{
        model: db.Tenant,
        as: 'tenant',
        attributes: ['id', 'code', 'name', 'status', 'isActive']
      }]
    });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Super admin can access all tenants
    if (user.role === 'super_admin') {
      req.isSuperAdmin = true;
      req.userId = user.id;
      req.userRole = user.role;
      
      // Super admin can optionally specify tenant via header or query
      const targetTenantId = req.headers['x-tenant-id'] || req.query.tenantId;
      if (targetTenantId) {
        const tenant = await db.Tenant.findByPk(targetTenantId);
        if (!tenant) {
          return res.status(404).json({ 
            error: 'Tenant not found',
            code: 'TENANT_NOT_FOUND'
          });
        }
        req.tenantId = targetTenantId;
        req.tenant = tenant;
      }
      
      return next();
    }
    
    // Regular users must have a tenant
    if (!user.tenantId) {
      return res.status(403).json({ 
        error: 'User not associated with any tenant',
        code: 'NO_TENANT'
      });
    }
    
    // Check if tenant is active
    if (user.tenant && !user.tenant.isActive) {
      return res.status(403).json({ 
        error: 'Tenant is not active',
        code: 'TENANT_INACTIVE'
      });
    }
    
    // Check tenant subscription status
    if (user.tenant && user.tenant.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Tenant subscription is suspended',
        code: 'TENANT_SUSPENDED'
      });
    }
    
    // Inject tenant context into request
    req.tenantId = user.tenantId;
    req.tenant = user.tenant;
    req.userId = user.id;
    req.userRole = user.role;
    req.isSuperAdmin = false;
    
    next();
  } catch (error) {
    console.error('Tenant context middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Require tenant context (fail if no tenant)
 */
function requireTenant(req, res, next) {
  if (!req.tenantId && !req.isSuperAdmin) {
    return res.status(403).json({ 
      error: 'Tenant context required',
      code: 'TENANT_REQUIRED'
    });
  }
  next();
}

/**
 * Require super admin role
 */
function requireSuperAdmin(req, res, next) {
  if (!req.isSuperAdmin) {
    return res.status(403).json({ 
      error: 'Super admin access required',
      code: 'SUPER_ADMIN_REQUIRED'
    });
  }
  next();
}

/**
 * Add tenant filter to Sequelize where clause
 */
function addTenantFilter(where = {}, req) {
  if (req.isSuperAdmin && !req.tenantId) {
    // Super admin without specific tenant - no filter
    return where;
  }
  
  return {
    ...where,
    tenantId: req.tenantId
  };
}

/**
 * Validate that a resource belongs to user's tenant
 */
async function validateTenantOwnership(model, resourceId, tenantId) {
  const db = getDb();
  const Model = db[model];
  
  if (!Model) {
    throw new Error(`Model ${model} not found`);
  }
  
  const resource = await Model.findByPk(resourceId);
  
  if (!resource) {
    return { valid: false, error: 'Resource not found' };
  }
  
  if (resource.tenantId !== tenantId) {
    return { valid: false, error: 'Resource does not belong to your tenant' };
  }
  
  return { valid: true, resource };
}

module.exports = {
  tenantContext,
  requireTenant,
  requireSuperAdmin,
  addTenantFilter,
  validateTenantOwnership
};

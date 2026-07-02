import { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, errorHandler } from '@/middleware/error-handler';
import { DatabaseService } from '@/services/database-service';
import sequelize from '@/lib/db';

/**
 * API Handler Type Definition
 */
export type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  context: ApiContext
) => Promise<void> | void;

/**
 * API Context with database service and tenant info
 */
export interface ApiContext {
  db: DatabaseService;
  tenantId: string | null;
  userId: string | null;
  userRole: string | null;
}

/**
 * Wraps an API handler with standard error handling, validation, and database access
 */
export function withApiHandler(handler: ApiHandler) {
  return errorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
    // Initialize database service if not already initialized
    const dbService = DatabaseService.getInstance();
    
    if (!dbService.isInitialized) {
      try {
        // Use the existing sequelize instance instead of initializing a new connection
        if (sequelize) {
          // Set the initialized flag without actual initialization
          // since we're using the existing Sequelize instance
          dbService.isInitialized = true;
        }
      } catch (error) {
        console.error('Failed to initialize database service:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'DB_INIT_ERROR',
            message: 'Database connection failed'
          }
        });
      }
    }
    
    // Extract tenant ID from headers or cookies
    const tenantId = extractTenantId(req);
    if (tenantId) {
      dbService.setTenantId(tenantId);
    }
    
    // Extract user ID and role from session or token
    const { userId, userRole } = extractUserInfo(req);
    
    // Create API context
    const context: ApiContext = {
      db: dbService,
      tenantId,
      userId,
      userRole
    };
    
    // Apply CORS headers for API requests
    applyCorsHeaders(req, res);
    
    // Execute the handler
    await handler(req, res, context);
  });
}

/**
 * Extract tenant ID from request
 */
function extractTenantId(req: NextApiRequest): string | null {
  // Try to get from headers
  const tenantId = req.headers['x-tenant-id'] as string;
  if (tenantId) return tenantId;
  
  // Try to get from cookies
  if (req.cookies.tenantId) return req.cookies.tenantId;
  
  // Try to get from session 
  // (assuming session is stored in req.session, may need adjustment based on your auth setup)
  const session = (req as any).session;
  if (session?.tenantId) return session.tenantId;
  
  return null;
}

/**
 * Extract user info from request
 */
function extractUserInfo(req: NextApiRequest): { userId: string | null; userRole: string | null } {
  // Default values
  let userId: string | null = null;
  let userRole: string | null = null;
  
  // Try to get from headers
  userId = (req.headers['x-user-id'] as string) || null;
  userRole = (req.headers['x-user-role'] as string) || null;
  
  // Try to get from session if not in headers
  // (adjust based on your auth setup)
  const session = (req as any).session;
  if (session) {
    userId = userId || session.userId || null;
    userRole = userRole || session.userRole || null;
  }
  
  return { userId, userRole };
}

/**
 * Apply CORS headers for API requests
 */
function applyCorsHeaders(req: NextApiRequest, res: NextApiResponse): void {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,OPTIONS,PATCH,DELETE,POST,PUT'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Tenant-Id, X-User-Id, X-User-Role, Authorization'
  );
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
}

/**
 * Parse request query parameters with validation
 */
export function parseQueryParams<T>(req: NextApiRequest, schema: Record<string, {
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  default?: any;
}>): T {
  const result: Record<string, any> = {};
  
  // Process each parameter according to schema
  for (const [key, config] of Object.entries(schema)) {
    let value = req.query[key];
    
    // For array parameters
    if (config.type === 'array' && typeof value === 'string') {
      value = value.split(',');
    } 
    // For number parameters
    else if (config.type === 'number' && value !== undefined) {
      value = Number(value);
      if (isNaN(value as number)) {
        throw new ApiError(400, `Invalid number format for parameter: ${key}`, 'VALIDATION_ERROR');
      }
    } 
    // For boolean parameters
    else if (config.type === 'boolean' && value !== undefined) {
      value = value === 'true' || value === '1';
    }
    
    // Check required parameters
    if (config.required && (value === undefined || value === '')) {
      throw new ApiError(400, `Missing required parameter: ${key}`, 'VALIDATION_ERROR');
    }
    
    // Apply default value if needed
    if (value === undefined && config.default !== undefined) {
      value = config.default;
    }
    
    // Add to result
    result[key] = value;
  }
  
  return result as T;
}

/**
 * Create a success response with standardized format
 */
export function success<T = any>(res: NextApiResponse, data: T, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

/**
 * Create an error response with standardized format
 */
export function error(
  res: NextApiResponse, 
  message: string, 
  statusCode: number = 500,
  errorCode: string = 'SERVER_ERROR',
  data?: any
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(data && { data })
    }
  });
}

/**
 * Check required permissions for API access
 */
export function checkPermissions(
  context: ApiContext,
  requiredRoles: string[] = [],
  requiredPermissions: string[] = []
): boolean {
  // If no roles or permissions required, allow access
  if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
    return true;
  }
  
  // If no user info, deny access
  if (!context.userId || !context.userRole) {
    return false;
  }
  
  // Check roles
  if (requiredRoles.length > 0 && !requiredRoles.includes(context.userRole)) {
    return false;
  }
  
  // TODO: Implement permission checking logic
  // This would require integration with your specific permission system
  
  return true;
}

/**
 * Validate API handler has required permissions
 */
export function withPermissions(handler: ApiHandler, requiredRoles: string[] = [], requiredPermissions: string[] = []) {
  return async (req: NextApiRequest, res: NextApiResponse, context: ApiContext) => {
    // Check permissions
    if (!checkPermissions(context, requiredRoles, requiredPermissions)) {
      throw new ApiError(403, 'Insufficient permissions', 'PERMISSION_ERROR');
    }
    
    // Call original handler
    return handler(req, res, context);
  };
}

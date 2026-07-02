/**
 * Security Middleware for API Routes
 * Provides authentication, authorization, rate limiting, and input validation
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Rate limiting store (in-memory, use Redis in production)
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

// Security configuration
const SECURITY_CONFIG = {
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    maxRequestsAuth: 200, // 200 requests for authenticated users
  },
  csrf: {
    enabled: true,
    headerName: 'x-csrf-token',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
};

// Role hierarchy for authorization
const ROLE_HIERARCHY: Record<string, number> = {
  'super_admin': 100,
  'admin': 80,
  'manager': 60,
  'supervisor': 40,
  'staff': 20,
  'cashier': 10,
  'guest': 0,
};

export interface SecurityContext {
  user: any;
  session: any;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasMinRole: (minRole: string) => boolean;
  isBranchMember: (branchId: string) => boolean;
}

/**
 * Authenticate request and return security context
 */
export async function authenticate(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SecurityContext | null> {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    const context: SecurityContext = {
      user: session?.user || null,
      session,
      isAuthenticated: !!session?.user,
      hasRole: (role: string) => session?.user?.role === role,
      hasMinRole: (minRole: string) => {
        const userRole = session?.user?.role as string | undefined;
        const userLevel = userRole ? (ROLE_HIERARCHY[userRole] || 0) : 0;
        const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
        return userLevel >= requiredLevel;
      },
      isBranchMember: (branchId: string) => {
        return session?.user?.branchId === branchId || 
               session?.user?.role === 'super_admin' ||
               session?.user?.role === 'admin';
      },
    };
    
    return context;
  } catch (error) {
    console.error('[Security] Authentication error:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 */
export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, ctx: SecurityContext) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const ctx = await authenticate(req, res);
    
    if (!ctx?.isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    return handler(req, res, ctx);
  };
}

/**
 * Require specific role middleware
 */
export function requireRole(
  roles: string | string[],
  handler: (req: NextApiRequest, res: NextApiResponse, ctx: SecurityContext) => Promise<void>
) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const ctx = await authenticate(req, res);
    
    if (!ctx?.isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    if (!allowedRoles.includes(ctx.user?.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }
    
    return handler(req, res, ctx);
  };
}

/**
 * Require minimum role level middleware
 */
export function requireMinRole(
  minRole: string,
  handler: (req: NextApiRequest, res: NextApiResponse, ctx: SecurityContext) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const ctx = await authenticate(req, res);
    
    if (!ctx?.isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    if (!ctx.hasMinRole(minRole)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Minimum required role: ${minRole}`
      });
    }
    
    return handler(req, res, ctx);
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options?: { maxRequests?: number; windowMs?: number }
) {
  const maxRequests = options?.maxRequests || SECURITY_CONFIG.rateLimit.maxRequests;
  const windowMs = options?.windowMs || SECURITY_CONFIG.rateLimit.windowMs;
  
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const ip = getClientIp(req);
    const key = `rate:${ip}`;
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
    }
    
    record.count++;
    rateLimitStore.set(key, record);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', record.resetTime);
    
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    return handler(req, res);
  };
}

/**
 * Input sanitization utilities
 */
export const sanitize = {
  // Escape HTML special characters
  html: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  
  // Remove SQL injection attempts
  sql: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },
  
  // Sanitize for use in file paths
  path: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '')
      .replace(/^\/+/, '');
  },
  
  // Remove control characters
  text: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.replace(/[\x00-\x1F\x7F]/g, '');
  },
};

/**
 * Input validation utilities
 */
export const validate = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  
  phone: (phone: string): boolean => {
    const phoneRegex = /^(\+62|62|0)[0-9]{8,13}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  },
  
  alphanumeric: (str: string): boolean => {
    return /^[a-zA-Z0-9]+$/.test(str);
  },
  
  numeric: (str: string): boolean => {
    return /^[0-9]+$/.test(str);
  },
  
  decimal: (str: string): boolean => {
    return /^[0-9]+(\.[0-9]+)?$/.test(str);
  },
  
  date: (str: string): boolean => {
    const date = new Date(str);
    return !isNaN(date.getTime());
  },
  
  minLength: (str: string, min: number): boolean => {
    return str.length >= min;
  },
  
  maxLength: (str: string, max: number): boolean => {
    return str.length <= max;
  },
};

/**
 * Get client IP address
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Security headers middleware
 */
export function securityHeaders(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // CORS headers
    const origin = req.headers.origin;
    if (origin && SECURITY_CONFIG.cors.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', SECURITY_CONFIG.cors.allowedMethods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    return handler(req, res);
  };
}

/**
 * Audit logging
 */
export async function auditLog(
  action: string,
  resource: string,
  resourceId: string,
  userId: string,
  details?: any
) {
  console.log(`[AUDIT] ${new Date().toISOString()} | User: ${userId} | Action: ${action} | Resource: ${resource}:${resourceId}`);
  
  // In production, save to database
  // await db.AuditLog.create({ action, resource, resourceId, userId, details, timestamp: new Date() });
}

export default {
  authenticate,
  requireAuth,
  requireRole,
  requireMinRole,
  rateLimit,
  securityHeaders,
  sanitize,
  validate,
  auditLog,
};

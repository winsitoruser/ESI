import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, AuthUser } from '../types';
import { sendError } from '../utils/helpers';
import logger from '../utils/logger';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Access token required', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;

    req.user = decoded;
    req.tenantId = decoded.tenantId;
    req.branchId = decoded.branchId;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      sendError(res, 'Token expired', 401);
      return;
    }
    sendError(res, 'Invalid token', 401);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401);
      return;
    }
    if (roles.length && !roles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 403);
      return;
    }
    next();
  };
}

export function requireTenant(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.tenantId) {
    sendError(res, 'Tenant context required', 400);
    return;
  }
  next();
}

export function requireBranch(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.branchId) {
    sendError(res, 'Branch context required', 400);
    return;
  }
  next();
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
}

export function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, tenantId: user.tenantId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
  );
}

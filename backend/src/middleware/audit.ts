import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import logger from '../utils/logger';

export function auditLog(req: AuthRequest, res: Response, next: NextFunction): void {
  const start = Date.now();
  const originalSend = res.json;

  res.json = function (body: any) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      tenantId: req.tenantId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      logger.info('AUDIT', logData);
    }

    return originalSend.call(this, body);
  };

  next();
}

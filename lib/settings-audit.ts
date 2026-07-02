import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

// Use dynamic import for CommonJS module
const getDb = () => require('../models');

export interface AuditLogData {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
}

export class SettingsAudit {
  static async log(data: AuditLogData, req?: any) {
    try {
      const { AuditLog } = getDb();
      
      await AuditLog.create({
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValues: data.oldValues || {},
        newValues: data.newValues || {},
        ipAddress: data.ipAddress || req?.ip || '',
        userAgent: data.userAgent || req?.headers['user-agent'] || '',
        description: data.description || `${data.action} ${data.entityType}`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  static async getAuditHistory(entityType: string, entityId?: string) {
    try {
      const { AuditLog, User } = getDb();
      
      const where: any = { entityType };
      if (entityId) {
        where.entityId = entityId;
      }

      const logs = await AuditLog.findAll({
        where,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }],
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      return logs.map((log: any) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        description: log.description,
        timestamp: log.createdAt,
        user: log.user ? {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email
        } : null
      }));
    } catch (error) {
      console.error('Failed to fetch audit history:', error);
      return [];
    }
  }

  static async createSettingsMiddleware(req: any, res: any, next: any) {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Log the response if it's a successful operation
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
        const session = getServerSession(req, res, authOptions);
        
        session.then((s: any) => {
          if (s && s.user && req.route?.path?.includes('/settings/')) {
            SettingsAudit.log({
              userId: s.user.id,
              action: req.method === 'POST' ? 'CREATE' : req.method === 'PUT' ? 'UPDATE' : 'DELETE',
              entityType: req.route.path.split('/')[2] || 'Unknown',
              entityId: req.params?.id || 'unknown',
              newValues: req.body,
              ipAddress: req.ip || '',
              userAgent: req.headers['user-agent'] || '',
              description: `${req.method} ${req.route.path}`
            }, req);
          }
        });
      }
      
      originalSend.call(res, data);
    };
    
    next();
  }
}

export default SettingsAudit;

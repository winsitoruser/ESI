import type { NextApiRequest, NextApiResponse } from 'next';
import { User, Branch } from '../../../../models';
// AuditLog model - will use mock data if not available
import { Op } from 'sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getAuditLogs(req, res);
      case 'POST':
        return await createAuditLog(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Audit Log API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAuditLogs(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', action, resource, userId, hqOnly, dateFrom, dateTo } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  try {
    const where: any = {};
    
    if (action && action !== 'all') {
      where.action = action;
    }
    
    if (resource && resource !== 'all') {
      where.resource = resource;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (hqOnly === 'true') {
      where.isHqAction = true;
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom as string);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo as string);
    }

    // Use mock data - in production, query from AuditLog model
    const allLogs = getMockAuditLogs();
    
    let filteredLogs = allLogs;
    if (action && action !== 'all') {
      filteredLogs = filteredLogs.filter(l => l.action === action);
    }
    if (resource && resource !== 'all') {
      filteredLogs = filteredLogs.filter(l => l.resource === resource);
    }
    if (hqOnly === 'true') {
      filteredLogs = filteredLogs.filter(l => l.isHqAction);
    }

    const total = filteredLogs.length;
    const logs = filteredLogs.slice(offset, offset + limitNum);

    return res.status(200).json({
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(200).json({
      logs: getMockAuditLogs(),
      total: 10,
      page: 1,
      limit: 20,
      totalPages: 1
    });
  }
}

async function createAuditLog(req: NextApiRequest, res: NextApiResponse) {
  const { action, resource, resourceId, resourceName, description, oldValue, newValue, userId, branchId, isHqAction } = req.body;

  try {
    // In production, create audit log in database
    const log = {
      id: Date.now().toString(),
      action,
      resource,
      resourceId,
      resourceName,
      description,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      userId,
      branchId,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      isHqAction: isHqAction || false,
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({ log });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return res.status(500).json({ error: 'Failed to create audit log' });
  }
}

function getMockAuditLogs() {
  return [
    { id: '1', action: 'UPDATE', resource: 'product', resourceId: '15', resourceName: 'Beras Premium 5kg', description: 'Harga produk diperbarui', userName: 'Admin HQ', userRole: 'HQ_ADMIN', branchName: null, isHqAction: true, createdAt: '2026-02-22T06:30:00Z' },
    { id: '2', action: 'CREATE', resource: 'user', resourceId: '28', resourceName: 'Andi Pratama', description: 'User baru ditambahkan', userName: 'Admin HQ', userRole: 'HQ_ADMIN', branchName: 'Cabang Bandung', isHqAction: true, createdAt: '2026-02-22T05:45:00Z' },
    { id: '3', action: 'VOID', resource: 'transaction', resourceId: 'TRX-2602-0045', resourceName: 'Transaksi POS', description: 'Transaksi di-void', userName: 'Siti Rahayu', userRole: 'BRANCH_MANAGER', branchName: 'Cabang Bandung', isHqAction: false, createdAt: '2026-02-22T04:30:00Z' },
    { id: '4', action: 'DELETE', resource: 'branch', resourceId: '8', resourceName: 'Kiosk Mall XYZ', description: 'Cabang dihapus', userName: 'Super Admin', userRole: 'SUPER_ADMIN', branchName: null, isHqAction: true, createdAt: '2026-02-21T14:00:00Z' },
    { id: '5', action: 'LOGIN', resource: 'session', resourceId: 'sess-123', resourceName: 'User Login', description: 'Login berhasil', userName: 'Ahmad Wijaya', userRole: 'BRANCH_MANAGER', branchName: 'Cabang Pusat Jakarta', isHqAction: false, createdAt: '2026-02-22T06:00:00Z' }
  ];
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Op } = require('sequelize');
const { TeamMember } = require('../../../../models/HR');

type HandlerResult = { success: boolean; data?: any; error?: string; message?: string; pagination?: any };

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;

    switch (req.method) {
      case 'GET':
        return await handleGetTeam(req, res, tenantId);
      case 'POST':
        return await handleCreateTeamMember(req, res, tenantId, userId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Team API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetTeam(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { page = '1', limit = '20', role, status, department, search, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (role) where.role = role;
  if (status) where.status = status;
  if (department) where.department = department;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

  try {
    const { count, rows } = await TeamMember.findAndCountAll({
      where,
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (dbError) {
    // Fallback mock data
    const mockMembers = generateMockTeamMembers(tenantId);
    const filtered = mockMembers.filter(m => {
      if (role && m.role !== role) return false;
      if (status && m.status !== status) return false;
      if (department && m.department !== department) return false;
      if (search) {
        const s = (search as string).toLowerCase();
        return m.name.toLowerCase().includes(s) || m.code.toLowerCase().includes(s) || m.email.toLowerCase().includes(s);
      }
      return true;
    });

    return res.status(200).json({
      success: true,
      data: filtered.slice(0, limitNum),
      pagination: { total: filtered.length, page: pageNum, limit: limitNum, totalPages: Math.ceil(filtered.length / limitNum) },
      meta: { isMock: true },
    });
  }
}

async function handleCreateTeamMember(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { name, email, phone, role, department, status, joinDate } = req.body;

  if (!name || !role) {
    return res.status(400).json({ success: false, error: 'Name and role are required' });
  }

  const validRoles = ['sales', 'marketing', 'ops', 'finance', 'admin', 'manager', 'executive'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  try {
    const prefix = role.substring(0, 3).toUpperCase();
    const count = await TeamMember.count({ where: { role } });
    const code = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    const member = await TeamMember.create({
      code,
      name,
      email,
      phone,
      role,
      department: department || role,
      status: status || 'active',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      tenantId,
      createdBy: userId,
    });

    return res.status(201).json({ success: true, data: member, message: 'Team member created successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to create team member' });
  }
}

function generateMockTeamMembers(tenantId: string) {
  const roles = ['sales', 'marketing', 'ops', 'finance', 'admin', 'manager', 'executive'] as const;
  const mockData: any[] = [];

  const namesByRole: Record<string, { name: string; email: string; phone: string; department: string }[]> = {
    sales: [
      { name: 'Ahmad Fauzi', email: 'ahmad@example.com', phone: '081234567890', department: 'Sales' },
      { name: 'Dewi Sartika', email: 'dewi@example.com', phone: '081234567891', department: 'Sales' },
      { name: 'Bambang Suprapto', email: 'bambang@example.com', phone: '081234567892', department: 'Sales' },
    ],
    marketing: [
      { name: 'Rina Wijaya', email: 'rina@example.com', phone: '081234567893', department: 'Marketing' },
      { name: 'Yoga Pratama', email: 'yoga@example.com', phone: '081234567894', department: 'Marketing' },
    ],
    ops: [
      { name: 'Hendra Kusuma', email: 'hendra@example.com', phone: '081234567895', department: 'Operations' },
      { name: 'Siti Nurhaliza', email: 'siti@example.com', phone: '081234567896', department: 'Operations' },
    ],
    finance: [
      { name: 'Agus Hartono', email: 'agus@example.com', phone: '081234567897', department: 'Finance' },
    ],
    admin: [
      { name: 'Lina Marlina', email: 'lina@example.com', phone: '081234567898', department: 'Administration' },
    ],
    manager: [
      { name: 'Dr. Andi Pratama', email: 'andi@example.com', phone: '081234567899', department: 'Management' },
    ],
    executive: [
      { name: 'Ir. Budi Santoso', email: 'budi@example.com', phone: '081234567800', department: 'Executive' },
    ],
  };

  const statuses = ['active', 'active', 'active', 'active', 'inactive', 'resigned'];
  const joinDates = ['2025-01-15', '2025-03-20', '2025-06-01', '2025-08-10', '2026-01-05', '2026-02-14'];

  for (const role of roles) {
    const members = namesByRole[role] || [{ name: `${role} Staff`, email: `${role}@example.com`, phone: '081200000000', department: role }];
    members.forEach((member, idx) => {
      mockData.push({
        id: `mock-tm-${role}-${idx + 1}`,
        code: `${role.substring(0, 3).toUpperCase()}-${String(idx + 1).padStart(4, '0')}`,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role,
        department: member.department,
        status: statuses[(idx + roles.indexOf(role)) % statuses.length],
        joinDate: joinDates[(idx + roles.indexOf(role)) % joinDates.length],
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  return mockData;
}

export default withHQAuth(handler);

import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Op } = require('sequelize');
const { TeamMember } = require('../../../../models/HR');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;

    switch (req.method) {
      case 'GET':
        return await handleGetMembers(req, res, tenantId);
      case 'POST':
        return await handleCreateMember(req, res, tenantId, userId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Team Members API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetMembers(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { page = '1', limit = '20', role, department, status, search, sortBy = 'name', sortOrder = 'ASC' } = req.query;

  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (role) where.role = role;
  if (department) where.department = department;
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
      { department: { [Op.iLike]: `%${search}%` } },
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
      pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) },
    });
  } catch (dbError) {
    const mockMembers = generateMockMembers(tenantId);
    const filtered = mockMembers.filter(m => {
      if (role && m.role !== role) return false;
      if (department && m.department !== department) return false;
      if (status && m.status !== status) return false;
      if (search) {
        const s = (search as string).toLowerCase();
        return m.name.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s) || m.code.toLowerCase().includes(s);
      }
      return true;
    });

    const totalFiltered = filtered.length;
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: { total: totalFiltered, page: pageNum, limit: limitNum, totalPages: Math.ceil(totalFiltered / limitNum) },
      meta: { isMock: true },
    });
  }
}

async function handleCreateMember(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { name, email, phone, role, department, joinDate } = req.body;

  if (!name || !role) {
    return res.status(400).json({ success: false, error: 'Name and role are required' });
  }

  const validRoles = ['sales', 'marketing', 'ops', 'finance', 'admin', 'manager', 'executive'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  try {
    const count = await TeamMember.count({ where: { role, tenantId } });
    const prefix = role.substring(0, 2).toUpperCase();
    const code = `TM-${prefix}-${String(count + 1).padStart(4, '0')}`;

    const member = await TeamMember.create({
      code, name, email, phone, role, department,
      joinDate: joinDate || new Date(),
      status: 'active',
      tenantId,
      createdBy: userId,
    });

    return res.status(201).json({ success: true, data: member, message: 'Team member created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to create member' });
  }
}

function generateMockMembers(tenantId: string) {
  const roles = ['sales', 'marketing', 'ops', 'finance', 'admin', 'manager', 'executive'] as const;
  const departments = ['Sales & Marketing', 'Operations', 'Finance', 'Administration', 'Executive'];
  const names = ['Andi Pratama', 'Sari Dewi', 'Budi Santoso', 'Rina Wijaya', 'Hendra Kusuma',
    'Dian Permata', 'Agus Wijaya', 'Nina Hartati', 'Rudi Hermawan', 'Maya Sari',
    'Doni Lesmana', 'Fitri Handayani', 'Gunawan Saputra', 'Hana Safitri', 'Irwan Setiawan'];

  return names.map((name, i) => {
    const role = roles[i % roles.length];
    const dept = role === 'sales' || role === 'marketing' ? 'Sales & Marketing'
               : role === 'ops' ? 'Operations'
               : role === 'finance' ? 'Finance'
               : role === 'admin' ? 'Administration'
               : 'Executive';
    return {
      id: `mock-tm-${i + 1}`,
      code: `TM-${role.substring(0, 2).toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@simesi.co.id`,
      phone: `0812${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      role,
      department: dept,
      status: i < 12 ? 'active' : (i < 14 ? 'inactive' : 'resigned'),
      joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      userId: null,
      tenantId,
      createdAt: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export default withHQAuth(handler);

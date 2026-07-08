import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import { loadEmployeeById } from '../../../lib/hris/employee-lookup';
import {
  deriveTeamFieldsFromEmployee,
  departmentCodeForTeamRole,
  serializeTeamMember,
} from '../../../lib/hris/team-member-sync';
import { getDepartmentLabel } from '../../../lib/hris/master-data';

const { Op } = require('sequelize');
const { TeamMember } = require('../../../models/HR');

const VALID_ROLES = ['sales', 'marketing', 'ops', 'finance', 'admin', 'manager', 'executive'];
const VALID_STATUSES = ['active', 'inactive', 'resigned'];

function isValidUUID(str: any): boolean {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        if (id && typeof id === 'string') return await handleGetOne(res, id, tenantId);
        return await handleGetMembers(req, res, tenantId);
      case 'POST':
        return await handleCreateMember(req, res, tenantId, userId);
      case 'PUT':
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ success: false, error: 'id query parameter required' });
        }
        return await handleUpdateMember(req, res, id, tenantId);
      case 'DELETE':
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ success: false, error: 'id query parameter required' });
        }
        return await handleDeactivateMember(res, id, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Team Members API error:', error?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

function tenantWhere(tenantId?: string) {
  return tenantId ? { tenantId } : {};
}

async function enrichMember(member: any, tenantId?: string) {
  const empId = member?.employeeId || member?.employee_id;
  const employee = empId && isValidUUID(String(empId))
    ? await loadEmployeeById(String(empId), tenantId)
    : null;
  return serializeTeamMember(member, employee);
}

async function handleGetOne(res: NextApiResponse, id: string, tenantId?: string) {
  const member = await TeamMember.findOne({ where: { id, ...tenantWhere(tenantId) } });
  if (!member) {
    return res.status(404).json({ success: false, error: 'Team member not found' });
  }
  return res.status(200).json({ success: true, data: await enrichMember(member, tenantId) });
}

async function handleGetMembers(req: NextApiRequest, res: NextApiResponse, tenantId?: string) {
  const { page = '1', limit = '20', role, department, status, search, sortBy = 'name', sortOrder = 'ASC' } = req.query;

  const where: any = { ...tenantWhere(tenantId) };
  if (role) where.role = role;
  if (department) where.department = department;
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
      { department: { [Op.iLike]: `%${search}%` } },
      { location: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const sortField = ['name', 'code', 'role', 'department', 'status', 'joinDate', 'createdAt'].includes(sortBy as string)
    ? sortBy as string : 'name';

  const { count, rows } = await TeamMember.findAndCountAll({
    where,
    order: [[sortField, sortOrder as string]],
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  });

  const allForStats = await TeamMember.findAll({
    where: tenantWhere(tenantId),
    attributes: ['role', 'status'],
  });

  const data = await Promise.all(rows.map((m: any) => enrichMember(m, tenantId)));

  return res.status(200).json({
    success: true,
    data,
    summary: buildSummary(allForStats),
    pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) },
  });
}

function buildSummary(members: Array<{ role: string; status: string }>) {
  const roleCounts: Record<string, number> = {};
  VALID_ROLES.forEach(r => { roleCounts[r] = 0; });
  let active = 0;
  members.forEach(m => {
    if (m.status === 'active') active++;
    if (roleCounts[m.role] !== undefined) roleCounts[m.role]++;
  });
  return { total: members.length, active, roleCounts };
}

async function resolveEmployeePayload(
  body: any,
  tenantId?: string,
  role?: string
) {
  const linkedId = body.employeeId || body.employee_id;
  if (!linkedId || !isValidUUID(String(linkedId))) {
    return {
      employeeId: null,
      name: body.name,
      email: body.email,
      phone: body.phone,
      department: body.department || departmentCodeForTeamRole(role),
      location: body.location,
      workArea: body.workArea,
      joinDate: body.joinDate,
    };
  }

  const employee = await loadEmployeeById(String(linkedId), tenantId);
  if (!employee) {
    throw new Error('Karyawan master tidak ditemukan');
  }

  const derived = deriveTeamFieldsFromEmployee(employee, role);
  return {
    employeeId: String(employee.id),
    name: derived.name || body.name,
    email: derived.email || body.email,
    phone: derived.phone || body.phone,
    department: body.department || derived.department,
    location: body.location || derived.location,
    workArea: body.workArea || derived.workArea,
    joinDate: body.joinDate || derived.joinDate,
    employeeUid: derived.employeeUid,
  };
}

async function handleCreateMember(req: NextApiRequest, res: NextApiResponse, tenantId?: string, userId?: string) {
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ success: false, error: 'Role is required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }

  let payload: any;
  try {
    payload = await resolveEmployeePayload(req.body, tenantId, role);
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e.message });
  }

  if (!payload.name) {
    return res.status(400).json({ success: false, error: 'Name is required (pilih karyawan atau isi nama)' });
  }

  if (payload.employeeId) {
    const existing = await TeamMember.findOne({
      where: { employeeId: payload.employeeId, status: 'active', ...tenantWhere(tenantId) },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Karyawan sudah terdaftar sebagai anggota tim (${existing.code})`,
      });
    }
  }

  const count = await TeamMember.count({ where: { role, ...tenantWhere(tenantId) } });
  const prefix = role.substring(0, 2).toUpperCase();
  const code = `TM-${prefix}-${String(count + 1).padStart(4, '0')}`;

  const member = await TeamMember.create({
    code,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    role,
    department: payload.department,
    location: payload.location,
    workArea: payload.workArea,
    employeeId: payload.employeeId,
    joinDate: payload.joinDate || new Date().toISOString().split('T')[0],
    status: 'active',
    tenantId: isValidUUID(tenantId) ? tenantId : undefined,
    createdBy: isValidUUID(userId) ? userId : undefined,
  });

  return res.status(201).json({
    success: true,
    data: await enrichMember(member, tenantId),
    message: `Anggota tim ${code} berhasil ditambahkan${payload.employeeUid ? ` (UID: ${payload.employeeUid})` : ''}`,
  });
}

async function handleUpdateMember(req: NextApiRequest, res: NextApiResponse, id: string, tenantId?: string) {
  const { role, status } = req.body;

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const member = await TeamMember.findOne({ where: { id, ...tenantWhere(tenantId) } });
  if (!member) {
    return res.status(404).json({ success: false, error: 'Team member not found' });
  }

  let payload: any;
  try {
    payload = await resolveEmployeePayload(req.body, tenantId, role || member.role);
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e.message });
  }

  await member.update({
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.email !== undefined && { email: payload.email }),
    ...(payload.phone !== undefined && { phone: payload.phone }),
    ...(role !== undefined && { role }),
    ...(payload.department !== undefined && { department: payload.department }),
    ...(payload.joinDate !== undefined && { joinDate: payload.joinDate }),
    ...(status !== undefined && { status }),
    ...(payload.location !== undefined && { location: payload.location }),
    ...(payload.workArea !== undefined && { workArea: payload.workArea }),
    ...(payload.employeeId !== undefined && { employeeId: payload.employeeId }),
  });

  return res.status(200).json({
    success: true,
    data: await enrichMember(member, tenantId),
    message: 'Team member updated',
  });
}

async function handleDeactivateMember(res: NextApiResponse, id: string, tenantId?: string) {
  const member = await TeamMember.findOne({ where: { id, ...tenantWhere(tenantId) } });
  if (!member) {
    return res.status(404).json({ success: false, error: 'Team member not found' });
  }
  await member.update({ status: 'inactive' });
  return res.status(200).json({ success: true, message: 'Team member deactivated' });
}

export default withHQAuth(handler, { module: 'hris' });

import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { TeamMember } = require('../../../../models/HR');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Team member ID is required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetMember(id, res, tenantId);
      case 'PUT':
        return await handleUpdateMember(id, req, res, tenantId, userId);
      case 'DELETE':
        return await handleDeleteMember(id, res, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Team member detail API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetMember(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const member = await TeamMember.findOne({ where });
    if (!member) {
      return res.status(404).json({ success: false, error: 'Team member not found' });
    }

    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch team member' });
  }
}

async function handleUpdateMember(id: string, req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { name, email, phone, role, department, status, joinDate } = req.body;

  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const member = await TeamMember.findOne({ where });
    if (!member) {
      return res.status(404).json({ success: false, error: 'Team member not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (status !== undefined) updateData.status = status;
    if (joinDate !== undefined) updateData.joinDate = joinDate;

    await member.update(updateData);

    return res.status(200).json({ success: true, data: member, message: 'Team member updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to update team member' });
  }
}

async function handleDeleteMember(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const member = await TeamMember.findOne({ where });
    if (!member) {
      return res.status(404).json({ success: false, error: 'Team member not found' });
    }

    await member.destroy();

    return res.status(200).json({ success: true, message: 'Team member deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete team member' });
  }
}

export default withHQAuth(handler);

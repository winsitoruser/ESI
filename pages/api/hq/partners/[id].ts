import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const Partner = require('../../../../models/Partner');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Partner ID is required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetPartner(id, res, tenantId);
      case 'PUT':
        return await handleUpdatePartner(id, req, res, tenantId, userId);
      case 'DELETE':
        return await handleDeletePartner(id, res, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Partner detail API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetPartner(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const partner = await Partner.findOne({ where });
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }

    return res.status(200).json({ success: true, data: partner });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch partner' });
  }
}

async function handleUpdatePartner(id: string, req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { name, type, picName, picPhone, phone, email, address, city, province, commissionRate, status, notes, tags, isActive } = req.body;

  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const partner = await Partner.findOne({ where });
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }

    const updateData: any = { updatedBy: userId };
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (picName !== undefined) updateData.picName = picName;
    if (picPhone !== undefined) updateData.picPhone = picPhone;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;
    if (isActive !== undefined) updateData.isActive = isActive;

    await partner.update(updateData);

    return res.status(200).json({ success: true, data: partner, message: 'Partner updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to update partner' });
  }
}

async function handleDeletePartner(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const partner = await Partner.findOne({ where });
    if (!partner) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }

    await partner.destroy();

    return res.status(200).json({ success: true, message: 'Partner deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete partner' });
  }
}

export default withHQAuth(handler);

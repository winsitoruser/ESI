import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Op } = require('sequelize');
const Partner = require('../../../../models/Partner');

type HandlerResult = { success: boolean; data?: any; error?: string; message?: string; pagination?: any };

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;

    switch (req.method) {
      case 'GET':
        return await handleGetPartners(req, res, tenantId);
      case 'POST':
        return await handleCreatePartner(req, res, tenantId, userId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Partner API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetPartners(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { page = '1', limit = '20', type, status, search, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { city: { [Op.iLike]: `%${search}%` } },
      { picName: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

  try {
    const { count, rows } = await Partner.findAndCountAll({
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
    const mockPartners = generateMockPartners(tenantId);
    const filtered = mockPartners.filter(p => {
      if (type && p.type !== type) return false;
      if (status && p.status !== status) return false;
      if (search) {
        const s = (search as string).toLowerCase();
        return p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s);
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

async function handleCreatePartner(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { name, type, picName, picPhone, phone, email, address, city, province, commissionRate, notes } = req.body;

  if (!name || !type) {
    return res.status(400).json({ success: false, error: 'Name and type are required' });
  }

  const validTypes = ['vet', 'petshop', 'petclinic', 'pethotel', 'pettransport'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    // Generate unique code
    const prefix = type.substring(0, 3).toUpperCase();
    const count = await Partner.count({ where: { type } });
    const code = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    const partner = await Partner.create({
      code,
      name,
      type,
      picName,
      picPhone,
      phone,
      email,
      address,
      city,
      province,
      commissionRate: commissionRate || 0,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      notes,
      tenantId,
      createdBy: userId,
      updatedBy: userId,
    });

    return res.status(201).json({ success: true, data: partner, message: 'Partner created successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to create partner' });
  }
}

function generateMockPartners(tenantId: string) {
  const partnerTypes = ['vet', 'petshop', 'petclinic', 'pethotel', 'pettransport'] as const;
  const mockData: any[] = [];

  const namesByType: Record<string, string[]> = {
    vet: ['Drh. Andi Pratama', 'Drh. Sari Dewi', 'Drh. Budi Hartono', 'Drh. Rina Wijaya', 'Drh. Hendra Kusuma'],
    petshop: ['Happy Pet Shop', 'Paws & Claws', 'Pet Lovers Jakarta', 'Animal Kingdom', 'Pet Paradise'],
    petclinic: ['Klinik Hewan Sehat', 'PetCare Clinic', 'VetMed Center', 'Animal Wellness', 'Paws Clinic'],
    pethotel: ['Pet Hotel Luxury', 'Paws Inn', 'Animal Resort', 'Pet Staycation', 'Furry Hotel'],
    pettransport: ['PetTrans Express', 'Animal Logistic', 'Paws Delivery', 'PetMove Indonesia', 'FurryTrans'],
  };

  const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Bali', 'Medan', 'Makassar'];
  const statuses = ['active', 'active', 'active', 'inactive', 'pending'];

  for (const type of partnerTypes) {
    const names = namesByType[type] || [`${type} Partner`];
    names.forEach((name, idx) => {
      mockData.push({
        id: `mock-${type}-${idx + 1}`,
        code: `${type.substring(0, 3).toUpperCase()}-${String(idx + 1).padStart(4, '0')}`,
        name,
        type,
        picName: `PIC ${name}`,
        picPhone: `0812${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        phone: `021${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        address: `Jl. Contoh No. ${idx + 1}`,
        city: cities[idx % cities.length],
        province: 'DKI Jakarta',
        latitude: -6.2 + (Math.random() - 0.5),
        longitude: 106.8 + (Math.random() - 0.5),
        status: statuses[idx % statuses.length],
        commissionRate: Math.floor(Math.random() * 20) + 5,
        joinDate: '2026-01-01',
        notes: '',
        tags: [],
        isActive: statuses[idx % statuses.length] === 'active',
        tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  return mockData;
}

export default withHQAuth(handler);

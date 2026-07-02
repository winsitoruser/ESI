import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Op } = require('sequelize');
const { Lead, Activity } = require('../../../../models/CRM');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;

    switch (req.method) {
      case 'GET':
        return await handleGetLeads(req, res, tenantId);
      case 'POST':
        return await handleCreateLead(req, res, tenantId, userId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('CRM API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetLeads(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { page = '1', limit = '20', stage, type, search, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (stage) where.stage = stage;
  if (type) where.partnerType = type;
  if (search) {
    where[Op.or] = [
      { companyName: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { picName: { [Op.iLike]: `%${search}%` } },
      { city: { [Op.iLike]: `%${search}%` } },
      { notes: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

  try {
    const { count, rows } = await Lead.findAndCountAll({
      where,
      order: [[sortBy as string, sortOrder as string]],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      attributes: {
        include: [
          [
            require('sequelize').literal(`(
              SELECT COUNT(*) FROM activities
              WHERE activities.related_to = 'lead'
              AND activities.related_id = "Lead"."id"
            )`),
            'activityCount'
          ]
        ]
      }
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
    const mockLeads = generateMockLeads(tenantId);
    const filtered = mockLeads.filter(l => {
      if (stage && l.stage !== stage) return false;
      if (type && l.partnerType !== type) return false;
      if (search) {
        const s = (search as string).toLowerCase();
        return l.companyName.toLowerCase().includes(s) || l.code.toLowerCase().includes(s) || (l.picName || '').toLowerCase().includes(s);
      }
      return true;
    });

    const totalFiltered = filtered.length;
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalFiltered / limitNum),
      },
      meta: { isMock: true },
    });
  }
}

async function handleCreateLead(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { companyName, partnerType, picName, picPhone, email, phone, city, source, stage, expectedValue, probability, assignedTo, notes } = req.body;

  if (!companyName || !partnerType) {
    return res.status(400).json({ success: false, error: 'Company name and partner type are required' });
  }

  const validTypes = ['vet', 'petshop', 'petclinic', 'pethotel', 'pettransport'];
  if (!validTypes.includes(partnerType)) {
    return res.status(400).json({ success: false, error: `Invalid partner type. Must be one of: ${validTypes.join(', ')}` });
  }

  const validStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  if (stage && !validStages.includes(stage)) {
    return res.status(400).json({ success: false, error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
  }

  try {
    const prefix = partnerType.substring(0, 3).toUpperCase();
    const count = await Lead.count({ where: { partnerType } });
    const code = `L-${prefix}-${String(count + 1).padStart(4, '0')}`;

    const lead = await Lead.create({
      code,
      companyName,
      partnerType,
      picName,
      picPhone,
      email,
      phone,
      city,
      source: source || 'direct',
      stage: stage || 'new',
      expectedValue: expectedValue || 0,
      probability: probability || 10,
      assignedTo: assignedTo || userId,
      notes,
      tenantId,
      createdBy: userId,
      updatedBy: userId,
    });

    return res.status(201).json({ success: true, data: lead, message: 'Lead created successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to create lead' });
  }
}

function generateMockLeads(tenantId: string) {
  const partnerTypes = ['vet', 'petshop', 'petclinic', 'pethotel', 'pettransport'] as const;
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
  const sources = ['referral', 'website', 'direct', 'event', 'cold_call', 'social_media', 'other'] as const;
  const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Bali', 'Medan', 'Makassar', 'Semarang', 'Palembang', 'Bogor'];

  const mockCompanies: Record<string, string[]> = {
    vet: ['Klinik Drh. Andi', 'Praktik Drh. Sari', 'VetCare Nusantara', 'Drh. Budi Pratama', 'Hewan Sehat Clinic', 'VetMedika', 'Paws Veterinary'],
    petshop: ['Happy Pet Shop', 'Paws & Claws', 'Pet Lovers Jakarta', 'Animal Kingdom Store', 'Pet Paradise', 'Furry Friends Shop', 'PetZone Indonesia'],
    petclinic: ['Klinik Hewan Sehat', 'PetCare Clinic', 'VetMed Center', 'Animal Wellness', 'Paws Clinic', 'Medivet', 'CarePet Clinic'],
    pethotel: ['Pet Hotel Luxury', 'Paws Inn Resort', 'Animal Resort', 'Pet Staycation', 'Furry Hotel', 'Pet Lodge', 'Paws Retreat'],
    pettransport: ['PetTrans Express', 'Animal Logistic', 'Paws Delivery', 'PetMove Indonesia', 'FurryTrans', 'PawWheels', 'PetGo'],
  };

  const names = ['Bambang', 'Siti', 'Ahmad', 'Dewi', 'Rudi', 'Rina', 'Hendra', 'Maya', 'Agus', 'Fitri'];
  const mockLeads: any[] = [];
  let idx = 0;

  for (const type of partnerTypes) {
    const companies = mockCompanies[type] || [`${type} Lead`];
    companies.forEach((name, i) => {
      idx++;
      const stage = stages[idx % stages.length];
      const probMap: Record<string, number> = { new: 10, contacted: 20, qualified: 40, proposal: 60, negotiation: 80, won: 100, lost: 0 };
      const val = Math.floor(Math.random() * 90000000) + 10000000;
      mockLeads.push({
        id: `mock-lead-${idx}`,
        code: `L-${type.substring(0, 3).toUpperCase()}-${String(idx).padStart(4, '0')}`,
        companyName: name,
        partnerType: type,
        picName: names[idx % names.length],
        picPhone: `0812${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: `021${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
        city: cities[idx % cities.length],
        source: sources[idx % sources.length],
        stage,
        status: stage === 'lost' ? 'inactive' : 'active',
        expectedValue: val,
        probability: probMap[stage] || 10,
        assignedTo: tenantId ? `user-${tenantId.substring(0, 4)}` : null,
        notes: stage === 'lost' ? 'Lead lost due to budget constraints' : (stage === 'won' ? 'Successfully converted!' : 'Follow up needed'),
        lostReason: stage === 'lost' ? 'Budget too low' : null,
        convertedToPartner: stage === 'won',
        partnerId: stage === 'won' ? `mock-partner-${idx}` : null,
        tenantId,
        activityCount: Math.floor(Math.random() * 5),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  return mockLeads;
}

export default withHQAuth(handler);

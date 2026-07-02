import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Op } = require('sequelize');
const TeleconsultSession = require('../../../../models/TeleconsultSession');
const Partner = require('../../../../models/Partner');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;

    switch (req.method) {
      case 'GET':
        return await handleGetSessions(req, res, tenantId);
      case 'POST':
        return await handleCreateSession(req, res, tenantId, userId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Teleconsult API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetSessions(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { page = '1', limit = '20', status, partnerId, search, sortBy = 'scheduledAt', sortOrder = 'DESC' } = req.query;

  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (status) where.status = status;
  if (partnerId) where.partnerId = partnerId;
  if (search) {
    where[Op.or] = [
      { petOwnerName: { [Op.iLike]: `%${search}%` } },
      { petName: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
      { petOwnerPhone: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

  try {
    const { count, rows } = await TeleconsultSession.findAndCountAll({
      where,
      include: [{ model: Partner, as: 'vet', attributes: ['id', 'name', 'code', 'type'] }],
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
    const mockSessions = generateMockSessions(tenantId);
    let filtered = [...mockSessions];
    if (status) filtered = filtered.filter(s => s.status === status);
    if (partnerId) filtered = filtered.filter(s => s.partnerId === partnerId);
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter(s => s.petOwnerName.toLowerCase().includes(q) || s.petName.toLowerCase().includes(q));
    }

    return res.status(200).json({
      success: true,
      data: filtered.slice(0, limitNum),
      pagination: { total: filtered.length, page: pageNum, limit: limitNum, totalPages: Math.ceil(filtered.length / limitNum) },
      meta: { isMock: true },
    });
  }
}

async function handleCreateSession(req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { partnerId, petOwnerName, petOwnerPhone, petOwnerEmail, petName, petType, petBreed, petAge, petWeight, symptoms, scheduledAt, fee } = req.body;

  if (!partnerId || !petOwnerName || !petName) {
    return res.status(400).json({ success: false, error: 'Partner, pet owner name and pet name are required' });
  }

  try {
    const count = await TeleconsultSession.count();
    const code = `TC-${String(count + 1).padStart(5, '0')}`;

    const session = await TeleconsultSession.create({
      code,
      partnerId,
      petOwnerName,
      petOwnerPhone,
      petOwnerEmail,
      petName,
      petType,
      petBreed,
      petAge,
      petWeight,
      symptoms,
      scheduledAt: scheduledAt || new Date(),
      fee: fee || 0,
      status: 'scheduled',
      tenantId,
      createdBy: userId,
      updatedBy: userId,
    });

    return res.status(201).json({ success: true, data: session, message: 'Teleconsult session created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to create session' });
  }
}

function generateMockSessions(tenantId: string) {
  const statuses = ['scheduled', 'in_progress', 'completed', 'completed', 'cancelled'];
  const petTypes = ['dog', 'cat', 'dog', 'cat', 'bird', 'dog', 'reptile'] as const;
  const petNames = ['Max', 'Luna', 'Bella', 'Charlie', 'Coco', 'Simba', 'Rocky', 'Milo', 'Oscar', 'Kiko'];
  const ownerNames = ['Budi Santoso', 'Sari Dewi', 'Andi Pratama', 'Rina Wijaya', 'Hendra Kusuma', 'Dian Permata', 'Agus Wijaya', 'Nina Hartati'];
  const symptoms = ['Demam & lesu', 'Mencret 2 hari', 'Muntah-muntah', 'Kulit merah & gatal', 'Batuk & pilek', 'Nafsu makan turun', 'Tidak mau jalan', 'Benjolan di perut'];
  const diagnoses = ['Infeksi saluran cerna', 'Alergi makanan', 'ISPA ringan', 'Dermatitis', 'Gastritis', 'Parasit internal', 'Displasia pinggul', 'Infeksi kulit'];

  return Array.from({ length: 20 }, (_, i) => {
    const status = statuses[i % statuses.length];
    const isPast = status === 'completed' || status === 'cancelled';
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + (isPast ? -Math.floor(i / 2) : Math.floor(i / 3)));
    scheduledDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    return {
      id: `mock-tc-${i + 1}`,
      code: `TC-${String(i + 1).padStart(5, '0')}`,
      partnerId: `mock-vet-${(i % 5) + 1}`,
      vet: { id: `mock-vet-${(i % 5) + 1}`, name: `Drh. ${ownerNames[i % ownerNames.length]}`, code: `VET-${String((i % 5) + 1).padStart(4, '0')}`, type: 'vet' },
      status,
      petOwnerName: ownerNames[(i + 3) % ownerNames.length],
      petOwnerPhone: '0812' + String(Math.floor(Math.random() * 90000000) + 10000000),
      petOwnerEmail: `owner${i + 1}@email.com`,
      petName: petNames[i % petNames.length],
      petType: petTypes[i % petTypes.length],
      petBreed: i % 2 === 0 ? 'Mix' : 'Purebred',
      petAge: `${Math.floor(Math.random() * 8) + 1} years`,
      petWeight: Math.floor(Math.random() * 30) + 2,
      symptoms: symptoms[i % symptoms.length],
      diagnosis: status === 'completed' ? diagnoses[i % diagnoses.length] : null,
      prescription: status === 'completed' ? 'Antibiotik 2x1, vitamin 1x1' : null,
      scheduledAt: scheduledDate.toISOString(),
      startedAt: status === 'completed' || status === 'in_progress' ? new Date(scheduledDate.getTime() + 1000 * 60 * 5).toISOString() : null,
      completedAt: status === 'completed' ? new Date(scheduledDate.getTime() + 1000 * 60 * 25).toISOString() : null,
      duration: status === 'completed' ? 20 + Math.floor(Math.random() * 20) : null,
      rating: status === 'completed' ? Math.floor(Math.random() * 2) + 4 : null,
      fee: 50000 + Math.floor(Math.random() * 5) * 10000,
      notes: '',
      tenantId,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export default withHQAuth(handler);

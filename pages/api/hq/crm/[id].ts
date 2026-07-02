import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
const { Op } = require('sequelize');
const { Lead, Activity } = require('../../../../models/CRM');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Lead ID is required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetLead(id, res, tenantId);
      case 'PUT':
        return await handleUpdateLead(id, req, res, tenantId, userId);
      case 'DELETE':
        return await handleDeleteLead(id, res, tenantId);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('CRM detail API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

async function handleGetLead(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const lead = await Lead.findOne({ where });

    if (!lead) {
      // Check mock data
      const mockLead = findMockLeadById(id);
      if (mockLead) {
        return res.status(200).json({ success: true, data: mockLead, meta: { isMock: true } });
      }
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Fetch activities for this lead
    const activities = await Activity.findAll({
      where: { relatedTo: 'lead', relatedId: id },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ success: true, data: { ...lead.toJSON(), activities } });
  } catch (error) {
    // Fallback mock
    const mockLead = findMockLeadById(id);
    if (mockLead) {
      return res.status(200).json({ success: true, data: mockLead, meta: { isMock: true } });
    }
    return res.status(500).json({ success: false, error: 'Failed to fetch lead' });
  }
}

async function handleUpdateLead(id: string, req: NextApiRequest, res: NextApiResponse, tenantId: string, userId: string) {
  const { companyName, partnerType, picName, picPhone, email, phone, city, source, stage, status, expectedValue, probability, assignedTo, notes, lostReason } = req.body;

  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const lead = await Lead.findOne({ where });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const updateData: any = { updatedBy: userId };
    if (companyName !== undefined) updateData.companyName = companyName;
    if (partnerType !== undefined) updateData.partnerType = partnerType;
    if (picName !== undefined) updateData.picName = picName;
    if (picPhone !== undefined) updateData.picPhone = picPhone;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;
    if (source !== undefined) updateData.source = source;
    if (stage !== undefined) updateData.stage = stage;
    if (status !== undefined) updateData.status = status;
    if (expectedValue !== undefined) updateData.expectedValue = expectedValue;
    if (probability !== undefined) updateData.probability = probability;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (notes !== undefined) updateData.notes = notes;
    if (lostReason !== undefined) updateData.lostReason = lostReason;

    // Auto-set status based on stage
    if (stage === 'lost' && !status) updateData.status = 'inactive';
    if (stage === 'won' && !status) updateData.status = 'active';

    await lead.update(updateData);

    return res.status(200).json({ success: true, data: lead, message: 'Lead updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to update lead' });
  }
}

async function handleDeleteLead(id: string, res: NextApiResponse, tenantId: string) {
  try {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const lead = await Lead.findOne({ where });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Soft delete: mark as inactive
    await lead.update({ status: 'inactive', updatedBy: null });

    return res.status(200).json({ success: true, message: 'Lead deactivated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to deactivate lead' });
  }
}

function findMockLeadById(id: string) {
  const mockLeads = generateMockLeads('mock-tenant');
  return mockLeads.find(l => l.id === id) || null;
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

      // Generate some mock activities
      const activityCount = Math.floor(Math.random() * 4) + 1;
      const activities: any[] = [];
      for (let a = 0; a < activityCount; a++) {
        const actTypes = ['call', 'email', 'meeting', 'follow_up', 'note', 'demo'] as const;
        activities.push({
          id: `mock-act-${idx}-${a}`,
          type: actTypes[a % actTypes.length],
          subject: actTypes[a % actTypes.length] === 'call' ? 'Initial call' :
                   actTypes[a % actTypes.length] === 'email' ? 'Sent proposal' :
                   actTypes[a % actTypes.length] === 'meeting' ? 'Discovery meeting' :
                   actTypes[a % actTypes.length] === 'follow_up' ? 'Follow up call' :
                   actTypes[a % actTypes.length] === 'demo' ? 'Product demo' : 'Added notes',
          description: `Activity #${a + 1} for ${name}`,
          relatedTo: 'lead',
          relatedId: `mock-lead-${idx}`,
          scheduledAt: new Date(Date.now() - a * 3 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: Math.random() > 0.3 ? new Date(Date.now() - a * 2 * 24 * 60 * 60 * 1000).toISOString() : null,
          isCompleted: Math.random() > 0.3,
          assignedTo: null,
          outcome: Math.random() > 0.5 ? 'Positive response' : null,
          tenantId,
          createdAt: new Date(Date.now() - a * 3 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

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
        assignedTo: null,
        notes: stage === 'lost' ? 'Lead lost due to budget constraints' : (stage === 'won' ? 'Successfully converted!' : 'Follow up needed'),
        lostReason: stage === 'lost' ? 'Budget too low' : null,
        convertedToPartner: stage === 'won',
        partnerId: stage === 'won' ? `mock-partner-${idx}` : null,
        tenantId,
        activities,
        activityCount,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  return mockLeads;
}

export default withHQAuth(handler);

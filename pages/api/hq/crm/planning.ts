import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

type PlanningType = 'visit_plan' | 'daily_report' | 'weekly_report' | 'weekly_plan';
type PlanStatus = 'planned' | 'completed' | 'cancelled';

interface PlanningItem {
  id: string;
  leadId: string;
  companyName: string;
  partnerType: string;
  type: PlanningType;
  title: string;
  description: string;
  plannedDate: string;
  actualDate: string | null;
  status: PlanStatus;
  targetCount: number;
  actualCount: number;
  outcome: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface TargetVsRealization {
  period: string;
  periodLabel: string;
  targetVisits: number;
  actualVisits: number;
  achievementPct: number;
  targetValue: number;
  actualValue: number;
  valueAchievementPct: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGetPlanning(req, res);
      case 'POST':
        return await handleCreatePlanning(req, res);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('CRM Planning API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function handleGetPlanning(req: NextApiRequest, res: NextApiResponse) {
  const { type, leadId, period, page = '1', limit = '50' } = req.query;
  let data = generateMockPlanning();

  if (type) data = data.filter(d => d.type === type);
  if (leadId) data = data.filter(d => d.leadId === leadId);
  if (period) {
    data = data.filter(d => d.plannedDate.startsWith(period as string));
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

  const paginated = data.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return res.status(200).json({
    success: true,
    data: paginated,
    pagination: {
      total: data.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(data.length / limitNum),
    },
  });
}

async function handleCreatePlanning(req: NextApiRequest, res: NextApiResponse) {
  const { leadId, companyName, partnerType, type, title, description, plannedDate, targetCount, notes } = req.body;

  if (!type || !title) {
    return res.status(400).json({ success: false, error: 'Type and title are required' });
  }

  const mockItem: PlanningItem = {
    id: `plan-${Date.now()}`,
    leadId: leadId || '',
    companyName: companyName || 'Unknown',
    partnerType: partnerType || 'petshop',
    type,
    title,
    description: description || '',
    plannedDate: plannedDate || new Date().toISOString().split('T')[0],
    actualDate: null,
    status: 'planned',
    targetCount: targetCount || 1,
    actualCount: 0,
    outcome: '',
    notes: notes || '',
    createdBy: 'current-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return res.status(201).json({ success: true, data: mockItem, message: 'Planning item created' });
}

function generateMockPlanning(): PlanningItem[] {
  const items: PlanningItem[] = [];
  const partnerTypes = ['vet', 'petshop', 'petclinic', 'pethotel', 'pettransport'];
  const companies: Record<string, string[]> = {
    vet: ['Klinik Drh. Andi', 'Praktik Drh. Sari', 'VetCare Nusantara'],
    petshop: ['Happy Pet Shop', 'Paws & Claws', 'Pet Lovers Jakarta'],
    petclinic: ['Klinik Hewan Sehat', 'PetCare Clinic', 'VetMed Center'],
    pethotel: ['Pet Hotel Luxury', 'Paws Inn Resort', 'Animal Resort'],
    pettransport: ['PetTrans Express', 'Animal Logistic', 'Paws Delivery'],
  };
  const outcomes = [
    'Meeting berjalan baik, prospek positif',
    'Diskusi produk, minat tinggi',
    'Follow up needed, belum ada keputusan',
    'Kunjungan rutin, maintenance relasi',
    'Demo produk, feedback positif',
  ];

  // Generate visit plans for this week
  const today = new Date();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
  const statuses: PlanStatus[] = ['planned', 'completed', 'completed', 'completed', 'planned', 'cancelled', 'planned'];

  for (let i = 0; i < 14; i++) {
    const dayOffset = (i % 7);
    const date = new Date(today);
    date.setDate(date.getDate() + (dayOffset - today.getDay()));
    const dateStr = date.toISOString().split('T')[0];
    const pType = partnerTypes[i % partnerTypes.length];
    const companyList = companies[pType] || ['Unknown Partner'];
    const company = companyList[i % companyList.length];
    const isPast = date <= today;
    const status = isPast ? (statuses[dayOffset] === 'planned' ? 'completed' : statuses[dayOffset]) : 'planned';

    items.push({
      id: `plan-mock-${i + 1}`,
      leadId: `mock-lead-${i + 1}`,
      companyName: company,
      partnerType: pType,
      type: 'visit_plan',
      title: `Kunjungan ke ${company}`,
      description: `Visit ${dayNames[dayOffset]} — Follow up prospek dan presentasi produk`,
      plannedDate: dateStr,
      actualDate: isPast ? dateStr : null,
      status: status as PlanStatus,
      targetCount: 3,
      actualCount: isPast ? (status === 'completed' ? Math.floor(Math.random() * 3) + 1 : 0) : 0,
      outcome: isPast && status === 'completed' ? outcomes[i % outcomes.length] : '',
      notes: isPast ? 'Kunjungan berjalan lancar' : '',
      createdBy: 'user-sales-1',
      createdAt: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: dateStr + 'T10:00:00.000Z',
    });
  }

  // Daily reports
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayIdx = date.getDay();

    items.push({
      id: `daily-mock-${i + 1}`,
      leadId: '',
      companyName: '—',
      partnerType: 'petshop',
      type: 'daily_report',
      title: `Daily Report ${dayNames[dayIdx]}, ${dateStr}`,
      description: `Laporan harian — ${Math.floor(Math.random() * 4) + 1} kunjungan, ${Math.floor(Math.random() * 2)} prospek baru`,
      plannedDate: dateStr,
      actualDate: dateStr,
      status: 'completed',
      targetCount: 5,
      actualCount: Math.floor(Math.random() * 4) + 1,
      outcome: 'Produktifitas hari ini cukup baik',
      notes: `Total kunjungan: ${Math.floor(Math.random() * 4) + 1}, Prospek baru: ${Math.floor(Math.random() * 2) + 1}`,
      createdBy: 'user-sales-1',
      createdAt: dateStr + 'T17:00:00.000Z',
      updatedAt: dateStr + 'T17:00:00.000Z',
    });
  }

  // Weekly plans
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const label = `${weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const isPastWeek = weekEnd <= today;

    items.push({
      id: `weekly-plan-${w + 1}`,
      leadId: '',
      companyName: '—',
      partnerType: 'petshop',
      type: 'weekly_plan',
      title: `Weekly Plan: ${label}`,
      description: `Target kunjungan: ${(w + 1) * 5} prospek, fokus pada petshop area Jakarta`,
      plannedDate: weekStart.toISOString().split('T')[0],
      actualDate: isPastWeek ? weekEnd.toISOString().split('T')[0] : null,
      status: isPastWeek ? 'completed' : 'planned',
      targetCount: (w + 1) * 5,
      actualCount: isPastWeek ? Math.floor((w + 1) * 3) + 2 : 0,
      outcome: isPastWeek ? 'Target tercapai 70%' : '',
      notes: isPastWeek ? `Realisasi: ${Math.floor((w + 1) * 3) + 2} dari ${(w + 1) * 5} target` : 'Belum dimulai',
      createdBy: 'user-sales-1',
      createdAt: new Date(weekStart.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: weekStart.toISOString(),
    });
  }

  // Weekly reports
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const label = `${weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const isPastWeek = weekEnd <= today;

    items.push({
      id: `weekly-report-${w + 1}`,
      leadId: '',
      companyName: '—',
      partnerType: 'petshop',
      type: 'weekly_report',
      title: `Weekly Report: ${label}`,
      description: `Ringkasan aktivitas mingguan — ${(w + 1) * 5} target, ${Math.floor((w + 1) * 3) + 2} realisasi`,
      plannedDate: weekStart.toISOString().split('T')[0],
      actualDate: isPastWeek ? weekEnd.toISOString().split('T')[0] : null,
      status: isPastWeek ? 'completed' : 'planned',
      targetCount: (w + 1) * 5,
      actualCount: isPastWeek ? Math.floor((w + 1) * 3) + 2 : 0,
      outcome: isPastWeek ? `${Math.round(((Math.floor((w + 1) * 3) + 2) / ((w + 1) * 5)) * 100)}% achievement` : '',
      notes: isPastWeek ? `Kunjungan: ${Math.floor((w + 1) * 3) + 2}/${(w + 1) * 5}` : 'Laporan belum tersedia',
      createdBy: 'user-sales-1',
      createdAt: new Date(weekEnd.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: weekEnd.toISOString(),
    });
  }

  return items;
}

export default withHQAuth(handler);

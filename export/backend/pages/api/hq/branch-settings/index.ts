import type { NextApiRequest, NextApiResponse } from 'next';

interface BranchSettingTemplate {
  id: string;
  name: string;
  description: string;
  category: 'operations' | 'pricing' | 'notifications' | 'security';
  settings: Record<string, any>;
  appliedBranches: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mock templates data
const mockTemplates: BranchSettingTemplate[] = [
  {
    id: '1',
    name: 'Template Standar Retail',
    description: 'Pengaturan default untuk cabang retail',
    category: 'operations',
    settings: {
      openingTime: '08:00',
      closingTime: '21:00',
      maxCashInDrawer: 5000000,
      autoLogoutMinutes: 30,
      requireManagerApproval: true
    },
    appliedBranches: 5,
    isDefault: true,
    createdAt: '2024-01-01',
    updatedAt: '2026-02-15'
  },
  {
    id: '2',
    name: 'Template Kiosk Mall',
    description: 'Pengaturan untuk kiosk di mall',
    category: 'operations',
    settings: {
      openingTime: '10:00',
      closingTime: '22:00',
      maxCashInDrawer: 3000000,
      autoLogoutMinutes: 15,
      requireManagerApproval: false
    },
    appliedBranches: 3,
    isDefault: false,
    createdAt: '2024-02-15',
    updatedAt: '2026-02-10'
  },
  {
    id: '3',
    name: 'Harga Premium Jakarta',
    description: 'Markup harga untuk area Jakarta',
    category: 'pricing',
    settings: {
      priceMultiplier: 1.05,
      roundingMethod: 'nearest_100',
      minMargin: 15,
      maxDiscount: 20
    },
    appliedBranches: 2,
    isDefault: false,
    createdAt: '2024-03-01',
    updatedAt: '2026-02-01'
  },
  {
    id: '4',
    name: 'Notifikasi Default',
    description: 'Pengaturan notifikasi standar',
    category: 'notifications',
    settings: {
      lowStockAlert: true,
      lowStockThreshold: 10,
      dailyReportEmail: true,
      voidAlertToManager: true,
      salesTargetAlert: true
    },
    appliedBranches: 8,
    isDefault: true,
    createdAt: '2024-01-01',
    updatedAt: '2026-02-20'
  },
  {
    id: '5',
    name: 'Keamanan Tinggi',
    description: 'Pengaturan keamanan untuk cabang high-value',
    category: 'security',
    settings: {
      requirePinForVoid: true,
      requirePinForDiscount: true,
      maxVoidPerDay: 5,
      maxDiscountPercent: 10,
      auditLogRetentionDays: 365
    },
    appliedBranches: 2,
    isDefault: false,
    createdAt: '2024-04-01',
    updatedAt: '2026-01-15'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getTemplates(req, res);
      case 'POST':
        return createTemplate(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Branch Settings API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getTemplates(req: NextApiRequest, res: NextApiResponse) {
  const { category } = req.query;

  let templates = [...mockTemplates];
  
  if (category && category !== 'all') {
    templates = templates.filter(t => t.category === category);
  }

  return res.status(200).json({ templates });
}

function createTemplate(req: NextApiRequest, res: NextApiResponse) {
  const { name, description, category, settings, isDefault } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const newTemplate: BranchSettingTemplate = {
    id: Date.now().toString(),
    name,
    description: description || '',
    category,
    settings: settings || {},
    appliedBranches: 0,
    isDefault: isDefault || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockTemplates.push(newTemplate);

  return res.status(201).json({ template: newTemplate, message: 'Template created successfully' });
}

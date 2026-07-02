import type { NextApiRequest, NextApiResponse } from 'next';

interface Stocktake {
  id: string;
  stocktakeNumber: string;
  branch: { id: string; name: string; code: string };
  type: 'full' | 'partial' | 'cycle';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  totalItems: number;
  countedItems: number;
  varianceCount: number;
  varianceValue: number;
  assignedTo: string[];
  createdBy: string;
  notes?: string;
}

const mockStocktakes: Stocktake[] = [
  {
    id: '1', stocktakeNumber: 'SO-2026-0015',
    branch: { id: '1', name: 'Gudang Pusat', code: 'WH-001' },
    type: 'full', status: 'in_progress',
    scheduledDate: '2026-02-22', startedAt: '2026-02-22T08:00:00',
    totalItems: 1250, countedItems: 856, varianceCount: 23, varianceValue: -2450000,
    assignedTo: ['Staff Gudang 1', 'Staff Gudang 2', 'Supervisor'],
    createdBy: 'Admin HQ'
  },
  {
    id: '2', stocktakeNumber: 'SO-2026-0014',
    branch: { id: '3', name: 'Cabang Bandung', code: 'BR-002' },
    type: 'partial', status: 'completed',
    scheduledDate: '2026-02-21', startedAt: '2026-02-21T09:00:00', completedAt: '2026-02-21T14:00:00',
    totalItems: 350, countedItems: 350, varianceCount: 8, varianceValue: -850000,
    assignedTo: ['Manager Bandung', 'Staff 1'],
    createdBy: 'Manager Bandung', notes: 'Stock opname kategori Bahan Pokok'
  },
  {
    id: '3', stocktakeNumber: 'SO-2026-0013',
    branch: { id: '4', name: 'Cabang Surabaya', code: 'BR-003' },
    type: 'cycle', status: 'scheduled',
    scheduledDate: '2026-02-25',
    totalItems: 200, countedItems: 0, varianceCount: 0, varianceValue: 0,
    assignedTo: ['Staff Surabaya'],
    createdBy: 'Admin HQ', notes: 'Cycle count mingguan'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getStocktakes(req, res);
      case 'POST':
        return createStocktake(req, res);
      case 'PUT':
        return updateStocktake(req, res);
      case 'DELETE':
        return deleteStocktake(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Stocktake API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getStocktakes(req: NextApiRequest, res: NextApiResponse) {
  const { status, branchId, search } = req.query;
  
  let filtered = [...mockStocktakes];
  
  if (status && status !== 'all') {
    filtered = filtered.filter(s => s.status === status);
  }
  
  if (branchId) {
    filtered = filtered.filter(s => s.branch.id === branchId || s.branch.code === branchId);
  }
  
  if (search) {
    const searchStr = (search as string).toLowerCase();
    filtered = filtered.filter(s => 
      s.stocktakeNumber.toLowerCase().includes(searchStr) ||
      s.branch.name.toLowerCase().includes(searchStr)
    );
  }

  const stats = {
    scheduled: mockStocktakes.filter(s => s.status === 'scheduled').length,
    inProgress: mockStocktakes.filter(s => s.status === 'in_progress').length,
    completed: mockStocktakes.filter(s => s.status === 'completed').length,
    totalVariance: mockStocktakes.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.varianceValue, 0)
  };

  return res.status(200).json({ stocktakes: filtered, stats });
}

function createStocktake(req: NextApiRequest, res: NextApiResponse) {
  const { branchId, branchName, branchCode, type, scheduledDate, assignedTo, notes } = req.body;
  
  if (!branchId || !type || !scheduledDate) {
    return res.status(400).json({ error: 'Branch, type, and scheduled date are required' });
  }

  const newStocktake: Stocktake = {
    id: Date.now().toString(),
    stocktakeNumber: `SO-2026-${String(mockStocktakes.length + 16).padStart(4, '0')}`,
    branch: { id: branchId, name: branchName || 'Unknown', code: branchCode || 'UNK' },
    type,
    status: 'scheduled',
    scheduledDate,
    totalItems: 0,
    countedItems: 0,
    varianceCount: 0,
    varianceValue: 0,
    assignedTo: assignedTo || [],
    createdBy: 'Admin HQ',
    notes
  };

  return res.status(201).json({ stocktake: newStocktake, message: 'Stocktake scheduled successfully' });
}

function updateStocktake(req: NextApiRequest, res: NextApiResponse) {
  const { id, action, countedItems, varianceCount, varianceValue } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Stocktake ID is required' });
  }

  const stocktake = mockStocktakes.find(s => s.id === id);
  if (!stocktake) {
    return res.status(404).json({ error: 'Stocktake not found' });
  }

  if (action === 'start') {
    stocktake.status = 'in_progress';
    stocktake.startedAt = new Date().toISOString();
  } else if (action === 'complete') {
    stocktake.status = 'completed';
    stocktake.completedAt = new Date().toISOString();
    if (countedItems !== undefined) stocktake.countedItems = countedItems;
    if (varianceCount !== undefined) stocktake.varianceCount = varianceCount;
    if (varianceValue !== undefined) stocktake.varianceValue = varianceValue;
  } else if (action === 'cancel') {
    stocktake.status = 'cancelled';
  }

  return res.status(200).json({ stocktake, message: 'Stocktake updated successfully' });
}

function deleteStocktake(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Stocktake ID is required' });
  }

  return res.status(200).json({ message: 'Stocktake deleted successfully' });
}

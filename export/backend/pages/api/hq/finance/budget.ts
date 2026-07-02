import type { NextApiRequest, NextApiResponse } from 'next';

interface BudgetItem {
  id: string;
  category: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'on_track' | 'over';
}

interface BranchBudget {
  branchId: string;
  branchName: string;
  branchCode: string;
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'on_track' | 'over';
  items: BudgetItem[];
}

interface Budget {
  id: string;
  period: string;
  year: number;
  month: number;
  status: 'draft' | 'approved' | 'active' | 'closed';
  totalBudget: number;
  totalActual: number;
  variance: number;
  branches: BranchBudget[];
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
}

const mockBudgets: Budget[] = [
  {
    id: '1',
    period: 'Februari 2026',
    year: 2026,
    month: 2,
    status: 'active',
    totalBudget: 850000000,
    totalActual: 720000000,
    variance: -130000000,
    branches: [
      {
        branchId: '1', branchName: 'Gudang Pusat', branchCode: 'WH-001',
        totalBudget: 150000000, totalActual: 125000000, variance: -25000000, variancePercent: -16.67, status: 'under',
        items: [
          { id: '1', category: 'Operasional', budgetAmount: 80000000, actualAmount: 65000000, variance: -15000000, variancePercent: -18.75, status: 'under' },
          { id: '2', category: 'Gaji', budgetAmount: 50000000, actualAmount: 48000000, variance: -2000000, variancePercent: -4, status: 'on_track' },
          { id: '3', category: 'Utilitas', budgetAmount: 20000000, actualAmount: 12000000, variance: -8000000, variancePercent: -40, status: 'under' }
        ]
      },
      {
        branchId: '2', branchName: 'Cabang Jakarta', branchCode: 'HQ-001',
        totalBudget: 200000000, totalActual: 185000000, variance: -15000000, variancePercent: -7.5, status: 'on_track',
        items: [
          { id: '4', category: 'Operasional', budgetAmount: 100000000, actualAmount: 95000000, variance: -5000000, variancePercent: -5, status: 'on_track' },
          { id: '5', category: 'Gaji', budgetAmount: 70000000, actualAmount: 68000000, variance: -2000000, variancePercent: -2.86, status: 'on_track' },
          { id: '6', category: 'Marketing', budgetAmount: 30000000, actualAmount: 22000000, variance: -8000000, variancePercent: -26.67, status: 'under' }
        ]
      },
      {
        branchId: '3', branchName: 'Cabang Bandung', branchCode: 'BR-002',
        totalBudget: 120000000, totalActual: 135000000, variance: 15000000, variancePercent: 12.5, status: 'over',
        items: [
          { id: '7', category: 'Operasional', budgetAmount: 60000000, actualAmount: 72000000, variance: 12000000, variancePercent: 20, status: 'over' },
          { id: '8', category: 'Gaji', budgetAmount: 45000000, actualAmount: 48000000, variance: 3000000, variancePercent: 6.67, status: 'over' },
          { id: '9', category: 'Utilitas', budgetAmount: 15000000, actualAmount: 15000000, variance: 0, variancePercent: 0, status: 'on_track' }
        ]
      }
    ],
    createdBy: 'Admin HQ',
    approvedBy: 'Finance Director',
    createdAt: '2026-01-25T10:00:00',
    approvedAt: '2026-01-28T14:00:00'
  },
  {
    id: '2',
    period: 'Januari 2026',
    year: 2026,
    month: 1,
    status: 'closed',
    totalBudget: 800000000,
    totalActual: 785000000,
    variance: -15000000,
    branches: [],
    createdBy: 'Admin HQ',
    approvedBy: 'Finance Director',
    createdAt: '2025-12-20T10:00:00',
    approvedAt: '2025-12-23T14:00:00'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getBudgets(req, res);
      case 'POST':
        return createBudget(req, res);
      case 'PUT':
        return updateBudget(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Budget API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getBudgets(req: NextApiRequest, res: NextApiResponse) {
  const { year, month, status, branchId } = req.query;
  
  let filtered = [...mockBudgets];
  
  if (year) {
    filtered = filtered.filter(b => b.year === parseInt(year as string));
  }
  
  if (month) {
    filtered = filtered.filter(b => b.month === parseInt(month as string));
  }
  
  if (status && status !== 'all') {
    filtered = filtered.filter(b => b.status === status);
  }

  const summary = {
    totalBudget: filtered.reduce((sum, b) => sum + b.totalBudget, 0),
    totalActual: filtered.reduce((sum, b) => sum + b.totalActual, 0),
    totalVariance: filtered.reduce((sum, b) => sum + b.variance, 0),
    activeBudgets: filtered.filter(b => b.status === 'active').length,
    draftBudgets: filtered.filter(b => b.status === 'draft').length
  };

  return res.status(200).json({ budgets: filtered, summary });
}

function createBudget(req: NextApiRequest, res: NextApiResponse) {
  const { year, month, branches } = req.body;
  
  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const newBudget: Budget = {
    id: Date.now().toString(),
    period: `${monthNames[month]} ${year}`,
    year,
    month,
    status: 'draft',
    totalBudget: branches?.reduce((sum: number, b: any) => sum + (b.totalBudget || 0), 0) || 0,
    totalActual: 0,
    variance: 0,
    branches: branches || [],
    createdBy: 'Admin HQ',
    createdAt: new Date().toISOString()
  };

  return res.status(201).json({ budget: newBudget, message: 'Budget created successfully' });
}

function updateBudget(req: NextApiRequest, res: NextApiResponse) {
  const { id, action, branches, approvedBy } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Budget ID is required' });
  }

  const budget = mockBudgets.find(b => b.id === id);
  if (!budget) {
    return res.status(404).json({ error: 'Budget not found' });
  }

  if (action === 'approve') {
    budget.status = 'approved';
    budget.approvedBy = approvedBy || 'Finance Director';
    budget.approvedAt = new Date().toISOString();
  } else if (action === 'activate') {
    budget.status = 'active';
  } else if (action === 'close') {
    budget.status = 'closed';
  } else if (branches) {
    budget.branches = branches;
    budget.totalBudget = branches.reduce((sum: number, b: BranchBudget) => sum + b.totalBudget, 0);
  }

  return res.status(200).json({ budget, message: 'Budget updated successfully' });
}

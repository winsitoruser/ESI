import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';

let FinanceBudget: any;
try {
  const models = require('../../../../models');
  FinanceBudget = models.FinanceBudget;
} catch (e) { console.warn('FinanceBudget not available'); }

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.error('Budget API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

async function getBudgets(req: NextApiRequest, res: NextApiResponse) {
  const { year, month, status, branchId } = req.query;
  const ctx = getTenantContext(req);
  const tenantWhere: any = ctx.tenantId ? { tenantId: ctx.tenantId } : {};

  if (FinanceBudget) {
    try {
      const where: any = { ...tenantWhere };
      if (year) where.year = parseInt(year as string);
      if (month) where.month = parseInt(month as string);
      if (status && status !== 'all') where.status = status;

      const budgets = await FinanceBudget.findAll({ where, order: [['year', 'DESC'], ['month', 'DESC']] });
      if (budgets.length > 0) {
        // Compute alert levels based on utilization
        const enriched = budgets.map((b: any) => {
          const raw = b.toJSON ? b.toJSON() : b;
          const budgetAmt = parseFloat(raw.totalBudget || raw.budgetAmount || 0);
          const spentAmt = parseFloat(raw.totalActual || raw.spentAmount || 0);
          const utilization = budgetAmt > 0 ? Math.round((spentAmt / budgetAmt) * 10000) / 100 : 0;
          const alertThreshold = raw.alertThreshold || 80;
          const criticalThreshold = raw.critical_threshold || raw.criticalThreshold || 90;
          let alert_level = 'none';
          if (utilization >= 100) alert_level = 'exceeded';
          else if (utilization >= criticalThreshold) alert_level = 'critical';
          else if (utilization >= alertThreshold) alert_level = 'warning';
          return { ...raw, utilization, alert_level };
        });

        const alerts = enriched.filter((b: any) => b.alert_level !== 'none');

        const summary = {
          totalBudget: budgets.reduce((s: number, b: any) => s + parseFloat(b.totalBudget || b.budgetAmount || 0), 0),
          totalActual: budgets.reduce((s: number, b: any) => s + parseFloat(b.totalActual || b.spentAmount || 0), 0),
          totalVariance: budgets.reduce((s: number, b: any) => s + parseFloat(b.variance || 0), 0),
          activeBudgets: budgets.filter((b: any) => b.status === 'active').length,
          draftBudgets: budgets.filter((b: any) => b.status === 'draft').length,
          warningCount: alerts.filter((a: any) => a.alert_level === 'warning').length,
          criticalCount: alerts.filter((a: any) => a.alert_level === 'critical').length,
          exceededCount: alerts.filter((a: any) => a.alert_level === 'exceeded').length,
        };
        return res.status(HttpStatus.OK).json(successResponse({ budgets: enriched, summary, alerts }));
      }
    } catch (e: any) { console.warn('Budget DB failed:', e.message); }
  }

  // Mock fallback
  let filtered = [...mockBudgets];
  if (year) filtered = filtered.filter(b => b.year === parseInt(year as string));
  if (month) filtered = filtered.filter(b => b.month === parseInt(month as string));
  if (status && status !== 'all') filtered = filtered.filter(b => b.status === status);

  const summary = {
    totalBudget: filtered.reduce((sum, b) => sum + b.totalBudget, 0),
    totalActual: filtered.reduce((sum, b) => sum + b.totalActual, 0),
    totalVariance: filtered.reduce((sum, b) => sum + b.variance, 0),
    activeBudgets: filtered.filter(b => b.status === 'active').length,
    draftBudgets: filtered.filter(b => b.status === 'draft').length
  };

  return res.status(HttpStatus.OK).json(successResponse({ budgets: filtered, summary }));
}

async function createBudget(req: NextApiRequest, res: NextApiResponse) {
  const { year, month, branches } = req.body;
  if (!year || !month) {
    return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Year and month are required'));
  }

  const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  if (FinanceBudget) {
    try {
      const budget = await FinanceBudget.create({
        period: `${monthNames[month]} ${year}`, year, month, status: 'draft',
        totalBudget: branches?.reduce((sum: number, b: any) => sum + (b.totalBudget || 0), 0) || 0,
        totalActual: 0, variance: 0, branches: branches || [],
        createdBy: 'Admin HQ'
      });
      return res.status(HttpStatus.CREATED).json(successResponse(budget, undefined, 'Budget berhasil dibuat'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.DATABASE_ERROR, e.message));
    }
  }

  const newBudget: Budget = {
    id: Date.now().toString(), period: `${monthNames[month]} ${year}`, year, month, status: 'draft',
    totalBudget: branches?.reduce((sum: number, b: any) => sum + (b.totalBudget || 0), 0) || 0,
    totalActual: 0, variance: 0, branches: branches || [], createdBy: 'Admin HQ', createdAt: new Date().toISOString()
  };
  return res.status(HttpStatus.CREATED).json(successResponse(newBudget, undefined, 'Budget created successfully'));
}

async function updateBudget(req: NextApiRequest, res: NextApiResponse) {
  const { id, action, branches, approvedBy } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Budget ID is required'));

  if (FinanceBudget) {
    try {
      const budget = await FinanceBudget.findByPk(id);
      if (!budget) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Budget not found'));

      const updateData: any = {};
      if (action === 'approve') { updateData.status = 'approved'; updateData.approvedBy = approvedBy || 'Finance Director'; updateData.approvedAt = new Date(); }
      else if (action === 'activate') updateData.status = 'active';
      else if (action === 'close') updateData.status = 'closed';
      else if (branches) { updateData.branches = branches; updateData.totalBudget = branches.reduce((s: number, b: any) => s + (b.totalBudget || 0), 0); }

      await budget.update(updateData);
      return res.status(HttpStatus.OK).json(successResponse(budget, undefined, 'Budget diperbarui'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.DATABASE_ERROR, e.message));
    }
  }

  // Mock fallback
  const budget = mockBudgets.find(b => b.id === id);
  if (!budget) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Budget not found'));

  if (action === 'approve') { budget.status = 'approved'; budget.approvedBy = approvedBy || 'Finance Director'; budget.approvedAt = new Date().toISOString(); }
  else if (action === 'activate') budget.status = 'active';
  else if (action === 'close') budget.status = 'closed';
  else if (branches) { budget.branches = branches; budget.totalBudget = branches.reduce((sum: number, b: BranchBudget) => sum + b.totalBudget, 0); }

  return res.status(HttpStatus.OK).json(successResponse(budget, undefined, 'Budget updated successfully'));
}

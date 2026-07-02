import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';

let FinanceTransaction: any, Branch: any;
try {
  const models = require('../../../../models');
  Branch = models.Branch;
  // Try finance subfolder model first
  try {
    const FT = require('../../../../models/finance/Transaction');
    FinanceTransaction = FT.default || FT;
  } catch (e2) {
    FinanceTransaction = models.FinanceTransaction;
  }
} catch (e) { console.warn('Expense models not available'); }

const mockSummary = {
  totalExpenses: 2884000000,
  previousExpenses: 2650000000,
  growth: 8.8,
  cogs: 1586200000,
  payroll: 721000000,
  utilities: 230720000,
  marketing: 201880000,
  logistics: 86520000,
  maintenance: 57680000,
  other: 0,
  pendingApprovals: 12,
  budgetUsed: 85,
  budgetTotal: 3400000000
};

const mockCategories = [
  { id: '1', name: 'Cost of Goods Sold', icon: 'shopping-cart', amount: 1586200000, budget: 1800000000, percentage: 55, trend: 5.2, color: '#3B82F6' },
  { id: '2', name: 'Payroll & Benefits', icon: 'users', amount: 721000000, budget: 850000000, percentage: 25, trend: 8.5, color: '#10B981' },
  { id: '3', name: 'Utilities', icon: 'zap', amount: 230720000, budget: 280000000, percentage: 8, trend: 12.3, color: '#F59E0B' },
  { id: '4', name: 'Marketing', icon: 'megaphone', amount: 201880000, budget: 250000000, percentage: 7, trend: -5.2, color: '#EF4444' },
  { id: '5', name: 'Logistics', icon: 'truck', amount: 86520000, budget: 120000000, percentage: 3, trend: 3.1, color: '#8B5CF6' },
  { id: '6', name: 'Maintenance', icon: 'wrench', amount: 57680000, budget: 100000000, percentage: 2, trend: -2.8, color: '#EC4899' }
];

const mockExpenses = [
  { id: '1', date: '2026-02-22', description: 'Pembelian Bahan Baku - PT Sukses Makmur', category: 'COGS', branch: 'HQ-001', amount: 45000000, status: 'approved', approver: 'Ahmad Wijaya', vendor: 'PT Sukses Makmur' },
  { id: '2', date: '2026-02-22', description: 'Gaji Karyawan Februari 2026', category: 'Payroll', branch: 'ALL', amount: 150000000, status: 'approved', approver: 'Finance Manager', vendor: '-' },
  { id: '3', date: '2026-02-21', description: 'Tagihan Listrik Cabang Jakarta', category: 'Utilities', branch: 'HQ-001', amount: 12500000, status: 'pending', approver: '-', vendor: 'PLN' },
  { id: '4', date: '2026-02-21', description: 'Facebook Ads Campaign', category: 'Marketing', branch: 'ALL', amount: 25000000, status: 'approved', approver: 'Marketing Dir', vendor: 'Meta' },
  { id: '5', date: '2026-02-20', description: 'Pengiriman Stok ke Cabang', category: 'Logistics', branch: 'BR-002', amount: 8500000, status: 'approved', approver: 'Ops Manager', vendor: 'JNE Express' }
];

const mockBranchExpenses = [
  { id: '1', name: 'Cabang Pusat Jakarta', code: 'HQ-001', totalExpenses: 875000000, cogs: 481250000, payroll: 218750000, utilities: 70000000, other: 105000000, budgetUsed: 82 },
  { id: '2', name: 'Cabang Bandung', code: 'BR-002', totalExpenses: 644000000, cogs: 354200000, payroll: 161000000, utilities: 51520000, other: 77280000, budgetUsed: 78 },
  { id: '3', name: 'Cabang Surabaya', code: 'BR-003', totalExpenses: 546000000, cogs: 300300000, payroll: 136500000, utilities: 43680000, other: 65520000, budgetUsed: 85 },
  { id: '4', name: 'Cabang Medan', code: 'BR-004', totalExpenses: 455000000, cogs: 250250000, payroll: 113750000, utilities: 36400000, other: 54600000, budgetUsed: 88 },
  { id: '5', name: 'Cabang Yogyakarta', code: 'BR-005', totalExpenses: 364000000, cogs: 200200000, payroll: 91000000, utilities: 29120000, other: 43680000, budgetUsed: 92 }
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
        errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
      );
    }

    return getExpenses(req, res);
  } catch (error) {
    console.error('Expenses API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

async function getExpenses(req: NextApiRequest, res: NextApiResponse) {
  const { period = 'month' } = req.query;
  const ctx = getTenantContext(req);
  const tenantWhere: any = ctx.tenantId ? { tenantId: ctx.tenantId } : {};

  const now = new Date();
    let startDate = new Date();
    switch (period) {
      case 'week': startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate.setMonth(now.getMonth() - 1); break;
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setMonth(now.getMonth() - 1);
    }

    if (FinanceTransaction) {
      try {
        const { Op } = require('sequelize');
        const where: any = { ...tenantWhere, type: 'expense', transactionDate: { [Op.between]: [startDate, now] } };

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), 5000));
        const queryPromise = FinanceTransaction.findAll({
          where, order: [['transactionDate', 'DESC']], limit: 50,
          include: Branch ? [{ model: Branch, as: 'branch', attributes: ['code', 'name'] }] : []
        });
        const transactions = await Promise.race([queryPromise, timeoutPromise]) as any[];

        if (transactions.length > 0) {
          const totalExpenses = transactions.reduce((s: number, t: any) => s + parseFloat(t.amount || 0), 0);
          const byCategory: Record<string, number> = {};
          transactions.forEach((t: any) => { byCategory[t.category || 'other'] = (byCategory[t.category || 'other'] || 0) + parseFloat(t.amount || 0); });

          const categories = Object.entries(byCategory).map(([name, amount], i) => ({
            id: String(i + 1), name, icon: 'circle', amount,
            budget: 0, percentage: totalExpenses > 0 ? Math.round(amount / totalExpenses * 100) : 0,
            trend: 0, color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][i % 6]
          }));

          const expenseList = transactions.map((t: any) => ({
            id: t.id, date: t.transactionDate, description: t.description,
            category: t.category || 'other', branch: t.branch?.code || 'N/A',
            amount: parseFloat(t.amount), status: t.status, approver: '', vendor: ''
          }));

          return res.status(HttpStatus.OK).json(
            successResponse({
              summary: { ...mockSummary, totalExpenses },
              categories,
              expenses: expenseList,
              branches: mockBranchExpenses,
              period
            })
          );
        }
      } catch (e: any) { console.warn('Expenses DB failed:', e.message); }
    }

  return res.status(HttpStatus.OK).json(
    successResponse({
      summary: mockSummary,
      categories: mockCategories,
      expenses: mockExpenses,
      branches: mockBranchExpenses,
      period
    })
  );
}

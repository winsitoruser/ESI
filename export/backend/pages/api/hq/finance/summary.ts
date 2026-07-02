import type { NextApiRequest, NextApiResponse } from 'next';
import { Op } from 'sequelize';

let Branch: any, PosTransaction: any, FinanceTransaction: any;
try {
  const models = require('../../../../models');
  Branch = models.Branch;
  PosTransaction = models.PosTransaction;
  FinanceTransaction = models.FinanceTransaction;
} catch (e) {
  console.warn('Models not available');
}

const mockSummary = {
  totalRevenue: 4120000000,
  totalExpenses: 2884000000,
  grossProfit: 1236000000,
  netProfit: 824000000,
  grossMargin: 30,
  netMargin: 20,
  cashOnHand: 1250000000,
  accountsReceivable: 450000000,
  accountsPayable: 320000000,
  pendingInvoices: 45,
  overdueInvoices: 8,
  monthlyGrowth: 12.5,
  yearlyGrowth: 28.3
};

const mockBranches = [
  { id: '1', name: 'Cabang Pusat Jakarta', code: 'HQ-001', revenue: 1250000000, expenses: 875000000, profit: 375000000, margin: 30, growth: 15.2, status: 'excellent' },
  { id: '2', name: 'Cabang Bandung', code: 'BR-002', revenue: 920000000, expenses: 644000000, profit: 276000000, margin: 30, growth: 12.8, status: 'excellent' },
  { id: '3', name: 'Cabang Surabaya', code: 'BR-003', revenue: 780000000, expenses: 546000000, profit: 234000000, margin: 30, growth: 8.5, status: 'good' },
  { id: '4', name: 'Cabang Medan', code: 'BR-004', revenue: 650000000, expenses: 455000000, profit: 195000000, margin: 30, growth: 5.2, status: 'good' },
  { id: '5', name: 'Cabang Yogyakarta', code: 'BR-005', revenue: 520000000, expenses: 410000000, profit: 110000000, margin: 21, growth: -2.3, status: 'warning' }
];

const mockTransactions = [
  { id: '1', date: '2026-02-22', description: 'Penjualan Harian - Cabang Pusat', branch: 'HQ-001', type: 'income', category: 'Sales', amount: 45000000, status: 'completed' },
  { id: '2', date: '2026-02-22', description: 'Pembayaran Supplier PT Sukses', branch: 'HQ-001', type: 'expense', category: 'COGS', amount: 25000000, status: 'completed' },
  { id: '3', date: '2026-02-22', description: 'Transfer Dana ke Cabang Bandung', branch: 'BR-002', type: 'transfer', category: 'Transfer', amount: 50000000, status: 'pending' },
  { id: '4', date: '2026-02-21', description: 'Penjualan Online - GoFood', branch: 'BR-003', type: 'income', category: 'Sales', amount: 12500000, status: 'completed' },
  { id: '5', date: '2026-02-21', description: 'Pembayaran Gaji Karyawan', branch: 'ALL', type: 'expense', category: 'Payroll', amount: 150000000, status: 'completed' },
  { id: '6', date: '2026-02-21', description: 'Tagihan Listrik Cabang Medan', branch: 'BR-004', type: 'expense', category: 'Utilities', amount: 8500000, status: 'pending' }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { period = 'month', branchId } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case 'week': startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate.setMonth(now.getMonth() - 1); break;
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setMonth(now.getMonth() - 1);
    }

    let summary = mockSummary;
    let branches = mockBranches;
    let transactions = mockTransactions;
    
    // Try to fetch real data from database
    try {
      if (Branch && PosTransaction) {
        const dbBranches = await Branch.findAll({
          where: { isActive: true },
          attributes: ['id', 'code', 'name', 'type'],
          order: [['name', 'ASC']]
        });
        
        if (dbBranches && dbBranches.length > 0) {
          // Calculate revenue per branch from POS transactions
          const branchData = await Promise.all(dbBranches.map(async (branch: any) => {
            const whereClause: any = {
              branchId: branch.id,
              status: 'completed',
              transactionDate: { [Op.between]: [startDate, now] }
            };

            const revenue = await PosTransaction.sum('total', { where: whereClause }) || 0;
            
            // Get previous period for growth calculation
            const prevStart = new Date(startDate);
            const prevEnd = new Date(startDate);
            prevStart.setMonth(prevStart.getMonth() - 1);
            
            const prevRevenue = await PosTransaction.sum('total', {
              where: {
                branchId: branch.id,
                status: 'completed',
                transactionDate: { [Op.between]: [prevStart, prevEnd] }
              }
            }) || 0;

            const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100) : 0;
            const expenses = revenue * 0.7; // Estimate 70% as expenses
            const profit = revenue - expenses;
            const margin = revenue > 0 ? (profit / revenue * 100) : 0;

            return {
              id: branch.id,
              name: branch.name,
              code: branch.code,
              revenue: parseFloat(revenue.toString()),
              expenses: parseFloat(expenses.toString()),
              profit: parseFloat(profit.toString()),
              margin: Math.round(margin * 10) / 10,
              growth: Math.round(growth * 10) / 10,
              status: growth > 10 ? 'excellent' : growth > 0 ? 'good' : 'warning'
            };
          }));

          branches = branchData;

          // Calculate total summary
          const totalRevenue = branches.reduce((sum, b) => sum + b.revenue, 0);
          const totalExpenses = branches.reduce((sum, b) => sum + b.expenses, 0);
          const grossProfit = totalRevenue - totalExpenses;

          summary = {
            totalRevenue,
            totalExpenses,
            grossProfit,
            netProfit: grossProfit * 0.8,
            grossMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
            netMargin: totalRevenue > 0 ? Math.round((grossProfit * 0.8 / totalRevenue) * 100) : 0,
            cashOnHand: mockSummary.cashOnHand,
            accountsReceivable: mockSummary.accountsReceivable,
            accountsPayable: mockSummary.accountsPayable,
            pendingInvoices: mockSummary.pendingInvoices,
            overdueInvoices: mockSummary.overdueInvoices,
            monthlyGrowth: branches.length > 0 ? Math.round(branches.reduce((sum, b) => sum + b.growth, 0) / branches.length * 10) / 10 : 0,
            yearlyGrowth: mockSummary.yearlyGrowth
          };
        }
      }
    } catch (dbError) {
      console.log('Using mock data:', dbError);
    }

    // Filter by branch if specified
    if (branchId && branchId !== 'all') {
      branches = branches.filter(b => b.id === branchId || b.code === branchId);
    }

    return res.status(200).json({
      summary,
      branches,
      transactions,
      period
    });
  } catch (error) {
    console.error('Error fetching finance summary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

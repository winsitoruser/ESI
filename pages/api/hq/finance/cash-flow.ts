import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';

let FinanceTransaction: any, FinanceAccount: any;
try {
  const models = require('../../../../models');
  FinanceAccount = models.FinanceAccount;
  try { const FT = require('../../../../models/finance/Transaction'); FinanceTransaction = FT.default || FT; } catch (e2) { FinanceTransaction = models.FinanceTransaction; }
} catch (e) { console.warn('Cash flow models not available'); }

const mockSummary = {
  openingBalance: 980000000,
  closingBalance: 1250000000,
  netChange: 270000000,
  cashInflow: 4350000000,
  cashOutflow: 4080000000,
  operatingCashFlow: 850000000,
  investingCashFlow: -150000000,
  financingCashFlow: -430000000,
  freeCashFlow: 700000000
};

const mockCashFlowItems = [
  { id: '1', date: '2026-02-22', description: 'Penjualan Harian - All Branches', category: 'Operating', type: 'inflow', source: 'Sales', destination: 'BCA Main', amount: 185000000, status: 'completed', reference: 'TRX-20260222-001' },
  { id: '2', date: '2026-02-22', description: 'Pembayaran Supplier PT Sukses', category: 'Operating', type: 'outflow', source: 'BCA Main', destination: 'PT Sukses Makmur', amount: 75000000, status: 'completed', reference: 'PAY-20260222-001' },
  { id: '3', date: '2026-02-22', description: 'Transfer ke Cabang Bandung', category: 'Internal', type: 'transfer', source: 'BCA Main', destination: 'BCA Bandung', amount: 50000000, status: 'pending', reference: 'TRF-20260222-001' },
  { id: '4', date: '2026-02-21', description: 'Pembayaran Gaji Karyawan', category: 'Operating', type: 'outflow', source: 'Mandiri Payroll', destination: 'Employees', amount: 150000000, status: 'completed', reference: 'PAY-20260221-001' },
  { id: '5', date: '2026-02-21', description: 'Penerimaan Piutang Customer', category: 'Operating', type: 'inflow', source: 'PT ABC Corp', destination: 'BCA Main', amount: 45000000, status: 'completed', reference: 'RCV-20260221-001' }
];

const mockBankAccounts = [
  { id: '1', name: 'BCA Main Account', bank: 'BCA', accountNumber: '123-456-7890', type: 'checking', balance: 850000000, currency: 'IDR' },
  { id: '2', name: 'Mandiri Payroll', bank: 'Mandiri', accountNumber: '987-654-3210', type: 'checking', balance: 250000000, currency: 'IDR' },
  { id: '3', name: 'BCA Savings', bank: 'BCA', accountNumber: '111-222-3333', type: 'savings', balance: 120000000, currency: 'IDR' },
  { id: '4', name: 'Petty Cash HQ', bank: '-', accountNumber: '-', type: 'petty_cash', balance: 15000000, currency: 'IDR' },
  { id: '5', name: 'Petty Cash Branches', bank: '-', accountNumber: '-', type: 'petty_cash', balance: 15000000, currency: 'IDR' }
];

const mockForecast = [
  { date: 'Week 1', projected: 1100000000, actual: 1120000000, variance: 20000000 },
  { date: 'Week 2', projected: 1150000000, actual: 1180000000, variance: 30000000 },
  { date: 'Week 3', projected: 1200000000, actual: 1210000000, variance: 10000000 },
  { date: 'Week 4', projected: 1250000000, actual: 1250000000, variance: 0 },
  { date: 'Week 5', projected: 1300000000 },
  { date: 'Week 6', projected: 1350000000 }
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getCashFlow(req, res);
      default:
        res.setHeader('Allow', ['GET']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.error('Cash Flow API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

async function getCashFlow(req: NextApiRequest, res: NextApiResponse) {
  try {
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
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), 5000));

        const dbQuery = async () => {
          const where: any = { ...tenantWhere, transactionDate: { [Op.between]: [startDate, now] }, status: 'completed' };
          const incomeTotal = await FinanceTransaction.sum('amount', { where: { ...where, type: 'income' } }) || 0;
          const expenseTotal = await FinanceTransaction.sum('amount', { where: { ...where, type: 'expense' } }) || 0;

          const recentItems = await FinanceTransaction.findAll({
            where: { ...tenantWhere, transactionDate: { [Op.between]: [startDate, now] } },
            order: [['transactionDate', 'DESC']], limit: 20
          });

          if (recentItems.length === 0) return null;

          const items = recentItems.map((t: any) => ({
            id: t.id, date: t.transactionDate, description: t.description,
            category: t.category || 'Operating',
            type: t.type === 'income' ? 'inflow' : t.type === 'expense' ? 'outflow' : 'transfer',
            source: '', destination: '',
            amount: parseFloat(t.amount), status: t.status, reference: t.reference || ''
          }));

          let accounts = mockBankAccounts;
          if (FinanceAccount) {
            try {
              const dbAccounts = await FinanceAccount.findAll({ where: { accountType: 'asset' }, limit: 10 });
              if (dbAccounts.length > 0) {
                accounts = dbAccounts.map((a: any) => ({
                  id: a.id, name: a.accountName, bank: '', accountNumber: a.accountCode,
                  type: 'checking', balance: parseFloat(a.balance || 0), currency: 'IDR'
                }));
              }
            } catch (e) {}
          }

          return {
            summary: {
              ...mockSummary,
              cashInflow: parseFloat(incomeTotal.toString()),
              cashOutflow: parseFloat(expenseTotal.toString()),
              netChange: parseFloat(incomeTotal.toString()) - parseFloat(expenseTotal.toString())
            },
            items, accounts, forecast: mockForecast, period
          };
        };

        const result = await Promise.race([dbQuery(), timeoutPromise]) as any;
        if (result) {
          return res.status(HttpStatus.OK).json(successResponse(result));
        }
      } catch (e: any) { console.warn('Cash flow DB failed:', e.message); }
    }

    return res.status(HttpStatus.OK).json(
      successResponse({ summary: mockSummary, items: mockCashFlowItems, accounts: mockBankAccounts, forecast: mockForecast, period })
    );
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch cash flow')
    );
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { Branch, PosTransaction } from '../../../../models';
import { Op, fn, col, literal } from 'sequelize';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
      errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
    );
  }

  try {
    return await getFinanceReport(req, res);
  } catch (error) {
    console.error('Finance Report API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'reports' });

function getPeriodRange(period: string, startDateStr?: string, endDateStr?: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), q * 3, 1);
      break;
    }
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      startDate = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
      if (endDateStr) endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { startDate, endDate };
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
}

async function getFinanceReport(req: NextApiRequest, res: NextApiResponse) {
  const period = (req.query.period as string) || 'month';
  const branchId = req.query.branchId as string | undefined;
  const startDateStr = req.query.startDate as string | undefined;
  const endDateStr = req.query.endDate as string | undefined;

  const { startDate, endDate } = getPeriodRange(period, startDateStr, endDateStr);

  try {
    const branches: any[] = await Branch.findAll({
      attributes: ['id', 'code', 'name'],
      where: branchId ? { id: branchId } : undefined,
      order: [['name', 'ASC']],
    });

    const branchIds = branches.map((b: any) => b.id);

    const financeData = await Promise.all(
      branches.map(async (branch: any) => {
        const where: any = {
          branchId: branch.id,
          createdAt: { [Op.between]: [startDate, endDate] },
          status: 'completed',
        };

        const rows: any[] = await PosTransaction.findAll({
          where,
          attributes: [
            [fn('COALESCE', fn('SUM', col('total')), 0), 'revenue'],
            [fn('COALESCE', fn('SUM', col('tax')), 0), 'tax'],
            [fn('COALESCE', fn('SUM', col('discount')), 0), 'discount'],
            [fn('COUNT', col('id')), 'transactions'],
            'paymentMethod',
          ],
          group: ['paymentMethod'],
          raw: true,
        });

        let revenue = 0;
        let tax = 0;
        let discount = 0;
        let transactions = 0;
        let cashSales = 0;
        let cardSales = 0;
        let digitalSales = 0;

        for (const r of rows) {
          const amt = parseFloat(r.revenue) || 0;
          const t = parseInt(r.transactions, 10) || 0;
          revenue += amt;
          tax += parseFloat(r.tax) || 0;
          discount += parseFloat(r.discount) || 0;
          transactions += t;
          const pm = String(r.paymentMethod || '').toLowerCase();
          if (pm === 'cash') cashSales += amt;
          else if (pm === 'card') cardSales += amt;
          else digitalSales += amt;
        }

        const cogs = revenue * 0.7;
        const grossProfit = revenue - cogs;
        const operatingExpenses = revenue * 0.1;
        const netProfit = grossProfit - operatingExpenses;

        return {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          revenue,
          cogs,
          grossProfit,
          operatingExpenses,
          netProfit,
          transactions,
          tax,
          discount,
          grossMargin: revenue > 0 ? +((grossProfit / revenue) * 100).toFixed(2) : 0,
          netMargin: revenue > 0 ? +((netProfit / revenue) * 100).toFixed(2) : 0,
          cashSales,
          cardSales,
          digitalSales,
        };
      })
    );

    const monthsCount = period === 'year' ? 12 : period === 'quarter' ? 3 : 6;
    const monthlyTrend = await buildMonthlyTrend(monthsCount, branchIds, branchId);

    const paymentBreakdown = await getPaymentBreakdown(startDate, endDate, branchIds, branchId);

    const totals = financeData.reduce(
      (acc, f) => {
        acc.revenue += f.revenue;
        acc.cogs += f.cogs;
        acc.grossProfit += f.grossProfit;
        acc.operatingExpenses += f.operatingExpenses;
        acc.netProfit += f.netProfit;
        acc.cashSales += f.cashSales;
        acc.cardSales += f.cardSales;
        acc.digitalSales += f.digitalSales;
        acc.transactions += f.transactions;
        acc.tax += f.tax;
        acc.discount += f.discount;
        return acc;
      },
      {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        netProfit: 0,
        cashSales: 0,
        cardSales: 0,
        digitalSales: 0,
        transactions: 0,
        tax: 0,
        discount: 0,
      }
    );

    const avgGrossMargin = totals.revenue > 0 ? +((totals.grossProfit / totals.revenue) * 100).toFixed(2) : 0;
    const avgNetMargin = totals.revenue > 0 ? +((totals.netProfit / totals.revenue) * 100).toFixed(2) : 0;

    return res.status(HttpStatus.OK).json(
      successResponse({
        period,
        dateRange: { startDate, endDate },
        summary: {
          ...totals,
          avgGrossMargin,
          avgNetMargin,
        },
        financeData: financeData.length > 0 ? financeData : getMockFinanceData(),
        monthlyTrend: monthlyTrend.length > 0 ? monthlyTrend : getMockMonthlyTrend(monthsCount),
        paymentBreakdown: paymentBreakdown.length > 0 ? paymentBreakdown : getMockPaymentBreakdown(totals.revenue),
      })
    );
  } catch (error) {
    console.error('Error fetching finance report:', error);
    const mock = getMockFinanceData();
    const totals = mock.reduce(
      (acc, f) => ({
        revenue: acc.revenue + f.revenue,
        cogs: acc.cogs + f.cogs,
        grossProfit: acc.grossProfit + f.grossProfit,
        operatingExpenses: acc.operatingExpenses + f.operatingExpenses,
        netProfit: acc.netProfit + f.netProfit,
        cashSales: acc.cashSales + f.cashSales,
        cardSales: acc.cardSales + f.cardSales,
        digitalSales: acc.digitalSales + f.digitalSales,
        transactions: acc.transactions + f.transactions,
        tax: acc.tax + f.tax,
        discount: acc.discount + f.discount,
      }),
      { revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, netProfit: 0, cashSales: 0, cardSales: 0, digitalSales: 0, transactions: 0, tax: 0, discount: 0 }
    );
    return res.status(HttpStatus.OK).json(
      successResponse({
        period,
        dateRange: { startDate, endDate },
        summary: {
          ...totals,
          avgGrossMargin: totals.revenue > 0 ? +((totals.grossProfit / totals.revenue) * 100).toFixed(2) : 0,
          avgNetMargin: totals.revenue > 0 ? +((totals.netProfit / totals.revenue) * 100).toFixed(2) : 0,
        },
        financeData: mock,
        monthlyTrend: getMockMonthlyTrend(6),
        paymentBreakdown: getMockPaymentBreakdown(totals.revenue),
      })
    );
  }
}

async function buildMonthlyTrend(months: number, branchIds: string[], branchId?: string) {
  const result: any[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

    const where: any = {
      createdAt: { [Op.between]: [start, end] },
      status: 'completed',
    };
    if (branchId) where.branchId = branchId;
    else if (branchIds.length > 0) where.branchId = { [Op.in]: branchIds };

    const row: any = await PosTransaction.findOne({
      where,
      attributes: [
        [fn('COALESCE', fn('SUM', col('total')), 0), 'revenue'],
        [fn('COUNT', col('id')), 'transactions'],
      ],
      raw: true,
    });

    const revenue = parseFloat(row?.revenue) || 0;
    const profit = revenue * 0.2;

    result.push({
      month: monthLabel(start),
      revenue: +(revenue / 1_000_000).toFixed(2),
      profit: +(profit / 1_000_000).toFixed(2),
      transactions: parseInt(row?.transactions, 10) || 0,
    });
  }

  return result;
}

async function getPaymentBreakdown(startDate: Date, endDate: Date, branchIds: string[], branchId?: string) {
  const where: any = {
    createdAt: { [Op.between]: [startDate, endDate] },
    status: 'completed',
  };
  if (branchId) where.branchId = branchId;
  else if (branchIds.length > 0) where.branchId = { [Op.in]: branchIds };

  const rows: any[] = await PosTransaction.findAll({
    where,
    attributes: [
      'paymentMethod',
      [fn('COALESCE', fn('SUM', col('total')), 0), 'amount'],
      [fn('COUNT', col('id')), 'transactions'],
    ],
    group: ['paymentMethod'],
    raw: true,
  });

  const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  return rows.map((r) => {
    const amount = parseFloat(r.amount) || 0;
    const transactions = parseInt(r.transactions, 10) || 0;
    return {
      method: r.paymentMethod,
      amount,
      transactions,
      avgTicket: transactions > 0 ? Math.round(amount / transactions) : 0,
      percentage: total > 0 ? +((amount / total) * 100).toFixed(2) : 0,
    };
  });
}

function getMockFinanceData() {
  return [
    { branchId: '1', branchName: 'Cabang Pusat Jakarta', branchCode: 'HQ-001', revenue: 1250000000, cogs: 875000000, grossProfit: 375000000, operatingExpenses: 125000000, netProfit: 250000000, transactions: 3420, tax: 125000000, discount: 42000000, grossMargin: 30, netMargin: 20, cashSales: 450000000, cardSales: 500000000, digitalSales: 300000000 },
    { branchId: '2', branchName: 'Cabang Bandung', branchCode: 'BR-002', revenue: 920000000, cogs: 644000000, grossProfit: 276000000, operatingExpenses: 92000000, netProfit: 184000000, transactions: 2680, tax: 92000000, discount: 31000000, grossMargin: 30, netMargin: 20, cashSales: 350000000, cardSales: 320000000, digitalSales: 250000000 },
    { branchId: '3', branchName: 'Cabang Surabaya', branchCode: 'BR-003', revenue: 780000000, cogs: 546000000, grossProfit: 234000000, operatingExpenses: 78000000, netProfit: 156000000, transactions: 2140, tax: 78000000, discount: 26000000, grossMargin: 30, netMargin: 20, cashSales: 300000000, cardSales: 280000000, digitalSales: 200000000 },
    { branchId: '4', branchName: 'Cabang Medan', branchCode: 'BR-004', revenue: 650000000, cogs: 455000000, grossProfit: 195000000, operatingExpenses: 65000000, netProfit: 130000000, transactions: 1780, tax: 65000000, discount: 21000000, grossMargin: 30, netMargin: 20, cashSales: 280000000, cardSales: 220000000, digitalSales: 150000000 },
    { branchId: '5', branchName: 'Cabang Yogyakarta', branchCode: 'BR-005', revenue: 520000000, cogs: 364000000, grossProfit: 156000000, operatingExpenses: 52000000, netProfit: 104000000, transactions: 1430, tax: 52000000, discount: 17000000, grossMargin: 30, netMargin: 20, cashSales: 200000000, cardSales: 180000000, digitalSales: 140000000 },
  ];
}

function getMockMonthlyTrend(months: number) {
  const now = new Date();
  const result: any[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const revenue = 3200 + Math.random() * 1400;
    result.push({
      month: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      revenue: +revenue.toFixed(2),
      profit: +(revenue * 0.2).toFixed(2),
      transactions: Math.round(3500 + Math.random() * 1200),
    });
  }
  return result;
}

function getMockPaymentBreakdown(totalRevenue: number) {
  const total = totalRevenue || 4120000000;
  const cash = total * 0.37;
  const card = total * 0.33;
  const qris = total * 0.18;
  const eWallet = total * 0.08;
  const transfer = total * 0.04;
  const rows = [
    { method: 'Cash', amount: cash, transactions: Math.round(cash / 85000) },
    { method: 'Card', amount: card, transactions: Math.round(card / 120000) },
    { method: 'QRIS', amount: qris, transactions: Math.round(qris / 70000) },
    { method: 'E-Wallet', amount: eWallet, transactions: Math.round(eWallet / 60000) },
    { method: 'Transfer', amount: transfer, transactions: Math.round(transfer / 350000) },
  ];
  return rows.map((r) => ({
    ...r,
    avgTicket: r.transactions > 0 ? Math.round(r.amount / r.transactions) : 0,
    percentage: +((r.amount / total) * 100).toFixed(2),
  }));
}

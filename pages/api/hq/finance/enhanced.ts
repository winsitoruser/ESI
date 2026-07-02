import type { NextApiRequest, NextApiResponse } from 'next';
import { Op } from 'sequelize';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';

let Branch: any, PosTransaction: any, FinanceTransaction: any, FinanceInvoice: any, FinanceAccount: any, User: any;
try {
  const models = require('../../../../models');
  Branch = models.Branch;
  PosTransaction = models.PosTransaction;
  User = models.User;
  try {
    const TxModel = require('../../../../models/finance/Transaction');
    const InvModel = require('../../../../models/finance/Invoice');
    const AccModel = require('../../../../models/finance/Account');
    FinanceTransaction = TxModel.default || TxModel;
    FinanceInvoice = InvModel.default || InvModel;
    FinanceAccount = AccModel.default || AccModel;
  } catch (e) { /* finance models may not exist yet */ }
} catch (e) {
  console.warn('Models not available for enhanced finance:', e);
}

// ─── Helpers ───
const ok = (res: NextApiResponse, data: any) => res.status(200).json({ success: true, ...data });
const fail = (res: NextApiResponse, msg: string, status = 500) => res.status(status).json({ success: false, error: msg });

const formatCur = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;

// ─── Industry KPI definitions ───
const INDUSTRY_KPIS: Record<string, { key: string; label: string; unit: string; target: number }[]> = {
  general: [
    { key: 'grossMargin', label: 'Gross Margin', unit: '%', target: 30 },
    { key: 'netMargin', label: 'Net Margin', unit: '%', target: 15 },
    { key: 'currentRatio', label: 'Current Ratio', unit: 'x', target: 2.0 },
    { key: 'debtToEquity', label: 'Debt to Equity', unit: 'x', target: 1.0 },
    { key: 'roiPercent', label: 'ROI', unit: '%', target: 20 },
    { key: 'operatingCashRatio', label: 'Operating Cash Ratio', unit: 'x', target: 0.5 },
  ],
  fnb: [
    { key: 'foodCostPercent', label: 'Food Cost %', unit: '%', target: 30 },
    { key: 'beverageCostPercent', label: 'Beverage Cost %', unit: '%', target: 25 },
    { key: 'laborCostPercent', label: 'Labor Cost %', unit: '%', target: 28 },
    { key: 'revPerSeat', label: 'Revenue per Seat', unit: 'Rp', target: 150000 },
    { key: 'tableOccupancyRate', label: 'Table Occupancy', unit: '%', target: 75 },
    { key: 'avgTicketSize', label: 'Avg Ticket Size', unit: 'Rp', target: 85000 },
  ],
  retail: [
    { key: 'grossMargin', label: 'Gross Margin', unit: '%', target: 35 },
    { key: 'inventoryTurnover', label: 'Inventory Turnover', unit: 'x', target: 8 },
    { key: 'salesPerSqm', label: 'Sales per sqm', unit: 'Rp', target: 5000000 },
    { key: 'shrinkageRate', label: 'Shrinkage Rate', unit: '%', target: 1.5 },
    { key: 'avgBasketSize', label: 'Avg Basket Size', unit: 'Rp', target: 250000 },
    { key: 'conversionRate', label: 'Conversion Rate', unit: '%', target: 30 },
  ],
  pharmacy: [
    { key: 'grossMargin', label: 'Gross Margin', unit: '%', target: 25 },
    { key: 'prescriptionRevPct', label: 'Prescription Revenue %', unit: '%', target: 60 },
    { key: 'otcRevPct', label: 'OTC Revenue %', unit: '%', target: 40 },
    { key: 'expiryLossRate', label: 'Expiry Loss Rate', unit: '%', target: 0.5 },
    { key: 'avgRxValue', label: 'Avg Rx Value', unit: 'Rp', target: 350000 },
    { key: 'inventoryTurnover', label: 'Inventory Turnover', unit: 'x', target: 12 },
  ],
  hospitality: [
    { key: 'revPAR', label: 'RevPAR', unit: 'Rp', target: 500000 },
    { key: 'adr', label: 'ADR', unit: 'Rp', target: 750000 },
    { key: 'occupancyRate', label: 'Occupancy Rate', unit: '%', target: 75 },
    { key: 'gopPAR', label: 'GOPPAR', unit: 'Rp', target: 350000 },
    { key: 'trevPAR', label: 'TRevPAR', unit: 'Rp', target: 650000 },
    { key: 'laborCostPct', label: 'Labor Cost %', unit: '%', target: 30 },
  ],
  manufacturing: [
    { key: 'grossMargin', label: 'Gross Margin', unit: '%', target: 25 },
    { key: 'cogsPercent', label: 'COGS %', unit: '%', target: 65 },
    { key: 'overheadRate', label: 'Overhead Rate', unit: '%', target: 15 },
    { key: 'capacityUtilization', label: 'Capacity Utilization', unit: '%', target: 80 },
    { key: 'yieldRate', label: 'Yield Rate', unit: '%', target: 95 },
    { key: 'costPerUnit', label: 'Cost per Unit', unit: 'Rp', target: 50000 },
  ],
  logistics: [
    { key: 'revenuePerKm', label: 'Revenue per KM', unit: 'Rp', target: 5000 },
    { key: 'fuelCostPct', label: 'Fuel Cost %', unit: '%', target: 30 },
    { key: 'operatingRatio', label: 'Operating Ratio', unit: '%', target: 85 },
    { key: 'deliveryMargin', label: 'Delivery Margin', unit: '%', target: 20 },
    { key: 'fleetUtilization', label: 'Fleet Utilization', unit: '%', target: 80 },
    { key: 'claimRate', label: 'Claim Rate', unit: '%', target: 0.5 },
  ],
  finance: [
    { key: 'nim', label: 'NIM', unit: '%', target: 5 },
    { key: 'nplRatio', label: 'NPL Ratio', unit: '%', target: 3 },
    { key: 'car', label: 'CAR', unit: '%', target: 15 },
    { key: 'ldr', label: 'LDR', unit: '%', target: 90 },
    { key: 'roe', label: 'ROE', unit: '%', target: 15 },
    { key: 'costToIncome', label: 'Cost to Income', unit: '%', target: 45 },
  ],
  workshop: [
    { key: 'laborEfficiency', label: 'Labor Efficiency', unit: '%', target: 85 },
    { key: 'partsMargin', label: 'Parts Margin', unit: '%', target: 30 },
    { key: 'serviceMargin', label: 'Service Margin', unit: '%', target: 55 },
    { key: 'avgRepairOrder', label: 'Avg Repair Order', unit: 'Rp', target: 1500000 },
    { key: 'bayUtilization', label: 'Bay Utilization', unit: '%', target: 75 },
    { key: 'comebackRate', label: 'Comeback Rate', unit: '%', target: 2 },
  ],
  distributor: [
    { key: 'grossMargin', label: 'Gross Margin', unit: '%', target: 12 },
    { key: 'dso', label: 'DSO (Days)', unit: 'days', target: 30 },
    { key: 'dpo', label: 'DPO (Days)', unit: 'days', target: 45 },
    { key: 'inventoryDays', label: 'Inventory Days', unit: 'days', target: 21 },
    { key: 'orderFillRate', label: 'Order Fill Rate', unit: '%', target: 97 },
    { key: 'logisticsCostPct', label: 'Logistics Cost %', unit: '%', target: 8 },
  ],
  rental: [
    { key: 'utilizationRate', label: 'Utilization Rate', unit: '%', target: 75 },
    { key: 'revPerAsset', label: 'Revenue per Asset', unit: 'Rp', target: 5000000 },
    { key: 'maintenanceCostPct', label: 'Maintenance Cost %', unit: '%', target: 15 },
    { key: 'depreciationPct', label: 'Depreciation %', unit: '%', target: 20 },
    { key: 'roaPercent', label: 'ROA', unit: '%', target: 10 },
    { key: 'defaultRate', label: 'Default Rate', unit: '%', target: 2 },
  ],
  property: [
    { key: 'occupancyRate', label: 'Occupancy Rate', unit: '%', target: 90 },
    { key: 'noi', label: 'NOI Margin', unit: '%', target: 60 },
    { key: 'capRate', label: 'Cap Rate', unit: '%', target: 7 },
    { key: 'costPerSqm', label: 'Cost per sqm', unit: 'Rp', target: 15000000 },
    { key: 'rentalYield', label: 'Rental Yield', unit: '%', target: 8 },
    { key: 'tenantRetention', label: 'Tenant Retention', unit: '%', target: 85 },
  ],
};

// ─── Mock data generators ───
function generateMockDashboard(period: string, industry: string) {
  const multiplier = period === 'year' ? 12 : period === 'quarter' ? 3 : 1;
  const base = 4120000000 * multiplier / 12;

  return {
    summary: {
      totalRevenue: Math.round(base),
      totalExpenses: Math.round(base * 0.7),
      grossProfit: Math.round(base * 0.4),
      netProfit: Math.round(base * 0.2),
      grossMargin: 40,
      netMargin: 20,
      ebitda: Math.round(base * 0.25),
      ebitdaMargin: 25,
      cashOnHand: 1250000000,
      accountsReceivable: 450000000,
      accountsPayable: 320000000,
      pendingInvoices: 45,
      overdueInvoices: 8,
      monthlyGrowth: 12.5,
      yearlyGrowth: 28.3,
      operatingCashFlow: 850000000,
      freeCashFlow: 700000000,
      workingCapital: 380000000,
      currentRatio: 2.1,
      quickRatio: 1.5,
      debtToEquity: 0.6,
      returnOnEquity: 22.5,
      returnOnAssets: 12.8,
    },
    branches: [
      { id: '1', name: 'Cabang Pusat Jakarta', code: 'HQ-001', revenue: Math.round(base * 0.3), expenses: Math.round(base * 0.21), profit: Math.round(base * 0.09), margin: 30, growth: 15.2, status: 'excellent', healthScore: 92 },
      { id: '2', name: 'Cabang Bandung', code: 'BR-002', revenue: Math.round(base * 0.22), expenses: Math.round(base * 0.154), profit: Math.round(base * 0.066), margin: 30, growth: 12.8, status: 'excellent', healthScore: 87 },
      { id: '3', name: 'Cabang Surabaya', code: 'BR-003', revenue: Math.round(base * 0.19), expenses: Math.round(base * 0.133), profit: Math.round(base * 0.057), margin: 30, growth: 8.5, status: 'good', healthScore: 78 },
      { id: '4', name: 'Cabang Medan', code: 'BR-004', revenue: Math.round(base * 0.16), expenses: Math.round(base * 0.112), profit: Math.round(base * 0.048), margin: 30, growth: 5.2, status: 'good', healthScore: 72 },
      { id: '5', name: 'Cabang Yogyakarta', code: 'BR-005', revenue: Math.round(base * 0.13), expenses: Math.round(base * 0.103), profit: Math.round(base * 0.027), margin: 21, growth: -2.3, status: 'warning', healthScore: 58 },
    ],
    transactions: [
      { id: '1', date: '2026-02-28', description: 'Penjualan Harian - Cabang Pusat', branch: 'HQ-001', type: 'income', category: 'Sales', amount: 45000000, status: 'completed' },
      { id: '2', date: '2026-02-28', description: 'Pembayaran Supplier PT Sukses', branch: 'HQ-001', type: 'expense', category: 'COGS', amount: 25000000, status: 'completed' },
      { id: '3', date: '2026-02-28', description: 'Transfer Dana ke Cabang Bandung', branch: 'BR-002', type: 'transfer', category: 'Transfer', amount: 50000000, status: 'pending' },
      { id: '4', date: '2026-02-27', description: 'Penjualan Online - GoFood', branch: 'BR-003', type: 'income', category: 'Sales', amount: 12500000, status: 'completed' },
      { id: '5', date: '2026-02-27', description: 'Pembayaran Gaji Karyawan', branch: 'ALL', type: 'expense', category: 'Payroll', amount: 150000000, status: 'completed' },
      { id: '6', date: '2026-02-27', description: 'Tagihan Listrik Cabang Medan', branch: 'BR-004', type: 'expense', category: 'Utilities', amount: 8500000, status: 'pending' },
      { id: '7', date: '2026-02-26', description: 'Pendapatan Catering Event', branch: 'BR-002', type: 'income', category: 'Catering', amount: 32000000, status: 'completed' },
      { id: '8', date: '2026-02-26', description: 'Pembayaran Sewa Ruko', branch: 'BR-005', type: 'expense', category: 'Rent', amount: 15000000, status: 'completed' },
    ],
  };
}

function generateMockRatios(industry: string) {
  const kpis = INDUSTRY_KPIS[industry] || INDUSTRY_KPIS.general;
  return kpis.map(kpi => ({
    ...kpi,
    actual: +(kpi.target * (0.7 + Math.random() * 0.6)).toFixed(2),
    previousPeriod: +(kpi.target * (0.65 + Math.random() * 0.5)).toFixed(2),
    trend: Math.round((Math.random() - 0.3) * 20 * 10) / 10,
  }));
}

function generateMockForecast() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonth = now.getMonth();
  return months.map((m, i) => ({
    month: m,
    projectedRevenue: Math.round((300 + Math.random() * 100) * 1000000),
    actualRevenue: i <= currentMonth ? Math.round((280 + Math.random() * 120) * 1000000) : null,
    projectedExpenses: Math.round((200 + Math.random() * 60) * 1000000),
    actualExpenses: i <= currentMonth ? Math.round((190 + Math.random() * 70) * 1000000) : null,
    projectedProfit: Math.round((80 + Math.random() * 50) * 1000000),
    actualProfit: i <= currentMonth ? Math.round((70 + Math.random() * 60) * 1000000) : null,
    isForecast: i > currentMonth,
  }));
}

function generateMockTrend(period: string) {
  const points = period === 'year' ? 12 : period === 'quarter' ? 13 : period === 'month' ? 30 : 7;
  const labels = [];
  const revenue = [];
  const expenses = [];
  const profit = [];

  for (let i = 0; i < points; i++) {
    if (period === 'year') labels.push(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]);
    else if (period === 'quarter') labels.push(`W${i + 1}`);
    else labels.push(`D${i + 1}`);

    const rev = Math.round((300 + Math.random() * 100 + i * 3) * 1000000);
    const exp = Math.round(rev * (0.6 + Math.random() * 0.15));
    revenue.push(rev);
    expenses.push(exp);
    profit.push(rev - exp);
  }

  return { labels, revenue, expenses, profit };
}

function generateMockExpenseBreakdown() {
  return [
    { category: 'COGS', amount: 2060000000, percentage: 55, budget: 2200000000, trend: -2.3 },
    { category: 'Payroll', amount: 935000000, percentage: 25, budget: 950000000, trend: 1.5 },
    { category: 'Utilities', amount: 299000000, percentage: 8, budget: 320000000, trend: 3.2 },
    { category: 'Marketing', amount: 262000000, percentage: 7, budget: 280000000, trend: -5.1 },
    { category: 'Logistics', amount: 112000000, percentage: 3, budget: 120000000, trend: 0.8 },
    { category: 'Other', amount: 75000000, percentage: 2, budget: 100000000, trend: -1.0 },
  ];
}

function generateMockCashFlowForecast() {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5 (Est)', 'Week 6 (Est)', 'Week 7 (Est)', 'Week 8 (Est)'];
  return weeks.map((w, i) => ({
    label: w,
    inflow: Math.round((800 + Math.random() * 300) * 1000000),
    outflow: Math.round((600 + Math.random() * 250) * 1000000),
    netFlow: 0,
    cumulative: 0,
    isForecast: i >= 4,
  })).map((item, i, arr) => {
    item.netFlow = item.inflow - item.outflow;
    item.cumulative = (i > 0 ? arr[i - 1].cumulative : 1250000000) + item.netFlow;
    return item;
  });
}

function calculateFinancialHealth(summary: any): { score: number; grade: string; factors: any[] } {
  let score = 0;
  const factors = [];

  // Profitability (30 points)
  const profitScore = Math.min(30, Math.max(0, summary.netMargin * 1.5));
  score += profitScore;
  factors.push({ name: 'Profitability', score: Math.round(profitScore), max: 30, detail: `Net Margin ${summary.netMargin}%` });

  // Liquidity (20 points)
  const liquidityScore = Math.min(20, Math.max(0, (summary.currentRatio || 2) * 10));
  score += liquidityScore;
  factors.push({ name: 'Liquidity', score: Math.round(liquidityScore), max: 20, detail: `Current Ratio ${summary.currentRatio || 2}x` });

  // Cash Flow (20 points)
  const cashScore = summary.operatingCashFlow > 0 ? 20 : summary.operatingCashFlow > -100000000 ? 10 : 0;
  score += cashScore;
  factors.push({ name: 'Cash Flow', score: cashScore, max: 20, detail: `OCF ${formatCur(summary.operatingCashFlow || 0)}` });

  // Growth (15 points)
  const growthScore = Math.min(15, Math.max(0, (summary.monthlyGrowth || 0) + 5));
  score += growthScore;
  factors.push({ name: 'Growth', score: Math.round(growthScore), max: 15, detail: `MoM ${summary.monthlyGrowth || 0}%` });

  // Efficiency (15 points)
  const effScore = Math.min(15, Math.max(0, 15 - (summary.debtToEquity || 0.6) * 10));
  score += effScore;
  factors.push({ name: 'Efficiency', score: Math.round(effScore), max: 15, detail: `D/E ${summary.debtToEquity || 0.6}x` });

  const total = Math.round(Math.min(100, score));
  const grade = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F';

  return { score: total, grade, factors };
}

// ─── Main handler ───
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return fail(res, `Method ${req.method} Not Allowed`, 405);
  }

  try {
    const { action = 'dashboard', period = 'month', industry = 'general', branchId } = req.query as Record<string, string>;
    const ctx = getTenantContext(req);
    const tenantWhere: any = ctx.tenantId ? { tenantId: ctx.tenantId } : {};

    switch (action) {
      case 'dashboard': {
        const data = generateMockDashboard(period, industry);

        // Try to augment with real data
        try {
          if (Branch && PosTransaction) {
            const now = new Date();
            let startDate = new Date();
            switch (period) {
              case 'day': startDate.setDate(now.getDate() - 1); break;
              case 'week': startDate.setDate(now.getDate() - 7); break;
              case 'month': startDate.setMonth(now.getMonth() - 1); break;
              case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
              case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
            }

            const where: any = { ...tenantWhere, createdAt: { [Op.gte]: startDate } };
            if (branchId && branchId !== 'all') where.branchId = branchId;

            const txCount = await PosTransaction.count({ where });
            if (txCount > 0) {
              const txSum = await PosTransaction.sum('grandTotal', { where });
              if (txSum) {
                data.summary.totalRevenue = txSum;
                // Try to get actual expenses from FinanceTransaction
                let totalExpenses = 0;
                if (FinanceTransaction) {
                  try {
                    const expWhere: any = { ...tenantWhere, type: 'expense', status: 'completed', transactionDate: { [Op.gte]: startDate } };
                    if (branchId && branchId !== 'all') expWhere.branchId = branchId;
                    totalExpenses = await FinanceTransaction.sum('amount', { where: expWhere }) || 0;
                  } catch (e) {}
                }
                if (totalExpenses > 0) {
                  data.summary.totalExpenses = totalExpenses;
                  data.summary.grossProfit = Math.round(txSum - totalExpenses);
                  data.summary.netProfit = Math.round((txSum - totalExpenses) * 0.78); // after 22% PPh Badan
                } else {
                  // Fallback to estimates when no expense data
                  data.summary.grossProfit = Math.round(txSum * 0.4);
                  data.summary.netProfit = Math.round(txSum * 0.2);
                }
              }
            }
          }
        } catch (e) { /* fallback to mock */ }

        const health = calculateFinancialHealth(data.summary);
        return ok(res, { data: { ...data, health } });
      }

      case 'ratios': {
        const ratios = generateMockRatios(industry);
        return ok(res, { data: { industry, kpis: INDUSTRY_KPIS[industry] || INDUSTRY_KPIS.general, ratios } });
      }

      case 'industry-kpis': {
        return ok(res, { data: { industries: Object.keys(INDUSTRY_KPIS), kpis: INDUSTRY_KPIS } });
      }

      case 'forecast': {
        const forecast = generateMockForecast();
        return ok(res, { data: { forecast } });
      }

      case 'trend': {
        const trend = generateMockTrend(period);
        return ok(res, { data: { trend } });
      }

      case 'expense-breakdown': {
        const expenses = generateMockExpenseBreakdown();
        return ok(res, { data: { expenses } });
      }

      case 'cash-flow-forecast': {
        const cashFlow = generateMockCashFlowForecast();
        return ok(res, { data: { cashFlow } });
      }

      case 'health': {
        const dashData = generateMockDashboard(period, industry);
        const health = calculateFinancialHealth(dashData.summary);
        return ok(res, { data: { health } });
      }

      case 'branch-comparison': {
        const dashData = generateMockDashboard(period, industry);
        const comparison = dashData.branches.map(b => ({
          ...b,
          revenuePerEmployee: Math.round(b.revenue / (15 + Math.random() * 10)),
          profitPerEmployee: Math.round(b.profit / (15 + Math.random() * 10)),
          expenseRatio: Math.round((b.expenses / b.revenue) * 100),
          roi: Math.round((b.profit / b.expenses) * 100),
        }));
        return ok(res, { data: { comparison } });
      }

      case 'export': {
        const dashData = generateMockDashboard(period, industry);
        const rows = dashData.branches.map(b =>
          `${b.code},${b.name},${b.revenue},${b.expenses},${b.profit},${b.margin},${b.growth},${b.status}`
        );
        const csv = `Code,Name,Revenue,Expenses,Profit,Margin%,Growth%,Status\n${rows.join('\n')}`;
        return ok(res, { data: { csv, filename: `finance-report-${period}-${new Date().toISOString().slice(0, 10)}.csv` } });
      }

      default:
        return fail(res, `Unknown action: ${action}`, 400);
    }
  } catch (error: any) {
    console.error('Enhanced Finance API Error:', error);
    return fail(res, error.message || 'Internal Server Error');
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

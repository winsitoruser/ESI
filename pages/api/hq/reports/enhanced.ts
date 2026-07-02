import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) { console.warn('Sequelize not available for enhanced reports'); }

const ok = (res: any, data: any) => res.status(200).json({ success: true, ...data });
const fail = (res: any, msg: string, status = 500) => res.status(status).json({ success: false, error: msg });

function generateCrossModuleKPIs() {
  return {
    sales: {
      totalRevenue: 4120000000, revenueMTD: 4120000000, revenueGrowth: 8.5,
      totalTransactions: 12450, transactionsGrowth: 5.2,
      avgTicketSize: 330884, avgTicketGrowth: 3.1,
      conversionRate: 68.5, returnsRate: 2.1,
    },
    finance: {
      grossProfit: 1236000000, grossMargin: 30,
      netProfit: 824000000, netMargin: 20,
      operatingExpenses: 412000000, expenseRatio: 10,
      cashFlow: 650000000, cashFlowGrowth: 12.3,
      accountsReceivable: 285000000, accountsPayable: 198000000,
    },
    inventory: {
      totalStockValue: 4785000000, stockTurnover: 5.2,
      daysOnHand: 42, fillRate: 94.5,
      lowStockAlerts: 65, outOfStock: 12,
      deadStock: 28, shrinkageRate: 1.2,
    },
    procurement: {
      totalPOs: 156, activePOs: 42,
      totalSpend: 2850000000, spendMTD: 485000000,
      onTimeDelivery: 91.2, fulfillmentRate: 94.5,
      activeSuppliers: 22, avgLeadTime: 3.5,
    },
    hr: {
      totalEmployees: 127, activeEmployees: 105,
      attendanceRate: 95.2, turnoverRate: 3.8,
      avgProductivityScore: 82.5, trainingCompletionRate: 78.0,
    },
    branches: {
      totalBranches: 8, activeBranches: 7,
      onTargetBranches: 4, avgAchievement: 102,
      bestBranch: 'Cabang Pusat Jakarta', worstBranch: 'Cabang Surabaya',
    },
  };
}

function generateTrendAnalysis() {
  const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  return {
    revenueTrend: months.map((m, i) => ({
      month: m,
      revenue: [3200, 3450, 3680, 4200, 3900, 4120][i],
      target: [3000, 3200, 3400, 3800, 3600, 4000][i],
      profit: [640, 690, 736, 840, 780, 824][i],
      expenses: [420, 435, 450, 480, 465, 470][i],
      transactions: [9800, 10200, 10800, 12500, 11800, 12450][i],
    })),
    inventoryTrend: months.map((m, i) => ({
      month: m,
      stockValue: [4200, 4350, 4500, 4800, 4650, 4785][i],
      turnover: [4.5, 4.8, 5.0, 5.5, 5.1, 5.2][i],
      lowStock: [45, 42, 50, 38, 55, 65][i],
    })),
    procurementTrend: months.map((m, i) => ({
      month: m,
      spend: [380, 420, 395, 510, 460, 485][i],
      poCount: [22, 28, 24, 35, 30, 32][i],
      onTimeRate: [88, 90, 89, 92, 91, 91.2][i],
    })),
    hrTrend: months.map((m, i) => ({
      month: m,
      headcount: [118, 120, 122, 125, 124, 127][i],
      attendance: [94.5, 95.0, 94.8, 95.5, 95.1, 95.2][i],
      productivity: [80, 81, 81.5, 83, 82, 82.5][i],
    })),
  };
}

function generateExecutiveSummary() {
  return {
    highlights: [
      { type: 'positive', module: 'Sales', message: 'Revenue meningkat 8.5% MoM, melampaui target bulanan', impact: 'high' },
      { type: 'positive', module: 'Procurement', message: 'On-time delivery rate 91.2%, tertinggi 6 bulan terakhir', impact: 'medium' },
      { type: 'positive', module: 'Branches', message: '4 dari 7 cabang aktif mencapai target revenue', impact: 'high' },
      { type: 'warning', module: 'Inventory', message: '65 produk low stock, 12 out of stock perlu restock segera', impact: 'high' },
      { type: 'warning', module: 'HR', message: 'Turnover rate 3.8% naik dari 3.2% bulan lalu', impact: 'medium' },
      { type: 'negative', module: 'Branches', message: 'Cabang Surabaya underperform, growth -2.1%', impact: 'high' },
    ],
    recommendations: [
      { priority: 'high', action: 'Segera lakukan restock 65 produk low stock untuk menghindari lost sales', module: 'Inventory' },
      { priority: 'high', action: 'Review strategi Cabang Surabaya - pertimbangkan promo atau penyesuaian target', module: 'Branches' },
      { priority: 'medium', action: 'Negosiasi ulang kontrak supplier dengan rating C/D untuk meningkatkan on-time delivery', module: 'Procurement' },
      { priority: 'medium', action: 'Investasi training program untuk meningkatkan productivity score ke 85+', module: 'HR' },
      { priority: 'low', action: 'Evaluasi 28 dead stock items - pertimbangkan clearance sale', module: 'Inventory' },
    ],
    scorecard: {
      overallScore: 82,
      modules: [
        { name: 'Sales', score: 88, status: 'excellent', trend: 'up' },
        { name: 'Finance', score: 85, status: 'good', trend: 'stable' },
        { name: 'Inventory', score: 76, status: 'average', trend: 'down' },
        { name: 'Procurement', score: 84, status: 'good', trend: 'up' },
        { name: 'HR', score: 78, status: 'average', trend: 'stable' },
        { name: 'Branches', score: 80, status: 'good', trend: 'up' },
      ],
    },
  };
}

function generateModuleHealth() {
  return [
    { module: 'POS / Sales', status: 'healthy', uptime: 99.9, latency: 120, errorRate: 0.3, lastIncident: null },
    { module: 'Inventory', status: 'healthy', uptime: 99.8, latency: 95, errorRate: 0.5, lastIncident: '2026-02-18' },
    { module: 'Finance', status: 'healthy', uptime: 99.9, latency: 110, errorRate: 0.2, lastIncident: null },
    { module: 'Procurement', status: 'healthy', uptime: 99.7, latency: 130, errorRate: 0.4, lastIncident: '2026-02-15' },
    { module: 'HRIS', status: 'warning', uptime: 99.5, latency: 180, errorRate: 1.1, lastIncident: '2026-02-21' },
    { module: 'FMS', status: 'healthy', uptime: 99.8, latency: 100, errorRate: 0.3, lastIncident: null },
    { module: 'TMS', status: 'healthy', uptime: 99.6, latency: 140, errorRate: 0.6, lastIncident: '2026-02-10' },
    { module: 'SFA / CRM', status: 'healthy', uptime: 99.7, latency: 150, errorRate: 0.5, lastIncident: '2026-02-12' },
  ];
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return fail(res, `Method ${req.method} Not Allowed`, 405);
  }

  try {
    const { action = 'cross-module-kpis' } = req.query as Record<string, string>;

    switch (action) {
      case 'cross-module-kpis': {
        const kpis = generateCrossModuleKPIs();
        // Try real DB for key numbers
        try {
          if (sequelize) {
            const [rows] = await sequelize.query(`
              SELECT
                (SELECT COUNT(*) FROM branches WHERE is_active=true)::int as active_branches,
                (SELECT COUNT(*) FROM branches)::int as total_branches,
                (SELECT COUNT(*) FROM hris_employees WHERE status='active')::int as active_employees,
                (SELECT COUNT(*) FROM suppliers WHERE is_active=true)::int as active_suppliers,
                (SELECT COUNT(*) FROM purchase_orders)::int as total_pos
            `);
            if (rows?.[0]) {
              const r = rows[0] as any;
              if (r.total_branches > 0) kpis.branches.totalBranches = parseInt(r.total_branches);
              if (r.active_branches > 0) kpis.branches.activeBranches = parseInt(r.active_branches);
              if (r.active_employees > 0) kpis.hr.activeEmployees = parseInt(r.active_employees);
              if (r.active_suppliers > 0) kpis.procurement.activeSuppliers = parseInt(r.active_suppliers);
              if (r.total_pos > 0) kpis.procurement.totalPOs = parseInt(r.total_pos);
            }
          }
        } catch (e) { /* fallback */ }
        return ok(res, { data: kpis });
      }

      case 'trend-analysis': {
        return ok(res, { data: generateTrendAnalysis() });
      }

      case 'executive-summary': {
        return ok(res, { data: generateExecutiveSummary() });
      }

      case 'module-health': {
        return ok(res, { data: generateModuleHealth() });
      }

      case 'export': {
        const { type = 'kpis' } = req.query as Record<string, string>;
        const kpis = generateCrossModuleKPIs();
        let csv = '';
        if (type === 'kpis') {
          csv = 'Module,Metric,Value\n';
          for (const [mod, metrics] of Object.entries(kpis)) {
            for (const [key, val] of Object.entries(metrics as Record<string, any>)) {
              csv += `${mod},${key},${val}\n`;
            }
          }
        } else if (type === 'executive') {
          const exec = generateExecutiveSummary();
          csv = 'Type,Module,Message,Impact\n';
          exec.highlights.forEach(h => { csv += `${h.type},${h.module},"${h.message}",${h.impact}\n`; });
        }
        return ok(res, { data: { csv, filename: `report-${type}-${new Date().toISOString().slice(0, 10)}.csv` } });
      }

      default:
        return fail(res, `Unknown action: ${action}`, 400);
    }
  } catch (error: any) {
    console.error('Enhanced Reports API Error:', error);
    return fail(res, error.message || 'Internal Server Error');
  }
}

export default withHQAuth(handler, { module: 'reports' });

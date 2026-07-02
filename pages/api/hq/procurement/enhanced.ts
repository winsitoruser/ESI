import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) { console.warn('Sequelize not available for enhanced procurement'); }

const ok = (res: any, data: any) => res.status(200).json({ success: true, ...data });
const fail = (res: any, msg: string, status = 500) => res.status(status).json({ success: false, error: msg });

// ─── Supplier scoring weights ───
const SCORING_WEIGHTS = {
  qualityScore: 0.30,
  deliveryScore: 0.25,
  priceScore: 0.20,
  responsiveness: 0.15,
  compliance: 0.10,
};

function generateSupplierScorecard(suppliers: any[]) {
  return suppliers.map(s => {
    const quality = 70 + Math.random() * 30;
    const delivery = 65 + Math.random() * 35;
    const price = 60 + Math.random() * 40;
    const responsive = 70 + Math.random() * 30;
    const compliance = 75 + Math.random() * 25;
    const overall = quality * SCORING_WEIGHTS.qualityScore +
      delivery * SCORING_WEIGHTS.deliveryScore +
      price * SCORING_WEIGHTS.priceScore +
      responsive * SCORING_WEIGHTS.responsiveness +
      compliance * SCORING_WEIGHTS.compliance;
    return {
      supplierId: s.id,
      name: s.name,
      code: s.code,
      qualityScore: +quality.toFixed(1),
      deliveryScore: +delivery.toFixed(1),
      priceScore: +price.toFixed(1),
      responsiveness: +responsive.toFixed(1),
      compliance: +compliance.toFixed(1),
      overallScore: +overall.toFixed(1),
      grade: overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : overall >= 60 ? 'D' : 'F',
      totalPO: s.totalPO || Math.round(10 + Math.random() * 40),
      totalValue: s.totalValue || Math.round(50000000 + Math.random() * 400000000),
      avgLeadTime: s.leadTimeDays || Math.round(2 + Math.random() * 5),
      onTimeDeliveryPct: +delivery.toFixed(1),
      defectRate: +(Math.random() * 5).toFixed(2),
      returnRate: +(Math.random() * 3).toFixed(2),
    };
  });
}

function generateMockDashboard() {
  return {
    summary: {
      totalPOs: 156,
      activePOs: 42,
      totalSpend: 2850000000,
      totalSpendMTD: 485000000,
      avgOrderValue: 18269230,
      totalSuppliers: 28,
      activeSuppliers: 22,
      pendingApproval: 8,
      overdueDeliveries: 3,
      avgLeadTimeDays: 3.5,
      onTimeDeliveryRate: 91.2,
      costSavingsPct: 4.8,
      poFulfillmentRate: 94.5,
      qualityRejectRate: 1.8,
    },
    spendByCategory: [
      { name: 'Sembako', value: 35, amount: 997500000 },
      { name: 'Minuman', value: 22, amount: 627000000 },
      { name: 'Makanan Ringan', value: 18, amount: 513000000 },
      { name: 'Perawatan Pribadi', value: 12, amount: 342000000 },
      { name: 'Kebersihan Rumah', value: 8, amount: 228000000 },
      { name: 'Lainnya', value: 5, amount: 142500000 },
    ],
    spendTrend: {
      labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
      spend: [380000000, 420000000, 395000000, 510000000, 460000000, 485000000],
      poCount: [22, 28, 24, 35, 30, 32],
      savings: [15000000, 22000000, 18000000, 28000000, 25000000, 23000000],
    },
    topSuppliers: [
      { id: '1', name: 'PT Supplier Utama', code: 'SUP-001', spend: 450000000, poCount: 45, score: 92 },
      { id: '4', name: 'PT Global Foods Indonesia', code: 'SUP-004', spend: 380000000, poCount: 28, score: 95 },
      { id: '2', name: 'CV Distributor Jaya', code: 'SUP-002', spend: 280000000, poCount: 32, score: 84 },
      { id: '3', name: 'UD Grosir Makmur', code: 'SUP-003', spend: 150000000, poCount: 18, score: 78 },
      { id: '5', name: 'CV Mitra Sejahtera', code: 'SUP-005', spend: 85000000, poCount: 12, score: 72 },
    ],
    poStatusBreakdown: [
      { status: 'draft', count: 5, label: 'Draft' },
      { status: 'pending', count: 8, label: 'Pending' },
      { status: 'approved', count: 12, label: 'Approved' },
      { status: 'sent', count: 10, label: 'Sent' },
      { status: 'partial', count: 4, label: 'Partial' },
      { status: 'received', count: 3, label: 'Received' },
    ],
    recentAlerts: [
      { type: 'overdue', message: 'PO-2602-0015 dari PT Supplier Utama melewati ETA 2 hari', severity: 'high' },
      { type: 'price_increase', message: 'Harga Beras Premium naik 5% dari supplier SUP-001', severity: 'medium' },
      { type: 'quality', message: 'Defect rate UD Grosir Makmur di atas threshold (4.2%)', severity: 'high' },
      { type: 'contract', message: 'Kontrak PT Global Foods akan expire dalam 30 hari', severity: 'low' },
    ],
  };
}

function generateMockPOAnalytics() {
  return {
    cycleTime: {
      avgDraftToApproval: 1.2,
      avgApprovalToSent: 0.5,
      avgSentToDelivery: 3.8,
      avgTotal: 5.5,
      trend: [
        { month: 'Sep', draftToApproval: 1.5, approvalToSent: 0.8, sentToDelivery: 4.2 },
        { month: 'Oct', draftToApproval: 1.3, approvalToSent: 0.6, sentToDelivery: 3.9 },
        { month: 'Nov', draftToApproval: 1.4, approvalToSent: 0.7, sentToDelivery: 4.0 },
        { month: 'Dec', draftToApproval: 1.1, approvalToSent: 0.5, sentToDelivery: 3.5 },
        { month: 'Jan', draftToApproval: 1.2, approvalToSent: 0.4, sentToDelivery: 3.8 },
        { month: 'Feb', draftToApproval: 1.0, approvalToSent: 0.5, sentToDelivery: 3.6 },
      ],
    },
    priceAnalysis: {
      avgPriceChange: 2.3,
      categoriesWithIncrease: 3,
      categoriesWithDecrease: 1,
      topIncreases: [
        { product: 'Beras Premium 5kg', change: 5.2, from: 70000, to: 73640 },
        { product: 'Minyak Goreng 2L', change: 3.8, from: 30000, to: 31140 },
        { product: 'Gula Pasir 1kg', change: 2.1, from: 16000, to: 16336 },
      ],
      topDecreases: [
        { product: 'Deterjen 1kg', change: -1.5, from: 25000, to: 24625 },
      ],
    },
    complianceMetrics: {
      contractCompliance: 94.5,
      invoiceAccuracy: 97.2,
      deliveryCompliance: 91.8,
      qualityCompliance: 96.3,
    },
  };
}

const mockSuppliers = [
  { id: '1', code: 'SUP-001', name: 'PT Supplier Utama', totalPO: 45, totalValue: 450000000, leadTimeDays: 3 },
  { id: '2', code: 'SUP-002', name: 'CV Distributor Jaya', totalPO: 32, totalValue: 280000000, leadTimeDays: 2 },
  { id: '3', code: 'SUP-003', name: 'UD Grosir Makmur', totalPO: 18, totalValue: 150000000, leadTimeDays: 4 },
  { id: '4', code: 'SUP-004', name: 'PT Global Foods Indonesia', totalPO: 28, totalValue: 380000000, leadTimeDays: 5 },
  { id: '5', code: 'SUP-005', name: 'CV Mitra Sejahtera', totalPO: 12, totalValue: 85000000, leadTimeDays: 3 },
];

// ─── Main handler ───
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return fail(res, `Method ${req.method} Not Allowed`, 405);
  }

  try {
    const { action = 'dashboard' } = req.query as Record<string, string>;

    switch (action) {
      case 'dashboard': {
        const data = generateMockDashboard();

        // Try real DB counts
        try {
          if (sequelize) {
            const [rows] = await sequelize.query(`
              SELECT
                (SELECT COUNT(*) FROM purchase_orders)::int as total_pos,
                (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('pending','approved','sent','partial'))::int as active_pos,
                (SELECT COALESCE(SUM(total),0)::numeric(15,0) FROM purchase_orders)::text as total_spend,
                (SELECT COUNT(*) FROM suppliers WHERE is_active=true)::int as active_suppliers,
                (SELECT COUNT(*) FROM suppliers)::int as total_suppliers,
                (SELECT COUNT(*) FROM purchase_orders WHERE status='pending')::int as pending_approval
            `);
            if (rows?.[0]) {
              const r = rows[0] as any;
              if (parseInt(r.total_pos) > 0) {
                data.summary.totalPOs = parseInt(r.total_pos);
                data.summary.activePOs = parseInt(r.active_pos) || data.summary.activePOs;
                data.summary.totalSpend = parseFloat(r.total_spend) || data.summary.totalSpend;
                data.summary.activeSuppliers = parseInt(r.active_suppliers) || data.summary.activeSuppliers;
                data.summary.totalSuppliers = parseInt(r.total_suppliers) || data.summary.totalSuppliers;
                data.summary.pendingApproval = parseInt(r.pending_approval) || data.summary.pendingApproval;
              }
            }
          }
        } catch (e) { /* fallback to mock */ }

        return ok(res, { data });
      }

      case 'supplier-scorecard': {
        let suppliers = mockSuppliers;
        try {
          if (sequelize) {
            const [rows] = await sequelize.query(`
              SELECT id, code, name, 
                (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id=s.id)::int as "totalPO",
                (SELECT COALESCE(SUM(total),0)::numeric(15,0) FROM purchase_orders WHERE supplier_id=s.id) as "totalValue",
                lead_time_days as "leadTimeDays"
              FROM suppliers s WHERE is_active=true ORDER BY name
            `);
            if (rows?.length > 0) suppliers = rows as any;
          }
        } catch (e) { /* fallback */ }

        const scorecards = generateSupplierScorecard(suppliers);
        return ok(res, { data: { scorecards, weights: SCORING_WEIGHTS } });
      }

      case 'po-analytics': {
        const data = generateMockPOAnalytics();
        return ok(res, { data });
      }

      case 'spend-analysis': {
        const dashboard = generateMockDashboard();
        return ok(res, { data: { spendByCategory: dashboard.spendByCategory, spendTrend: dashboard.spendTrend } });
      }

      case 'export': {
        const dashboard = generateMockDashboard();
        const rows = dashboard.topSuppliers.map(s =>
          `${s.name},${s.code},${s.spend},${s.poCount},${s.score}`
        );
        const csv = `Supplier,Code,TotalSpend,POCount,Score\n${rows.join('\n')}`;
        return ok(res, { data: { csv, filename: `procurement-report-${new Date().toISOString().slice(0, 10)}.csv` } });
      }

      default:
        return fail(res, `Unknown action: ${action}`, 400);
    }
  } catch (error: any) {
    console.error('Enhanced Procurement API Error:', error);
    return fail(res, error.message || 'Internal Server Error');
  }
}

export default withHQAuth(handler, { module: 'inventory' });

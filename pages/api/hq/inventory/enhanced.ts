import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) { console.warn('Sequelize not available for enhanced inventory'); }

const ok = (res: any, data: any) => res.status(200).json({ success: true, ...data });
const fail = (res: any, msg: string, status = 500) => res.status(status).json({ success: false, error: msg });

// ─── Industry inventory KPI definitions ───
const INDUSTRY_KPIS: Record<string, { key: string; label: string; unit: string; target: number }[]> = {
  general: [
    { key: 'inventoryTurnover', label: 'Inventory Turnover', unit: 'x', target: 8 },
    { key: 'daysOnHand', label: 'Days on Hand', unit: 'days', target: 45 },
    { key: 'stockAccuracy', label: 'Stock Accuracy', unit: '%', target: 98 },
    { key: 'fillRate', label: 'Fill Rate', unit: '%', target: 95 },
    { key: 'shrinkageRate', label: 'Shrinkage Rate', unit: '%', target: 1.5 },
    { key: 'carryingCostPct', label: 'Carrying Cost %', unit: '%', target: 20 },
  ],
  fnb: [
    { key: 'inventoryTurnover', label: 'Inventory Turnover', unit: 'x', target: 20 },
    { key: 'wasteRate', label: 'Waste Rate', unit: '%', target: 3 },
    { key: 'expiryLossRate', label: 'Expiry Loss', unit: '%', target: 1 },
    { key: 'freshStockPct', label: 'Fresh Stock %', unit: '%', target: 90 },
    { key: 'parLevel', label: 'Par Level Compliance', unit: '%', target: 95 },
    { key: 'recipeYield', label: 'Recipe Yield', unit: '%', target: 92 },
  ],
  retail: [
    { key: 'inventoryTurnover', label: 'Inventory Turnover', unit: 'x', target: 10 },
    { key: 'gmroi', label: 'GMROI', unit: 'x', target: 3.5 },
    { key: 'sellThrough', label: 'Sell-Through Rate', unit: '%', target: 75 },
    { key: 'shrinkageRate', label: 'Shrinkage Rate', unit: '%', target: 1.5 },
    { key: 'stockToSales', label: 'Stock-to-Sales Ratio', unit: 'x', target: 4 },
    { key: 'deadStockPct', label: 'Dead Stock %', unit: '%', target: 5 },
  ],
  pharmacy: [
    { key: 'inventoryTurnover', label: 'Inventory Turnover', unit: 'x', target: 12 },
    { key: 'expiryRate', label: 'Expiry Rate', unit: '%', target: 0.5 },
    { key: 'rxFillRate', label: 'Rx Fill Rate', unit: '%', target: 98 },
    { key: 'controlledAccuracy', label: 'Controlled Substance Accuracy', unit: '%', target: 100 },
    { key: 'genericSubstitution', label: 'Generic Substitution', unit: '%', target: 80 },
    { key: 'shortDatedPct', label: 'Short-Dated Stock %', unit: '%', target: 5 },
  ],
  manufacturing: [
    { key: 'rawMaterialTurnover', label: 'Raw Material Turnover', unit: 'x', target: 12 },
    { key: 'wipDays', label: 'WIP Days', unit: 'days', target: 5 },
    { key: 'finishedGoodsDays', label: 'FG Days on Hand', unit: 'days', target: 15 },
    { key: 'scrapRate', label: 'Scrap Rate', unit: '%', target: 2 },
    { key: 'materialYield', label: 'Material Yield', unit: '%', target: 95 },
    { key: 'supplierOnTime', label: 'Supplier On-Time', unit: '%', target: 90 },
  ],
  logistics: [
    { key: 'warehouseUtilization', label: 'Warehouse Utilization', unit: '%', target: 85 },
    { key: 'pickAccuracy', label: 'Pick Accuracy', unit: '%', target: 99 },
    { key: 'orderCycleTime', label: 'Order Cycle Time', unit: 'hours', target: 4 },
    { key: 'dockToStock', label: 'Dock-to-Stock Time', unit: 'hours', target: 2 },
    { key: 'crossDockPct', label: 'Cross-Dock %', unit: '%', target: 30 },
    { key: 'damageRate', label: 'Damage Rate', unit: '%', target: 0.5 },
  ],
  hospitality: [
    { key: 'inventoryTurnover', label: 'Inventory Turnover', unit: 'x', target: 15 },
    { key: 'amenityStockLevel', label: 'Amenity Stock Level', unit: '%', target: 100 },
    { key: 'linenParLevel', label: 'Linen Par Level', unit: '%', target: 95 },
    { key: 'minibarRevenue', label: 'Minibar Revenue/Room', unit: 'Rp', target: 50000 },
    { key: 'fbWasteRate', label: 'F&B Waste Rate', unit: '%', target: 3 },
    { key: 'purchaseCostPct', label: 'Purchase Cost %', unit: '%', target: 25 },
  ],
  distributor: [
    { key: 'inventoryTurnover', label: 'Inventory Turnover', unit: 'x', target: 15 },
    { key: 'fillRate', label: 'Fill Rate', unit: '%', target: 97 },
    { key: 'backorderRate', label: 'Backorder Rate', unit: '%', target: 2 },
    { key: 'daysOfSupply', label: 'Days of Supply', unit: 'days', target: 21 },
    { key: 'pickPackAccuracy', label: 'Pick & Pack Accuracy', unit: '%', target: 99.5 },
    { key: 'returnRate', label: 'Return Rate', unit: '%', target: 2 },
  ],
};

// ─── Mock data generators ───
function generateMockDashboard(industry: string) {
  return {
    summary: {
      totalProducts: 1250,
      totalSKUs: 2180,
      totalStock: 85200,
      totalValue: 4780000000,
      lowStockItems: 65,
      outOfStockItems: 12,
      overStockItems: 89,
      pendingTransfers: 15,
      pendingOrders: 8,
      inventoryTurnover: industry === 'fnb' ? 18.5 : industry === 'retail' ? 9.2 : 7.8,
      daysOnHand: industry === 'fnb' ? 20 : industry === 'retail' ? 40 : 47,
      stockAccuracy: 97.5,
      fillRate: 94.2,
      shrinkageRate: 1.2,
      deadStockValue: 156000000,
      slowMovingValue: 420000000,
      expiringWithin30Days: industry === 'fnb' ? 45 : industry === 'pharmacy' ? 23 : 8,
    },
    warehouseHealth: [
      { id: '1', name: 'Gudang Pusat', code: 'WH-001', capacity: 85, temperature: 24, humidity: 55, score: 92, issues: 0 },
      { id: '2', name: 'Cold Storage', code: 'WH-002', capacity: 72, temperature: -18, humidity: 30, score: 88, issues: 1 },
      { id: '3', name: 'Dry Storage', code: 'WH-003', capacity: 91, temperature: 22, humidity: 45, score: 78, issues: 2 },
    ],
    stockMovementTrend: {
      labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
      inbound: [1200, 980, 1500, 1100, 1350, 800, 950],
      outbound: [850, 1100, 900, 1200, 1000, 600, 750],
      netChange: [350, -120, 600, -100, 350, 200, 200],
    },
    categoryBreakdown: [
      { name: 'Bahan Pokok', value: 35, stockValue: 1673000000, items: 250, turnover: 12 },
      { name: 'Minuman', value: 25, stockValue: 1195000000, items: 180, turnover: 15 },
      { name: 'Snack & Kering', value: 20, stockValue: 956000000, items: 320, turnover: 8 },
      { name: 'Frozen', value: 12, stockValue: 573600000, items: 150, turnover: 6 },
      { name: 'Non-Food', value: 8, stockValue: 382400000, items: 350, turnover: 4 },
    ],
    reorderSuggestions: [
      { productId: '1', name: 'Beras Premium 5kg', sku: 'BRS-001', currentStock: 120, reorderPoint: 500, suggestedQty: 1000, supplier: 'PT Indo Beras', leadTimeDays: 3, urgency: 'high' },
      { productId: '2', name: 'Minyak Goreng 2L', sku: 'MYK-001', currentStock: 80, reorderPoint: 400, suggestedQty: 800, supplier: 'PT Sinar Mas', leadTimeDays: 2, urgency: 'high' },
      { productId: '3', name: 'Gula Pasir 1kg', sku: 'GLA-001', currentStock: 250, reorderPoint: 600, suggestedQty: 1200, supplier: 'PT Sugar Group', leadTimeDays: 4, urgency: 'medium' },
      { productId: '4', name: 'Tepung Terigu 1kg', sku: 'TPG-001', currentStock: 180, reorderPoint: 300, suggestedQty: 600, supplier: 'PT Bogasari', leadTimeDays: 3, urgency: 'medium' },
      { productId: '5', name: 'Kopi Arabica 250g', sku: 'KPI-001', currentStock: 50, reorderPoint: 200, suggestedQty: 500, supplier: 'PT Kapal Api', leadTimeDays: 5, urgency: 'low' },
    ],
  };
}

function generateMockKPIs(industry: string) {
  const kpis = INDUSTRY_KPIS[industry] || INDUSTRY_KPIS.general;
  return kpis.map(kpi => {
    const isLowerBetter = kpi.key.includes('waste') || kpi.key.includes('shrinkage') || kpi.key.includes('scrap') || kpi.key.includes('expiry') || kpi.key.includes('damage') || kpi.key.includes('dead') || kpi.key.includes('backorder') || kpi.key.includes('return') || kpi.key.includes('short');
    const multiplier = isLowerBetter ? (0.5 + Math.random() * 1.0) : (0.7 + Math.random() * 0.6);
    return {
      ...kpi,
      actual: +(kpi.target * multiplier).toFixed(2),
      previousPeriod: +(kpi.target * (multiplier - 0.05 + Math.random() * 0.1)).toFixed(2),
      trend: Math.round((Math.random() - 0.3) * 20 * 10) / 10,
    };
  });
}

function generateMockForecast() {
  const products = [
    { name: 'Beras Premium 5kg', sku: 'BRS-001', currentStock: 2500, avgDailySales: 85, leadTimeDays: 3, reorderPoint: 500 },
    { name: 'Minyak Goreng 2L', sku: 'MYK-001', currentStock: 1800, avgDailySales: 62, leadTimeDays: 2, reorderPoint: 400 },
    { name: 'Gula Pasir 1kg', sku: 'GLA-001', currentStock: 3200, avgDailySales: 45, leadTimeDays: 4, reorderPoint: 600 },
    { name: 'Tepung Terigu 1kg', sku: 'TPG-001', currentStock: 1500, avgDailySales: 38, leadTimeDays: 3, reorderPoint: 300 },
    { name: 'Kopi Arabica 250g', sku: 'KPI-001', currentStock: 450, avgDailySales: 12, leadTimeDays: 5, reorderPoint: 200 },
  ];
  return products.map(p => ({
    ...p,
    daysUntilStockout: Math.round(p.currentStock / p.avgDailySales),
    reorderDate: new Date(Date.now() + Math.max(0, Math.round((p.currentStock / p.avgDailySales) - p.leadTimeDays) * 86400000)).toISOString().slice(0, 10),
    projectedWeekly: Array.from({ length: 8 }, (_, i) => ({
      week: `W${i + 1}`,
      projected: Math.max(0, Math.round(p.currentStock - p.avgDailySales * 7 * (i + 1))),
      demand: Math.round(p.avgDailySales * 7 * (0.9 + Math.random() * 0.2)),
    })),
    status: p.currentStock / p.avgDailySales < 7 ? 'critical' : p.currentStock / p.avgDailySales < 14 ? 'warning' : 'healthy',
  }));
}

function generateMockABCAnalysis() {
  return {
    summary: { aItems: 150, bItems: 350, cItems: 750, aValuePct: 70, bValuePct: 20, cValuePct: 10 },
    categories: [
      { class: 'A', items: 150, valuePct: 70, stockValue: 3346000000, avgTurnover: 14, description: 'High-value, fast-moving items' },
      { class: 'B', items: 350, valuePct: 20, stockValue: 956000000, avgTurnover: 8, description: 'Moderate value and movement' },
      { class: 'C', items: 750, valuePct: 10, stockValue: 478000000, avgTurnover: 3, description: 'Low-value, slow-moving items' },
    ],
  };
}

// ─── Main handler ───
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return fail(res, `Method ${req.method} Not Allowed`, 405);
  }

  try {
    const { action = 'dashboard', industry = 'general' } = req.query as Record<string, string>;

    switch (action) {
      case 'dashboard': {
        const data = generateMockDashboard(industry);

        // Try real DB data
        try {
          if (sequelize) {
            const [rows] = await sequelize.query(`
              SELECT 
                (SELECT COUNT(*) FROM products WHERE is_active=true)::int as total_products,
                (SELECT COALESCE(SUM(quantity),0)::int FROM inventory_stock) as total_stock,
                (SELECT COALESCE(SUM(quantity * cost_price),0)::numeric(15,0) FROM inventory_stock) as total_value
            `);
            if (rows?.[0]) {
              const r = rows[0];
              if (parseInt(r.total_products) > 0) {
                data.summary.totalProducts = parseInt(r.total_products);
                data.summary.totalStock = parseInt(r.total_stock) || data.summary.totalStock;
                data.summary.totalValue = parseFloat(r.total_value) || data.summary.totalValue;
              }
            }
          }
        } catch (e) { /* fallback to mock */ }

        return ok(res, { data });
      }

      case 'kpis': {
        const kpis = generateMockKPIs(industry);
        return ok(res, { data: { industry, kpis, definitions: INDUSTRY_KPIS[industry] || INDUSTRY_KPIS.general } });
      }

      case 'industry-kpis': {
        return ok(res, { data: { industries: Object.keys(INDUSTRY_KPIS), kpis: INDUSTRY_KPIS } });
      }

      case 'forecast': {
        const forecast = generateMockForecast();
        return ok(res, { data: { forecast } });
      }

      case 'abc-analysis': {
        const abc = generateMockABCAnalysis();
        return ok(res, { data: abc });
      }

      case 'export': {
        const data = generateMockDashboard(industry);
        const rows = data.categoryBreakdown.map(c =>
          `${c.name},${c.items},${c.stockValue},${c.turnover},${c.value}%`
        );
        const csv = `Category,Items,StockValue,Turnover,Percentage\n${rows.join('\n')}`;
        return ok(res, { data: { csv, filename: `inventory-report-${new Date().toISOString().slice(0, 10)}.csv` } });
      }

      default:
        return fail(res, `Unknown action: ${action}`, 400);
    }
  } catch (error: any) {
    console.error('Enhanced Inventory API Error:', error);
    return fail(res, error.message || 'Internal Server Error');
  }
}

export default withHQAuth(handler, { module: 'inventory' });

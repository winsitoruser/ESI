/**
 * SFA Sales Management API
 *
 * Endpoint terpadu untuk Manajemen Penjualan SFA pada industri Retail/FMCG/Direct Sales:
 *   - Input penjualan terupdated (manual / bulk / import dari field order / POS)
 *   - Penjualan vs Target secara global, per item, per group produk, per outlet,
 *     per salesperson/tim/territory
 *   - Outlet Transaksi & Target Pertumbuhan Outlet (active, new, productive)
 *
 * Tabel utama:
 *   - sfa_sales_entries
 *   - sfa_sales_item_targets
 *   - sfa_outlet_growth_targets
 *
 * Integrasi:
 *   - sfa_field_orders  (bisa dikonversi jadi sales entry saat approved)
 *   - pos_transactions  (opsional: import secondary sales)
 *   - sfa_outlet_targets (dibaca utk cross-check tier bonus)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';
import { logAudit } from '../../../../lib/audit/auditLogger';
import * as SfaRich from '../../../../lib/hq/sfa-rich-mock';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
const ok = (res: NextApiResponse, extra: any = {}) => res.json({ success: true, ...extra });
const err = (res: NextApiResponse, msg: string, code = 400) => res.status(code).json({ success: false, error: msg });

async function q(sql: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try { const [rows] = await sequelize.query(sql, replacements ? { replacements } : undefined); return (rows as any[]) || []; }
  catch (e: any) { console.error('[sales-mgmt] Q error:', e.message); return []; }
}
async function qOne(sql: string, replacements?: any): Promise<any> {
  const rows = await q(sql, replacements);
  return rows[0] || null;
}
async function qExec(sql: string, replacements?: any): Promise<boolean> {
  if (!sequelize) return false;
  try { await sequelize.query(sql, replacements ? { replacements } : undefined); return true; }
  catch (e: any) { console.error('[sales-mgmt] Exec error:', e.message); return false; }
}

/** Tanpa baris penjualan di DB → pakai payload demo agar chart Manajemen Penjualan terisi. */
async function tenantHasNoSalesData(tid: string | null): Promise<boolean> {
  if (!tid) return true;
  if (!sequelize) return true;
  const row = await qOne(`SELECT COUNT(*)::int AS c FROM sfa_sales_entries WHERE tenant_id = :tid`, { tid });
  return parseInt(String(row?.c ?? 0), 10) === 0;
}

function toNumber(v: any, def = 0): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parsePeriod(period?: string): { period: string; year: number; start: string; end: string } {
  const p = (period && /^\d{4}-\d{2}$/.test(period)) ? period : currentPeriod();
  const [y, m] = p.split('-').map(Number);
  const start = `${p}-01`;
  const end = new Date(y, m, 0).toISOString().slice(0, 10); // last day of month
  return { period: p, year: y, start, end };
}

/** Tanggal "as of" untuk analisis MTD/YTD: hari ini jika periode = bulan berjalan, else akhir bulan yang dipilih */
function asOfDateForPeriod(period?: string): string {
  const p = (period && /^\d{4}-\d{2}$/.test(period)) ? period : currentPeriod();
  if (p === currentPeriod()) {
    return new Date().toISOString().slice(0, 10);
  }
  const [y, m] = p.split('-').map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

// Common filters untuk query aggregator
function buildSalesFilters(query: any, params: any): string {
  let where = 'WHERE tenant_id = :tid AND is_deleted IS NOT TRUE';
  if (query.period) { where += ' AND period = :period'; params.period = query.period; }
  if (query.date_from) { where += ' AND entry_date >= :dfrom'; params.dfrom = query.date_from; }
  if (query.date_to) { where += ' AND entry_date <= :dto'; params.dto = query.date_to; }
  if (query.salesperson_id) { where += ' AND salesperson_id = :sp'; params.sp = query.salesperson_id; }
  if (query.team_id) { where += ' AND team_id = :team'; params.team = query.team_id; }
  if (query.territory_id) { where += ' AND territory_id = :ter'; params.ter = query.territory_id; }
  if (query.branch_id) { where += ' AND branch_id = :br'; params.br = query.branch_id; }
  if (query.sales_type) { where += ' AND sales_type = :stype'; params.stype = query.sales_type; }
  if (query.outlet_channel) { where += ' AND outlet_channel = :ochan'; params.ochan = query.outlet_channel; }
  if (query.outlet_id) { where += ' AND outlet_id = :oid'; params.oid = query.outlet_id; }
  if (query.product_id) { where += ' AND product_id = :pid'; params.pid = query.product_id; }
  if (query.product_group) { where += ' AND product_group = :pgrp'; params.pgrp = query.product_group; }
  if (query.product_brand) { where += ' AND product_brand = :pbrand'; params.pbrand = query.product_brand; }
  // by default exclude cancelled & returned
  if (!query.include_all) { where += " AND status NOT IN ('cancelled') AND is_return = false"; }
  return where;
}

// ────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return err(res, 'Unauthorized', 401);

    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id;
    const userName = (session.user as any).name || 'System';
    const userRole = (session.user as any).role || 'staff';
    const isManager = ['super_admin', 'owner', 'admin', 'manager', 'hq_admin'].includes(userRole);

    const action = String(req.query.action || '');
    const fireAudit = (act: string, entity: string, entityId?: string, newVals?: any) => {
      logAudit({
        tenantId: tid, userId: uid, userName,
        action: act as any, entityType: entity, entityId, newValues: newVals, req,
      }).catch(() => {});
    };

    // Manager-only actions
    const MGR_ONLY = [
      'create-item-target', 'update-item-target', 'delete-item-target',
      'create-outlet-growth-target', 'update-outlet-growth-target', 'delete-outlet-growth-target',
      'import-from-field-orders', 'delete-sales-entry',
    ];
    if (MGR_ONLY.includes(action) && !isManager) {
      return err(res, 'Akses ditolak. Hanya Manager/Admin yang bisa melakukan aksi ini.', 403);
    }

    switch (action) {
      // ════════════════════════════════════════════════════════════
      // DASHBOARD
      // ════════════════════════════════════════════════════════════
      case 'sales-dashboard': {
        return getSalesDashboard(req, res, tid);
      }

      // ════════════════════════════════════════════════════════════
      // SALES ENTRIES
      // ════════════════════════════════════════════════════════════
      case 'sales-entries':
        return listSalesEntries(req, res, tid);
      case 'sales-entry-detail':
        return getSalesEntryDetail(req, res, tid);
      case 'create-sales-entry':
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        return createSalesEntry(req, res, tid, uid, fireAudit);
      case 'bulk-sales-entry':
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        return bulkCreateSalesEntry(req, res, tid, uid, fireAudit);
      case 'update-sales-entry':
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        return updateSalesEntry(req, res, tid, uid, fireAudit);
      case 'delete-sales-entry':
        if (req.method !== 'DELETE') return err(res, 'DELETE only', 405);
        return deleteSalesEntry(req, res, tid, fireAudit);
      case 'import-from-field-orders':
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        return importFromFieldOrders(req, res, tid, uid, fireAudit);

      // ════════════════════════════════════════════════════════════
      // VS TARGET
      // ════════════════════════════════════════════════════════════
      case 'vs-target-global':
        return vsTargetGlobal(req, res, tid);
      case 'vs-target-product':
        return vsTargetProduct(req, res, tid);
      case 'vs-target-product-group':
        return vsTargetProductGroup(req, res, tid);
      case 'vs-target-outlet':
        return vsTargetOutlet(req, res, tid);
      case 'vs-target-salesperson':
        return vsTargetSalesperson(req, res, tid);
      case 'sales-trend':
        return getSalesTrend(req, res, tid);

      // ════════════════════════════════════════════════════════════
      // ITEM / GROUP TARGETS
      // ════════════════════════════════════════════════════════════
      case 'item-targets':
        return listItemTargets(req, res, tid);
      case 'create-item-target':
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        return createItemTarget(req, res, tid, uid, fireAudit);
      case 'update-item-target':
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        return updateItemTarget(req, res, tid, uid, fireAudit);
      case 'delete-item-target':
        if (req.method !== 'DELETE') return err(res, 'DELETE only', 405);
        return deleteItemTarget(req, res, tid, fireAudit);

      // ════════════════════════════════════════════════════════════
      // OUTLET COVERAGE & GROWTH
      // ════════════════════════════════════════════════════════════
      case 'outlet-coverage':
        return getOutletCoverage(req, res, tid);
      case 'outlet-transactions':
        return getOutletTransactions(req, res, tid);
      case 'outlet-growth-targets':
        return listOutletGrowthTargets(req, res, tid);
      case 'create-outlet-growth-target':
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        return createOutletGrowthTarget(req, res, tid, uid, fireAudit);
      case 'update-outlet-growth-target':
        if (req.method !== 'PUT') return err(res, 'PUT only', 405);
        return updateOutletGrowthTarget(req, res, tid, uid, fireAudit);
      case 'delete-outlet-growth-target':
        if (req.method !== 'DELETE') return err(res, 'DELETE only', 405);
        return deleteOutletGrowthTarget(req, res, tid, fireAudit);

      // ════════════════════════════════════════════════════════════
      // DISTRIBUTION (FMCG KPIs — Numeric & Weighted Distribution)
      // ════════════════════════════════════════════════════════════
      case 'distribution':
        return getDistribution(req, res, tid);
      case 'distribution-per-product':
        return getDistributionPerProduct(req, res, tid);

      // ════════════════════════════════════════════════════════════
      // PARETO 80/20 — klasifikasi A/B/C berdasarkan kumulatif
      // ════════════════════════════════════════════════════════════
      case 'pareto-outlets':
        return getParetoOutlets(req, res, tid);
      case 'pareto-products':
        return getParetoProducts(req, res, tid);
      case 'pareto-salespersons':
        return getParetoSalespersons(req, res, tid);

      // ════════════════════════════════════════════════════════════
      // PERFORMANCE — breakdown per dimension (branch/territory/team)
      // ════════════════════════════════════════════════════════════
      case 'performance-branch':
        return getPerformanceByDim(req, res, tid, 'branch');
      case 'performance-territory':
        return getPerformanceByDim(req, res, tid, 'territory');
      case 'performance-team':
        return getPerformanceByDim(req, res, tid, 'team');

      // ════════════════════════════════════════════════════════════
      // SCORECARD / LEADERBOARD / FUNNEL / ADVANCED KPIs
      // ════════════════════════════════════════════════════════════
      case 'salesperson-scorecard':
        return getSalespersonScorecard(req, res, tid);
      case 'leaderboard':
        return getLeaderboard(req, res, tid);
      case 'sales-funnel':
        return getSalesFunnel(req, res, tid);
      case 'advanced-kpis':
        return getAdvancedKpis(req, res, tid);
      case 'growth-analysis':
        return getGrowthAnalysis(req, res, tid);
      case 'mtd-ytd-run':
        return getMtdYtdRun(req, res, tid);
      case 'pareto-product-target':
        return getParetoProductWithTarget(req, res, tid);
      case 'outlet-order-behavior':
        return getOutletOrderBehavior(req, res, tid);

      // ════════════════════════════════════════════════════════════
      // DRILL-DOWN ENTRIES (per outlet / per produk / per salesperson)
      // ════════════════════════════════════════════════════════════
      case 'entries-drilldown':
        return getEntriesDrilldown(req, res, tid);

      // ════════════════════════════════════════════════════════════
      // CSV IMPORT / EXPORT
      // ════════════════════════════════════════════════════════════
      case 'export-csv':
        return exportCsv(req, res, tid);
      case 'import-csv':
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        return importCsv(req, res, tid, uid, fireAudit);
      case 'csv-template':
        return csvTemplate(res);

      // ════════════════════════════════════════════════════════════
      // INVENTORY INTEGRATION (catalog / stock check / categories / locations)
      // ════════════════════════════════════════════════════════════
      case 'item-catalog':
        return getItemCatalog(req, res, tid);
      case 'item-detail':
        return getItemDetail(req, res, tid);
      case 'product-categories':
        return getProductCategories(res, tid);
      case 'stock-locations':
        return getStockLocations(res, tid);
      case 'check-stock':
        return checkStock(req, res, tid);
      case 'reverse-stock':
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        return reverseStock(req, res, tid, uid, fireAudit);

      // ════════════════════════════════════════════════════════════
      // LOOKUP (filter dropdown helpers)
      // ════════════════════════════════════════════════════════════
      case 'lookup-filters':
        return getLookupFilters(res, tid);

      // ════════════════════════════════════════════════════════════
      // HRIS & INTEGRATION CONFIG
      // ════════════════════════════════════════════════════════════
      case 'salespersons':
        return getSalespersons(req, res, tid);
      case 'salesperson-detail':
        return getSalespersonDetail(req, res, tid);
      case 'integration-config':
        return getIntegrationConfig(res, tid);
      case 'update-integration-config':
        if (req.method !== 'POST' && req.method !== 'PUT') return err(res, 'POST/PUT only', 405);
        if (!isManager) return err(res, 'Hanya Manager/Admin yang bisa mengubah konfigurasi', 403);
        return updateIntegrationConfig(req, res, tid, uid, fireAudit);
      case 'integration-health':
        return getIntegrationHealth(res, tid);

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('[sales-mgmt] Handler error:', error);
    return err(res, error.message || 'Internal Server Error', 500);
  }
}

// ════════════════════════════════════════════════════════════════
// ██  DASHBOARD
// ════════════════════════════════════════════════════════════════
async function getSalesDashboard(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, { data: SfaRich.salesDashboardDemo(period) });
  }
  const { start, end } = parsePeriod(period);

  const params = { tid, period, start, end } as any;

  // Current period aggregate
  const current = await qOne(
    `SELECT COALESCE(SUM(net_amount),0) AS net_total,
            COALESCE(SUM(gross_amount),0) AS gross_total,
            COALESCE(SUM(quantity),0) AS total_qty,
            COUNT(*) AS entry_count,
            COUNT(DISTINCT outlet_id) AS active_outlets,
            COUNT(DISTINCT product_id) AS active_products,
            COUNT(DISTINCT salesperson_id) AS active_salespeople
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false`,
    params,
  );

  // Previous period for growth
  const prevPeriod = (() => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const prev = await qOne(
    `SELECT COALESCE(SUM(net_amount),0) AS net_total,
            COUNT(DISTINCT outlet_id) AS active_outlets
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :prev AND status NOT IN ('cancelled') AND is_return = false`,
    { tid, prev: prevPeriod },
  );

  // Target global (sum of all global item targets for period + outlet targets)
  const itemTargetTotal = await qOne(
    `SELECT COALESCE(SUM(target_value),0) AS total_value, COALESCE(SUM(target_quantity),0) AS total_qty
       FROM sfa_sales_item_targets
      WHERE tenant_id = :tid AND period = :period AND status = 'active'`,
    params,
  );

  // Outlet growth target (global scope)
  const growthTarget = await qOne(
    `SELECT target_active_outlets, target_new_outlets, target_productive_outlets, productive_threshold
       FROM sfa_outlet_growth_targets
      WHERE tenant_id = :tid AND period = :period AND scope_type = 'global' AND status = 'active'
      ORDER BY created_at DESC LIMIT 1`,
    params,
  );

  // Top products this period
  const topProducts = await q(
    `SELECT product_id, product_sku, product_name, product_group,
            COALESCE(SUM(net_amount),0) AS net_total, COALESCE(SUM(quantity),0) AS total_qty
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY product_id, product_sku, product_name, product_group
      ORDER BY net_total DESC LIMIT 10`,
    params,
  );

  // Top outlets this period
  const topOutlets = await q(
    `SELECT outlet_id, outlet_code, outlet_name, outlet_channel,
            COALESCE(SUM(net_amount),0) AS net_total, COUNT(*) AS trx_count
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY outlet_id, outlet_code, outlet_name, outlet_channel
      ORDER BY net_total DESC LIMIT 10`,
    params,
  );

  // Top salespeople
  const topSalespeople = await q(
    `SELECT salesperson_id, salesperson_name,
            COALESCE(SUM(net_amount),0) AS net_total, COUNT(*) AS trx_count,
            COUNT(DISTINCT outlet_id) AS outlets_covered
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND salesperson_id IS NOT NULL AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY salesperson_id, salesperson_name
      ORDER BY net_total DESC LIMIT 10`,
    params,
  );

  // Breakdown by sales_type
  const byType = await q(
    `SELECT sales_type, COALESCE(SUM(net_amount),0) AS net_total, COUNT(*) AS entry_count
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY sales_type`,
    params,
  );

  // Breakdown by channel
  const byChannel = await q(
    `SELECT COALESCE(outlet_channel, 'unknown') AS outlet_channel,
            COALESCE(SUM(net_amount),0) AS net_total,
            COUNT(DISTINCT outlet_id) AS outlet_count
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY outlet_channel
      ORDER BY net_total DESC`,
    params,
  );

  // Recent entries
  const recent = await q(
    `SELECT id, entry_date, sales_type, salesperson_name, outlet_name, product_name,
            quantity, net_amount, status
       FROM sfa_sales_entries
      WHERE tenant_id = :tid
      ORDER BY entry_date DESC, created_at DESC
      LIMIT 15`,
    params,
  );

  const netTotal = toNumber(current?.net_total);
  const prevTotal = toNumber(prev?.net_total);
  const growthPct = prevTotal > 0 ? ((netTotal - prevTotal) / prevTotal) * 100 : 0;

  const globalTarget = toNumber(itemTargetTotal?.total_value);
  const globalAchievement = globalTarget > 0 ? (netTotal / globalTarget) * 100 : 0;

  const calendarKpis = await buildMtdYtdRunBlock(tid, period);

  return ok(res, {
    data: {
      period,
      summary: {
        netTotal,
        grossTotal: toNumber(current?.gross_total),
        totalQty: toNumber(current?.total_qty),
        entryCount: parseInt(current?.entry_count || '0'),
        activeOutlets: parseInt(current?.active_outlets || '0'),
        activeProducts: parseInt(current?.active_products || '0'),
        activeSalespeople: parseInt(current?.active_salespeople || '0'),
        previousTotal: prevTotal,
        growthPct: Number(growthPct.toFixed(2)),
        globalTarget,
        globalAchievement: Number(globalAchievement.toFixed(2)),
        targetQty: toNumber(itemTargetTotal?.total_qty),
        targetActiveOutlets: parseInt(growthTarget?.target_active_outlets || '0'),
        targetNewOutlets: parseInt(growthTarget?.target_new_outlets || '0'),
        targetProductiveOutlets: parseInt(growthTarget?.target_productive_outlets || '0'),
        productiveThreshold: toNumber(growthTarget?.productive_threshold),
      },
      mtdYtd: calendarKpis,
      topProducts,
      topOutlets,
      topSalespeople,
      byType,
      byChannel,
      recent,
    },
  });
}

/** MTD/YTD berdasarkan entry_date + run-rate vs target bulanan (prorata hari) */
async function buildMtdYtdRunBlock(tid: string, period: string) {
  const asOf = asOfDateForPeriod(period);
  const [y, mo] = asOf.split('-').map(Number);
  const mtdStart = `${y}-${String(mo).padStart(2, '0')}-01`;
  const ytdStart = `${y}-01-01`;
  const daysInMonth = new Date(y, mo, 0).getDate();
  const dayOfMonth = new Date(asOf + 'T12:00:00').getDate();
  const pctMonthElapsed = daysInMonth > 0 ? dayOfMonth / daysInMonth : 1;

  const sumRange = async (from: string, to: string) =>
    qOne(
      `SELECT COALESCE(SUM(net_amount),0) AS net,
              COALESCE(SUM(quantity),0) AS qty,
              COUNT(*)::int AS entries,
              COUNT(DISTINCT outlet_id)::int AS outlets,
              COUNT(DISTINCT product_id)::int AS products
         FROM sfa_sales_entries
        WHERE tenant_id = :tid AND entry_date >= :dfrom AND entry_date <= :dto
          AND status NOT IN ('cancelled') AND is_return = false`,
      { tid, dfrom: from, dto: to },
    );

  const mtd = await sumRange(mtdStart, asOf);
  const ytd = await sumRange(ytdStart, asOf);

  // YoY: jendela MTD tahun lalu (hari yang sama, clamp ke akhir bulan)
  const maxDayLy = new Date(y - 1, mo, 0).getDate();
  const dLy = Math.min(dayOfMonth, maxDayLy);
  const lyStr = `${y - 1}-${String(mo).padStart(2, '0')}-${String(dLy).padStart(2, '0')}`;
  const lyMtdStart = `${y - 1}-${String(mo).padStart(2, '0')}-01`;
  const mtdLy = await sumRange(lyMtdStart, lyStr);

  const targetRow = await qOne(
    `SELECT COALESCE(SUM(target_value),0) AS v, COALESCE(SUM(target_quantity),0) AS q
       FROM sfa_sales_item_targets
      WHERE tenant_id = :tid AND period = :period AND status = 'active'`,
    { tid, period },
  );
  const monthTargetValue = toNumber(targetRow?.v);
  const proratedTarget = monthTargetValue * pctMonthElapsed;
  const mtdNet = toNumber(mtd?.net);
  const paceVsProrata = proratedTarget > 0 ? (mtdNet / proratedTarget) * 100 : null;
  const projectedMonthEnd = pctMonthElapsed > 0 ? mtdNet / pctMonthElapsed : mtdNet;
  const gapToTarget = monthTargetValue - mtdNet;

  return {
    as_of: asOf,
    period_month: period,
    mtd: {
      start: mtdStart,
      end: asOf,
      net: mtdNet,
      qty: toNumber(mtd?.qty),
      entries: parseInt(String(mtd?.entries || '0')),
      outlets: parseInt(String(mtd?.outlets || '0')),
      products: parseInt(String(mtd?.products || '0')),
    },
    ytd: {
      start: ytdStart,
      end: asOf,
      net: toNumber(ytd?.net),
      qty: toNumber(ytd?.qty),
      entries: parseInt(String(ytd?.entries || '0')),
      outlets: parseInt(String(ytd?.outlets || '0')),
    },
    yoy_mtd: {
      net_ly_same_window: toNumber(mtdLy?.net),
      growth_pct:
        toNumber(mtdLy?.net) > 0
          ? Number((((mtdNet - toNumber(mtdLy?.net)) / toNumber(mtdLy?.net)) * 100).toFixed(2))
          : null,
    },
    running: {
      days_in_month: daysInMonth,
      day_of_month: dayOfMonth,
      pct_month_elapsed: Number((pctMonthElapsed * 100).toFixed(2)),
      month_target_value: monthTargetValue,
      prorated_target_value: Number(proratedTarget.toFixed(2)),
      pace_vs_prorata_pct: paceVsProrata != null ? Number(paceVsProrata.toFixed(2)) : null,
      projected_month_end_net: Number(projectedMonthEnd.toFixed(2)),
      gap_to_full_month_target: Number(gapToTarget.toFixed(2)),
      achievement_mtd_vs_full_month_pct:
        monthTargetValue > 0 ? Number(((mtdNet / monthTargetValue) * 100).toFixed(2)) : null,
    },
  };
}

async function getMtdYtdRun(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  const data = await buildMtdYtdRunBlock(tid, period);
  return ok(res, { data, period });
}

// ════════════════════════════════════════════════════════════════
// ██  SALES ENTRIES CRUD
// ════════════════════════════════════════════════════════════════
async function listSalesEntries(req: NextApiRequest, res: NextApiResponse, tid: string) {
  if (await tenantHasNoSalesData(tid)) {
    const rows = SfaRich.salesEntriesListDemo();
    return ok(res, { data: rows, total: rows.length, limit: rows.length, offset: 0 });
  }
  const params: any = { tid };
  const where = buildSalesFilters({ ...req.query, include_all: req.query.include_all === '1' }, params);
  const limit = Math.min(parseInt(String(req.query.limit || '200'), 10) || 200, 1000);
  const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);
  params.limit = limit;
  params.offset = offset;

  const rows = await q(
    `SELECT * FROM sfa_sales_entries ${where}
     ORDER BY entry_date DESC, created_at DESC
     LIMIT :limit OFFSET :offset`,
    params,
  );
  const total = await qOne(`SELECT COUNT(*) AS cnt FROM sfa_sales_entries ${where}`, params);
  return ok(res, { data: rows, total: parseInt(total?.cnt || '0'), limit, offset });
}

async function getSalesEntryDetail(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const { id } = req.query;
  if (!id) return err(res, 'id required');
  const row = await qOne(`SELECT * FROM sfa_sales_entries WHERE id = :id AND tenant_id = :tid`, { id, tid });
  if (!row) return err(res, 'Entry not found', 404);
  return ok(res, { data: row });
}

function computeEntryAmounts(input: any) {
  const quantity = toNumber(input.quantity, 0);
  const unitPrice = toNumber(input.unit_price, 0);
  const gross = input.gross_amount !== undefined
    ? toNumber(input.gross_amount)
    : quantity * unitPrice;
  const discount = toNumber(input.discount_amount, 0);
  const tax = toNumber(input.tax_amount, 0);
  const net = input.net_amount !== undefined
    ? toNumber(input.net_amount)
    : gross - discount + tax;
  return { quantity, unitPrice, gross, discount, tax, net };
}

async function createSalesEntry(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const b = req.body || {};
  if (!b.entry_date || !b.product_name) {
    return err(res, 'entry_date & product_name wajib');
  }
  const entryDate = String(b.entry_date);
  const period = entryDate.slice(0, 7);
  const year = parseInt(period.split('-')[0], 10);
  const { quantity, unitPrice, gross, discount, tax, net } = computeEntryAmounts(b);

  // ── Integration rules ─────────────────────────────────────────
  const cfg = await loadIntegrationConfig(tid);
  const itemType = ['product', 'service', 'bundle', 'subscription', 'other'].includes(b.item_type) ? b.item_type : 'product';
  const isPhysical = itemType === 'product' || itemType === 'bundle';
  const invProductId = b.inventory_product_id ? parseInt(b.inventory_product_id, 10) : null;

  // ── ENFORCEMENT: physical entry requires inventory link ──
  if (isPhysical && cfg.require_inventory_for_physical_entries && !invProductId && !b.allow_manual_physical) {
    return err(res,
      `Produk fisik wajib dipilih dari katalog inventory. Gunakan Item Picker, atau ubah Tipe Item ke service/subscription, atau aktifkan override "allow_manual_physical" (tidak direkomendasi).`,
      422,
    );
  }

  // ── ENFORCEMENT: HRIS-linked salesperson ──
  const hrisEmployeeId = b.hris_employee_id || null;
  const salespersonUserId = b.salesperson_user_id ? parseInt(b.salesperson_user_id, 10) : null;
  if (cfg.require_hris_for_salespersons && b.salesperson_name && !hrisEmployeeId && !b.allow_manual_salesperson) {
    return err(res,
      'Salesperson wajib dipilih dari data HRIS. Gunakan Salesperson Picker, atau override via "allow_manual_salesperson".',
      422,
    );
  }

  // Enrich salesperson snapshot from HRIS if linked
  let spDept: string | null = b.salesperson_department || null;
  let spEmpNumber: string | null = b.salesperson_employee_number || null;
  let spName = b.salesperson_name || null;
  let spId = b.salesperson_id ? parseInt(String(b.salesperson_id), 10) : null;
  if (hrisEmployeeId) {
    const emp = await qOne(
      `SELECT he."employeeNumber" AS emp_no, he.name, he.department, he.position, he."branchId",
              (SELECT u.id FROM users u WHERE u.email = he.email AND u."tenantId" = :tid LIMIT 1) AS user_id
         FROM hris_employees he WHERE he.id = :eid LIMIT 1`,
      { tid, eid: hrisEmployeeId },
    ).catch(() => null);
    if (emp) {
      spDept = spDept || emp.department || null;
      spEmpNumber = spEmpNumber || emp.emp_no || null;
      spName = spName || emp.name || null;
      if (!spId && emp.user_id) spId = parseInt(emp.user_id, 10);
      if (!b.branch_id && emp.branchId) b.branch_id = emp.branchId;
    }
  }

  const wantsStockDecrement = itemType === 'product' && (b.decrement_stock === undefined ? cfg.auto_decrement_stock : b.decrement_stock === true) && invProductId && !b.is_return;
  let stockDecremented = false;

  if (wantsStockDecrement && quantity > 0) {
    const locId = b.branch_location_id ? parseInt(b.branch_location_id, 10) : null;
    const stockRow = locId
      ? await qOne(`SELECT id, quantity FROM stocks WHERE product_id = :pid AND location_id = :loc LIMIT 1`, { pid: invProductId, loc: locId })
      : await qOne(`SELECT id, quantity FROM stocks WHERE product_id = :pid ORDER BY quantity DESC LIMIT 1`, { pid: invProductId });
    if (!stockRow) {
      return err(res, 'Stok produk tidak ditemukan di lokasi ini. Tambahkan stok terlebih dulu.');
    }
    const curQty = parseFloat(stockRow.quantity) || 0;
    const allowNegative = b.allow_negative_stock !== undefined ? b.allow_negative_stock : cfg.allow_negative_stock;
    if (curQty < quantity && !allowNegative) {
      return err(res, `Stok tidak mencukupi (tersedia: ${curQty}, dibutuhkan: ${quantity}). Aktifkan 'allow_negative_stock' untuk memaksa.`);
    }
    await qExec(
      `UPDATE stocks SET quantity = quantity - :q, last_movement_date = NOW(), updated_at = NOW() WHERE id = :id`,
      { q: quantity, id: stockRow.id },
    );
    stockDecremented = true;
  }

  const row = await qOne(
    `INSERT INTO sfa_sales_entries
      (tenant_id, entry_date, period, year, sales_type, source, reference_type, reference_id, reference_number,
       salesperson_id, salesperson_name, salesperson_user_id, hris_employee_id, salesperson_employee_number, salesperson_department,
       team_id, territory_id, branch_id,
       outlet_id, outlet_code, outlet_name, outlet_class, outlet_channel, outlet_city, outlet_province,
       product_id, product_sku, product_name, product_group, product_brand, product_uom,
       item_type, inventory_product_id, service_duration_minutes, service_location,
       stock_decremented, branch_location_id,
       quantity, unit_price, gross_amount, discount_amount, tax_amount, net_amount, currency,
       status, is_return, promo_code, notes, created_by)
     VALUES
      (:tid, :entry_date, :period, :year, :sales_type, :source, :reference_type, :reference_id, :reference_number,
       :salesperson_id, :salesperson_name, :sp_user_id, :hris_emp_id, :sp_emp_number, :sp_department,
       :team_id, :territory_id, :branch_id,
       :outlet_id, :outlet_code, :outlet_name, :outlet_class, :outlet_channel, :outlet_city, :outlet_province,
       :product_id, :product_sku, :product_name, :product_group, :product_brand, :product_uom,
       :item_type, :inventory_product_id, :service_duration, :service_location,
       :stock_decremented, :branch_location_id,
       :quantity, :unit_price, :gross_amount, :discount_amount, :tax_amount, :net_amount, :currency,
       :status, :is_return, :promo_code, :notes, :uid)
     RETURNING id`,
    {
      tid, uid,
      entry_date: entryDate, period, year,
      sales_type: b.sales_type || 'primary',
      source: b.source || 'manual',
      reference_type: b.reference_type || null,
      reference_id: b.reference_id || null,
      reference_number: b.reference_number || null,
      salesperson_id: spId,
      salesperson_name: spName,
      sp_user_id: salespersonUserId,
      hris_emp_id: hrisEmployeeId,
      sp_emp_number: spEmpNumber,
      sp_department: spDept,
      team_id: b.team_id || null,
      territory_id: b.territory_id || null,
      branch_id: b.branch_id || null,
      outlet_id: b.outlet_id || null,
      outlet_code: b.outlet_code || null,
      outlet_name: b.outlet_name || null,
      outlet_class: b.outlet_class || null,
      outlet_channel: b.outlet_channel || null,
      outlet_city: b.outlet_city || null,
      outlet_province: b.outlet_province || null,
      product_id: b.product_id || (invProductId ? String(invProductId) : null),
      product_sku: b.product_sku || null,
      product_name: b.product_name,
      product_group: b.product_group || null,
      product_brand: b.product_brand || null,
      product_uom: b.product_uom || 'pcs',
      item_type: itemType,
      inventory_product_id: invProductId,
      service_duration: b.service_duration_minutes ? parseInt(b.service_duration_minutes, 10) : null,
      service_location: b.service_location || null,
      stock_decremented: stockDecremented,
      branch_location_id: b.branch_location_id ? parseInt(b.branch_location_id, 10) : null,
      quantity, unit_price: unitPrice,
      gross_amount: gross, discount_amount: discount, tax_amount: tax, net_amount: net,
      currency: b.currency || 'IDR',
      status: b.status || 'confirmed',
      is_return: !!b.is_return,
      promo_code: b.promo_code || null,
      notes: b.notes || null,
    },
  );
  if (!row?.id) return err(res, 'Gagal menyimpan entry penjualan', 500);

  // Log stock movement (best-effort, backward-compat with inventory_stock_movements)
  if (stockDecremented) {
    try {
      await qExec(
        `INSERT INTO inventory_stock_movements
           (id, "tenantId", "branchId", "productId", type, quantity, "unitCost", "totalCost",
            "referenceType", "referenceId", reason, "performedBy", "performedAt", "createdBy", "createdAt", "updatedAt")
         VALUES
           (gen_random_uuid(), :tid, :branch, :pid, 'out', :qty, :price, :total,
            'sfa_sales_entry', :ref, 'SFA sales entry', :uid, NOW(), :uid, NOW(), NOW())`,
        {
          tid, uid,
          branch: b.branch_id || null,
          pid: invProductId,
          qty: quantity,
          price: unitPrice,
          total: net,
          ref: row.id,
        },
      );
    } catch (e: any) { /* movement log optional – table may not exist in legacy tenants */ }
  }

  fireAudit('create', 'sfa_sales_entry', row.id, {
    net, product_name: b.product_name, outlet_name: b.outlet_name,
    item_type: itemType, stock_decremented: stockDecremented,
  });
  return res.status(201).json({ success: true, message: stockDecremented ? 'Entry penjualan tersimpan & stok diupdate' : 'Entry penjualan tersimpan', data: { id: row.id, stock_decremented: stockDecremented } });
}

async function bulkCreateSalesEntry(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const b = req.body || {};
  const items: any[] = Array.isArray(b.entries) ? b.entries : [];
  if (items.length === 0) return err(res, 'entries[] kosong');

  const cfg = await loadIntegrationConfig(tid);
  let inserted = 0;
  const errors: string[] = [];
  for (const entry of items) {
    if (!entry.entry_date || !entry.product_name) { errors.push('entry_date & product_name wajib'); continue; }
    const period = String(entry.entry_date).slice(0, 7);
    const year = parseInt(period.split('-')[0], 10);
    const { quantity, unitPrice, gross, discount, tax, net } = computeEntryAmounts(entry);

    const it = ['product', 'service', 'bundle', 'subscription', 'other'].includes(entry.item_type) ? entry.item_type : 'product';
    const isPhysical = it === 'product' || it === 'bundle';
    const invPid = entry.inventory_product_id ? parseInt(entry.inventory_product_id, 10) : null;
    const hrisEid = entry.hris_employee_id || b.hris_employee_id || null;

    if (isPhysical && cfg.require_inventory_for_physical_entries && !invPid && !entry.allow_manual_physical) {
      errors.push(`${entry.product_name}: produk fisik wajib dipilih dari inventory`); continue;
    }
    if (cfg.require_hris_for_salespersons && (entry.salesperson_name || b.salesperson_name) && !hrisEid && !entry.allow_manual_salesperson) {
      errors.push(`${entry.salesperson_name || b.salesperson_name}: salesperson wajib di-link ke HRIS`); continue;
    }

    const okInsert = await qExec(
      `INSERT INTO sfa_sales_entries
         (tenant_id, entry_date, period, year, sales_type, source, reference_number,
          salesperson_id, salesperson_name, salesperson_user_id, hris_employee_id, salesperson_employee_number, salesperson_department,
          team_id, territory_id, branch_id,
          outlet_id, outlet_code, outlet_name, outlet_class, outlet_channel,
          product_id, product_sku, product_name, product_group, product_brand, product_uom,
          item_type, inventory_product_id,
          quantity, unit_price, gross_amount, discount_amount, tax_amount, net_amount, currency,
          status, is_return, promo_code, notes, created_by)
       VALUES
         (:tid, :entry_date, :period, :year, :sales_type, :source, :reference_number,
          :salesperson_id, :salesperson_name, :sp_user_id, :hris_emp_id, :sp_emp_number, :sp_department,
          :team_id, :territory_id, :branch_id,
          :outlet_id, :outlet_code, :outlet_name, :outlet_class, :outlet_channel,
          :product_id, :product_sku, :product_name, :product_group, :product_brand, :product_uom,
          :item_type, :inv_pid,
          :quantity, :unit_price, :gross_amount, :discount_amount, :tax_amount, :net_amount, :currency,
          :status, :is_return, :promo_code, :notes, :uid)`,
      {
        tid, uid,
        entry_date: entry.entry_date, period, year,
        sales_type: entry.sales_type || b.sales_type || 'primary',
        source: entry.source || b.source || 'manual',
        reference_number: entry.reference_number || b.reference_number || null,
        salesperson_id: entry.salesperson_id || b.salesperson_id || null,
        salesperson_name: entry.salesperson_name || b.salesperson_name || null,
        sp_user_id: entry.salesperson_user_id || b.salesperson_user_id || null,
        hris_emp_id: hrisEid,
        sp_emp_number: entry.salesperson_employee_number || b.salesperson_employee_number || null,
        sp_department: entry.salesperson_department || b.salesperson_department || null,
        team_id: entry.team_id || b.team_id || null,
        territory_id: entry.territory_id || b.territory_id || null,
        branch_id: entry.branch_id || b.branch_id || null,
        outlet_id: entry.outlet_id || b.outlet_id || null,
        outlet_code: entry.outlet_code || b.outlet_code || null,
        outlet_name: entry.outlet_name || b.outlet_name || null,
        outlet_class: entry.outlet_class || b.outlet_class || null,
        outlet_channel: entry.outlet_channel || b.outlet_channel || null,
        product_id: entry.product_id || (invPid ? String(invPid) : null),
        product_sku: entry.product_sku || null,
        product_name: entry.product_name,
        product_group: entry.product_group || null,
        product_brand: entry.product_brand || null,
        product_uom: entry.product_uom || 'pcs',
        item_type: it,
        inv_pid: invPid,
        quantity, unit_price: unitPrice,
        gross_amount: gross, discount_amount: discount, tax_amount: tax, net_amount: net,
        currency: entry.currency || b.currency || 'IDR',
        status: entry.status || 'confirmed',
        is_return: !!entry.is_return,
        promo_code: entry.promo_code || null,
        notes: entry.notes || null,
      },
    );
    if (okInsert) inserted++;
  }

  fireAudit('import', 'sfa_sales_entry', undefined, { count: inserted });
  return ok(res, { message: `${inserted} entry tersimpan`, inserted, errors });
}

async function updateSalesEntry(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const { id, ...data } = req.body || {};
  if (!id) return err(res, 'id required');

  const allowed = [
    'entry_date', 'sales_type',
    'salesperson_id', 'salesperson_name', 'salesperson_user_id', 'hris_employee_id',
    'salesperson_employee_number', 'salesperson_department',
    'team_id', 'territory_id', 'branch_id',
    'outlet_id', 'outlet_code', 'outlet_name', 'outlet_class', 'outlet_channel', 'outlet_city', 'outlet_province',
    'product_id', 'product_sku', 'product_name', 'product_group', 'product_brand', 'product_uom',
    'item_type', 'inventory_product_id', 'service_duration_minutes', 'service_location',
    'quantity', 'unit_price', 'gross_amount', 'discount_amount', 'tax_amount', 'net_amount', 'currency',
    'status', 'is_return', 'promo_code', 'notes', 'reference_number',
  ];
  const sets: string[] = [];
  const params: any = { id, tid, uid };
  for (const k of allowed) if (data[k] !== undefined) { sets.push(`${k} = :${k}`); params[k] = data[k]; }

  // Recompute amounts if quantity/unit_price/discount/tax disentuh
  if (data.quantity !== undefined || data.unit_price !== undefined || data.discount_amount !== undefined || data.tax_amount !== undefined) {
    const prev = await qOne(`SELECT quantity, unit_price, discount_amount, tax_amount FROM sfa_sales_entries WHERE id = :id AND tenant_id = :tid`, { id, tid });
    const merged = {
      quantity: data.quantity ?? prev?.quantity,
      unit_price: data.unit_price ?? prev?.unit_price,
      discount_amount: data.discount_amount ?? prev?.discount_amount,
      tax_amount: data.tax_amount ?? prev?.tax_amount,
    };
    const { gross, net } = computeEntryAmounts(merged);
    sets.push('gross_amount = :auto_gross', 'net_amount = :auto_net');
    params.auto_gross = gross;
    params.auto_net = net;
  }

  // Re-derive period if entry_date change
  if (data.entry_date) {
    const period = String(data.entry_date).slice(0, 7);
    sets.push('period = :auto_period', 'year = :auto_year');
    params.auto_period = period;
    params.auto_year = parseInt(period.split('-')[0], 10);
  }

  if (sets.length === 0) return err(res, 'Tidak ada field untuk diupdate');
  sets.push('updated_by = :uid', 'updated_at = NOW()');

  const okSql = await qExec(
    `UPDATE sfa_sales_entries SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`,
    params,
  );
  if (!okSql) return err(res, 'Gagal update', 500);
  fireAudit('update', 'sfa_sales_entry', id, data);
  return ok(res, { message: 'Entry penjualan diperbarui' });
}

async function deleteSalesEntry(req: NextApiRequest, res: NextApiResponse, tid: string, fireAudit: Function) {
  const { id } = req.query;
  if (!id) return err(res, 'id required');

  // Auto-reverse stock bila entry ini pernah mengurangi stok
  const entry = await qOne(
    `SELECT stock_decremented, inventory_product_id, branch_location_id, quantity
       FROM sfa_sales_entries WHERE id = :id AND tenant_id = :tid LIMIT 1`,
    { id, tid },
  );
  if (entry?.stock_decremented && entry.inventory_product_id) {
    const qty = toNumber(entry.quantity);
    const locId = entry.branch_location_id;
    const stockRow = locId
      ? await qOne(`SELECT id FROM stocks WHERE product_id = :pid AND location_id = :loc LIMIT 1`, { pid: entry.inventory_product_id, loc: locId })
      : await qOne(`SELECT id FROM stocks WHERE product_id = :pid ORDER BY quantity DESC LIMIT 1`, { pid: entry.inventory_product_id });
    if (stockRow) {
      await qExec(`UPDATE stocks SET quantity = quantity + :q, last_movement_date = NOW(), updated_at = NOW() WHERE id = :id`, { q: qty, id: stockRow.id });
    }
  }

  const okSql = await qExec(`UPDATE sfa_sales_entries SET is_deleted=true, deleted_at=NOW() WHERE id = :id AND tenant_id = :tid`, { id, tid });
  if (!okSql) return err(res, 'Gagal hapus', 500);
  fireAudit('delete', 'sfa_sales_entry', String(id), { stock_reversed: !!entry?.stock_decremented });
  return ok(res, { message: entry?.stock_decremented ? 'Entry dihapus & stok dikembalikan' : 'Entry dihapus' });
}

async function importFromFieldOrders(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const b = req.body || {};
  const period = b.period || currentPeriod();
  const { start, end } = parsePeriod(period);

  // Ambil approved field orders yang belum di-import
  const orders = await q(
    `SELECT fo.id, fo.order_number, fo.order_date, fo.customer_id, fo.customer_name,
            fo.salesperson_id, fo.team_id, fo.territory_id,
            fo.subtotal, fo.total, fo.tax_amount
       FROM sfa_field_orders fo
      WHERE fo.tenant_id = :tid
        AND fo.status = 'approved'
        AND fo.order_date BETWEEN :start AND :end
        AND NOT EXISTS (
          SELECT 1 FROM sfa_sales_entries se
           WHERE se.tenant_id = :tid
             AND se.reference_type = 'field_order'
             AND se.reference_id = fo.id::text
        )`,
    { tid, start, end },
  );

  let insertedLines = 0;
  let errors = 0;
  for (const order of orders) {
    const items = await q(
      `SELECT product_id, product_name, product_sku, category_name,
              quantity, unit, unit_price, discount_amount, subtotal
         FROM sfa_field_order_items
        WHERE field_order_id = :fid ORDER BY sort_order`,
      { fid: order.id },
    );
    // Try to resolve HRIS employee for salesperson (via user email)
    let hrisEid: string | null = null;
    let spEmpNumber: string | null = null;
    let spDept: string | null = null;
    let spName: string | null = order.salesperson_name || null;
    if (order.salesperson_id) {
      const hm = await qOne(
        `SELECT he.id, he."employeeNumber" AS emp_no, he.department, he.name
           FROM users u JOIN hris_employees he ON he.email = u.email AND he."tenantId" = u."tenantId"
          WHERE u.id = :uid AND u."tenantId" = :tid LIMIT 1`,
        { uid: order.salesperson_id, tid },
      ).catch(() => null);
      if (hm) {
        hrisEid = hm.id;
        spEmpNumber = hm.emp_no;
        spDept = hm.department;
        spName = spName || hm.name;
      }
    }

    for (const item of items) {
      const period2 = String(order.order_date).slice(0, 7);
      const year2 = parseInt(period2.split('-')[0], 10);
      const okInsert = await qExec(
        `INSERT INTO sfa_sales_entries
          (tenant_id, entry_date, period, year, sales_type, source, reference_type, reference_id, reference_number,
           salesperson_id, salesperson_name, salesperson_user_id, hris_employee_id, salesperson_employee_number, salesperson_department,
           team_id, territory_id,
           outlet_id, outlet_name,
           product_id, product_sku, product_name, product_group, product_uom,
           item_type, inventory_product_id,
           quantity, unit_price, gross_amount, discount_amount, net_amount,
           status, created_by)
         VALUES
          (:tid, :edate, :period, :year, 'primary', 'field_order', 'field_order', :rid, :rnum,
           :sp_user, :sp_name, :sp_user, :hris_eid, :sp_empno, :sp_dept,
           :team, :ter,
           :oid, :oname,
           :pid, :psku, :pname, :pgrp, :puom,
           :item_type, :inv_pid,
           :qty, :price, :gross, :disc, :net,
           'confirmed', :uid)`,
        {
          tid, uid,
          edate: order.order_date, period: period2, year: year2,
          rid: String(order.id), rnum: order.order_number,
          sp_user: order.salesperson_id, sp_name: spName,
          hris_eid: hrisEid, sp_empno: spEmpNumber, sp_dept: spDept,
          team: order.team_id, ter: order.territory_id,
          oid: order.customer_id ? String(order.customer_id) : null, oname: order.customer_name,
          pid: item.product_id, psku: item.product_sku, pname: item.product_name,
          pgrp: item.category_name, puom: item.unit || 'pcs',
          item_type: item.product_id ? 'product' : 'other',
          inv_pid: item.product_id && /^\d+$/.test(String(item.product_id)) ? parseInt(String(item.product_id), 10) : null,
          qty: toNumber(item.quantity), price: toNumber(item.unit_price),
          gross: toNumber(item.quantity) * toNumber(item.unit_price),
          disc: toNumber(item.discount_amount),
          net: toNumber(item.subtotal),
        },
      );
      if (okInsert) insertedLines++; else errors++;
    }
  }

  fireAudit('import', 'sfa_sales_entry', undefined, { source: 'field_orders', period, insertedLines });
  return ok(res, { message: `${insertedLines} baris tersimpan dari ${orders.length} field order`, inserted: insertedLines, errors });
}

// ════════════════════════════════════════════════════════════════
// ██  VS TARGET
// ════════════════════════════════════════════════════════════════
async function vsTargetGlobal(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, { data: SfaRich.vsTargetGlobalDemo(period) });
  }
  const params = { tid, period };

  const actual = await qOne(
    `SELECT COALESCE(SUM(net_amount),0) AS net, COALESCE(SUM(quantity),0) AS qty, COUNT(*) AS entries
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false`,
    params,
  );
  const target = await qOne(
    `SELECT COALESCE(SUM(target_value),0) AS value, COALESCE(SUM(target_quantity),0) AS qty, COUNT(*) AS count
       FROM sfa_sales_item_targets
      WHERE tenant_id = :tid AND period = :period AND status = 'active'`,
    params,
  );

  const actualNet = toNumber(actual?.net);
  const targetValue = toNumber(target?.value);
  const achievement = targetValue > 0 ? (actualNet / targetValue) * 100 : 0;
  const gap = targetValue - actualNet;

  // Trend 6 periode terakhir
  const trend = await q(
    `WITH periods AS (
        SELECT TO_CHAR(date_trunc('month', NOW()) - (n || ' months')::interval, 'YYYY-MM') AS p
          FROM generate_series(0, 5) n
     )
     SELECT p AS period,
            COALESCE((SELECT SUM(net_amount) FROM sfa_sales_entries
                       WHERE tenant_id = :tid AND period = p AND status NOT IN ('cancelled') AND is_return = false), 0) AS actual_value,
            COALESCE((SELECT SUM(target_value) FROM sfa_sales_item_targets
                       WHERE tenant_id = :tid AND period = p AND status = 'active'), 0) AS target_value
       FROM periods ORDER BY p ASC`,
    { tid },
  );

  return ok(res, {
    data: {
      period,
      actual: { value: actualNet, qty: toNumber(actual?.qty), entries: parseInt(actual?.entries || '0') },
      target: { value: targetValue, qty: toNumber(target?.qty), count: parseInt(target?.count || '0') },
      achievement_pct: Number(achievement.toFixed(2)),
      gap,
      trend,
    },
  });
}

async function vsTargetProduct(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, { data: SfaRich.vsTargetProductDemo(period), period });
  }

  const rows = await q(
    `WITH actual AS (
        SELECT product_id, product_sku, product_name, product_group,
               SUM(net_amount) AS actual_value, SUM(quantity) AS actual_qty
          FROM sfa_sales_entries
         WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false
         GROUP BY product_id, product_sku, product_name, product_group
     ),
     target AS (
        SELECT product_id, product_sku, product_name, product_group,
               SUM(target_value) AS target_value, SUM(target_quantity) AS target_qty
          FROM sfa_sales_item_targets
         WHERE tenant_id = :tid AND period = :period AND status = 'active'
           AND target_level IN ('product', 'global')
         GROUP BY product_id, product_sku, product_name, product_group
     )
     SELECT COALESCE(a.product_id, t.product_id) AS product_id,
            COALESCE(a.product_sku, t.product_sku) AS product_sku,
            COALESCE(a.product_name, t.product_name) AS product_name,
            COALESCE(a.product_group, t.product_group) AS product_group,
            COALESCE(a.actual_value, 0) AS actual_value,
            COALESCE(a.actual_qty, 0) AS actual_qty,
            COALESCE(t.target_value, 0) AS target_value,
            COALESCE(t.target_qty, 0) AS target_qty,
            CASE WHEN COALESCE(t.target_value, 0) > 0
                 THEN ROUND(COALESCE(a.actual_value, 0)::numeric / t.target_value * 100, 2)
                 ELSE NULL END AS achievement_pct
       FROM actual a FULL OUTER JOIN target t
         ON a.product_id = t.product_id OR (a.product_id IS NULL AND t.product_id IS NULL AND a.product_name = t.product_name)
      ORDER BY COALESCE(a.actual_value, 0) DESC NULLS LAST
      LIMIT 500`,
    { tid, period },
  );

  return ok(res, { data: rows, period });
}

async function vsTargetProductGroup(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, { data: SfaRich.vsTargetGroupDemo(period), period });
  }

  const rows = await q(
    `WITH actual AS (
        SELECT COALESCE(product_group, 'Uncategorized') AS product_group,
               SUM(net_amount) AS actual_value, SUM(quantity) AS actual_qty,
               COUNT(DISTINCT product_id) AS product_count,
               COUNT(DISTINCT outlet_id) AS outlet_count
          FROM sfa_sales_entries
         WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false
         GROUP BY product_group
     ),
     target AS (
        SELECT COALESCE(product_group, 'Uncategorized') AS product_group,
               SUM(target_value) AS target_value, SUM(target_quantity) AS target_qty
          FROM sfa_sales_item_targets
         WHERE tenant_id = :tid AND period = :period AND status = 'active'
         GROUP BY product_group
     )
     SELECT COALESCE(a.product_group, t.product_group) AS product_group,
            COALESCE(a.actual_value, 0) AS actual_value,
            COALESCE(a.actual_qty, 0) AS actual_qty,
            COALESCE(a.product_count, 0) AS product_count,
            COALESCE(a.outlet_count, 0) AS outlet_count,
            COALESCE(t.target_value, 0) AS target_value,
            COALESCE(t.target_qty, 0) AS target_qty,
            CASE WHEN COALESCE(t.target_value, 0) > 0
                 THEN ROUND(COALESCE(a.actual_value, 0)::numeric / t.target_value * 100, 2)
                 ELSE NULL END AS achievement_pct
       FROM actual a FULL OUTER JOIN target t ON a.product_group = t.product_group
      ORDER BY COALESCE(a.actual_value, 0) DESC NULLS LAST`,
    { tid, period },
  );

  return ok(res, { data: rows, period });
}

async function vsTargetOutlet(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, {
      data: SfaRich.vsTargetOutletDemo(period),
      period,
      prev_period: SfaRich.prevPeriodStr(period),
    });
  }
  const prevPeriod = (() => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const rows = await q(
    `WITH cur AS (
        SELECT outlet_id, outlet_code, outlet_name, outlet_channel, outlet_class, outlet_city,
               SUM(net_amount) AS actual_value, SUM(quantity) AS actual_qty, COUNT(*) AS trx_count
          FROM sfa_sales_entries
         WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
           AND status NOT IN ('cancelled') AND is_return = false
         GROUP BY outlet_id, outlet_code, outlet_name, outlet_channel, outlet_class, outlet_city
     ),
     prev AS (
        SELECT outlet_id, SUM(net_amount) AS prev_value
          FROM sfa_sales_entries
         WHERE tenant_id = :tid AND period = :prev AND outlet_id IS NOT NULL
           AND status NOT IN ('cancelled') AND is_return = false
         GROUP BY outlet_id
     ),
     target AS (
        SELECT scope_id AS outlet_id, SUM(target_value) AS target_value
          FROM sfa_sales_item_targets
         WHERE tenant_id = :tid AND period = :period AND status = 'active' AND scope_type = 'outlet'
         GROUP BY scope_id
     )
     SELECT c.outlet_id, c.outlet_code, c.outlet_name, c.outlet_channel, c.outlet_class, c.outlet_city,
            c.actual_value, c.actual_qty, c.trx_count,
            COALESCE(p.prev_value, 0) AS prev_value,
            CASE WHEN COALESCE(p.prev_value, 0) > 0
                 THEN ROUND((c.actual_value - p.prev_value) / p.prev_value * 100, 2)
                 ELSE NULL END AS growth_pct,
            COALESCE(t.target_value, 0) AS target_value,
            CASE WHEN COALESCE(t.target_value, 0) > 0
                 THEN ROUND(c.actual_value::numeric / t.target_value * 100, 2)
                 ELSE NULL END AS achievement_pct
       FROM cur c
       LEFT JOIN prev p ON c.outlet_id = p.outlet_id
       LEFT JOIN target t ON c.outlet_id = t.outlet_id
      ORDER BY c.actual_value DESC
      LIMIT 500`,
    { tid, period, prev: prevPeriod },
  );

  return ok(res, { data: rows, period, prev_period: prevPeriod });
}

async function vsTargetSalesperson(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, { data: SfaRich.vsTargetSalesDemo(period), period });
  }

  const rows = await q(
    `WITH actual AS (
        SELECT salesperson_id, salesperson_name, team_id, territory_id,
               SUM(net_amount) AS actual_value, SUM(quantity) AS actual_qty,
               COUNT(*) AS trx_count, COUNT(DISTINCT outlet_id) AS outlets_covered
          FROM sfa_sales_entries
         WHERE tenant_id = :tid AND period = :period AND salesperson_id IS NOT NULL
           AND status NOT IN ('cancelled') AND is_return = false
         GROUP BY salesperson_id, salesperson_name, team_id, territory_id
     ),
     target AS (
        SELECT scope_id::integer AS salesperson_id, SUM(target_value) AS target_value
          FROM sfa_sales_item_targets
         WHERE tenant_id = :tid AND period = :period AND status = 'active' AND scope_type = 'salesperson'
         GROUP BY scope_id
     )
     SELECT a.salesperson_id, a.salesperson_name, a.team_id, a.territory_id,
            a.actual_value, a.actual_qty, a.trx_count, a.outlets_covered,
            COALESCE(t.target_value, 0) AS target_value,
            CASE WHEN COALESCE(t.target_value, 0) > 0
                 THEN ROUND(a.actual_value::numeric / t.target_value * 100, 2)
                 ELSE NULL END AS achievement_pct
       FROM actual a
       LEFT JOIN target t ON a.salesperson_id = t.salesperson_id
      ORDER BY a.actual_value DESC
      LIMIT 200`,
    { tid, period },
  );

  return ok(res, { data: rows, period });
}

async function getSalesTrend(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const months = Math.max(1, Math.min(24, parseInt(String(req.query.months || '12'), 10)));
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, { data: SfaRich.salesTrendDemo(months) });
  }
  const rows = await q(
    `WITH periods AS (
        SELECT TO_CHAR(date_trunc('month', NOW()) - (n || ' months')::interval, 'YYYY-MM') AS p
          FROM generate_series(0, :months - 1) n
     )
     SELECT p AS period,
            COALESCE((SELECT SUM(net_amount) FROM sfa_sales_entries
                       WHERE tenant_id = :tid AND period = p AND status NOT IN ('cancelled') AND is_return = false), 0) AS actual_value,
            COALESCE((SELECT SUM(quantity) FROM sfa_sales_entries
                       WHERE tenant_id = :tid AND period = p AND status NOT IN ('cancelled') AND is_return = false), 0) AS actual_qty,
            COALESCE((SELECT COUNT(DISTINCT outlet_id) FROM sfa_sales_entries
                       WHERE tenant_id = :tid AND period = p AND status NOT IN ('cancelled') AND is_return = false), 0) AS active_outlets,
            COALESCE((SELECT SUM(target_value) FROM sfa_sales_item_targets
                       WHERE tenant_id = :tid AND period = p AND status = 'active'), 0) AS target_value
       FROM periods ORDER BY p ASC`,
    { tid, months },
  );
  return ok(res, { data: rows });
}

// ════════════════════════════════════════════════════════════════
// ██  ITEM TARGETS
// ════════════════════════════════════════════════════════════════
async function listItemTargets(req: NextApiRequest, res: NextApiResponse, tid: string) {
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.itemTargetsDemo(String(req.query.period || currentPeriod())));
  }
  const { period, target_level, product_group, scope_type } = req.query;
  let where = 'WHERE tenant_id = :tid AND is_deleted IS NOT TRUE';
  const params: any = { tid };
  if (period) { where += ' AND period = :period'; params.period = period; }
  if (target_level) { where += ' AND target_level = :lvl'; params.lvl = target_level; }
  if (product_group) { where += ' AND product_group = :pgrp'; params.pgrp = product_group; }
  if (scope_type) { where += ' AND scope_type = :st'; params.st = scope_type; }

  const rows = await q(`SELECT * FROM sfa_sales_item_targets ${where} ORDER BY period DESC, target_level, product_name LIMIT 500`, params);

  // Hitung actual on-the-fly per target
  for (const t of rows) {
    let where2 = 'WHERE tenant_id = :tid AND period = :period AND status NOT IN (\'cancelled\') AND is_return = false';
    const p2: any = { tid, period: t.period };
    if (t.target_level === 'product' && t.product_id) { where2 += ' AND product_id = :pid'; p2.pid = t.product_id; }
    else if (t.target_level === 'product_group' && t.product_group) { where2 += ' AND product_group = :pgrp'; p2.pgrp = t.product_group; }
    else if (t.target_level === 'brand' && t.product_brand) { where2 += ' AND product_brand = :pb'; p2.pb = t.product_brand; }
    if (t.scope_type === 'salesperson' && t.scope_id) { where2 += ' AND salesperson_id = :sid'; p2.sid = t.scope_id; }
    else if (t.scope_type === 'team' && t.scope_id) { where2 += ' AND team_id = :sid'; p2.sid = t.scope_id; }
    else if (t.scope_type === 'territory' && t.scope_id) { where2 += ' AND territory_id = :sid'; p2.sid = t.scope_id; }
    else if (t.scope_type === 'outlet' && t.scope_id) { where2 += ' AND outlet_id = :sid'; p2.sid = t.scope_id; }
    const agg = await qOne(`SELECT COALESCE(SUM(net_amount),0) AS av, COALESCE(SUM(quantity),0) AS aq FROM sfa_sales_entries ${where2}`, p2);
    t.actual_value = toNumber(agg?.av);
    t.actual_quantity = toNumber(agg?.aq);
    t.achievement_pct = toNumber(t.target_value) > 0 ? Number(((t.actual_value / toNumber(t.target_value)) * 100).toFixed(2)) : 0;
  }

  return ok(res, { data: rows });
}

async function createItemTarget(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const b = req.body || {};
  if (!b.name || !b.period) return err(res, 'name & period wajib');
  const year = parseInt(String(b.period).split('-')[0], 10);
  const code = b.code || `ITGT-${Date.now().toString(36).toUpperCase()}`;

  // ── Load integration config & enforce rules ──
  const cfg = await loadIntegrationConfig(tid);
  const targetLevel = b.target_level || 'product';
  const itemType = ['product', 'service', 'bundle', 'subscription', 'other'].includes(b.item_type) ? b.item_type : 'product';
  const isPhysical = itemType === 'product' || itemType === 'bundle';

  // Enrich from inventory if linked
  let invProductId = b.inventory_product_id ? parseInt(b.inventory_product_id, 10) : null;
  let productUnit: string | null = b.product_unit || null;
  let productCategoryId: number | null = b.product_category_id ? parseInt(b.product_category_id, 10) : null;
  let stockSnapshotQty: number | null = null;
  let prodData: any = null;

  if (invProductId) {
    prodData = await qOne(
      `SELECT p.id, p.name, p.sku, p.unit, p.category_id, c.name AS category_name,
              p.product_type, p.is_trackable, COALESCE(p.can_be_sold, true) AS can_be_sold,
              COALESCE((SELECT SUM(quantity) FROM stocks WHERE product_id = p.id), 0) AS stock_total
         FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
        WHERE p.id = :pid LIMIT 1`,
      { pid: invProductId },
    ).catch(async () => qOne(
      `SELECT p.id, p.name, p.sku, p.unit, p.category_id,
              COALESCE((SELECT SUM(quantity) FROM stocks WHERE product_id = p.id), 0) AS stock_total
         FROM products p WHERE p.id = :pid LIMIT 1`,
      { pid: invProductId },
    ));

    if (!prodData) return err(res, 'Produk inventory tidak ditemukan (inventory_product_id tidak valid)', 422);
    if (prodData.can_be_sold === false) return err(res, `Produk "${prodData.name}" ditandai tidak bisa dijual. Pilih produk lain.`);

    productUnit = productUnit || prodData.unit || 'pcs';
    productCategoryId = productCategoryId || prodData.category_id || null;
    if (cfg.auto_snapshot_stock_on_target) stockSnapshotQty = toNumber(prodData.stock_total);

    // Auto-fill snapshot fields if missing
    if (!b.product_name) b.product_name = prodData.name;
    if (!b.product_sku) b.product_sku = prodData.sku;
    if (!b.product_group && prodData.category_name) b.product_group = prodData.category_name;
    if (!b.product_id) b.product_id = String(prodData.id);
  }

  // ── ENFORCEMENT: Physical product target → must link inventory ──
  const requireInvLink = b.require_inventory_link !== undefined ? !!b.require_inventory_link
    : (isPhysical && cfg.require_inventory_for_physical_targets);

  if (targetLevel === 'product' && isPhysical && cfg.require_inventory_for_physical_targets && !invProductId) {
    return err(res,
      `Target produk fisik wajib terhubung ke data inventory. Pilih produk dari katalog inventory, atau ubah Tipe Item ke "service/subscription/other" jika non-fisik, atau nonaktifkan kebijakan ini di Konfigurasi Integrasi.`,
      422,
    );
  }

  if (targetLevel === 'product' && !isPhysical && !cfg.allow_non_physical_without_inventory && !invProductId) {
    return err(res, 'Kebijakan tenant ini menuntut setiap target produk untuk terhubung ke inventory.', 422);
  }

  // ── HRIS enforcement for salesperson-scoped targets ──
  const hrisEmpId = b.hris_employee_id || null;
  const salespersonUserId = b.salesperson_user_id ? parseInt(b.salesperson_user_id, 10) : null;
  if (b.scope_type === 'salesperson' && cfg.require_hris_for_sp_targets && !hrisEmpId) {
    return err(res, 'Target scope salesperson harus terhubung ke data HRIS. Gunakan Salesperson Picker (HRIS).', 422);
  }

  const row = await qOne(
    `INSERT INTO sfa_sales_item_targets
       (tenant_id, code, name, target_level, item_type,
        product_id, product_sku, product_name, product_group, product_brand,
        inventory_product_id, require_inventory_link, product_unit, product_category_id, stock_snapshot_qty,
        scope_type, scope_id, scope_name,
        hris_employee_id, salesperson_user_id,
        period_type, period, year, target_type,
        target_quantity, target_value, currency, status, notes, created_by)
     VALUES
       (:tid, :code, :name, :target_level, :item_type,
        :product_id, :product_sku, :product_name, :product_group, :product_brand,
        :inv_pid, :require_inv, :product_unit, :product_cat_id, :stock_snap,
        :scope_type, :scope_id, :scope_name,
        :hris_emp_id, :sp_user_id,
        :period_type, :period, :year, :target_type,
        :target_quantity, :target_value, :currency, :status, :notes, :uid)
     RETURNING id`,
    {
      tid, uid, code, name: b.name,
      target_level: targetLevel, item_type: itemType,
      product_id: b.product_id || null, product_sku: b.product_sku || null, product_name: b.product_name || null,
      product_group: b.product_group || null, product_brand: b.product_brand || null,
      inv_pid: invProductId, require_inv: requireInvLink,
      product_unit: productUnit, product_cat_id: productCategoryId, stock_snap: stockSnapshotQty,
      scope_type: b.scope_type || 'global',
      scope_id: b.scope_id || null, scope_name: b.scope_name || null,
      hris_emp_id: hrisEmpId, sp_user_id: salespersonUserId,
      period_type: b.period_type || 'monthly', period: b.period, year,
      target_type: b.target_type || 'value',
      target_quantity: toNumber(b.target_quantity), target_value: toNumber(b.target_value),
      currency: b.currency || 'IDR',
      status: b.status || 'active',
      notes: b.notes || null,
    },
  ).catch(async (e: any) => {
    // Backward-compat: if some columns missing (older schema), retry w/ minimal fields
    console.warn('[sales-mgmt] createItemTarget extended insert failed:', e.message);
    return qOne(
      `INSERT INTO sfa_sales_item_targets
         (tenant_id, code, name, target_level,
          product_id, product_sku, product_name, product_group, product_brand,
          scope_type, scope_id, scope_name,
          period_type, period, year, target_type,
          target_quantity, target_value, currency, status, notes, created_by)
       VALUES
         (:tid, :code, :name, :target_level,
          :product_id, :product_sku, :product_name, :product_group, :product_brand,
          :scope_type, :scope_id, :scope_name,
          :period_type, :period, :year, :target_type,
          :target_quantity, :target_value, :currency, :status, :notes, :uid)
       RETURNING id`,
      {
        tid, uid, code, name: b.name,
        target_level: targetLevel,
        product_id: b.product_id || null, product_sku: b.product_sku || null, product_name: b.product_name || null,
        product_group: b.product_group || null, product_brand: b.product_brand || null,
        scope_type: b.scope_type || 'global',
        scope_id: b.scope_id || null, scope_name: b.scope_name || null,
        period_type: b.period_type || 'monthly', period: b.period, year,
        target_type: b.target_type || 'value',
        target_quantity: toNumber(b.target_quantity), target_value: toNumber(b.target_value),
        currency: b.currency || 'IDR',
        status: b.status || 'active',
        notes: b.notes || null,
      },
    );
  });

  if (!row?.id) return err(res, 'Gagal buat target', 500);
  fireAudit('create', 'sfa_sales_item_target', row.id, {
    name: b.name, period: b.period, item_type: itemType,
    inventory_product_id: invProductId, linked_to_inventory: !!invProductId,
  });
  return res.status(201).json({
    success: true,
    message: invProductId ? 'Target dibuat & terhubung ke inventory' : 'Target penjualan dibuat',
    data: { id: row.id, inventory_linked: !!invProductId, item_type: itemType },
  });
}

async function updateItemTarget(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const { id, ...data } = req.body || {};
  if (!id) return err(res, 'id required');
  const allowed = ['name', 'target_level', 'item_type',
    'product_id', 'product_sku', 'product_name', 'product_group', 'product_brand',
    'inventory_product_id', 'require_inventory_link', 'product_unit', 'product_category_id', 'stock_snapshot_qty',
    'scope_type', 'scope_id', 'scope_name',
    'hris_employee_id', 'salesperson_user_id',
    'period_type', 'period', 'year', 'target_type',
    'target_quantity', 'target_value', 'currency', 'status', 'notes'];
  const sets: string[] = [];
  const params: any = { id, tid, uid };
  for (const k of allowed) if (data[k] !== undefined) { sets.push(`${k} = :${k}`); params[k] = data[k]; }
  if (sets.length === 0) return err(res, 'Tidak ada field untuk diupdate');
  sets.push('updated_by = :uid', 'updated_at = NOW()');
  const okSql = await qExec(`UPDATE sfa_sales_item_targets SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, params);
  if (!okSql) return err(res, 'Gagal update', 500);
  fireAudit('update', 'sfa_sales_item_target', id, data);
  return ok(res, { message: 'Target diperbarui' });
}

async function deleteItemTarget(req: NextApiRequest, res: NextApiResponse, tid: string, fireAudit: Function) {
  const { id } = req.query;
  if (!id) return err(res, 'id required');
  const okSql = await qExec(`UPDATE sfa_sales_item_targets SET is_deleted=true, deleted_at=NOW() WHERE id = :id AND tenant_id = :tid`, { id, tid });
  if (!okSql) return err(res, 'Gagal hapus', 500);
  fireAudit('delete', 'sfa_sales_item_target', String(id));
  return ok(res, { message: 'Target dihapus' });
}

// ════════════════════════════════════════════════════════════════
// ██  OUTLET COVERAGE & GROWTH
// ════════════════════════════════════════════════════════════════
async function getOutletCoverage(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.outletCoverageDemo(period));
  }
  const prevPeriod = (() => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const productiveThreshold = toNumber(req.query.productive_threshold, 0);

  // Get target untuk scope global
  const target = await qOne(
    `SELECT * FROM sfa_outlet_growth_targets
      WHERE tenant_id = :tid AND period = :period AND scope_type = 'global' AND status = 'active'
      ORDER BY created_at DESC LIMIT 1`,
    { tid, period },
  );
  const threshold = productiveThreshold || toNumber(target?.productive_threshold);

  // Outlet transacting this period
  const cur = await qOne(
    `SELECT COUNT(DISTINCT outlet_id) AS active_outlets,
            COUNT(DISTINCT CASE WHEN outlet_total >= :threshold THEN outlet_id END) AS productive_outlets
       FROM (
         SELECT outlet_id, SUM(net_amount) AS outlet_total
           FROM sfa_sales_entries
          WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
            AND status NOT IN ('cancelled') AND is_return = false
          GROUP BY outlet_id
       ) sub`,
    { tid, period, threshold },
  );

  // Previous period active outlets
  const prev = await qOne(
    `SELECT COUNT(DISTINCT outlet_id) AS active_outlets
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :prev AND outlet_id IS NOT NULL
        AND status NOT IN ('cancelled') AND is_return = false`,
    { tid, prev: prevPeriod },
  );

  // New outlets = outlets transacting this period that never transacted before
  const newOutlets = await qOne(
    `SELECT COUNT(*) AS cnt
       FROM (
         SELECT outlet_id FROM sfa_sales_entries
          WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
            AND status NOT IN ('cancelled') AND is_return = false
          GROUP BY outlet_id
         HAVING NOT EXISTS (
           SELECT 1 FROM sfa_sales_entries se2
            WHERE se2.tenant_id = :tid AND se2.outlet_id = sfa_sales_entries.outlet_id
              AND se2.period < :period AND se2.status NOT IN ('cancelled') AND se2.is_return = false
         )
       ) sub`,
    { tid, period },
  );

  // Channel breakdown
  const byChannel = await q(
    `SELECT COALESCE(outlet_channel, 'unknown') AS channel,
            COUNT(DISTINCT outlet_id) AS active_outlets,
            COALESCE(SUM(net_amount), 0) AS total_value
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
        AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY outlet_channel
      ORDER BY total_value DESC`,
    { tid, period },
  );

  // Trend 6 periode
  const trend = await q(
    `WITH periods AS (
        SELECT TO_CHAR(date_trunc('month', NOW()) - (n || ' months')::interval, 'YYYY-MM') AS p
          FROM generate_series(0, 5) n
     )
     SELECT p AS period,
            COALESCE((SELECT COUNT(DISTINCT outlet_id) FROM sfa_sales_entries
                       WHERE tenant_id = :tid AND period = p AND outlet_id IS NOT NULL
                         AND status NOT IN ('cancelled') AND is_return = false), 0) AS active_outlets
       FROM periods ORDER BY p ASC`,
    { tid },
  );

  const curActive = parseInt(cur?.active_outlets || '0');
  const prevActive = parseInt(prev?.active_outlets || '0');
  const growthPct = prevActive > 0 ? ((curActive - prevActive) / prevActive) * 100 : 0;

  return ok(res, {
    data: {
      period,
      prev_period: prevPeriod,
      actual: {
        active_outlets: curActive,
        productive_outlets: parseInt(cur?.productive_outlets || '0'),
        new_outlets: parseInt(newOutlets?.cnt || '0'),
        prev_active_outlets: prevActive,
        growth_pct: Number(growthPct.toFixed(2)),
      },
      target: target ? {
        active_outlets: parseInt(target.target_active_outlets || '0'),
        productive_outlets: parseInt(target.target_productive_outlets || '0'),
        new_outlets: parseInt(target.target_new_outlets || '0'),
        registered_outlets: parseInt(target.target_registered_outlets || '0'),
        productive_threshold: toNumber(target.productive_threshold),
        growth_rate_target: toNumber(target.growth_rate_target),
      } : null,
      byChannel,
      trend,
    },
  });
}

async function getOutletTransactions(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.outletTransactionsDemo(period));
  }
  const productiveThreshold = toNumber(req.query.productive_threshold, 0);

  const rows = await q(
    `SELECT outlet_id, outlet_code, outlet_name, outlet_channel, outlet_class, outlet_city,
            COUNT(*) AS trx_count,
            COUNT(DISTINCT product_id) AS product_variety,
            SUM(net_amount) AS total_value,
            SUM(quantity) AS total_qty,
            MIN(entry_date) AS first_trx,
            MAX(entry_date) AS last_trx,
            CASE WHEN SUM(net_amount) >= :threshold THEN true ELSE false END AS is_productive
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
        AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY outlet_id, outlet_code, outlet_name, outlet_channel, outlet_class, outlet_city
      ORDER BY total_value DESC
      LIMIT 1000`,
    { tid, period, threshold: productiveThreshold },
  );
  return ok(res, { data: rows, period });
}

async function listOutletGrowthTargets(req: NextApiRequest, res: NextApiResponse, tid: string) {
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.outletGrowthTargetsDemo(String(req.query.period || currentPeriod())));
  }
  const { period, scope_type } = req.query;
  let where = 'WHERE tenant_id = :tid AND is_deleted IS NOT TRUE';
  const params: any = { tid };
  if (period) { where += ' AND period = :period'; params.period = period; }
  if (scope_type) { where += ' AND scope_type = :st'; params.st = scope_type; }
  const rows = await q(`SELECT * FROM sfa_outlet_growth_targets ${where} ORDER BY period DESC, scope_type`, params);

  // Refresh actual untuk setiap row
  for (const t of rows) {
    const baseParams: any = { tid, period: t.period, threshold: toNumber(t.productive_threshold) };
    let scopeWhere = '';
    if (t.scope_type === 'salesperson' && t.scope_id) { scopeWhere = ' AND salesperson_id = :sid'; baseParams.sid = t.scope_id; }
    else if (t.scope_type === 'team' && t.scope_id) { scopeWhere = ' AND team_id = :sid'; baseParams.sid = t.scope_id; }
    else if (t.scope_type === 'territory' && t.scope_id) { scopeWhere = ' AND territory_id = :sid'; baseParams.sid = t.scope_id; }
    else if (t.scope_type === 'branch' && t.scope_id) { scopeWhere = ' AND branch_id = :sid'; baseParams.sid = t.scope_id; }

    const cnt = await qOne(
      `SELECT COUNT(DISTINCT outlet_id) AS active_outlets,
              COUNT(DISTINCT CASE WHEN outlet_total >= :threshold THEN outlet_id END) AS productive_outlets
         FROM (
           SELECT outlet_id, SUM(net_amount) AS outlet_total
             FROM sfa_sales_entries
            WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
              AND status NOT IN ('cancelled') AND is_return = false ${scopeWhere}
            GROUP BY outlet_id
         ) sub`,
      baseParams,
    );
    t.actual_active_outlets = parseInt(cnt?.active_outlets || '0');
    t.actual_productive_outlets = parseInt(cnt?.productive_outlets || '0');
  }
  return ok(res, { data: rows });
}

async function createOutletGrowthTarget(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const b = req.body || {};
  if (!b.name || !b.period) return err(res, 'name & period wajib');
  const year = parseInt(String(b.period).split('-')[0], 10);
  const code = b.code || `OGT-${Date.now().toString(36).toUpperCase()}`;

  const row = await qOne(
    `INSERT INTO sfa_outlet_growth_targets
       (tenant_id, code, name, scope_type, scope_id, scope_name,
        period_type, period, year,
        target_active_outlets, target_new_outlets, target_productive_outlets, target_registered_outlets,
        productive_threshold, growth_rate_target, status, notes, created_by)
     VALUES
       (:tid, :code, :name, :scope_type, :scope_id, :scope_name,
        :period_type, :period, :year,
        :tao, :tno, :tpo, :tro,
        :pt, :grt, :status, :notes, :uid)
     RETURNING id`,
    {
      tid, uid, code, name: b.name,
      scope_type: b.scope_type || 'global',
      scope_id: b.scope_id || null, scope_name: b.scope_name || null,
      period_type: b.period_type || 'monthly', period: b.period, year,
      tao: parseInt(b.target_active_outlets || 0),
      tno: parseInt(b.target_new_outlets || 0),
      tpo: parseInt(b.target_productive_outlets || 0),
      tro: parseInt(b.target_registered_outlets || 0),
      pt: toNumber(b.productive_threshold),
      grt: toNumber(b.growth_rate_target),
      status: b.status || 'active',
      notes: b.notes || null,
    },
  );
  if (!row?.id) return err(res, 'Gagal buat target pertumbuhan outlet', 500);
  fireAudit('create', 'sfa_outlet_growth_target', row.id, { name: b.name, period: b.period });
  return res.status(201).json({ success: true, message: 'Target pertumbuhan outlet dibuat', data: { id: row.id } });
}

async function updateOutletGrowthTarget(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const { id, ...data } = req.body || {};
  if (!id) return err(res, 'id required');
  const allowed = ['name', 'scope_type', 'scope_id', 'scope_name', 'period_type', 'period', 'year',
    'target_active_outlets', 'target_new_outlets', 'target_productive_outlets', 'target_registered_outlets',
    'productive_threshold', 'growth_rate_target', 'status', 'notes'];
  const sets: string[] = [];
  const params: any = { id, tid, uid };
  for (const k of allowed) if (data[k] !== undefined) { sets.push(`${k} = :${k}`); params[k] = data[k]; }
  if (sets.length === 0) return err(res, 'Tidak ada field untuk diupdate');
  sets.push('updated_by = :uid', 'updated_at = NOW()');
  const okSql = await qExec(`UPDATE sfa_outlet_growth_targets SET ${sets.join(', ')} WHERE id = :id AND tenant_id = :tid`, params);
  if (!okSql) return err(res, 'Gagal update', 500);
  fireAudit('update', 'sfa_outlet_growth_target', id, data);
  return ok(res, { message: 'Target diperbarui' });
}

async function deleteOutletGrowthTarget(req: NextApiRequest, res: NextApiResponse, tid: string, fireAudit: Function) {
  const { id } = req.query;
  if (!id) return err(res, 'id required');
  const okSql = await qExec(`UPDATE sfa_outlet_growth_targets SET is_deleted=true, deleted_at=NOW() WHERE id = :id AND tenant_id = :tid`, { id, tid });
  if (!okSql) return err(res, 'Gagal hapus', 500);
  fireAudit('delete', 'sfa_outlet_growth_target', String(id));
  return ok(res, { message: 'Target dihapus' });
}

// ════════════════════════════════════════════════════════════════
// ██  LOOKUP
// ════════════════════════════════════════════════════════════════
async function getLookupFilters(res: NextApiResponse, tid: string) {
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.lookupFiltersDemo());
  }
  const [productGroups, brands, channels, salespeople, territories, teams, outlets] = await Promise.all([
    q(`SELECT DISTINCT product_group FROM sfa_sales_entries WHERE tenant_id = :tid AND product_group IS NOT NULL ORDER BY product_group`, { tid }),
    q(`SELECT DISTINCT product_brand FROM sfa_sales_entries WHERE tenant_id = :tid AND product_brand IS NOT NULL ORDER BY product_brand`, { tid }),
    q(`SELECT DISTINCT outlet_channel FROM sfa_sales_entries WHERE tenant_id = :tid AND outlet_channel IS NOT NULL ORDER BY outlet_channel`, { tid }),
    q(`SELECT DISTINCT salesperson_id, salesperson_name FROM sfa_sales_entries WHERE tenant_id = :tid AND salesperson_id IS NOT NULL ORDER BY salesperson_name LIMIT 200`, { tid }),
    q(`SELECT id, name, code FROM sfa_territories WHERE tenant_id = :tid ORDER BY name LIMIT 200`, { tid }),
    q(`SELECT id, name FROM sfa_teams WHERE tenant_id = :tid ORDER BY name LIMIT 200`, { tid }),
    q(`SELECT DISTINCT outlet_id, outlet_code, outlet_name FROM sfa_sales_entries WHERE tenant_id = :tid AND outlet_id IS NOT NULL ORDER BY outlet_name LIMIT 500`, { tid }),
  ]);
  return ok(res, {
    data: {
      product_groups: productGroups.map((r: any) => r.product_group),
      product_brands: brands.map((r: any) => r.product_brand),
      outlet_channels: channels.map((r: any) => r.outlet_channel),
      salespeople, territories, teams, outlets,
    },
  });
}

// ════════════════════════════════════════════════════════════════
// ██  DISTRIBUTION KPIs (FMCG)
// ════════════════════════════════════════════════════════════════
// Numeric Distribution (ND)  = # outlet yang mengambil produk kita / # outlet universe × 100
// Weighted Distribution (WD) = Σ total omzet kategori di outlet yang mengambil produk kita
//                              / Σ total omzet kategori di semua outlet × 100
// Konsep: outlet yang "bagus" (omzet besar) mengambil produk kita → WD tinggi.
async function getDistribution(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.distributionDemo(period));
  }

  // Ambil universe dari sfa_outlet_growth_targets (scope global)
  const universe = await qOne(
    `SELECT target_registered_outlets
       FROM sfa_outlet_growth_targets
      WHERE tenant_id = :tid AND period = :period AND scope_type = 'global' AND status = 'active'
      ORDER BY created_at DESC LIMIT 1`,
    { tid, period },
  );
  const universeCount = parseInt(universe?.target_registered_outlets || '0') || 0;

  // Outlet yang transaksi pada periode ini
  const activeOutletsRow = await qOne(
    `SELECT COUNT(DISTINCT outlet_id) AS cnt
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
        AND status NOT IN ('cancelled') AND is_return = false`,
    { tid, period },
  );
  const activeOutlets = parseInt(activeOutletsRow?.cnt || '0');

  // Total omzet seluruh outlet (untuk WD denominator)
  const totalRow = await qOne(
    `SELECT COALESCE(SUM(net_amount), 0) AS total FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false`,
    { tid, period },
  );
  const grandTotal = toNumber(totalRow?.total);

  // Karena produk kita dianggap "tercover" bila outlet mengambilnya,
  // ND global = outlet yang ambil minimal 1 SKU / universe total
  const nd = universeCount > 0 ? (activeOutlets / universeCount) * 100 : 0;

  // WD global = total omzet outlet yang ambil produk kita / total omzet seluruh universe (proxy grandTotal)
  // Karena universe sales tidak tersedia, gunakan grandTotal sebagai 100% (→ WD ≈ 100% utk global).
  // WD per-produk lebih bermakna (lihat endpoint berikutnya).

  return ok(res, {
    data: {
      period,
      universe_outlets: universeCount,
      active_outlets: activeOutlets,
      numeric_distribution_pct: universeCount > 0 ? Number(nd.toFixed(2)) : null,
      grand_total: grandTotal,
      note: 'Untuk Weighted Distribution per produk, gunakan distribution-per-product.',
    },
  });
}

async function getDistributionPerProduct(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.distributionPerProductDemo(period));
  }
  const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);

  const universe = await qOne(
    `SELECT target_registered_outlets
       FROM sfa_outlet_growth_targets
      WHERE tenant_id = :tid AND period = :period AND scope_type = 'global' AND status = 'active'
      ORDER BY created_at DESC LIMIT 1`,
    { tid, period },
  );
  const universeCount = parseInt(universe?.target_registered_outlets || '0') || 0;

  const totalRow = await qOne(
    `SELECT COALESCE(SUM(net_amount), 0) AS total FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false`,
    { tid, period },
  );
  const grandTotal = toNumber(totalRow?.total);

  // Per produk: ND = outlet yg ambil produk ini / universe
  //             WD = Σ omzet outlet yg ambil produk ini (semua kategori) / grand total
  const rows = await q(
    `WITH product_outlets AS (
        SELECT product_id, product_sku, product_name, product_group,
               array_agg(DISTINCT outlet_id) AS outlets,
               COUNT(DISTINCT outlet_id) AS outlet_count,
               SUM(net_amount) AS product_value,
               SUM(quantity) AS product_qty
          FROM sfa_sales_entries
         WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
           AND status NOT IN ('cancelled') AND is_return = false
         GROUP BY product_id, product_sku, product_name, product_group
     ),
     outlet_totals AS (
        SELECT outlet_id, SUM(net_amount) AS outlet_total
          FROM sfa_sales_entries
         WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
           AND status NOT IN ('cancelled') AND is_return = false
         GROUP BY outlet_id
     )
     SELECT po.product_id, po.product_sku, po.product_name, po.product_group,
            po.outlet_count, po.product_value, po.product_qty,
            COALESCE((SELECT SUM(ot.outlet_total) FROM outlet_totals ot
                       WHERE ot.outlet_id = ANY(po.outlets)), 0) AS weighted_outlet_value
       FROM product_outlets po
      ORDER BY po.outlet_count DESC, po.product_value DESC
      LIMIT :limit`,
    { tid, period, limit },
  );

  const result = rows.map((r: any) => {
    const oc = parseInt(r.outlet_count || '0');
    const nd = universeCount > 0 ? (oc / universeCount) * 100 : null;
    const wd = grandTotal > 0 ? (toNumber(r.weighted_outlet_value) / grandTotal) * 100 : null;
    return {
      product_id: r.product_id,
      product_sku: r.product_sku,
      product_name: r.product_name,
      product_group: r.product_group,
      outlet_count: oc,
      product_value: toNumber(r.product_value),
      product_qty: toNumber(r.product_qty),
      numeric_distribution_pct: nd !== null ? Number(nd.toFixed(2)) : null,
      weighted_distribution_pct: wd !== null ? Number(wd.toFixed(2)) : null,
    };
  });

  return ok(res, { data: result, period, universe_outlets: universeCount, grand_total: grandTotal });
}

// ════════════════════════════════════════════════════════════════
// ██  DRILL-DOWN ENTRIES
// ════════════════════════════════════════════════════════════════
async function getEntriesDrilldown(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  const { outlet_id, product_id, salesperson_id, product_group } = req.query;
  if (!outlet_id && !product_id && !salesperson_id && !product_group) {
    return err(res, 'Minimal 1 dimensi filter: outlet_id / product_id / salesperson_id / product_group');
  }
  let where = "WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false";
  const params: any = { tid, period };
  if (outlet_id) { where += ' AND outlet_id = :oid'; params.oid = outlet_id; }
  if (product_id) { where += ' AND product_id = :pid'; params.pid = product_id; }
  if (salesperson_id) { where += ' AND salesperson_id = :sp'; params.sp = salesperson_id; }
  if (product_group) { where += ' AND product_group = :pgrp'; params.pgrp = product_group; }

  const rows = await q(
    `SELECT id, entry_date, sales_type, salesperson_name, outlet_name, outlet_channel,
            product_name, product_group, product_sku,
            quantity, unit_price, discount_amount, net_amount, status, reference_number, source
       FROM sfa_sales_entries ${where}
       ORDER BY entry_date DESC, created_at DESC
       LIMIT 500`,
    params,
  );
  const summary = await qOne(
    `SELECT COUNT(*) AS cnt, COALESCE(SUM(net_amount),0) AS total, COALESCE(SUM(quantity),0) AS qty
       FROM sfa_sales_entries ${where}`,
    params,
  );
  return ok(res, {
    data: rows,
    summary: {
      count: parseInt(summary?.cnt || '0'),
      total: toNumber(summary?.total),
      qty: toNumber(summary?.qty),
    },
  });
}

// ════════════════════════════════════════════════════════════════
// ██  CSV IMPORT / EXPORT
// ════════════════════════════════════════════════════════════════
const CSV_COLUMNS = [
  'entry_date', 'sales_type', 'salesperson_name', 'outlet_code', 'outlet_name', 'outlet_channel', 'outlet_class', 'outlet_city',
  'product_sku', 'product_name', 'product_group', 'product_brand', 'product_uom',
  'quantity', 'unit_price', 'discount_amount', 'tax_amount', 'net_amount', 'currency',
  'reference_number', 'promo_code', 'status', 'notes',
];

function escapeCsv(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { val += '"'; i++; }
        else inQuote = false;
      } else val += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { cur.push(val); val = ''; }
      else if (ch === '\n') { cur.push(val); rows.push(cur); cur = []; val = ''; }
      else if (ch === '\r') { /* skip */ }
      else val += ch;
    }
  }
  if (val.length > 0 || cur.length > 0) { cur.push(val); rows.push(cur); }
  return rows.filter(r => r.some(c => c !== ''));
}

async function exportCsv(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const params: any = { tid };
  const where = buildSalesFilters({ ...req.query, include_all: req.query.include_all === '1' }, params);
  const limit = Math.min(parseInt(String(req.query.limit || '10000'), 10) || 10000, 50000);
  params.limit = limit;
  const rows = await q(
    `SELECT ${CSV_COLUMNS.join(', ')} FROM sfa_sales_entries ${where}
     ORDER BY entry_date DESC, created_at DESC LIMIT :limit`,
    params,
  );

  const header = CSV_COLUMNS.join(',');
  const body = rows.map((r: any) => CSV_COLUMNS.map(c => escapeCsv(r[c])).join(',')).join('\n');
  const csv = `${header}\n${body}`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sales_entries_${Date.now()}.csv"`);
  return res.send(csv);
}

function csvTemplate(res: NextApiResponse) {
  const header = CSV_COLUMNS.join(',');
  const sample = [
    '2026-04-18', 'primary', 'John Doe', 'OUT001', 'Toko Maju', 'general_trade', 'A', 'Jakarta',
    'SKU-001', 'Susu UHT 1L', 'Dairy', 'BrandX', 'pcs',
    '12', '15000', '0', '19800', '199800', 'IDR',
    'SO-0001', '', 'confirmed', 'Contoh baris',
  ];
  const csv = `${header}\n${sample.map(escapeCsv).join(',')}\n`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sales_entries_template.csv"');
  return res.send(csv);
}

async function importCsv(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const b = req.body || {};
  const csv = String(b.csv || '');
  if (!csv.trim()) return err(res, 'csv body required');

  const rows = parseCsv(csv);
  if (rows.length < 2) return err(res, 'CSV kosong atau hanya header');

  const header = rows[0].map(h => h.trim());
  const idx: Record<string, number> = {};
  for (const c of CSV_COLUMNS) idx[c] = header.indexOf(c);
  if (idx.entry_date < 0 || idx.product_name < 0) {
    return err(res, 'Header CSV minimal harus memiliki entry_date dan product_name');
  }

  let inserted = 0;
  const errors: Array<{ row: number; error: string }> = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (k: string) => idx[k] >= 0 ? (row[idx[k]] ?? '').trim() : '';
    const entry_date = get('entry_date');
    const product_name = get('product_name');
    if (!entry_date || !product_name) { errors.push({ row: i + 1, error: 'entry_date & product_name wajib' }); continue; }

    const period = entry_date.slice(0, 7);
    const year = parseInt(period.split('-')[0], 10);
    const quantity = parseFloat(get('quantity')) || 0;
    const unit_price = parseFloat(get('unit_price')) || 0;
    const discount_amount = parseFloat(get('discount_amount')) || 0;
    const tax_amount = parseFloat(get('tax_amount')) || 0;
    const gross_amount = quantity * unit_price;
    const csvNet = parseFloat(get('net_amount'));
    const net_amount = Number.isFinite(csvNet) && csvNet > 0 ? csvNet : (gross_amount - discount_amount + tax_amount);

    const okInsert = await qExec(
      `INSERT INTO sfa_sales_entries
        (tenant_id, entry_date, period, year, sales_type, source,
         salesperson_name, outlet_code, outlet_name, outlet_channel, outlet_class, outlet_city,
         product_sku, product_name, product_group, product_brand, product_uom,
         quantity, unit_price, gross_amount, discount_amount, tax_amount, net_amount, currency,
         reference_number, promo_code, status, notes, created_by)
       VALUES
        (:tid, :edate, :period, :year, :sales_type, 'import',
         :spn, :ocode, :oname, :ochan, :oclass, :ocity,
         :psku, :pname, :pgrp, :pbrand, :puom,
         :qty, :price, :gross, :disc, :tax, :net, :curr,
         :ref, :promo, :status, :notes, :uid)`,
      {
        tid, uid,
        edate: entry_date, period, year,
        sales_type: get('sales_type') || 'primary',
        spn: get('salesperson_name') || null,
        ocode: get('outlet_code') || null, oname: get('outlet_name') || null,
        ochan: get('outlet_channel') || null, oclass: get('outlet_class') || null, ocity: get('outlet_city') || null,
        psku: get('product_sku') || null, pname: product_name,
        pgrp: get('product_group') || null, pbrand: get('product_brand') || null, puom: get('product_uom') || 'pcs',
        qty: quantity, price: unit_price, gross: gross_amount, disc: discount_amount, tax: tax_amount, net: net_amount,
        curr: get('currency') || 'IDR',
        ref: get('reference_number') || null, promo: get('promo_code') || null,
        status: get('status') || 'confirmed',
        notes: get('notes') || null,
      },
    );
    if (okInsert) inserted++;
    else errors.push({ row: i + 1, error: 'DB insert gagal' });
  }

  fireAudit('import', 'sfa_sales_entry', undefined, { source: 'csv', inserted, errors: errors.length });
  return ok(res, { message: `${inserted} baris tersimpan dari ${rows.length - 1} total`, inserted, errors });
}

// ════════════════════════════════════════════════════════════════
// ██  PARETO 80/20 ANALYSIS (klasifikasi A/B/C)
// ════════════════════════════════════════════════════════════════
// Kumulatif kontribusi:
//   A = 0 – 80 %   (vital few)
//   B = 80 – 95 %  (important)
//   C = 95 – 100 % (trivial many / long tail)
function classifyAbc(cumPct: number): 'A' | 'B' | 'C' {
  if (cumPct <= 80) return 'A';
  if (cumPct <= 95) return 'B';
  return 'C';
}

async function paretoRowsFromBase(
  tid: string,
  query: any,
  groupCols: string,
  selectCols: string,
  metric: 'net_amount' | 'quantity' = 'net_amount',
  limit = 500,
) {
  const params: any = { tid };
  const where = buildSalesFilters(query, params);
  params.limit = limit;
  const rows = await q(
    `SELECT ${selectCols},
            COALESCE(SUM(${metric}), 0) AS metric_value,
            COALESCE(SUM(net_amount), 0) AS total_value,
            COALESCE(SUM(quantity), 0) AS total_qty,
            COUNT(DISTINCT outlet_id) AS outlets_involved,
            COUNT(*) AS trx_count
       FROM sfa_sales_entries ${where}
       GROUP BY ${groupCols}
       HAVING COALESCE(SUM(${metric}), 0) > 0
       ORDER BY metric_value DESC
       LIMIT :limit`,
    params,
  );
  const grand = rows.reduce((s: number, r: any) => s + toNumber(r.metric_value), 0);
  let cum = 0;
  const enriched = rows.map((r: any, i: number) => {
    const val = toNumber(r.metric_value);
    const pct = grand > 0 ? (val / grand) * 100 : 0;
    cum += pct;
    return {
      rank: i + 1,
      ...r,
      metric_value: val,
      total_value: toNumber(r.total_value),
      total_qty: toNumber(r.total_qty),
      outlets_involved: parseInt(r.outlets_involved || '0'),
      trx_count: parseInt(r.trx_count || '0'),
      contribution_pct: Number(pct.toFixed(2)),
      cumulative_pct: Number(cum.toFixed(2)),
      abc_class: classifyAbc(cum),
    };
  });
  const summary = {
    total_entities: enriched.length,
    grand_total: grand,
    class_A: enriched.filter(e => e.abc_class === 'A').length,
    class_B: enriched.filter(e => e.abc_class === 'B').length,
    class_C: enriched.filter(e => e.abc_class === 'C').length,
    top_20_pct_contribution: (() => {
      const top20 = Math.max(1, Math.ceil(enriched.length * 0.2));
      const sum = enriched.slice(0, top20).reduce((s, e) => s + e.metric_value, 0);
      return grand > 0 ? Number(((sum / grand) * 100).toFixed(2)) : 0;
    })(),
  };
  return { rows: enriched, summary };
}

async function getParetoOutlets(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    const result = SfaRich.paretoOutletsDemo(period);
    return ok(res, { ...result, dimension: 'outlet', metric: 'net_amount' });
  }
  const metric = (req.query.metric === 'quantity' ? 'quantity' : 'net_amount') as 'net_amount' | 'quantity';
  const result = await paretoRowsFromBase(
    tid,
    { ...req.query, period: req.query.period || currentPeriod() },
    'outlet_id, outlet_code, outlet_name, outlet_channel, outlet_class, outlet_city',
    'outlet_id, outlet_code, outlet_name, outlet_channel, outlet_class, outlet_city',
    metric,
  );
  return ok(res, { ...result, dimension: 'outlet', metric });
}

async function getParetoProducts(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    const result = SfaRich.paretoProductsDemo(period);
    return ok(res, { ...result, dimension: 'product', metric: 'net_amount' });
  }
  const metric = (req.query.metric === 'quantity' ? 'quantity' : 'net_amount') as 'net_amount' | 'quantity';
  const result = await paretoRowsFromBase(
    tid,
    { ...req.query, period: req.query.period || currentPeriod() },
    'product_id, product_sku, product_name, product_group, product_brand',
    'product_id, product_sku, product_name, product_group, product_brand',
    metric,
  );
  return ok(res, { ...result, dimension: 'product', metric });
}

async function getParetoSalespersons(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    const result = SfaRich.paretoSalespersonsDemo(period);
    return ok(res, { ...result, dimension: 'salesperson', metric: 'net_amount' });
  }
  const metric = (req.query.metric === 'quantity' ? 'quantity' : 'net_amount') as 'net_amount' | 'quantity';
  const result = await paretoRowsFromBase(
    tid,
    { ...req.query, period: req.query.period || currentPeriod() },
    'salesperson_id, salesperson_name, team_id, territory_id',
    'salesperson_id, salesperson_name, team_id, territory_id',
    metric,
  );
  return ok(res, { ...result, dimension: 'salesperson', metric });
}

/** Pareto produk + target & % pencapaian (join ke sfa_sales_item_targets) */
async function getParetoProductWithTarget(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  const limit = Math.min(parseInt(String(req.query.limit || '80'), 10) || 80, 300);
  const metric = (req.query.metric === 'quantity' ? 'quantity' : 'net_amount') as 'net_amount' | 'quantity';

  const rows = await q(
    `WITH actual AS (
        SELECT product_id, product_sku, product_name, product_group, product_brand,
               COALESCE(SUM(${metric}), 0) AS actual_metric,
               COALESCE(SUM(net_amount), 0) AS actual_net,
               COALESCE(SUM(quantity), 0) AS actual_qty,
               COUNT(DISTINCT outlet_id) AS outlets_involved,
               COUNT(*) AS trx_count
          FROM sfa_sales_entries
         WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false
         GROUP BY product_id, product_sku, product_name, product_group, product_brand
     ),
     tgt AS (
        SELECT product_id, product_sku, product_name, product_group,
               COALESCE(SUM(target_value), 0) AS target_value,
               COALESCE(SUM(target_quantity), 0) AS target_qty
          FROM sfa_sales_item_targets
         WHERE tenant_id = :tid AND period = :period AND status = 'active'
           AND target_level IN ('product', 'global')
         GROUP BY product_id, product_sku, product_name, product_group
     )
     SELECT COALESCE(a.product_id, t.product_id) AS product_id,
            COALESCE(a.product_sku, t.product_sku) AS product_sku,
            COALESCE(a.product_name, t.product_name) AS product_name,
            COALESCE(a.product_group, t.product_group) AS product_group,
            a.product_brand,
            COALESCE(a.actual_metric, 0) AS metric_value,
            COALESCE(a.actual_net, 0) AS actual_net,
            COALESCE(a.actual_qty, 0) AS actual_qty,
            COALESCE(a.outlets_involved, 0) AS outlets_involved,
            COALESCE(a.trx_count, 0) AS trx_count,
            COALESCE(t.target_value, 0) AS target_value,
            COALESCE(t.target_qty, 0) AS target_qty,
            CASE WHEN COALESCE(t.target_value, 0) > 0
                 THEN ROUND(COALESCE(a.actual_net, 0)::numeric / t.target_value * 100, 2)
                 ELSE NULL END AS achievement_pct
       FROM actual a
       FULL OUTER JOIN tgt t
         ON (a.product_id IS NOT DISTINCT FROM t.product_id)
        AND COALESCE(a.product_sku, '') = COALESCE(t.product_sku, '')
        AND COALESCE(a.product_name, '') = COALESCE(t.product_name, '')
      ORDER BY COALESCE(a.actual_metric, 0) DESC NULLS LAST
      LIMIT :lim`,
    { tid, period, lim: limit * 2 },
  );

  const sorted = rows
    .map((r: any) => ({
      ...r,
      metric_value: toNumber(r.metric_value),
      actual_net: toNumber(r.actual_net),
      actual_qty: toNumber(r.actual_qty),
      target_value: toNumber(r.target_value),
      target_qty: toNumber(r.target_qty),
      achievement_pct: r.achievement_pct != null ? toNumber(r.achievement_pct) : null,
    }))
    .filter((r: any) => r.metric_value > 0 || r.target_value > 0)
    .sort((a: any, b: any) => b.metric_value - a.metric_value)
    .slice(0, limit);

  const grand = sorted.reduce((s: number, r: any) => s + r.metric_value, 0);
  let cum = 0;
  const enriched = sorted.map((r: any, i: number) => {
    const pct = grand > 0 ? (r.metric_value / grand) * 100 : 0;
    cum += pct;
    return {
      rank: i + 1,
      ...r,
      contribution_pct: Number(pct.toFixed(2)),
      cumulative_pct: Number(cum.toFixed(2)),
      abc_class: classifyAbc(cum),
    };
  });

  const summary = {
    total_entities: enriched.length,
    grand_total: grand,
    class_A: enriched.filter((e: any) => e.abc_class === 'A').length,
    class_B: enriched.filter((e: any) => e.abc_class === 'B').length,
    class_C: enriched.filter((e: any) => e.abc_class === 'C').length,
    with_target: enriched.filter((e: any) => e.target_value > 0).length,
    avg_achievement_among_with_target: (() => {
      const w = enriched.filter((e: any) => e.target_value > 0 && e.achievement_pct != null);
      if (w.length === 0) return null;
      return Number((w.reduce((s: number, e: any) => s + e.achievement_pct, 0) / w.length).toFixed(2));
    })(),
  };

  return ok(res, { rows: enriched, summary, period, metric, dimension: 'product_with_target' });
}

/** Perilaku order outlet (field order) — frekuensi, tiket, status, pola waktu */
async function getOutletOrderBehavior(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  const { start, end } = parsePeriod(period);

  const tableCheck = await qOne(
    `SELECT to_regclass('public.sfa_field_orders') AS reg`,
    {},
  );
  if (!tableCheck?.reg) {
    return ok(res, {
      data: {
        available: false,
        message: 'Tabel field order belum tersedia. Gunakan entry penjualan untuk analisis.',
      },
      period,
    });
  }

  const overview = await qOne(
    `SELECT COUNT(*)::int AS order_count,
            COALESCE(SUM(fo.total), 0) AS revenue,
            COALESCE(AVG(fo.total), 0) AS avg_ticket,
            COALESCE(AVG(items.cnt), 0) AS avg_lines_per_order
       FROM sfa_field_orders fo
  LEFT JOIN (
        SELECT field_order_id, COUNT(*)::int AS cnt
          FROM sfa_field_order_items
         GROUP BY field_order_id
      ) items ON items.field_order_id = fo.id
      WHERE fo.tenant_id = :tid AND fo.order_date >= :start AND fo.order_date <= :end`,
    { tid, start, end },
  ).catch(() => null);

  if (!overview) {
    return ok(res, { data: { available: false, message: 'Gagal membaca field order' }, period });
  }

  const byStatus = await q(
    `SELECT status, COUNT(*)::int AS cnt, COALESCE(SUM(total), 0) AS revenue
       FROM sfa_field_orders
      WHERE tenant_id = :tid AND order_date >= :start AND order_date <= :end
      GROUP BY status ORDER BY cnt DESC`,
    { tid, start, end },
  ).catch(() => []);

  const topOutlets = await q(
    `SELECT COALESCE(customer_name, '—') AS outlet_name,
            customer_id::text AS customer_id,
            COUNT(*)::int AS order_count,
            COALESCE(SUM(total), 0) AS revenue,
            COALESCE(AVG(total), 0) AS avg_ticket
       FROM sfa_field_orders
      WHERE tenant_id = :tid AND order_date >= :start AND order_date <= :end
      GROUP BY customer_id, customer_name
      ORDER BY revenue DESC NULLS LAST
      LIMIT 25`,
    { tid, start, end },
  ).catch(() => []);

  const byWeekday = await q(
    `SELECT EXTRACT(ISODOW FROM order_date)::int AS dow,
            TO_CHAR(order_date, 'Dy') AS label,
            COUNT(*)::int AS orders,
            COALESCE(SUM(total), 0) AS revenue
       FROM sfa_field_orders
      WHERE tenant_id = :tid AND order_date >= :start AND order_date <= :end
      GROUP BY EXTRACT(ISODOW FROM order_date), TO_CHAR(order_date, 'Dy')
      ORDER BY dow`,
    { tid, start, end },
  ).catch(() => []);

  const repeatMix = await qOne(
    `WITH oc AS (
        SELECT customer_id, COUNT(*)::int AS n
          FROM sfa_field_orders
         WHERE tenant_id = :tid AND order_date >= :start AND order_date <= :end
           AND customer_id IS NOT NULL
         GROUP BY customer_id
     )
     SELECT COUNT(*) FILTER (WHERE n = 1)::int AS outlets_single_order,
            COUNT(*) FILTER (WHERE n > 1)::int AS outlets_repeat,
            COUNT(*)::int AS outlet_customers_distinct
       FROM oc`,
    { tid, start, end },
  ).catch(() => null);

  const bySalesperson = await q(
    `SELECT u.name AS salesperson_name,
            fo.salesperson_id,
            COUNT(*)::int AS orders,
            COALESCE(SUM(fo.total), 0) AS revenue
       FROM sfa_field_orders fo
  LEFT JOIN users u ON u.id = fo.salesperson_id
      WHERE fo.tenant_id = :tid AND fo.order_date >= :start AND fo.order_date <= :end
      GROUP BY fo.salesperson_id, u.name
      ORDER BY revenue DESC
      LIMIT 15`,
    { tid, start, end },
  ).catch(() => []);

  return ok(res, {
    data: {
      available: true,
      period,
      range: { start, end },
      overview: {
        order_count: parseInt(String(overview.order_count || '0')),
        revenue: toNumber(overview.revenue),
        avg_ticket: toNumber(overview.avg_ticket),
        avg_lines_per_order: toNumber(overview.avg_lines_per_order),
      },
      by_status: byStatus.map((r: any) => ({
        status: r.status,
        count: parseInt(String(r.cnt || '0')),
        revenue: toNumber(r.revenue),
      })),
      top_outlets: topOutlets.map((r: any) => ({
        outlet_name: r.outlet_name,
        customer_id: r.customer_id,
        order_count: parseInt(String(r.order_count || '0')),
        revenue: toNumber(r.revenue),
        avg_ticket: toNumber(r.avg_ticket),
      })),
      by_weekday: byWeekday.map((r: any) => ({
        dow: parseInt(String(r.dow || '0')),
        label: r.label,
        orders: parseInt(String(r.orders || '0')),
        revenue: toNumber(r.revenue),
      })),
      repeat_vs_single: repeatMix
        ? {
            distinct_outlets_with_orders: parseInt(String(repeatMix.outlet_customers_distinct || '0')),
            single_order_outlets: parseInt(String(repeatMix.outlets_single_order || '0')),
            repeat_order_outlets: parseInt(String(repeatMix.outlets_repeat || '0')),
            repeat_rate_pct:
              parseInt(String(repeatMix.outlet_customers_distinct || '0')) > 0
                ? Number(
                    (
                      (parseInt(String(repeatMix.outlets_repeat || '0')) /
                        parseInt(String(repeatMix.outlet_customers_distinct || '1'))) *
                      100
                    ).toFixed(2),
                  )
                : null,
          }
        : null,
      by_salesperson: bySalesperson.map((r: any) => ({
        salesperson_name: r.salesperson_name || `ID ${r.salesperson_id}`,
        salesperson_id: r.salesperson_id,
        orders: parseInt(String(r.orders || '0')),
        revenue: toNumber(r.revenue),
      })),
    },
    period,
  });
}

// ════════════════════════════════════════════════════════════════
// ██  PERFORMANCE BY DIMENSION (branch / territory / team)
// ════════════════════════════════════════════════════════════════
async function getPerformanceByDim(
  req: NextApiRequest,
  res: NextApiResponse,
  tid: string,
  dim: 'branch' | 'territory' | 'team',
) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.performanceDemo(period, dim));
  }
  const dimCol = dim === 'branch' ? 'branch_id' : dim === 'territory' ? 'territory_id' : 'team_id';
  const nameJoin = dim === 'branch'
    ? `LEFT JOIN branches b ON b.id::text = sse.${dimCol}::text`
    : dim === 'territory'
      ? `LEFT JOIN sfa_territories b ON b.id::text = sse.${dimCol}::text`
      : `LEFT JOIN sfa_teams b ON b.id::text = sse.${dimCol}::text`;

  const params: any = { tid };
  const where = buildSalesFilters({ period, ...req.query }, params);
  const whereSse = where.replace(/WHERE tenant_id = :tid/, 'WHERE sse.tenant_id = :tid');

  // Previous period (MoM)
  const prevPeriod = (() => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const rows = await q(
    `SELECT sse.${dimCol} AS dim_id,
            COALESCE(b.name, 'Unassigned') AS dim_name,
            COALESCE(SUM(sse.net_amount), 0) AS actual_value,
            COALESCE(SUM(sse.quantity), 0) AS total_qty,
            COUNT(DISTINCT sse.outlet_id) AS active_outlets,
            COUNT(DISTINCT sse.salesperson_id) AS active_salespersons,
            COUNT(DISTINCT sse.product_id) AS active_products,
            COUNT(*) AS trx_count,
            COALESCE(SUM(sse.net_amount), 0) / NULLIF(COUNT(DISTINCT sse.outlet_id), 0) AS avg_per_outlet,
            COALESCE(SUM(sse.net_amount), 0) / NULLIF(COUNT(DISTINCT sse.salesperson_id), 0) AS avg_per_sales
       FROM sfa_sales_entries sse
       ${nameJoin}
       ${whereSse}
       GROUP BY sse.${dimCol}, b.name
       ORDER BY actual_value DESC
       LIMIT 200`,
    params,
  );

  // Previous period comparison (per dim)
  const prevParams: any = { tid, prev: prevPeriod };
  const prevRows = await q(
    `SELECT ${dimCol} AS dim_id, COALESCE(SUM(net_amount), 0) AS prev_value
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :prev AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY ${dimCol}`,
    prevParams,
  );
  const prevMap = new Map(prevRows.map((r: any) => [String(r.dim_id || 'null'), toNumber(r.prev_value)]));

  // Target aggregation from sfa_sales_item_targets (global + per dim)
  const scopeType = dim;
  const tgtRows = await q(
    `SELECT scope_id, SUM(target_value) AS target_value, SUM(target_quantity) AS target_qty
       FROM sfa_sales_item_targets
      WHERE tenant_id = :tid AND period = :period
        AND (scope_type = :scope OR scope_type = 'global') AND status = 'active'
      GROUP BY scope_id`,
    { tid, period, scope: scopeType },
  );
  const tgtMap = new Map(tgtRows.map((r: any) => [String(r.scope_id || 'global'), { v: toNumber(r.target_value), q: toNumber(r.target_qty) }]));

  const enriched = rows.map((r: any, i: number) => {
    const prev = prevMap.get(String(r.dim_id || 'null')) || 0;
    const actual = toNumber(r.actual_value);
    const growth = prev > 0 ? ((actual - prev) / prev) * 100 : (actual > 0 ? 100 : 0);
    const tgt = tgtMap.get(String(r.dim_id)) || tgtMap.get('global') || { v: 0, q: 0 };
    const achv = tgt.v > 0 ? (actual / tgt.v) * 100 : null;
    return {
      rank: i + 1,
      dim_id: r.dim_id,
      dim_name: r.dim_name,
      actual_value: actual,
      prev_value: prev,
      growth_pct: Number(growth.toFixed(2)),
      target_value: tgt.v,
      achievement_pct: achv !== null ? Number(achv.toFixed(2)) : null,
      total_qty: toNumber(r.total_qty),
      active_outlets: parseInt(r.active_outlets || '0'),
      active_salespersons: parseInt(r.active_salespersons || '0'),
      active_products: parseInt(r.active_products || '0'),
      trx_count: parseInt(r.trx_count || '0'),
      avg_per_outlet: toNumber(r.avg_per_outlet),
      avg_per_sales: toNumber(r.avg_per_sales),
    };
  });

  const grand = enriched.reduce((s, r) => s + r.actual_value, 0);
  return ok(res, {
    data: enriched,
    summary: {
      dimension: dim,
      period, prev_period: prevPeriod,
      grand_total: grand,
      dim_count: enriched.length,
    },
  });
}

// ════════════════════════════════════════════════════════════════
// ██  SALESPERSON SCORECARD (360° view per sales)
// ════════════════════════════════════════════════════════════════
async function getSalespersonScorecard(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.scorecardDemo(period));
  }
  const salespersonId = req.query.salesperson_id;

  const params: any = { tid, period };
  let spFilter = '';
  if (salespersonId) { spFilter = ' AND salesperson_id = :sp'; params.sp = salespersonId; }

  // Aggregate per salesperson
  const rows = await q(
    `WITH sp AS (
       SELECT salesperson_id, salesperson_name, team_id, territory_id,
              COALESCE(SUM(net_amount), 0) AS revenue,
              COALESCE(SUM(quantity), 0) AS qty_sold,
              COUNT(DISTINCT outlet_id) AS outlets_covered,
              COUNT(DISTINCT product_id) AS unique_products,
              COUNT(*) AS trx_count,
              COUNT(DISTINCT DATE(entry_date)) AS active_days,
              COALESCE(SUM(net_amount),0) / NULLIF(COUNT(*),0) AS avg_order_value,
              COALESCE(SUM(net_amount),0) / NULLIF(COUNT(DISTINCT outlet_id),0) AS rev_per_outlet
         FROM sfa_sales_entries
        WHERE tenant_id = :tid AND period = :period
          AND status NOT IN ('cancelled') AND is_return = false ${spFilter}
        GROUP BY salesperson_id, salesperson_name, team_id, territory_id
     )
     SELECT sp.*, u.name AS user_name, t.name AS team_name, ter.name AS territory_name
       FROM sp
  LEFT JOIN users u ON sp.salesperson_id = u.id
  LEFT JOIN sfa_teams t ON sp.team_id = t.id
  LEFT JOIN sfa_territories ter ON sp.territory_id = ter.id
      ORDER BY sp.revenue DESC`,
    params,
  );

  // Target per salesperson
  const targets = await q(
    `SELECT scope_id, SUM(target_value) AS tv, SUM(target_quantity) AS tq
       FROM sfa_sales_item_targets
      WHERE tenant_id = :tid AND period = :period
        AND scope_type = 'salesperson' AND status = 'active'
      GROUP BY scope_id`,
    { tid, period },
  );
  const tMap = new Map(targets.map((r: any) => [String(r.scope_id), { v: toNumber(r.tv), q: toNumber(r.tq) }]));

  // Visit data (SFA visits for conversion funnel)
  const visits = await q(
    `SELECT salesperson_id,
            COUNT(*) AS visit_count,
            COUNT(DISTINCT customer_id) AS outlets_visited
       FROM sfa_visits
      WHERE tenant_id = :tid AND DATE_TRUNC('month', visit_date) = DATE_TRUNC('month', :start::date)
      GROUP BY salesperson_id`,
    { tid, start: `${period}-01` },
  ).catch(() => []);
  const vMap = new Map(visits.map((v: any) => [String(v.salesperson_id), { visit: parseInt(v.visit_count || '0'), outlets: parseInt(v.outlets_visited || '0') }]));

  const scorecard = rows.map((r: any) => {
    const rev = toNumber(r.revenue);
    const tgt = tMap.get(String(r.salesperson_id)) || { v: 0, q: 0 };
    const achv = tgt.v > 0 ? (rev / tgt.v) * 100 : null;
    const vis = vMap.get(String(r.salesperson_id)) || { visit: 0, outlets: 0 };
    const callsPerDay = r.active_days > 0 ? vis.visit / parseInt(r.active_days) : 0;
    return {
      salesperson_id: r.salesperson_id,
      salesperson_name: r.user_name || r.salesperson_name,
      team_name: r.team_name,
      territory_name: r.territory_name,
      kpi: {
        revenue: rev,
        qty_sold: toNumber(r.qty_sold),
        outlets_covered: parseInt(r.outlets_covered || '0'),
        unique_products: parseInt(r.unique_products || '0'),
        trx_count: parseInt(r.trx_count || '0'),
        active_days: parseInt(r.active_days || '0'),
        avg_order_value: toNumber(r.avg_order_value),
        revenue_per_outlet: toNumber(r.rev_per_outlet),
        visit_count: vis.visit,
        outlets_visited: vis.outlets,
        call_rate_per_day: Number(callsPerDay.toFixed(2)),
        // effective call rate: outlet bertransaksi / outlet dikunjungi
        productive_call_rate: vis.outlets > 0 ? Number(((parseInt(r.outlets_covered || '0') / vis.outlets) * 100).toFixed(2)) : null,
      },
      target: { value: tgt.v, qty: tgt.q, achievement_pct: achv !== null ? Number(achv.toFixed(2)) : null },
    };
  });

  return ok(res, { data: scorecard, period });
}

// ════════════════════════════════════════════════════════════════
// ██  LEADERBOARD (badges / medals)
// ════════════════════════════════════════════════════════════════
async function getLeaderboard(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.leaderboardDemo(period));
  }
  const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 100);

  const categories = [
    { key: 'revenue', sql: 'SUM(net_amount)', label: 'Top Revenue' },
    { key: 'qty', sql: 'SUM(quantity)', label: 'Top Quantity' },
    { key: 'outlets', sql: 'COUNT(DISTINCT outlet_id)', label: 'Top Outlet Coverage' },
    { key: 'trx', sql: 'COUNT(*)', label: 'Most Transactions' },
    { key: 'products', sql: 'COUNT(DISTINCT product_id)', label: 'Widest Product Range' },
  ];

  const boards: Record<string, any[]> = {};
  for (const cat of categories) {
    const rows = await q(
      `SELECT salesperson_id, salesperson_name, ${cat.sql} AS score
         FROM sfa_sales_entries
        WHERE tenant_id = :tid AND period = :period
          AND salesperson_id IS NOT NULL AND status NOT IN ('cancelled') AND is_return = false
        GROUP BY salesperson_id, salesperson_name
        ORDER BY score DESC
        LIMIT :limit`,
      { tid, period, limit },
    );
    boards[cat.key] = rows.map((r: any, i: number) => ({
      rank: i + 1,
      salesperson_id: r.salesperson_id,
      salesperson_name: r.salesperson_name,
      score: toNumber(r.score),
      badge: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : null,
      label: cat.label,
    }));
  }

  return ok(res, { data: boards, period, categories: categories.map(c => ({ key: c.key, label: c.label })) });
}

// ════════════════════════════════════════════════════════════════
// ██  SALES FUNNEL (Visit → Order → Revenue conversion)
// ════════════════════════════════════════════════════════════════
async function getSalesFunnel(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.salesFunnelDemo(period));
  }
  const salespersonId = req.query.salesperson_id;

  const start = `${period}-01`;

  // Visits
  let visitWhere = `WHERE tenant_id = :tid AND DATE_TRUNC('month', visit_date) = DATE_TRUNC('month', :start::date)`;
  const visitParams: any = { tid, start };
  if (salespersonId) { visitWhere += ' AND salesperson_id = :sp'; visitParams.sp = salespersonId; }
  const visitAgg = await qOne(
    `SELECT COUNT(*) AS total_visits,
            COUNT(DISTINCT customer_id) AS unique_outlets_visited,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_visits
       FROM sfa_visits ${visitWhere}`,
    visitParams,
  ).catch(() => ({ total_visits: 0, unique_outlets_visited: 0, completed_visits: 0 }));

  // Orders (field orders)
  let foWhere = 'WHERE tenant_id = :tid AND DATE_TRUNC(\'month\', order_date) = DATE_TRUNC(\'month\', :start::date)';
  const foParams: any = { tid, start };
  if (salespersonId) { foWhere += ' AND salesperson_id = :sp'; foParams.sp = salespersonId; }
  const foAgg = await qOne(
    `SELECT COUNT(*) AS total_orders,
            COUNT(CASE WHEN status IN ('approved','processing','shipped','delivered') THEN 1 END) AS approved_orders,
            COALESCE(SUM(CASE WHEN status IN ('approved','processing','shipped','delivered') THEN total ELSE 0 END), 0) AS approved_value
       FROM sfa_field_orders ${foWhere}`,
    foParams,
  ).catch(() => ({ total_orders: 0, approved_orders: 0, approved_value: 0 }));

  // Actual revenue in sales entries
  let seWhere = 'WHERE tenant_id = :tid AND period = :period AND status NOT IN (\'cancelled\') AND is_return = false';
  const seParams: any = { tid, period };
  if (salespersonId) { seWhere += ' AND salesperson_id = :sp'; seParams.sp = salespersonId; }
  const seAgg = await qOne(
    `SELECT COUNT(*) AS trx_count,
            COUNT(DISTINCT outlet_id) AS productive_outlets,
            COALESCE(SUM(net_amount), 0) AS revenue
       FROM sfa_sales_entries ${seWhere}`,
    seParams,
  );

  const visitTotal = parseInt(visitAgg?.total_visits || '0');
  const outletsVisited = parseInt(visitAgg?.unique_outlets_visited || '0');
  const foTotal = parseInt(foAgg?.total_orders || '0');
  const foApproved = parseInt(foAgg?.approved_orders || '0');
  const productive = parseInt(seAgg?.productive_outlets || '0');
  const revenue = toNumber(seAgg?.revenue);

  return ok(res, {
    data: {
      period, salesperson_id: salespersonId || null,
      stages: [
        { stage: 'visits', label: 'Kunjungan', count: visitTotal, value: null },
        { stage: 'outlets_visited', label: 'Outlet Dikunjungi', count: outletsVisited, value: null },
        { stage: 'orders', label: 'Order Dibuat', count: foTotal, value: null },
        { stage: 'orders_approved', label: 'Order Disetujui', count: foApproved, value: toNumber(foAgg?.approved_value) },
        { stage: 'productive_outlets', label: 'Outlet Produktif', count: productive, value: null },
        { stage: 'revenue', label: 'Realisasi Revenue', count: parseInt(seAgg?.trx_count || '0'), value: revenue },
      ],
      conversion: {
        visit_to_order_pct: visitTotal > 0 ? Number(((foTotal / visitTotal) * 100).toFixed(2)) : null,
        order_to_approved_pct: foTotal > 0 ? Number(((foApproved / foTotal) * 100).toFixed(2)) : null,
        outlet_productivity_pct: outletsVisited > 0 ? Number(((productive / outletsVisited) * 100).toFixed(2)) : null,
        avg_revenue_per_visit: visitTotal > 0 ? Number((revenue / visitTotal).toFixed(2)) : null,
      },
    },
  });
}

// ════════════════════════════════════════════════════════════════
// ██  ADVANCED KPIs (basket analysis, diversity, concentration)
// ════════════════════════════════════════════════════════════════
async function getAdvancedKpis(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, SfaRich.advancedKpisDemo(period));
  }
  const params: any = { tid, period };

  const main = await qOne(
    `SELECT COUNT(*) AS trx_count,
            COUNT(DISTINCT reference_number) AS order_count,
            COUNT(DISTINCT outlet_id) AS outlets,
            COUNT(DISTINCT salesperson_id) AS salespersons,
            COUNT(DISTINCT product_id) AS products,
            COALESCE(SUM(net_amount), 0) AS revenue,
            COALESCE(SUM(quantity), 0) AS total_qty,
            COALESCE(SUM(gross_amount - net_amount), 0) AS total_discount,
            COALESCE(SUM(gross_amount), 0) AS gross_rev
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND status NOT IN ('cancelled') AND is_return = false`,
    params,
  );

  const revenue = toNumber(main?.revenue);
  const outlets = parseInt(main?.outlets || '0');
  const products = parseInt(main?.products || '0');
  const trxCount = parseInt(main?.trx_count || '0');
  const orderCount = parseInt(main?.order_count || '0');
  const totalQty = toNumber(main?.total_qty);
  const gross = toNumber(main?.gross_rev);
  const discount = toNumber(main?.total_discount);

  // Basket analysis: lines per order + average basket value
  const linesPerOrder = orderCount > 0 ? trxCount / orderCount : 0;
  const avgBasketValue = orderCount > 0 ? revenue / orderCount : 0;
  const avgUnitPrice = totalQty > 0 ? revenue / totalQty : 0;
  const discountRate = gross > 0 ? (discount / gross) * 100 : 0;

  // Concentration: HHI (Herfindahl index) on outlets
  const hhiRows = await q(
    `SELECT outlet_id, SUM(net_amount) AS v
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND outlet_id IS NOT NULL
        AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY outlet_id`,
    params,
  );
  let hhi = 0;
  if (revenue > 0) {
    hhi = hhiRows.reduce((s: number, r: any) => {
      const share = toNumber(r.v) / revenue;
      return s + share * share;
    }, 0);
  }

  // Return rate
  const ret = await qOne(
    `SELECT COALESCE(SUM(net_amount), 0) AS returned
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND period = :period AND is_return = true`,
    params,
  );
  const returnRate = revenue > 0 ? (toNumber(ret?.returned) / revenue) * 100 : 0;

  // New vs Repeat outlets (new = first-ever transaction period == current)
  const newRepeat = await qOne(
    `WITH first_trx AS (
        SELECT outlet_id, MIN(period) AS first_period
          FROM sfa_sales_entries
         WHERE tenant_id = :tid AND outlet_id IS NOT NULL
           AND status NOT IN ('cancelled') AND is_return = false
         GROUP BY outlet_id
     )
     SELECT
        COUNT(DISTINCT CASE WHEN ft.first_period = :period THEN sse.outlet_id END) AS new_outlets,
        COUNT(DISTINCT CASE WHEN ft.first_period < :period THEN sse.outlet_id END) AS repeat_outlets,
        COALESCE(SUM(CASE WHEN ft.first_period = :period THEN sse.net_amount ELSE 0 END), 0) AS new_rev,
        COALESCE(SUM(CASE WHEN ft.first_period < :period THEN sse.net_amount ELSE 0 END), 0) AS repeat_rev
       FROM sfa_sales_entries sse
       JOIN first_trx ft ON ft.outlet_id = sse.outlet_id
      WHERE sse.tenant_id = :tid AND sse.period = :period
        AND sse.status NOT IN ('cancelled') AND sse.is_return = false`,
    params,
  );

  return ok(res, {
    data: {
      period,
      volume: {
        revenue, gross_revenue: gross, total_discount: discount,
        qty: totalQty, trx_count: trxCount, order_count: orderCount,
        outlets, salespersons: parseInt(main?.salespersons || '0'), products,
      },
      basket: {
        lines_per_order: Number(linesPerOrder.toFixed(2)),
        avg_basket_value: Number(avgBasketValue.toFixed(2)),
        avg_unit_price: Number(avgUnitPrice.toFixed(2)),
        discount_rate_pct: Number(discountRate.toFixed(2)),
      },
      concentration: {
        hhi: Number(hhi.toFixed(4)),
        hhi_label: hhi < 0.15 ? 'Terdiversifikasi' : hhi < 0.25 ? 'Moderat' : 'Terkonsentrasi',
        return_rate_pct: Number(returnRate.toFixed(2)),
      },
      mix: {
        new_outlets: parseInt(newRepeat?.new_outlets || '0'),
        repeat_outlets: parseInt(newRepeat?.repeat_outlets || '0'),
        new_outlet_revenue: toNumber(newRepeat?.new_rev),
        repeat_outlet_revenue: toNumber(newRepeat?.repeat_rev),
      },
    },
  });
}

// ════════════════════════════════════════════════════════════════
// ██  GROWTH ANALYSIS (MoM / YoY trend + current period)
// ════════════════════════════════════════════════════════════════
async function getGrowthAnalysis(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const period = String(req.query.period || currentPeriod());
  const monthsBack = Math.min(parseInt(String(req.query.months || '12'), 10) || 12, 36);
  if (await tenantHasNoSalesData(tid)) {
    return ok(res, { data: SfaRich.growthAnalysisDemo(period, monthsBack), period, months: monthsBack });
  }

  const trend = await q(
    `SELECT period,
            COALESCE(SUM(net_amount), 0) AS revenue,
            COALESCE(SUM(quantity), 0) AS qty,
            COUNT(DISTINCT outlet_id) AS outlets,
            COUNT(DISTINCT salesperson_id) AS salespersons,
            COUNT(*) AS trx
       FROM sfa_sales_entries
      WHERE tenant_id = :tid
        AND period >= TO_CHAR((:period || '-01')::date - (INTERVAL '1 month' * :months), 'YYYY-MM')
        AND status NOT IN ('cancelled') AND is_return = false
      GROUP BY period
      ORDER BY period ASC`,
    { tid, period, months: monthsBack },
  );

  const enriched = trend.map((r: any, i: number, arr: any[]) => {
    const prev = i > 0 ? arr[i - 1] : null;
    const prevRev = prev ? toNumber(prev.revenue) : 0;
    const curRev = toNumber(r.revenue);
    const mom = prev && prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : null;
    // YoY: period 12 bulan sebelumnya
    const yoyIdx = arr.findIndex((x: any) => {
      const [y1, m1] = r.period.split('-').map(Number);
      const [y2, m2] = x.period.split('-').map(Number);
      return y2 === y1 - 1 && m2 === m1;
    });
    const yoy = yoyIdx >= 0 && toNumber(arr[yoyIdx].revenue) > 0
      ? ((curRev - toNumber(arr[yoyIdx].revenue)) / toNumber(arr[yoyIdx].revenue)) * 100
      : null;
    return {
      period: r.period,
      revenue: curRev,
      qty: toNumber(r.qty),
      outlets: parseInt(r.outlets || '0'),
      salespersons: parseInt(r.salespersons || '0'),
      trx: parseInt(r.trx || '0'),
      mom_growth_pct: mom !== null ? Number(mom.toFixed(2)) : null,
      yoy_growth_pct: yoy !== null ? Number(yoy.toFixed(2)) : null,
    };
  });

  return ok(res, { data: enriched, period, months: monthsBack });
}

// ════════════════════════════════════════════════════════════════
// ██  INVENTORY INTEGRATION — catalog, stock, categories, locations
// ════════════════════════════════════════════════════════════════
//
// Ketentuan pemetaan item_type ↔ products table:
//   • item_type = 'product'      → products where can_be_sold=true & is_trackable=true
//                                   (barang fisik yang dihitung stoknya)
//   • item_type = 'service'      → products where can_be_sold=true & is_trackable=false
//                                   (jasa, layanan, non-stock)
//   • item_type = 'bundle'       → products where product_type='manufactured' (composite/kit)
//   • item_type = 'subscription' → products with unit='subscription' atau product_type='finished'
//                                   & SKU prefix 'SUB-' (fleksibel; override via API body)
//   • item_type = 'other'        → catch-all, tanpa filter
async function getItemCatalog(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const type = String(req.query.item_type || 'all');
  const search = String(req.query.search || '').trim();
  const categoryId = req.query.category_id ? parseInt(String(req.query.category_id), 10) : null;
  const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);

  let where = 'WHERE (p.is_active = true OR p.is_active IS NULL)';
  const params: any = { limit };

  // Tenant scoping — only apply if products.tenant_id exists (multi-tenant pricing schema)
  // Skip tenant filter to stay backward-compatible: the POS is single-tenant per deployment.

  // item_type filter
  if (type === 'product') {
    where += ` AND COALESCE(p.can_be_sold, true) = true
               AND (p.is_trackable = true OR p.product_type IN ('finished', 'manufactured'))`;
  } else if (type === 'service') {
    where += ` AND COALESCE(p.can_be_sold, true) = true
               AND (p.is_trackable = false OR p.product_type = 'service'
                    OR LOWER(COALESCE(p.unit,'')) IN ('service','jasa','hour','jam','session','sesi'))`;
  } else if (type === 'bundle') {
    where += " AND (p.product_type = 'manufactured' OR p.recipe_id IS NOT NULL)";
  } else if (type === 'subscription') {
    where += " AND (LOWER(COALESCE(p.unit,'')) IN ('subscription','langganan','bulan','month','year','tahun') OR p.sku LIKE 'SUB-%')";
  }

  if (search) {
    where += ` AND (p.name ILIKE :search OR p.sku ILIKE :search OR p.barcode ILIKE :search)`;
    params.search = `%${search}%`;
  }
  if (categoryId) {
    where += ` AND p.category_id = :catId`;
    params.catId = categoryId;
  }

  const rows = await q(
    `SELECT p.id, p.name, p.sku, p.barcode, p.unit, p.sell_price, p.buy_price,
            p.category_id, p.product_type, p.is_trackable,
            COALESCE(p.can_be_sold, true) AS can_be_sold,
            c.name AS category_name,
            COALESCE(SUM(s.quantity), 0) AS stock_total,
            COALESCE(SUM(s.available_quantity), 0) AS stock_available,
            COUNT(DISTINCT s.location_id) AS stock_locations
       FROM products p
  LEFT JOIN product_categories c ON c.id = p.category_id
  LEFT JOIN stocks s ON s.product_id = p.id
       ${where}
      GROUP BY p.id, c.name
      ORDER BY p.name ASC
      LIMIT :limit`,
    params,
  ).catch(async (e: any) => {
    // Legacy fallback: if product_categories table missing, try simpler query
    console.warn('[sales-mgmt] item-catalog fallback:', e.message);
    return q(
      `SELECT p.id, p.name, p.sku, p.barcode, p.unit, p.sell_price, p.buy_price,
              p.category_id, p.product_type, p.is_trackable,
              COALESCE(SUM(s.quantity), 0) AS stock_total
         FROM products p
    LEFT JOIN stocks s ON s.product_id = p.id
        ${where}
        GROUP BY p.id
        ORDER BY p.name ASC
        LIMIT :limit`,
      params,
    );
  });

  const items = rows.map((r: any) => {
    // Derive item_type for each returned row
    let derivedType: string = 'product';
    if (r.product_type === 'manufactured' || r.recipe_id) derivedType = 'bundle';
    else if (r.is_trackable === false) derivedType = 'service';
    else if ((r.unit || '').toLowerCase().match(/^(service|jasa|hour|jam|session|sesi)$/)) derivedType = 'service';
    else if ((r.unit || '').toLowerCase().match(/^(subscription|langganan|bulan|month|year|tahun)$/) || (r.sku || '').startsWith('SUB-')) derivedType = 'subscription';

    return {
      id: r.id,
      name: r.name,
      sku: r.sku,
      barcode: r.barcode,
      unit: r.unit || 'pcs',
      sell_price: toNumber(r.sell_price),
      buy_price: toNumber(r.buy_price),
      category_id: r.category_id,
      category_name: r.category_name || null,
      product_type: r.product_type,
      is_trackable: r.is_trackable,
      can_be_sold: r.can_be_sold !== false,
      item_type: derivedType,
      stock_total: toNumber(r.stock_total),
      stock_available: toNumber(r.stock_available || r.stock_total),
      stock_locations: parseInt(r.stock_locations || '1') || 1,
    };
  });

  return ok(res, { data: items, total: items.length, item_type_filter: type });
}

async function getItemDetail(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const id = req.query.id;
  if (!id) return err(res, 'id wajib');
  const product = await qOne(
    `SELECT p.*, c.name AS category_name
       FROM products p
  LEFT JOIN product_categories c ON c.id = p.category_id
      WHERE p.id = :id LIMIT 1`,
    { id },
  ).catch(() => qOne(`SELECT * FROM products WHERE id = :id LIMIT 1`, { id }));
  if (!product) return err(res, 'Produk tidak ditemukan', 404);

  const stocks = await q(
    `SELECT s.*, l.name AS location_name, l.code AS location_code
       FROM stocks s
  LEFT JOIN locations l ON l.id = s.location_id
      WHERE s.product_id = :id
      ORDER BY s.quantity DESC`,
    { id },
  ).catch(() => q(`SELECT * FROM stocks WHERE product_id = :id ORDER BY quantity DESC`, { id }));

  // Sales history (SFA only)
  const salesHistory = await q(
    `SELECT period, COALESCE(SUM(quantity),0) AS qty, COALESCE(SUM(net_amount),0) AS rev
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND inventory_product_id = :id
      GROUP BY period ORDER BY period DESC LIMIT 12`,
    { tid, id },
  );

  return ok(res, {
    data: {
      product: {
        ...product,
        sell_price: toNumber(product.sell_price),
        buy_price: toNumber(product.buy_price),
      },
      stocks: stocks.map((s: any) => ({
        ...s,
        quantity: toNumber(s.quantity),
        reserved_quantity: toNumber(s.reserved_quantity),
        available_quantity: toNumber(s.available_quantity || s.quantity),
      })),
      stock_total: stocks.reduce((s: number, r: any) => s + toNumber(r.quantity), 0),
      sales_history: salesHistory,
    },
  });
}

async function getProductCategories(res: NextApiResponse, tid: string) {
  const rows = await q(
    `SELECT id, name, parent_id FROM product_categories ORDER BY name LIMIT 500`,
    {},
  ).catch(() => []);
  return ok(res, { data: rows });
}

async function getStockLocations(res: NextApiResponse, tid: string) {
  const rows = await q(
    `SELECT id, name, code, type FROM locations WHERE COALESCE(is_active, true) = true ORDER BY name LIMIT 200`,
    {},
  ).catch(() => []);
  return ok(res, { data: rows });
}

async function checkStock(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const pid = req.query.product_id ? parseInt(String(req.query.product_id), 10) : null;
  if (!pid) return err(res, 'product_id wajib');
  const locId = req.query.location_id ? parseInt(String(req.query.location_id), 10) : null;
  let sql = `SELECT s.*, l.name AS location_name FROM stocks s LEFT JOIN locations l ON l.id = s.location_id WHERE s.product_id = :pid`;
  const params: any = { pid };
  if (locId) { sql += ' AND s.location_id = :loc'; params.loc = locId; }
  sql += ' ORDER BY s.quantity DESC';
  const stocks = await q(sql, params).catch(() => []);
  const total = stocks.reduce((s: number, r: any) => s + toNumber(r.quantity), 0);
  const available = stocks.reduce((s: number, r: any) => s + toNumber(r.available_quantity || r.quantity), 0);
  return ok(res, {
    data: {
      product_id: pid,
      stocks: stocks.map((s: any) => ({
        location_id: s.location_id,
        location_name: s.location_name,
        quantity: toNumber(s.quantity),
        reserved: toNumber(s.reserved_quantity),
        available: toNumber(s.available_quantity || s.quantity),
      })),
      total, available,
    },
  });
}

// Reverse stock (untuk cancel entry / refund)
async function reverseStock(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const b = req.body || {};
  const entryId = b.entry_id;
  if (!entryId) return err(res, 'entry_id wajib');

  const entry = await qOne(
    `SELECT * FROM sfa_sales_entries WHERE id = :id AND tenant_id = :tid LIMIT 1`,
    { id: entryId, tid },
  );
  if (!entry) return err(res, 'Entry tidak ditemukan', 404);
  if (!entry.stock_decremented) return err(res, 'Entry ini tidak memicu stok sebelumnya');
  if (!entry.inventory_product_id) return err(res, 'Entry tidak terhubung ke inventory');

  const qty = toNumber(entry.quantity);
  const locId = entry.branch_location_id;

  // Restore stock
  const stockRow = locId
    ? await qOne(`SELECT id FROM stocks WHERE product_id = :pid AND location_id = :loc LIMIT 1`, { pid: entry.inventory_product_id, loc: locId })
    : await qOne(`SELECT id FROM stocks WHERE product_id = :pid ORDER BY quantity DESC LIMIT 1`, { pid: entry.inventory_product_id });

  if (stockRow) {
    await qExec(`UPDATE stocks SET quantity = quantity + :q, last_movement_date = NOW(), updated_at = NOW() WHERE id = :id`, { q: qty, id: stockRow.id });
  }

  await qExec(`UPDATE sfa_sales_entries SET stock_decremented = false, updated_at = NOW() WHERE id = :id AND tenant_id = :tid`, { id: entryId, tid });

  try {
    await qExec(
      `INSERT INTO inventory_stock_movements
         (id, "tenantId", "branchId", "productId", type, quantity, "unitCost", "totalCost",
          "referenceType", "referenceId", reason, "performedBy", "performedAt", "createdBy", "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid(), :tid, :branch, :pid, 'return', :qty, :price, :total,
          'sfa_sales_entry', :ref, 'SFA reverse stock', :uid, NOW(), :uid, NOW(), NOW())`,
      {
        tid, uid,
        branch: entry.branch_id || null,
        pid: entry.inventory_product_id,
        qty, price: toNumber(entry.unit_price),
        total: toNumber(entry.net_amount),
        ref: entryId,
      },
    );
  } catch (e: any) { /* optional */ }

  fireAudit('reverse_stock', 'sfa_sales_entry', entryId, { qty, product_id: entry.inventory_product_id });
  return ok(res, { message: 'Stok dikembalikan', data: { entry_id: entryId, restored_qty: qty } });
}

// ════════════════════════════════════════════════════════════════
// ██  HRIS & INTEGRATION CONFIG
// ════════════════════════════════════════════════════════════════
type IntegrationConfig = {
  require_inventory_for_physical_targets: boolean;
  require_inventory_for_physical_entries: boolean;
  allow_non_physical_without_inventory: boolean;
  auto_decrement_stock: boolean;
  allow_negative_stock: boolean;
  auto_snapshot_stock_on_target: boolean;
  require_hris_for_salespersons: boolean;
  require_hris_for_sp_targets: boolean;
  auto_sync_on_field_orders: boolean;
  hris_sales_departments: string[];
  link_outlet_to_crm_customer: boolean;
};

const DEFAULT_CONFIG: IntegrationConfig = {
  require_inventory_for_physical_targets: true,
  require_inventory_for_physical_entries: true,
  allow_non_physical_without_inventory: true,
  auto_decrement_stock: true,
  allow_negative_stock: false,
  auto_snapshot_stock_on_target: true,
  require_hris_for_salespersons: true,
  require_hris_for_sp_targets: false,
  auto_sync_on_field_orders: true,
  hris_sales_departments: ['Sales', 'Marketing', 'Field Force'],
  link_outlet_to_crm_customer: true,
};

async function loadIntegrationConfig(tid: string | null): Promise<IntegrationConfig> {
  if (!tid) return { ...DEFAULT_CONFIG };
  const row = await qOne(
    `SELECT * FROM sfa_integration_config WHERE tenant_id = :tid LIMIT 1`,
    { tid },
  ).catch(() => null);
  if (!row) return { ...DEFAULT_CONFIG };
  // Merge with defaults for any missing flag
  return {
    ...DEFAULT_CONFIG,
    require_inventory_for_physical_targets: row.require_inventory_for_physical_targets ?? DEFAULT_CONFIG.require_inventory_for_physical_targets,
    require_inventory_for_physical_entries: row.require_inventory_for_physical_entries ?? DEFAULT_CONFIG.require_inventory_for_physical_entries,
    allow_non_physical_without_inventory: row.allow_non_physical_without_inventory ?? DEFAULT_CONFIG.allow_non_physical_without_inventory,
    auto_decrement_stock: row.auto_decrement_stock ?? DEFAULT_CONFIG.auto_decrement_stock,
    allow_negative_stock: row.allow_negative_stock ?? DEFAULT_CONFIG.allow_negative_stock,
    auto_snapshot_stock_on_target: row.auto_snapshot_stock_on_target ?? DEFAULT_CONFIG.auto_snapshot_stock_on_target,
    require_hris_for_salespersons: row.require_hris_for_salespersons ?? DEFAULT_CONFIG.require_hris_for_salespersons,
    require_hris_for_sp_targets: row.require_hris_for_sp_targets ?? DEFAULT_CONFIG.require_hris_for_sp_targets,
    auto_sync_on_field_orders: row.auto_sync_on_field_orders ?? DEFAULT_CONFIG.auto_sync_on_field_orders,
    hris_sales_departments: Array.isArray(row.hris_sales_departments) ? row.hris_sales_departments : DEFAULT_CONFIG.hris_sales_departments,
    link_outlet_to_crm_customer: row.link_outlet_to_crm_customer ?? DEFAULT_CONFIG.link_outlet_to_crm_customer,
  };
}

async function getIntegrationConfig(res: NextApiResponse, tid: string) {
  const cfg = await loadIntegrationConfig(tid);
  // Also enrich with integration health preview
  const health = await computeIntegrationHealth(tid);
  return ok(res, { data: cfg, health, defaults: DEFAULT_CONFIG });
}

async function updateIntegrationConfig(req: NextApiRequest, res: NextApiResponse, tid: string, uid: any, fireAudit: Function) {
  const b = req.body || {};
  const cur = await loadIntegrationConfig(tid);
  const merged = { ...cur };
  const boolKeys: (keyof IntegrationConfig)[] = [
    'require_inventory_for_physical_targets', 'require_inventory_for_physical_entries',
    'allow_non_physical_without_inventory', 'auto_decrement_stock', 'allow_negative_stock',
    'auto_snapshot_stock_on_target', 'require_hris_for_salespersons', 'require_hris_for_sp_targets',
    'auto_sync_on_field_orders', 'link_outlet_to_crm_customer',
  ];
  for (const k of boolKeys) {
    if (b[k] !== undefined) (merged as any)[k] = !!b[k];
  }
  if (Array.isArray(b.hris_sales_departments)) merged.hris_sales_departments = b.hris_sales_departments;

  // Upsert
  await qExec(
    `INSERT INTO sfa_integration_config
       (tenant_id, require_inventory_for_physical_targets, require_inventory_for_physical_entries,
        allow_non_physical_without_inventory, auto_decrement_stock, allow_negative_stock,
        auto_snapshot_stock_on_target, require_hris_for_salespersons, require_hris_for_sp_targets,
        auto_sync_on_field_orders, hris_sales_departments, link_outlet_to_crm_customer,
        last_updated_by, notes, created_at, updated_at)
     VALUES
       (:tid, :a, :b, :c, :d, :e, :f, :g, :h, :i, :j::jsonb, :k, :uid, :notes, NOW(), NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       require_inventory_for_physical_targets = EXCLUDED.require_inventory_for_physical_targets,
       require_inventory_for_physical_entries = EXCLUDED.require_inventory_for_physical_entries,
       allow_non_physical_without_inventory = EXCLUDED.allow_non_physical_without_inventory,
       auto_decrement_stock = EXCLUDED.auto_decrement_stock,
       allow_negative_stock = EXCLUDED.allow_negative_stock,
       auto_snapshot_stock_on_target = EXCLUDED.auto_snapshot_stock_on_target,
       require_hris_for_salespersons = EXCLUDED.require_hris_for_salespersons,
       require_hris_for_sp_targets = EXCLUDED.require_hris_for_sp_targets,
       auto_sync_on_field_orders = EXCLUDED.auto_sync_on_field_orders,
       hris_sales_departments = EXCLUDED.hris_sales_departments,
       link_outlet_to_crm_customer = EXCLUDED.link_outlet_to_crm_customer,
       last_updated_by = EXCLUDED.last_updated_by,
       notes = EXCLUDED.notes,
       updated_at = NOW()`,
    {
      tid,
      a: merged.require_inventory_for_physical_targets,
      b: merged.require_inventory_for_physical_entries,
      c: merged.allow_non_physical_without_inventory,
      d: merged.auto_decrement_stock,
      e: merged.allow_negative_stock,
      f: merged.auto_snapshot_stock_on_target,
      g: merged.require_hris_for_salespersons,
      h: merged.require_hris_for_sp_targets,
      i: merged.auto_sync_on_field_orders,
      j: JSON.stringify(merged.hris_sales_departments),
      k: merged.link_outlet_to_crm_customer,
      uid, notes: b.notes || null,
    },
  );
  fireAudit('update', 'sfa_integration_config', 'tenant-' + tid, merged);
  return ok(res, { message: 'Konfigurasi integrasi diperbarui', data: merged });
}

async function getIntegrationHealth(res: NextApiResponse, tid: string) {
  const data = await computeIntegrationHealth(tid);
  return ok(res, { data });
}

async function computeIntegrationHealth(tid: string) {
  const [entriesStat, targetStat, spStat] = await Promise.all([
    qOne(
      `SELECT
         COUNT(*) FILTER (WHERE item_type IN ('product','bundle')) AS physical_entries,
         COUNT(*) FILTER (WHERE item_type IN ('product','bundle') AND inventory_product_id IS NOT NULL) AS physical_entries_linked,
         COUNT(*) FILTER (WHERE item_type IN ('service','subscription','other')) AS non_physical_entries,
         COUNT(*) FILTER (WHERE salesperson_name IS NOT NULL) AS entries_with_sp,
         COUNT(*) FILTER (WHERE hris_employee_id IS NOT NULL) AS entries_sp_hris_linked,
         COUNT(*) AS total_entries
       FROM sfa_sales_entries WHERE tenant_id = :tid`,
      { tid },
    ).catch(() => ({})),
    qOne(
      `SELECT
         COUNT(*) FILTER (WHERE target_level = 'product' AND item_type IN ('product','bundle')) AS physical_targets,
         COUNT(*) FILTER (WHERE target_level = 'product' AND item_type IN ('product','bundle') AND inventory_product_id IS NOT NULL) AS physical_targets_linked,
         COUNT(*) AS total_targets
       FROM sfa_sales_item_targets WHERE tenant_id = :tid`,
      { tid },
    ).catch(() => ({})),
    qOne(
      `SELECT COUNT(DISTINCT salesperson_name) AS unique_sp,
              COUNT(DISTINCT hris_employee_id) AS hris_linked_sp
         FROM sfa_sales_entries WHERE tenant_id = :tid AND salesperson_name IS NOT NULL`,
      { tid },
    ).catch(() => ({})),
  ]);

  const pe = toNumber(entriesStat?.physical_entries);
  const pel = toNumber(entriesStat?.physical_entries_linked);
  const pt = toNumber(targetStat?.physical_targets);
  const ptl = toNumber(targetStat?.physical_targets_linked);
  const spCnt = toNumber(spStat?.unique_sp);
  const spHris = toNumber(spStat?.hris_linked_sp);

  return {
    physical_entry_link_rate: pe > 0 ? Number(((pel / pe) * 100).toFixed(1)) : 100,
    physical_entries_linked: pel,
    physical_entries: pe,
    physical_entries_unlinked: pe - pel,
    physical_target_link_rate: pt > 0 ? Number(((ptl / pt) * 100).toFixed(1)) : 100,
    physical_targets_linked: ptl,
    physical_targets: pt,
    physical_targets_unlinked: pt - ptl,
    salesperson_hris_link_rate: spCnt > 0 ? Number(((spHris / spCnt) * 100).toFixed(1)) : 0,
    salespersons_linked: spHris,
    salespersons_total: spCnt,
    total_entries: toNumber(entriesStat?.total_entries),
    total_targets: toNumber(targetStat?.total_targets),
  };
}

async function getSalespersons(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const search = String(req.query.search || '').trim();
  const department = req.query.department ? String(req.query.department) : null;
  const includeInactive = req.query.include_inactive === 'true';
  const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);

  const cfg = await loadIntegrationConfig(tid);
  const salesDepts = cfg.hris_sales_departments || [];

  const params: any = { tid, limit };
  let where = `WHERE he."tenantId" = :tid`;
  if (!includeInactive) where += ` AND he.status = 'active'`;

  // Narrow to sales-eligible departments if config lists any
  if (salesDepts.length > 0) {
    where += ` AND (he.department IS NULL OR he.department ILIKE ANY(ARRAY[${salesDepts.map((_, i) => `:dept${i}`).join(',')}]))`;
    salesDepts.forEach((d, i) => { params[`dept${i}`] = `%${d}%`; });
  }
  if (department) {
    where += ` AND he.department ILIKE :dept`;
    params.dept = `%${department}%`;
  }
  if (search) {
    where += ` AND (he.name ILIKE :s OR he.email ILIKE :s OR he."employeeNumber" ILIKE :s OR he.position ILIKE :s)`;
    params.s = `%${search}%`;
  }

  const rows = await q(
    `SELECT
        he.id AS hris_employee_id,
        he."employeeNumber" AS employee_number,
        he.name, he.email, he.phone,
        he.department, he.position, he."employmentType" AS employment_type,
        he.status, he."branchId" AS branch_id,
        b.name AS branch_name,
        (SELECT u.id FROM users u WHERE u.email = he.email AND u."tenantId" = :tid LIMIT 1) AS user_id,
        (SELECT u.role FROM users u WHERE u.email = he.email AND u."tenantId" = :tid LIMIT 1) AS user_role,
        (SELECT st.name FROM sfa_team_members stm
           JOIN sfa_teams st ON st.id = stm.team_id
          WHERE stm.is_active = true
            AND stm.user_id = (SELECT u.id FROM users u WHERE u.email = he.email AND u."tenantId" = :tid LIMIT 1)
          LIMIT 1) AS sfa_team_name,
        (SELECT st.id FROM sfa_team_members stm
           JOIN sfa_teams st ON st.id = stm.team_id
          WHERE stm.is_active = true
            AND stm.user_id = (SELECT u.id FROM users u WHERE u.email = he.email AND u."tenantId" = :tid LIMIT 1)
          LIMIT 1) AS sfa_team_id,
        (SELECT t.id FROM sfa_territories t WHERE t.tenant_id = :tid AND t.manager_employee_id = he.id LIMIT 1) AS territory_id,
        -- Latest 30-day performance snapshot
        (SELECT COALESCE(SUM(se.net_amount),0) FROM sfa_sales_entries se
          WHERE se.tenant_id = :tid AND se.hris_employee_id = he.id
            AND se.entry_date >= CURRENT_DATE - INTERVAL '30 days'
            AND se.status NOT IN ('cancelled') AND se.is_return = false) AS revenue_30d,
        (SELECT COUNT(*) FROM sfa_sales_entries se
          WHERE se.tenant_id = :tid AND se.hris_employee_id = he.id
            AND se.entry_date >= CURRENT_DATE - INTERVAL '30 days'
            AND se.status NOT IN ('cancelled') AND se.is_return = false) AS trx_30d
      FROM hris_employees he
      LEFT JOIN branches b ON b.id = he."branchId"
      ${where}
      ORDER BY he.status DESC, he.name ASC
      LIMIT :limit`,
    params,
  ).catch(async (e: any) => {
    console.warn('[sales-mgmt] salespersons rich query failed, fallback:', e.message);
    return q(
      `SELECT he.id AS hris_employee_id, he."employeeNumber" AS employee_number,
              he.name, he.email, he.phone, he.department, he.position, he.status
         FROM hris_employees he ${where} ORDER BY he.name ASC LIMIT :limit`,
      params,
    );
  });

  return ok(res, {
    data: rows.map((r: any) => ({
      ...r,
      revenue_30d: toNumber(r.revenue_30d),
      trx_30d: parseInt(r.trx_30d || '0', 10),
    })),
    total: rows.length,
    sales_departments: salesDepts,
  });
}

async function getSalespersonDetail(req: NextApiRequest, res: NextApiResponse, tid: string) {
  const id = req.query.hris_employee_id || req.query.id;
  if (!id) return err(res, 'hris_employee_id wajib');

  const emp = await qOne(
    `SELECT he.*, b.name AS branch_name
       FROM hris_employees he
  LEFT JOIN branches b ON b.id = he."branchId"
      WHERE he.id = :id AND he."tenantId" = :tid`,
    { id, tid },
  );
  if (!emp) return err(res, 'Karyawan tidak ditemukan', 404);

  const user = await qOne(
    `SELECT id, name, email, role FROM users WHERE email = :em AND "tenantId" = :tid LIMIT 1`,
    { em: emp.email, tid },
  );

  const perf = await qOne(
    `SELECT
        COUNT(*) AS entries_count,
        COALESCE(SUM(net_amount), 0) AS total_revenue,
        COALESCE(SUM(quantity), 0) AS total_qty,
        COUNT(DISTINCT outlet_id) AS unique_outlets,
        COUNT(DISTINCT inventory_product_id) AS unique_products
       FROM sfa_sales_entries
      WHERE tenant_id = :tid AND hris_employee_id = :id
        AND entry_date >= CURRENT_DATE - INTERVAL '90 days'
        AND status NOT IN ('cancelled') AND is_return = false`,
    { tid, id },
  ).catch(() => ({}));

  return ok(res, {
    data: {
      employee: emp,
      user: user || null,
      performance_90d: {
        entries: parseInt(perf?.entries_count || '0'),
        revenue: toNumber(perf?.total_revenue),
        qty: toNumber(perf?.total_qty),
        unique_outlets: parseInt(perf?.unique_outlets || '0'),
        unique_products: parseInt(perf?.unique_products || '0'),
      },
    },
  });
}

export default withModuleGuard('sfa', handler);

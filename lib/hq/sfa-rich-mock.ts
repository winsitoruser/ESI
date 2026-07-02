/**
 * Data demo kaya untuk Manajemen Penjualan SFA & chart (±2 tahun historis).
 * Dipakai oleh `/api/hq/sfa/sales-management` bila tenant belum punya `sfa_sales_entries`.
 */

const BASE_MONTHLY_NET = 2_850_000_000;

/** 24 bulan berakhir April 2026 (Mei 2024 – Apr 2026) */
export const SFA_DEMO_PERIODS_24: string[] = (() => {
  const out: string[] = [];
  let y = 2024;
  let m = 5;
  while (out.length < 24) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (y === 2026 && m > 4) break;
  }
  return out;
})();

function seededAmt(seed: number, base: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const r = x - Math.floor(x);
  return Math.round(base * (0.92 + r * 0.16));
}

function periodParts(period: string): { y: number; m: number } {
  const [ys, ms] = period.split('-').map(Number);
  return { y: ys, m: ms };
}

export function prevPeriodStr(period: string): string {
  const { y, m } = periodParts(period);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(y: number, mo: number): number {
  return new Date(y, mo, 0).getDate();
}

/** MTD/YTD block selaras `buildMtdYtdRunBlock` di sales-management */
export function demoMtdYtdBlock(period: string) {
  const { y, m } = periodParts(period);
  const dim = daysInMonth(y, m);
  const asOf = `${y}-${String(m).padStart(2, '0')}-${String(Math.min(18, dim)).padStart(2, '0')}`;
  const mtdStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const ytdStart = `${y}-01-01`;
  const dayOfMonth = new Date(`${asOf}T12:00:00`).getDate();
  const pctMonthElapsed = dim > 0 ? dayOfMonth / dim : 1;
  const monthTargetValue = seededAmt(y * 100 + m, 3_200_000_000);
  const mtdNet = seededAmt(y * 100 + m + 7, 1_420_000_000);
  const proratedTarget = monthTargetValue * pctMonthElapsed;
  const paceVsProrata = proratedTarget > 0 ? (mtdNet / proratedTarget) * 100 : null;
  const projectedMonthEnd = pctMonthElapsed > 0 ? mtdNet / pctMonthElapsed : mtdNet;
  const gapToTarget = monthTargetValue - mtdNet;
  const lyMtdNet = seededAmt(y * 100 + m + 99, 1_280_000_000);
  const ytdNet = seededAmt(y * 100 + m + 3, 8_200_000_000);

  return {
    as_of: asOf,
    period_month: period,
    mtd: {
      start: mtdStart,
      end: asOf,
      net: mtdNet,
      qty: seededAmt(y * 100 + m + 1, 125_000),
      entries: 420 + (m % 5) * 12,
      outlets: 118 + m,
      products: 42,
    },
    ytd: {
      start: ytdStart,
      end: asOf,
      net: ytdNet,
      qty: seededAmt(y * 100 + m + 2, 980_000),
      entries: 2100 + m * 40,
      outlets: 156,
    },
    yoy_mtd: {
      net_ly_same_window: lyMtdNet,
      growth_pct: lyMtdNet > 0 ? Number((((mtdNet - lyMtdNet) / lyMtdNet) * 100).toFixed(2)) : null,
    },
    running: {
      days_in_month: dim,
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

const PRODUCTS = [
  { id: 'p1', sku: 'SKU-KAG-001', name: 'Kopi Arabica Gayo 1kg', group: 'Bahan Baku', brand: 'Bedagang' },
  { id: 'p2', sku: 'SKU-GP-001', name: 'Gula Pasir Premium 1kg', group: 'Bahan Baku', brand: 'Lokal' },
  { id: 'p3', sku: 'SKU-CP16-001', name: 'Cup Plastik 16oz', group: 'Packaging', brand: 'Primera' },
  { id: 'p4', sku: 'SKU-TB-001', name: 'Teh Celup Premium', group: 'Minuman', brand: 'Bedagang' },
  { id: 'p5', sku: 'SKU-CK-001', name: 'Cookies Coklat', group: 'Makanan', brand: 'Homemade' },
];

const OUTLETS = [
  { id: 'o1', code: 'OUT-JKT-001', name: 'Indomaret Kelapa Gading', channel: 'modern_trade', klass: 'A', city: 'Jakarta' },
  { id: 'o2', code: 'OUT-BDG-014', name: 'Alfamart Dago', channel: 'modern_trade', klass: 'A', city: 'Bandung' },
  { id: 'o3', code: 'OUT-SBY-022', name: 'Hypermart Tunjungan', channel: 'modern_trade', klass: 'B', city: 'Surabaya' },
  { id: 'o4', code: 'OUT-DPS-008', name: 'Mini Market Sanur', channel: 'general_trade', klass: 'B', city: 'Denpasar' },
  { id: 'o5', code: 'OUT-TGR-031', name: 'Warung Berkah', channel: 'general_trade', klass: 'C', city: 'Tangerang' },
];

const SALESPEOPLE = [
  { id: 'sp1', name: 'Fajar Setiawan' },
  { id: 'sp2', name: 'Siti Rahayu' },
  { id: 'sp3', name: 'Made Wirawan' },
  { id: 'sp4', name: 'Rina Kusuma' },
];

export function salesDashboardDemo(period: string) {
  const { y, m } = periodParts(period);
  const netTotal = seededAmt(y * 100 + m, BASE_MONTHLY_NET);
  const prevP = prevPeriodStr(period);
  const prevTotal = seededAmt(periodParts(prevP).y * 100 + periodParts(prevP).m, BASE_MONTHLY_NET * 0.97);
  const growthPct = prevTotal > 0 ? Number((((netTotal - prevTotal) / prevTotal) * 100).toFixed(2)) : 0;
  const globalTarget = seededAmt(y * 100 + m + 11, 3_100_000_000);
  const globalAchievement = globalTarget > 0 ? Number(((netTotal / globalTarget) * 100).toFixed(2)) : 0;

  const topProducts = PRODUCTS.map((p, i) => ({
    product_id: p.id,
    product_sku: p.sku,
    product_name: p.name,
    product_group: p.group,
    net_total: seededAmt(i * 17 + m, 420_000_000),
    total_qty: 2000 + i * 400,
  })).sort((a, b) => b.net_total - a.net_total);

  const topOutlets = OUTLETS.map((o, i) => ({
    outlet_id: o.id,
    outlet_code: o.code,
    outlet_name: o.name,
    outlet_channel: o.channel,
    net_total: seededAmt(i * 23 + m, 380_000_000),
    trx_count: 40 + i * 8,
  })).sort((a, b) => b.net_total - a.net_total);

  const topSalespeople = SALESPEOPLE.map((s, i) => ({
    salesperson_id: s.id,
    salesperson_name: s.name,
    net_total: seededAmt(i * 31 + m, 520_000_000),
    trx_count: 120 + i * 15,
    outlets_covered: 28 + i * 4,
  })).sort((a, b) => b.net_total - a.net_total);

  const byType = [
    { sales_type: 'primary', net_total: netTotal * 0.55, entry_count: 620 },
    { sales_type: 'secondary', net_total: netTotal * 0.35, entry_count: 410 },
    { sales_type: 'direct', net_total: netTotal * 0.1, entry_count: 120 },
  ];

  const byChannel = [
    { outlet_channel: 'modern_trade', net_total: netTotal * 0.62, outlet_count: 88 },
    { outlet_channel: 'general_trade', net_total: netTotal * 0.28, outlet_count: 64 },
    { outlet_channel: 'horeca', net_total: netTotal * 0.1, outlet_count: 22 },
  ];

  const recent = Array.from({ length: 15 }, (_, i) => {
    const p = PRODUCTS[i % PRODUCTS.length];
    const d = new Date(y, m - 1, 28 - i);
    return {
      id: `demo-se-${period}-${i}`,
      entry_date: d.toISOString().slice(0, 10),
      sales_type: i % 3 === 0 ? 'primary' : 'secondary',
      salesperson_name: SALESPEOPLE[i % SALESPEOPLE.length].name,
      outlet_name: OUTLETS[i % OUTLETS.length].name,
      product_name: p.name,
      quantity: 10 + (i % 8) * 5,
      net_amount: seededAmt(i * 7 + m, 4_500_000),
      status: 'posted',
    };
  });

  return {
    period,
    summary: {
      netTotal,
      grossTotal: netTotal * 1.06,
      totalQty: 185_000 + m * 1200,
      entryCount: 1150,
      activeOutlets: 142,
      activeProducts: 38,
      activeSalespeople: 24,
      previousTotal: prevTotal,
      growthPct,
      globalTarget,
      globalAchievement,
      targetQty: 200_000,
      targetActiveOutlets: 150,
      targetNewOutlets: 12,
      targetProductiveOutlets: 110,
      productiveThreshold: 5_000_000,
    },
    mtdYtd: demoMtdYtdBlock(period),
    topProducts,
    topOutlets,
    topSalespeople,
    byType,
    byChannel,
    recent,
  };
}

export function salesTrendDemo(months: number): any[] {
  const n = Math.min(24, Math.max(1, months));
  const slice = SFA_DEMO_PERIODS_24.slice(-n);
  return slice.map((p, idx) => {
    const [yy, mm] = p.split('-').map(Number);
    const actual = seededAmt(yy * 50 + mm + idx, BASE_MONTHLY_NET * 0.95);
    const target = seededAmt(yy * 50 + mm + idx + 3, 3_050_000_000);
    return {
      period: p,
      actual_value: actual,
      actual_qty: seededAmt(idx + mm, 180_000),
      active_outlets: 120 + (idx % 8) * 3,
      target_value: target,
    };
  });
}

export function vsTargetGlobalDemo(period: string) {
  const net = seededAmt(periodParts(period).y * 100 + periodParts(period).m, BASE_MONTHLY_NET);
  const target = seededAmt(periodParts(period).y * 100 + periodParts(period).m + 5, 3_100_000_000);
  const trend = SFA_DEMO_PERIODS_24.slice(-6).map((p) => ({
    period: p,
    actual_value: seededAmt(parseInt(p.replace('-', ''), 10), BASE_MONTHLY_NET * 0.94),
    target_value: seededAmt(parseInt(p.replace('-', ''), 10) + 1, 3_000_000_000),
  }));
  return {
    period,
    actual: { value: net, qty: 175_000, entries: 980 },
    target: { value: target, qty: 190_000, count: 24 },
    achievement_pct: target > 0 ? Number(((net / target) * 100).toFixed(2)) : 0,
    gap: target - net,
    trend,
  };
}

function vsRowsGeneric(period: string, kind: 'product' | 'group' | 'outlet' | 'sales') {
  const { y, m } = periodParts(period);
  if (kind === 'product') {
    return PRODUCTS.map((p, i) => {
      const av = seededAmt(i * 11 + m, 480_000_000);
      const tv = seededAmt(i * 11 + m + 2, 520_000_000);
      return {
        product_id: p.id,
        product_sku: p.sku,
        product_name: p.name,
        product_group: p.group,
        actual_value: av,
        actual_qty: 5000 + i * 200,
        target_value: tv,
        target_qty: 5200 + i * 100,
        achievement_pct: tv > 0 ? Number(((av / tv) * 100).toFixed(2)) : null,
      };
    });
  }
  if (kind === 'group') {
    const groups = ['Bahan Baku', 'Packaging', 'Minuman', 'Makanan'];
    return groups.map((g, i) => ({
      product_group: g,
      actual_value: seededAmt(i * 19 + m, 720_000_000),
      actual_qty: 50_000 + i * 5000,
      target_value: seededAmt(i * 19 + m + 1, 800_000_000),
      target_qty: 52_000,
      achievement_pct: null as number | null,
    }));
  }
  if (kind === 'outlet') {
    return OUTLETS.map((o, i) => {
      const av = seededAmt(i * 13 + m, 410_000_000);
      const tv = seededAmt(i * 13 + m + 4, 450_000_000);
      const pv = seededAmt(i * 13 + m - 1, 390_000_000);
      const gp = pv > 0 ? Number((((av - pv) / pv) * 100).toFixed(2)) : null;
      return {
        outlet_id: o.id,
        outlet_code: o.code,
        outlet_name: o.name,
        outlet_channel: o.channel,
        outlet_class: o.klass,
        outlet_city: o.city,
        actual_value: av,
        actual_qty: 8000 + i * 400,
        trx_count: 90 + i * 5,
        prev_value: pv,
        growth_pct: gp,
        target_value: tv,
        achievement_pct: tv > 0 ? Number(((av / tv) * 100).toFixed(2)) : null,
      };
    });
  }
  return SALESPEOPLE.map((s, i) => {
    const av = seededAmt(i * 29 + m, 620_000_000);
    const tv = seededAmt(i * 29 + m + 3, 680_000_000);
    return {
      salesperson_id: s.id,
      salesperson_name: s.name,
      team_id: 'tm1',
      territory_id: 'tr1',
      actual_value: av,
      actual_qty: 22_000 + i * 800,
      trx_count: 180 + i * 10,
      outlets_covered: 28 + i * 3,
      target_value: tv,
      achievement_pct: tv > 0 ? Number(((av / tv) * 100).toFixed(2)) : null,
    };
  });
}

export const vsTargetProductDemo = (p: string) => vsRowsGeneric(p, 'product');
export const vsTargetGroupDemo = (p: string) => vsRowsGeneric(p, 'group');
export const vsTargetOutletDemo = (p: string) => vsRowsGeneric(p, 'outlet');
export const vsTargetSalesDemo = (p: string) => vsRowsGeneric(p, 'sales');

function classifyAbc(cumulativePct: number): 'A' | 'B' | 'C' {
  if (cumulativePct <= 80) return 'A';
  if (cumulativePct <= 95) return 'B';
  return 'C';
}

function paretoFromValues(
  rows: { label: string; id: string; metric_value: number }[],
): { rows: any[]; summary: any } {
  const grand = rows.reduce((s, r) => s + r.metric_value, 0);
  let cum = 0;
  const enriched = rows.map((r, i) => {
    const pct = grand > 0 ? (r.metric_value / grand) * 100 : 0;
    cum += pct;
    const mv = r.metric_value;
    return {
      rank: i + 1,
      ...r,
      total_value: mv,
      total_qty: Math.max(1, Math.round(mv / 85_000)),
      outlets_involved: 8 + (i % 5),
      trx_count: 15 + i * 2,
      contribution_pct: Number(pct.toFixed(2)),
      cumulative_pct: Number(cum.toFixed(2)),
      abc_class: classifyAbc(cum),
    };
  });
  const top20 = Math.max(1, Math.ceil(enriched.length * 0.2));
  const sumTop = enriched.slice(0, top20).reduce((s, e) => s + e.metric_value, 0);
  return {
    rows: enriched,
    summary: {
      total_entities: enriched.length,
      grand_total: grand,
      class_A: enriched.filter((e) => e.abc_class === 'A').length,
      class_B: enriched.filter((e) => e.abc_class === 'B').length,
      class_C: enriched.filter((e) => e.abc_class === 'C').length,
      top_20_pct_contribution: grand > 0 ? Number(((sumTop / grand) * 100).toFixed(2)) : 0,
    },
  };
}

export function paretoOutletsDemo(period: string) {
  const vals = OUTLETS.map((o, i) => ({
    id: o.id,
    label: o.name,
    outlet_id: o.id,
    outlet_code: o.code,
    outlet_name: o.name,
    outlet_channel: o.channel,
    outlet_class: o.klass,
    outlet_city: o.city,
    metric_value: seededAmt(i * 41 + periodParts(period).m, 280_000_000),
  }));
  return paretoFromValues(vals);
}

export function paretoProductsDemo(period: string) {
  const vals = PRODUCTS.map((p, i) => ({
    id: p.id,
    label: p.name,
    product_id: p.id,
    product_sku: p.sku,
    product_name: p.name,
    product_group: p.group,
    product_brand: p.brand,
    metric_value: seededAmt(i * 37 + periodParts(period).m, 320_000_000),
  }));
  return paretoFromValues(vals);
}

export function paretoSalespersonsDemo(period: string) {
  const vals = SALESPEOPLE.map((s, i) => ({
    id: s.id,
    label: s.name,
    salesperson_id: s.id,
    salesperson_name: s.name,
    team_id: 'tm1',
    territory_id: 'tr1',
    metric_value: seededAmt(i * 43 + periodParts(period).m, 410_000_000),
  }));
  return paretoFromValues(vals);
}

export function performanceDemo(period: string, dim: 'branch' | 'territory' | 'team') {
  const dims =
    dim === 'branch'
      ? [
          { id: 'b1', name: 'Jakarta HQ' },
          { id: 'b2', name: 'Bandung' },
          { id: 'b3', name: 'Surabaya' },
        ]
      : dim === 'territory'
        ? [
            { id: 'tr1', name: 'Jakarta Barat' },
            { id: 'tr2', name: 'Bandung Raya' },
            { id: 'tr3', name: 'Surabaya' },
          ]
        : [
            { id: 'tm1', name: 'Tim Jabodetabek' },
            { id: 'tm2', name: 'Tim Jabar' },
            { id: 'tm3', name: 'Tim Jatim' },
          ];
  const data = dims.map((d, i) => {
    const actual = seededAmt(i * 47 + periodParts(period).m, 890_000_000);
    const prev = seededAmt(i * 47 + periodParts(period).m - 1, 820_000_000);
    return {
      rank: i + 1,
      dim_id: d.id,
      dim_name: d.name,
      actual_value: actual,
      prev_value: prev,
      growth_pct: prev > 0 ? Number((((actual - prev) / prev) * 100).toFixed(2)) : 0,
      target_value: seededAmt(i + 10, 950_000_000),
      achievement_pct: Number(((actual / 950_000_000) * 100).toFixed(2)),
      total_qty: 40_000 + i * 2000,
      active_outlets: 40 + i * 5,
      active_salespersons: 8 + i,
      active_products: 12 + i,
      trx_count: 200 + i * 20,
      avg_per_outlet: actual / (40 + i * 5),
      avg_per_sales: actual / (8 + i),
    };
  });
  const grand = data.reduce((s, r) => s + r.actual_value, 0);
  return {
    data,
    summary: {
      dimension: dim,
      period,
      prev_period: prevPeriodStr(period),
      grand_total: grand,
      dim_count: data.length,
    },
  };
}

export function leaderboardDemo(period: string) {
  const mkRows = (label: string, scoreFn: (i: number) => number) =>
    SALESPEOPLE.map((s, i) => ({
      rank: i + 1,
      salesperson_id: s.id,
      salesperson_name: s.name,
      score: scoreFn(i),
      badge: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : null,
      label,
    }));
  const categories = [
    { key: 'revenue', label: 'Top Revenue' },
    { key: 'qty', label: 'Top Quantity' },
    { key: 'outlets', label: 'Top Outlet Coverage' },
    { key: 'trx', label: 'Most Transactions' },
    { key: 'products', label: 'Widest Product Range' },
  ];
  const m = periodParts(period).m;
  const boards: Record<string, any[]> = {
    revenue: mkRows('Top Revenue', (i) => seededAmt(i * 53 + m, 900_000_000)),
    qty: mkRows('Top Quantity', (i) => seededAmt(i * 51 + m, 120_000)),
    outlets: mkRows('Top Outlet Coverage', (i) => 35 + i * 4),
    trx: mkRows('Most Transactions', (i) => 180 + i * 12),
    products: mkRows('Widest Product Range', (i) => 14 + i * 2),
  };
  return { data: boards, period, categories };
}

export function scorecardDemo(period: string) {
  return {
    data: SALESPEOPLE.map((s, i) => ({
      salesperson_id: s.id,
      salesperson_name: s.name,
      team_name: 'Tim Nasional',
      territory_name: 'Jakarta & Bali',
      kpi: {
        revenue: seededAmt(i * 59 + periodParts(period).m, 680_000_000),
        qty_sold: 18_000 + i * 500,
        outlets_covered: 32 + i * 2,
        unique_products: 15,
        trx_count: 220 + i * 10,
        active_days: 18,
        avg_order_value: 3_100_000,
        revenue_per_outlet: 21_000_000,
        visit_count: 42 + i * 3,
        outlets_visited: 38,
        call_rate_per_day: 2.3,
        productive_call_rate: 88.5,
      },
      target: {
        value: 720_000_000,
        qty: 20_000,
        achievement_pct: 94.2,
      },
    })),
    period,
  };
}

export function advancedKpisDemo(period: string) {
  const net = seededAmt(periodParts(period).y + periodParts(period).m, BASE_MONTHLY_NET);
  return {
    data: {
      period,
      volume: {
        revenue: net,
        gross_revenue: net * 1.05,
        total_discount: net * 0.02,
        qty: 165_000,
        trx_count: 2100,
        order_count: 1850,
        outlets: 142,
        salespersons: 24,
        products: 38,
      },
      basket: {
        lines_per_order: 1.14,
        avg_basket_value: Number((net / 1850).toFixed(0)),
        avg_unit_price: 12500,
        discount_rate_pct: 2.1,
      },
      concentration: {
        hhi: 0.112,
        hhi_label: 'Terdiversifikasi',
        return_rate_pct: 0.4,
      },
      mix: {
        new_outlets: 8,
        repeat_outlets: 124,
        new_outlet_revenue: net * 0.06,
        repeat_outlet_revenue: net * 0.94,
      },
    },
  };
}

export function growthAnalysisDemo(period: string, monthsBack: number) {
  const n = Math.min(36, Math.max(3, monthsBack));
  const all = SFA_DEMO_PERIODS_24;
  let endIdx = all.indexOf(period);
  if (endIdx < 0) endIdx = all.length - 1;
  const startIdx = Math.max(0, endIdx - n + 1);
  const slice = all.slice(startIdx, endIdx + 1);
  return slice.map((p, i, arr) => {
    const [yy, mm] = p.split('-').map(Number);
    const revenue = seededAmt(yy * 40 + mm + i, BASE_MONTHLY_NET * 0.96);
    const prev = i > 0 ? seededAmt(parseInt(arr[i - 1].replace('-', ''), 10), BASE_MONTHLY_NET) : revenue * 0.98;
    const mom = i > 0 && prev > 0 ? Number((((revenue - prev) / prev) * 100).toFixed(2)) : null;
    const yoyIdx = arr.findIndex((x) => {
      const [y1, m1] = p.split('-').map(Number);
      const [y2, m2] = x.split('-').map(Number);
      return y2 === y1 - 1 && m2 === m1;
    });
    const yoyRev = yoyIdx >= 0 ? seededAmt(parseInt(arr[yoyIdx].replace('-', ''), 10), BASE_MONTHLY_NET) : 0;
    const yoy = yoyIdx >= 0 && yoyRev > 0 ? Number((((revenue - yoyRev) / yoyRev) * 100).toFixed(2)) : null;
    return {
      period: p,
      revenue,
      qty: seededAmt(yy + mm, 170_000),
      outlets: 118 + (i % 7),
      salespersons: 22 + (i % 4),
      trx: 1800 + i * 5,
      mom_growth_pct: mom,
      yoy_growth_pct: yoy,
    };
  });
}

export function salesFunnelDemo(period: string) {
  const visitTotal = 1240;
  const outletsVisited = 380;
  const foTotal = 420;
  const foApproved = 380;
  const productive = 142;
  const revenue = seededAmt(periodParts(period).m, BASE_MONTHLY_NET);
  const trxCount = 2100;
  const approvedVal = 2_100_000_000;
  return {
    data: {
      period,
      salesperson_id: null,
      stages: [
        { stage: 'visits', label: 'Kunjungan', count: visitTotal, value: null },
        { stage: 'outlets_visited', label: 'Outlet Dikunjungi', count: outletsVisited, value: null },
        { stage: 'orders', label: 'Order Dibuat', count: foTotal, value: null },
        { stage: 'orders_approved', label: 'Order Disetujui', count: foApproved, value: approvedVal },
        { stage: 'productive_outlets', label: 'Outlet Produktif', count: productive, value: null },
        { stage: 'revenue', label: 'Realisasi Revenue', count: trxCount, value: revenue },
      ],
      conversion: {
        visit_to_order_pct: visitTotal > 0 ? Number(((foTotal / visitTotal) * 100).toFixed(2)) : null,
        order_to_approved_pct: foTotal > 0 ? Number(((foApproved / foTotal) * 100).toFixed(2)) : null,
        outlet_productivity_pct: outletsVisited > 0 ? Number(((productive / outletsVisited) * 100).toFixed(2)) : null,
        avg_revenue_per_visit: visitTotal > 0 ? Number((revenue / visitTotal).toFixed(2)) : null,
      },
    },
  };
}

export function outletCoverageDemo(period: string) {
  const trend = SFA_DEMO_PERIODS_24.slice(-6).map((p) => ({
    period: p,
    active_outlets: 110 + (p.charCodeAt(p.length - 1) % 9),
  }));
  return {
    data: {
      period,
      prev_period: prevPeriodStr(period),
      actual: {
        active_outlets: 142,
        productive_outlets: 108,
        new_outlets: 9,
        prev_active_outlets: 136,
        growth_pct: 4.4,
      },
      target: {
        active_outlets: 150,
        productive_outlets: 115,
        new_outlets: 10,
        registered_outlets: 480,
        productive_threshold: 5_000_000,
        growth_rate_target: 8,
      },
      byChannel: [
        { channel: 'modern_trade', active_outlets: 72, total_value: 1_800_000_000 },
        { channel: 'general_trade', active_outlets: 52, total_value: 820_000_000 },
        { channel: 'horeca', active_outlets: 18, total_value: 230_000_000 },
      ],
      trend,
    },
  };
}

export function outletTransactionsDemo(period: string) {
  return {
    data: OUTLETS.map((o, i) => ({
      outlet_id: o.id,
      outlet_code: o.code,
      outlet_name: o.name,
      outlet_channel: o.channel,
      outlet_class: o.klass,
      outlet_city: o.city,
      trx_count: 80 + i * 12,
      product_variety: 12 + i,
      total_value: seededAmt(i * 17 + periodParts(period).m, 420_000_000),
      total_qty: 9000 + i * 400,
      first_trx: `${period}-02`,
      last_trx: `${period}-26`,
      is_productive: true,
    })),
    period,
  };
}

export function distributionDemo(period: string) {
  const net = seededAmt(periodParts(period).y * 10 + periodParts(period).m, BASE_MONTHLY_NET);
  return {
    data: {
      period,
      universe_outlets: 520,
      active_outlets: 142,
      numeric_distribution_pct: 27.31,
      grand_total: net,
      note: 'Demo ND/WD — data penuh untuk preview.',
    },
  };
}

export function distributionPerProductDemo(period: string) {
  const net = seededAmt(periodParts(period).y + periodParts(period).m, BASE_MONTHLY_NET);
  return {
    data: PRODUCTS.map((p, i) => ({
      product_id: p.id,
      product_sku: p.sku,
      product_name: p.name,
      product_group: p.group,
      outlet_count: 95 + i * 4,
      product_value: seededAmt(i * 19 + periodParts(period).m, 380_000_000),
      product_qty: 12_000 + i * 500,
      numeric_distribution_pct: 18.2 + i * 0.8,
      weighted_distribution_pct: 12.5 + i * 1.2,
    })),
    period,
    universe_outlets: 520,
    grand_total: net,
  };
}

export function salesEntriesListDemo(): any[] {
  const rows: any[] = [];
  let idx = 0;
  for (const per of SFA_DEMO_PERIODS_24.slice(-12)) {
    const [yy, mm] = per.split('-').map(Number);
    for (let d = 1; d <= 28; d += 7) {
      const p = PRODUCTS[idx % PRODUCTS.length];
      const o = OUTLETS[idx % OUTLETS.length];
      const sp = SALESPEOPLE[idx % SALESPEOPLE.length];
      rows.push({
        id: `demo-entry-${per}-${idx}`,
        tenant_id: 'demo',
        period: per,
        entry_date: `${yy}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        sales_type: idx % 2 === 0 ? 'primary' : 'secondary',
        salesperson_id: sp.id,
        salesperson_name: sp.name,
        outlet_id: o.id,
        outlet_code: o.code,
        outlet_name: o.name,
        outlet_channel: o.channel,
        product_id: p.id,
        product_sku: p.sku,
        product_name: p.name,
        product_group: p.group,
        quantity: 20 + (idx % 5) * 4,
        unit_price: 150_000,
        gross_amount: (20 + (idx % 5) * 4) * 150_000,
        discount_amount: 0,
        tax_amount: 0,
        net_amount: (20 + (idx % 5) * 4) * 150_000,
        status: 'posted',
        is_return: false,
      });
      idx += 1;
    }
  }
  return rows;
}

export function lookupFiltersDemo() {
  return {
    data: {
      product_groups: ['Bahan Baku', 'Packaging', 'Minuman', 'Makanan'],
      product_brands: ['Bedagang', 'Lokal', 'Primera'],
      outlet_channels: ['modern_trade', 'general_trade', 'horeca'],
      salespeople: SALESPEOPLE.map((s) => ({ salesperson_id: s.id, salesperson_name: s.name })),
      territories: [
        { id: 'tr1', name: 'Jakarta Barat', code: 'T-JKT-W' },
        { id: 'tr2', name: 'Bandung Raya', code: 'T-BDG' },
      ],
      teams: [
        { id: 'tm1', name: 'Tim Jabodetabek' },
        { id: 'tm2', name: 'Tim Jabar' },
      ],
      outlets: OUTLETS.map((o) => ({ outlet_id: o.id, outlet_code: o.code, outlet_name: o.name })),
    },
  };
}

export function itemTargetsDemo(period: string) {
  return {
    data: PRODUCTS.map((p, i) => ({
      id: `it-${p.id}`,
      name: `Target ${p.name}`,
      period,
      target_level: 'product',
      product_id: p.id,
      product_sku: p.sku,
      product_name: p.name,
      product_group: p.group,
      target_value: seededAmt(i * 7 + periodParts(period).m, 520_000_000),
      target_quantity: 8000,
      scope_type: 'global',
      status: 'active',
      actual_value: seededAmt(i * 7 + periodParts(period).m + 1, 480_000_000),
      actual_quantity: 7600,
      achievement_pct: 92.5,
    })),
  };
}

export function outletGrowthTargetsDemo(period: string) {
  return {
    data: [
      {
        id: 'ogt1',
        name: 'Pertumbuhan outlet nasional',
        period,
        scope_type: 'global',
        target_active_outlets: 150,
        target_new_outlets: 12,
        target_productive_outlets: 115,
        target_registered_outlets: 520,
        productive_threshold: 5_000_000,
        growth_rate_target: 8,
        status: 'active',
        actual_active_outlets: 142,
        actual_productive_outlets: 108,
      },
    ],
  };
}

/** Kanban demo — struktur selaras `task-calendar` action `board` */
export function taskCalendarBoardDemo(): { columns: { id: string; title: string; color: string; tasks: any[] }[]; totalTasks: number } {
  const tasks = [
    {
      id: 'tc1',
      task_number: 'TSK-2026-1042',
      title: 'Follow-up proposal PT Maju',
      task_type: 'field_visit',
      priority: 'high',
      status: 'open',
      due_date: '2026-04-22',
      assigned_name: 'Fajar Setiawan',
      customer_name: 'PT Maju Bersama',
      outlet_name: 'Indomaret KG',
      checklist: [{ text: 'Bawa sampel', done: true }],
      tags: ['kunjungan'],
    },
    {
      id: 'tc2',
      task_number: 'TSK-2026-1043',
      title: 'Sinkron stok HoReCa Sanur',
      task_type: 'visit',
      priority: 'medium',
      status: 'in_progress',
      due_date: '2026-04-20',
      assigned_name: 'Made Wirawan',
      outlet_name: 'Mini Market Sanur',
    },
    {
      id: 'tc3',
      task_number: 'TSK-2026-1038',
      title: 'Closing PO bulanan',
      task_type: 'approval',
      priority: 'urgent',
      status: 'completed',
      due_date: '2026-04-15',
      completed_date: '2026-04-15',
      assigned_name: 'Rina Kusuma',
    },
  ];
  const columns: Record<string, { id: string; title: string; color: string; tasks: any[] }> = {
    open: { id: 'open', title: 'Open', color: '#3b82f6', tasks: [] },
    in_progress: { id: 'in_progress', title: 'In Progress', color: '#f59e0b', tasks: [] },
    completed: { id: 'completed', title: 'Completed', color: '#10b981', tasks: [] },
    deferred: { id: 'deferred', title: 'Deferred', color: '#6b7280', tasks: [] },
    cancelled: { id: 'cancelled', title: 'Cancelled', color: '#94a3b8', tasks: [] },
  };
  columns.open.tasks.push({ ...tasks[0], isOverdue: false });
  columns.in_progress.tasks.push({ ...tasks[1], isOverdue: false });
  columns.completed.tasks.push({ ...tasks[2], isOverdue: false });
  const colArr = Object.values(columns);
  return { columns: colArr, totalTasks: tasks.length };
}

/** Gantt demo — task dengan start_date & due_date di sekitar hari ini */
export function taskCalendarGanttDemo(): any[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (n: number) => {
    const x = new Date(base);
    x.setDate(x.getDate() + n);
    return iso(x);
  };
  const rows = [
    { id: 'gt1', task_number: 'GT-D-001', title: 'Ronde modern trade Jabodetabek', status: 'in_progress', priority: 'high', task_type: 'field_visit', start_date: addDays(-6), due_date: addDays(10), progress: 42, assigned_name: 'Fajar Setiawan', isOverdue: false },
    { id: 'gt2', task_number: 'GT-D-002', title: 'Closing PO bulanan HoReCa', status: 'open', priority: 'urgent', task_type: 'approval', start_date: addDays(-2), due_date: addDays(3), progress: 0, assigned_name: 'Rina Kusuma', isOverdue: false },
    { id: 'gt3', task_number: 'GT-D-003', title: 'Sinkron stok & display minimarket', status: 'in_progress', priority: 'medium', task_type: 'visit', start_date: addDays(-12), due_date: addDays(5), progress: 55, assigned_name: 'Made Wirawan', isOverdue: false },
    { id: 'gt4', task_number: 'GT-D-004', title: 'Training merchandiser baru', status: 'open', priority: 'low', task_type: 'meeting', start_date: addDays(2), due_date: addDays(14), progress: 0, assigned_name: 'Siti Rahayu', isOverdue: false },
    { id: 'gt5', task_number: 'GT-D-005', title: 'Follow-up komplain pengiriman', status: 'completed', priority: 'high', task_type: 'follow_up', start_date: addDays(-20), due_date: addDays(-4), progress: 100, assigned_name: 'Budi Santoso', isOverdue: false },
    { id: 'gt6', task_number: 'GT-D-006', title: 'Audit display & harga competitor', status: 'in_progress', priority: 'medium', task_type: 'field_visit', start_date: addDays(-4), due_date: addDays(8), progress: 30, assigned_name: 'Dewi Lestari', isOverdue: false },
    { id: 'gt7', task_number: 'GT-D-007', title: 'QBR dengan distributor Jatim', status: 'open', priority: 'medium', task_type: 'meeting', start_date: addDays(5), due_date: addDays(18), progress: 0, assigned_name: 'Eko Prasetyo', isOverdue: false },
    { id: 'gt8', task_number: 'GT-D-008', title: 'Update pipeline CRM mingguan', status: 'completed', priority: 'low', task_type: 'custom', start_date: addDays(-9), due_date: addDays(-1), progress: 100, assigned_name: 'Fajar Setiawan', isOverdue: false },
  ];
  return rows;
}

/** Kalender demo — event + task untuk bulan yang diminta */
export function taskCalendarCalendarDemo(year: number, month: number): { events: any[]; taskEvents: any[] } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = year;
  const m = month;
  const events = [
    { id: 'ce-d1', title: 'QBR Key Account', start_time: `${y}-${pad(m)}-04T10:00:00Z`, end_time: `${y}-${pad(m)}-04T11:30:00Z`, event_type: 'meeting', customer_name: 'PT Maju Bersama', color: '#3b82f6' },
    { id: 'ce-d2', title: 'Kickoff promo musiman', start_time: `${y}-${pad(m)}-11T13:00:00Z`, end_time: `${y}-${pad(m)}-11T14:00:00Z`, event_type: 'internal', color: '#8b5cf6' },
    { id: 'ce-d3', title: 'Joint visit distributor', start_time: `${y}-${pad(m)}-18T08:30:00Z`, end_time: `${y}-${pad(m)}-18T12:00:00Z`, event_type: 'visit', customer_name: 'PT Indo Retail Chain', color: '#10b981' },
    { id: 'ce-d4', title: 'Review forecast bulanan', start_time: `${y}-${pad(m)}-25T15:00:00Z`, end_time: `${y}-${pad(m)}-25T16:00:00Z`, event_type: 'meeting', color: '#f59e0b' },
  ];
  const taskEvents = [
    { id: 'te-d1', title: '[Task] Visit Indomaret prioritas', start_time: `${y}-${pad(m)}-06T00:00:00Z`, end_time: `${y}-${pad(m)}-06T23:59:59Z`, all_day: true, event_type: 'task', status: 'open', priority: 'high', task_type: 'field_visit', assigned_name: 'Budi Santoso', color: '#ef4444', isTask: true, isOverdue: false },
    { id: 'te-d2', title: '[Task] Closing quotation hotel', start_time: `${y}-${pad(m)}-14T00:00:00Z`, end_time: `${y}-${pad(m)}-14T23:59:59Z`, all_day: true, event_type: 'task', status: 'in_progress', priority: 'medium', task_type: 'approval', assigned_name: 'Made Wirawan', color: '#f59e0b', isTask: true, isOverdue: false },
    { id: 'te-d3', title: '[Task] Follow-up pembayaran', start_time: `${y}-${pad(m)}-22T00:00:00Z`, end_time: `${y}-${pad(m)}-22T23:59:59Z`, all_day: true, event_type: 'task', status: 'open', priority: 'urgent', task_type: 'follow_up', assigned_name: 'Rina Kusuma', color: '#dc2626', isTask: true, isOverdue: false },
  ];
  return { events, taskEvents };
}

/** Stats demo — kartu ringkasan saat DB tanpa task */
export function taskCalendarStatsDemo() {
  return {
    total: 52,
    completed: 31,
    active: 15,
    overdue: 6,
    completionRate: 60,
    byStatus: [
      { status: 'open', count: 8 },
      { status: 'in_progress', count: 7 },
      { status: 'completed', count: 31 },
      { status: 'deferred', count: 4 },
      { status: 'cancelled', count: 2 },
    ],
    byPriority: [
      { priority: 'urgent', count: 4 },
      { priority: 'high', count: 11 },
      { priority: 'medium', count: 24 },
      { priority: 'low', count: 13 },
    ],
    byType: [
      { task_type: 'field_visit', count: 18 },
      { task_type: 'visit', count: 12 },
      { task_type: 'follow_up', count: 9 },
      { task_type: 'meeting', count: 8 },
      { task_type: 'approval', count: 5 },
    ],
  };
}

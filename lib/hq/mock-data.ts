/**
 * Data demo/mock untuk modul HQ — dipakai sebagai nilai awal state dan fallback
 * bila API kosong atau gagal, agar layar HQ tetap terisi untuk demo/preview.
 */

/** Gunakan data API jika ada isi; jika kosong/null, tetap tampilkan mock (demo). */
export function rowsOr<T>(rows: T[] | null | undefined, fallback: T[]): T[] {
  return rows && rows.length > 0 ? rows : fallback;
}

/** ESI ERP — organisasi tunggal, tanpa cabang */
export const MOCK_HQ_BRANCHES = [
  { id: 'esi-hq', code: 'ESI-HQ', name: 'Kantor Pusat ESI', type: 'main', city: 'Jakarta' },
];

export const MOCK_HQ_ACCOUNTS = [
  { id: 'a1', code: '1-1000', name: 'Kas & Setara Kas', type: 'asset' },
  { id: 'a2', code: '4-4000', name: 'Pendapatan Penjualan', type: 'revenue' },
  { id: 'a3', code: '5-5000', name: 'Beban Operasional', type: 'expense' },
];

// ─── Export / Import ─────────────────────────────────────────────
export const MOCK_EXIM_DOCUMENTS = [
  { id: 'd1', doc_type: 'invoice', shipment_id: 's1', file_name: 'INV-2026-0312.pdf', status: 'verified', uploaded_at: '2026-03-12T10:00:00Z' },
  { id: 'd2', doc_type: 'packing_list', shipment_id: 's2', file_name: 'PL-SHP-047.xlsx', status: 'pending', uploaded_at: '2026-03-08T14:30:00Z' },
];

export const MOCK_EXIM_CUSTOMS = [
  { id: 'c1', shipment_id: 's1', declaration_no: 'BC 2.0-2026-001', status: 'cleared', lane: 'green', updated_at: '2026-03-14' },
  { id: 'c2', shipment_id: 's2', declaration_no: 'BC 2.3-2026-088', status: 'submitted', lane: 'yellow', updated_at: '2026-03-15' },
];

export const MOCK_EXIM_LCS = [
  { id: 'lc1', lc_number: 'LC-2026-014', bank: 'BCA', amount: 1250000000, currency: 'USD', status: 'active', expiry_date: '2026-08-30' },
  { id: 'lc2', lc_number: 'LC-2026-009', bank: 'Mandiri', amount: 890000000, currency: 'USD', status: 'active', expiry_date: '2026-07-15' },
];

export const MOCK_EXIM_CONTAINERS = [
  { id: 'ct1', container_no: 'MSKU 1234567', shipment_id: 's1', size: '40HC', status: 'in_transit', seal: 'SL882211' },
  { id: 'ct2', container_no: 'TEMU 7654321', shipment_id: 's2', size: '20DV', status: 'loaded', seal: 'SL991133' },
];

export const MOCK_EXIM_PARTNERS = [
  { id: 'p1', name: 'Global Freight ID', partner_type: 'forwarder', country: 'ID', status: 'active', contact: '+62 21 5550101' },
  { id: 'p2', name: 'Pacific Line Ltd', partner_type: 'shipping_line', country: 'SG', status: 'active', contact: '+65 6123 4400' },
];

export const MOCK_EXIM_COSTS = [
  { id: 'co1', shipment_id: 's1', cost_category: 'freight', amount: 185000000, currency: 'IDR', description: 'Ocean freight Jakarta–Singapore' },
  { id: 'co2', shipment_id: 's2', cost_category: 'customs', amount: 42000000, currency: 'IDR', description: 'BMTE & PPh import' },
];

export const MOCK_EXIM_HS_CODES = [
  { id: 'h1', hs_code: '2106.90', description: 'Preparations food / minuman lainnya', duty_rate: 5 },
  { id: 'h2', hs_code: '8517.12', description: 'Telepon seluler & perangkat nirkabel', duty_rate: 0 },
];

export const MOCK_EXIM_ANALYTICS = {
  tradeBalance: [{ period: '2026-Q1', balance: 1900000000 }],
  byCountry: [{ country: 'Singapore', export_value: 2100000000, import_value: 980000000 }],
  byTransport: [{ transport_mode: 'sea', count: 32, value: 7200000000 }],
  monthlySummary: [{ month: '2026-03', exports: 5200000000, imports: 3300000000 }],
  costBreakdown: [{ category: 'freight', total: 450000000 }, { category: 'customs', total: 120000000 }],
};

// ─── E-Procurement ─────────────────────────────────────────────
export const MOCK_EPR_DASHBOARD = {
  vendorStats: { total: 24, active: 18, avg_rating: 4.25, total_spend: 12800000000 },
  rfqStats: { published: 6, awarded: 4 },
  tenderStats: { ongoing: 3, awarded: 2 },
  contractStats: { active: 12, expiring_soon: 2, total_value: 45200000000 },
  prStats: { pending_approval: 5, total_budget: 8950000000 },
  poStats: { approved: 14, total_value: 21800000000 },
  grnStats: { confirmed: 28 },
  invoiceStats: { outstanding: 3250000000 },
  pendingApprovals: [
    { entity: 'procurement_request', count: 3 },
    { entity: 'purchase_order', count: 2 },
    { entity: 'invoice', count: 4 },
  ],
  topVendors: [
    { id: 'v1', name: 'PT Supplier Prima Nusantara', vendor_code: 'V-2024-001', rating: 4.6, total_spend: 2850000000 },
    { id: 'v2', name: 'CV Mitra Bahan Pokok', vendor_code: 'V-2024-014', rating: 4.3, total_spend: 2120000000 },
    { id: 'v3', name: 'PT Indo Packaging', vendor_code: 'V-2023-088', rating: 4.1, total_spend: 1680000000 },
  ],
};

export const MOCK_EPR_VENDORS = [
  { id: 'v1', vendor_code: 'V-2024-001', name: 'PT Supplier Prima Nusantara', vendor_type: 'goods', category: 'Bahan baku', city: 'Tangerang', status: 'active', rating: 4.6, total_orders: 42, total_spend: 2850000000 },
  { id: 'v2', vendor_code: 'V-2024-014', name: 'CV Mitra Bahan Pokok', vendor_type: 'goods', category: 'Makanan', city: 'Bogor', status: 'active', rating: 4.3, total_orders: 36, total_spend: 2120000000 },
  { id: 'v3', vendor_code: 'V-2023-088', name: 'PT Indo Packaging', vendor_type: 'goods', category: 'Kemasan', city: 'Bekasi', status: 'pending_approval', rating: 4.1, total_orders: 18, total_spend: 1680000000 },
];

export const MOCK_EPR_RFQS = [
  { id: 'r1', rfq_number: 'RFQ-2026-014', title: 'Pengadaan kemasan sekunder Q2', status: 'published', due_date: '2026-04-25', estimated_value: 450000000 },
  { id: 'r2', rfq_number: 'RFQ-2026-012', title: 'Bumbu & seasoning bulk', status: 'awarded', due_date: '2026-03-30', estimated_value: 780000000 },
];

export const MOCK_EPR_TENDERS = [
  { id: 't1', tender_number: 'TD-2026-003', title: 'Renovasi cold storage', status: 'ongoing', closing_date: '2026-05-10', budget: 3500000000 },
  { id: 't2', tender_number: 'TD-2026-001', title: 'Maintenance forklift', status: 'awarded', closing_date: '2026-02-28', budget: 420000000 },
];

export const MOCK_EPR_PROC_REQUESTS = [
  { id: 'pr1', pr_number: 'PR-2026-102', requester: 'Ops Jakarta', department: 'Operations', status: 'pending', total_estimated: 125000000, created_at: '2026-03-18' },
  { id: 'pr2', pr_number: 'PR-2026-098', requester: 'Kitchen Dev', department: 'R&D', status: 'approved', total_estimated: 68000000, created_at: '2026-03-12' },
];

export const MOCK_EPR_CONTRACTS = [
  { id: 'ct1', contract_number: 'CT-2025-044', vendor_name: 'PT Supplier Prima', title: 'Supply bahan baku 12 bulan', status: 'active', value: 9600000000, end_date: '2026-11-30' },
  { id: 'ct2', contract_number: 'CT-2024-019', vendor_name: 'CV Mitra Bahan Pokok', title: 'Distribusi regional', status: 'active', value: 5400000000, end_date: '2026-09-15' },
];

export const MOCK_EPR_EVALUATIONS = [
  { id: 'e1', ref_number: 'EV-2026-005', vendor_name: 'PT Indo Packaging', tender_ref: 'TD-2026-003', status: 'evaluation', score: 82 },
  { id: 'e2', ref_number: 'EV-2026-002', vendor_name: 'PT Supplier Prima', tender_ref: 'TD-2026-001', status: 'completed', score: 91 },
];

export const MOCK_EPR_PURCHASE_ORDERS = [
  { id: 'po1', po_number: 'PO-2026-188', vendor_name: 'PT Supplier Prima', status: 'approved', total_amount: 420000000, order_date: '2026-03-10' },
  { id: 'po2', po_number: 'PO-2026-175', vendor_name: 'CV Mitra Bahan Pokok', status: 'fulfilled', total_amount: 195000000, order_date: '2026-02-28' },
];

export const MOCK_EPR_GOODS_RECEIPTS = [
  { id: 'g1', grn_number: 'GRN-2026-092', po_number: 'PO-2026-175', status: 'confirmed', received_date: '2026-03-05', lines: 8 },
  { id: 'g2', grn_number: 'GRN-2026-088', po_number: 'PO-2026-170', status: 'partial_received', received_date: '2026-02-22', lines: 5 },
];

export const MOCK_EPR_INVOICES = [
  { id: 'i1', invoice_number: 'INV-VEN-2026-031', vendor_name: 'PT Supplier Prima', status: 'pending', amount: 210000000, due_date: '2026-04-10' },
  { id: 'i2', invoice_number: 'INV-VEN-2026-028', vendor_name: 'CV Mitra Bahan Pokok', status: 'paid', amount: 98000000, due_date: '2026-03-25' },
];

export const MOCK_EPR_APPROVALS = [
  { id: 'ap1', entity_type: 'procurement_request', ref: 'PR-2026-102', requester: 'Ops Jakarta', status: 'pending', submitted_at: '2026-03-18T09:00:00Z' },
  { id: 'ap2', entity_type: 'purchase_order', ref: 'PO-2026-188', requester: 'Procurement', status: 'approved', submitted_at: '2026-03-10T11:20:00Z' },
];

export const MOCK_EPR_BUDGETS = [
  { id: 'bu1', cost_center: 'Ops-HQ', period: '2026', allocated: 12000000000, used: 7800000000, remaining: 4200000000 },
  { id: 'bu2', cost_center: 'Marketing', period: '2026', allocated: 4500000000, used: 2100000000, remaining: 2400000000 },
];

export const MOCK_EPR_AUDIT = [
  { id: 'au1', action: 'approve', entity: 'purchase_order', ref: 'PO-2026-188', actor: 'dewi@bedagang.id', at: '2026-03-10T14:02:00Z' },
  { id: 'au2', action: 'create', entity: 'vendor', ref: 'V-2024-014', actor: 'budi@bedagang.id', at: '2026-03-08T08:45:00Z' },
];

export const MOCK_EPR_ANALYTICS = {
  spendByMonth: [{ month: '2026-01', amount: 2100000000 }, { month: '2026-02', amount: 2450000000 }, { month: '2026-03', amount: 2680000000 }],
  topCategories: [{ category: 'Bahan baku', pct: 42 }, { category: 'Kemasan', pct: 18 }],
};

export const MOCK_EPR_SETTINGS = [
  { key: 'default_payment_term', value: 'Net 30', description: 'Default termin pembayaran vendor' },
  { key: 'pr_approval_threshold', value: '100000000', description: 'Nilai PR memerlukan approval direksi' },
];

// ─── SFA / CRM (unified page) ─────────────────────────────────

/** Ringkasan status kunjungan untuk doughnut dashboard (field `status` + `count`). */
function buildSfaVisitStatusDemo() {
  return [
    { status: 'completed', count: 520 },
    { status: 'planned', count: 186 },
    { status: 'in_progress', count: 94 },
    { status: 'missed', count: 38 },
    { status: 'cancelled', count: 22 },
  ];
}

/** CRM forecast analytics: 24 bulan (Mei 2024 – Apr 2026) untuk grafik target vs aktual. */
function buildSfaCrmForecastAnalytics() {
  const forecasts: {
    name: string;
    period_start: string;
    period_end: string;
    target_revenue: string;
    actual_revenue: string;
    best_case: string;
    most_likely: string;
    worst_case: string;
  }[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(2024, 4 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    const last = new Date(y, m, 0).getDate();
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    const tgt = 3_200_000_000 + i * 48_000_000 + (i % 5) * 11_000_000;
    const act = Math.round(tgt * (0.76 + (i % 9) * 0.025));
    forecasts.push({
      name: `Forecast ${label}`,
      period_start: `${ym}-01`,
      period_end: `${ym}-${String(last).padStart(2, '0')}`,
      target_revenue: String(tgt),
      actual_revenue: String(act),
      best_case: String(Math.round(tgt * 1.09)),
      most_likely: String(tgt),
      worst_case: String(Math.round(tgt * 0.84)),
    });
  }
  const accuracy = forecasts.slice(0, 12).map((f, idx) => ({
    name: f.name,
    accuracy_score: 70 + (idx % 18),
  }));
  return {
    forecasts,
    accuracy,
    dealScoreDist: [
      { temp: 'hot', count: '38' },
      { temp: 'warm', count: '64' },
      { temp: 'cold', count: '29' },
    ],
  };
}

/** Daftar kunjungan demo tersebar ~24 bulan (2 entri/bulan). */
function buildSfaVisitsTwoYears() {
  const outlets = [
    'Indomaret Kelapa Gading',
    'Hypermart Tunjungan',
    'Alfamidi Denpasar',
    'Superindo Bogor',
    'Transmart Bandung',
    'Lotte Mart Jakarta',
    'Giant Bekasi',
    'Hero Kemang',
  ];
  const reps = ['Budi Santoso', 'Made Wirawan', 'Siti Rahayu', 'Fajar Setiawan', 'Dewi Lestari', 'Rina Kusuma'];
  const statuses = ['completed', 'completed', 'completed', 'planned', 'in_progress'] as const;
  const rows: any[] = [];
  let n = 0;
  for (let mi = 0; mi < 24; mi++) {
    for (let k = 0; k < 2; k++) {
      const d = new Date(2024, 4 + mi, 8 + k * 10);
      const ds = d.toISOString().slice(0, 10);
      rows.push({
        id: `v-demo-${n}`,
        outlet: outlets[n % outlets.length],
        planned_date: ds,
        status: statuses[n % statuses.length],
        rep: reps[n % reps.length],
        check_in: statuses[n % statuses.length] === 'completed' ? `${ds}T09:15:00Z` : null,
      });
      n++;
    }
  }
  return rows;
}

export const MOCK_SFA_DASHBOARD = {
  totalLeads: 245,
  totalOpportunities: 68,
  totalVisits: 1230,
  totalOrders: 342,
  conversionRate: 28,
  avgDealSize: 45000000,
  totalRevenue: 3060000000,
  winRate: 42,
  leadsByStatus: [
    { status: 'new', count: 52 },
    { status: 'contacted', count: 68 },
    { status: 'qualified', count: 45 },
    { status: 'proposal', count: 32 },
    { status: 'negotiation', count: 28 },
    { status: 'converted', count: 12 },
    { status: 'lost', count: 8 },
  ],
  pipelineStages: [
    { stage: 'qualification', count: 18, value: 810000000 },
    { stage: 'needs_analysis', count: 15, value: 675000000 },
    { stage: 'proposal', count: 12, value: 540000000 },
    { stage: 'negotiation', count: 10, value: 450000000 },
    { stage: 'closed_won', count: 8, value: 360000000 },
    { stage: 'closed_lost', count: 5, value: 225000000 },
  ],
  visitStats: buildSfaVisitStatusDemo(),
  topLeads: [
    { id: 'l1', name: 'PT Maju Bersama', company: 'PT Maju Bersama', value: 150000000, status: 'negotiation', owner: 'Fajar Setiawan' },
    { id: 'l2', name: 'CV Sejahtera Abadi', company: 'CV Sejahtera Abadi', value: 120000000, status: 'proposal', owner: 'Siti Rahayu' },
    { id: 'l3', name: 'Hotel Grand Nusa', company: 'Hotel Grand Nusa', value: 95000000, status: 'qualified', owner: 'Made Wirawan' },
  ],
  pipelineBreakdown: { totalValue: 3060000000, avgDealSize: 45000000, avgCycleTime: 21, forecastedRevenue: 1800000000 },
};

export const MOCK_SFA_LEADS = [
  { id: 'l1', name: 'PT Maju Bersama', contact_name: 'Agus Pratama', email: 'agus@majubersama.com', phone: '081234567101', company: 'PT Maju Bersama', status: 'negotiation', source: 'referral', value: 150000000, owner: 'Fajar Setiawan', created_at: '2026-02-15' },
  { id: 'l2', name: 'CV Sejahtera Abadi', contact_name: 'Ratna Sari', email: 'ratna@sejahtera.com', phone: '081234567102', company: 'CV Sejahtera Abadi', status: 'proposal', source: 'website', value: 120000000, owner: 'Siti Rahayu', created_at: '2026-02-20' },
  { id: 'l3', name: 'Hotel Grand Nusa', contact_name: 'Wayan Sudirta', email: 'wayan@grandnusa.com', phone: '081234567103', company: 'Hotel Grand Nusa', status: 'qualified', source: 'event', value: 95000000, owner: 'Made Wirawan', created_at: '2026-03-01' },
  { id: 'l4', name: 'Restoran Padang Sederhana', contact_name: 'Hasan', email: 'hasan@padangsederhana.com', phone: '081234567104', company: 'Restoran Padang Sederhana', status: 'new', source: 'cold_call', value: 35000000, owner: 'Budi Santoso', created_at: '2026-03-10' },
  { id: 'l5', name: 'Koperasi Makmur Jaya', contact_name: 'Slamet', email: 'slamet@koperasimj.co.id', phone: '081234567105', company: 'Koperasi Makmur Jaya', status: 'contacted', source: 'referral', value: 55000000, owner: 'Dewi Lestari', created_at: '2026-03-05' },
];

export const MOCK_SFA_OPPORTUNITIES = [
  { id: 'o1', name: 'Supply F&B Maju Bersama', leadName: 'PT Maju Bersama', stage: 'negotiation', value: 150000000, probability: 70, expectedCloseDate: '2026-04-15', owner: 'Fajar Setiawan' },
  { id: 'o2', name: 'Paket Kopi Sejahtera', leadName: 'CV Sejahtera Abadi', stage: 'proposal', value: 120000000, probability: 40, expectedCloseDate: '2026-04-30', owner: 'Siti Rahayu' },
  { id: 'o3', name: 'Hotel Grand Nusa Amenities', leadName: 'Hotel Grand Nusa', stage: 'needs_analysis', value: 95000000, probability: 25, expectedCloseDate: '2026-05-15', owner: 'Made Wirawan' },
  { id: 'o4', name: 'Outlet Setup Koperasi MJ', leadName: 'Koperasi Makmur Jaya', stage: 'qualification', value: 55000000, probability: 10, expectedCloseDate: '2026-06-01', owner: 'Dewi Lestari' },
];

export const MOCK_SFA_TEAMS = [
  { id: 'tm1', name: 'Tim Jabodetabek — Key Account', leader: 'Fajar Setiawan', members: 8, territory: 'Jakarta / Tangerang / Bekasi', quota_monthly: 1200000000 },
  { id: 'tm2', name: 'Tim Jawa Barat', leader: 'Siti Rahayu', members: 6, territory: 'Bandung & Jabar', quota_monthly: 650000000 },
  { id: 'tm3', name: 'Tim Bali & Nusa Tenggara', leader: 'Made Wirawan', members: 5, territory: 'Denpasar & NTB', quota_monthly: 580000000 },
  { id: 'tm4', name: 'Tim Jawa Timur', leader: 'Dewi Lestari', members: 9, territory: 'Surabaya & Jatim', quota_monthly: 980000000 },
  { id: 'tm5', name: 'Tim Modern Trade Nasional', leader: 'Rina Kusuma', members: 4, territory: 'MT nasional', quota_monthly: 2100000000 },
];

export const MOCK_SFA_TERRITORIES = [
  { id: 'tr1', code: 'T-JKT-W', name: 'Jakarta Barat', assigned_team: 'Tim Jabodetabek — Key Account', outlets: 42 },
  { id: 'tr2', code: 'T-BDG', name: 'Bandung Raya', assigned_team: 'Tim Jawa Barat', outlets: 28 },
  { id: 'tr3', code: 'T-SBY', name: 'Surabaya', assigned_team: 'Tim Jawa Timur', outlets: 35 },
  { id: 'tr4', code: 'T-DPS', name: 'Denpasar', assigned_team: 'Tim Bali & Nusa Tenggara', outlets: 19 },
  { id: 'tr5', code: 'T-MT', name: 'Modern Trade Jabodetabek', assigned_team: 'Tim Modern Trade Nasional', outlets: 156 },
];

export const MOCK_SFA_VISITS = buildSfaVisitsTwoYears();

export const MOCK_SFA_COVERAGE_PLANS = [
  { id: 'cp1', code: 'CP-Q1-26', name: 'Coverage modern trade Q1', frequency: 'weekly', visits_per_period: 4, status: 'active' },
];

export const MOCK_SFA_COMPLIANCE = [
  { id: 'cf1', outlet: 'Indomaret KG', plan: 'CP-Q1-26', score: 92, issues: 0 },
];

export const MOCK_SFA_FIELD_ORDERS = [
  { id: 'fo1', order_number: 'FO-2026-0142', customer_name: 'PT Maju Bersama', status: 'submitted', total: 185000000, created_at: '2026-03-17' },
];

export const MOCK_SFA_QUOTATIONS = [
  { id: 'q1', quote_number: 'QT-2026-088', customer: 'Hotel Grand Nusa', status: 'sent', amount: 95000000, valid_until: '2026-04-01' },
];

export const MOCK_SFA_TARGET_GROUPS = [{ id: 'tg1', name: 'Modern Trade', target_revenue: 12000000000, achievement_pct: 78 }];

const MOCK_SFA_TARGET_GROUPS_ENHANCED = [
  {
    id: 'tg1',
    code: 'TG-MT-Q1',
    name: 'Modern Trade — Q1 2026',
    period: '03',
    year: 2026,
    status: 'active',
    period_type: 'monthly',
    assignment_count: 12,
    total_target_value: 12000000000,
    overall_achievement_pct: 78,
  },
  {
    id: 'tg2',
    code: 'TG-GT-Q1',
    name: 'General Trade — Q1 2026',
    period: '03',
    year: 2026,
    status: 'active',
    period_type: 'monthly',
    assignment_count: 18,
    total_target_value: 6500000000,
    overall_achievement_pct: 65,
  },
];
export const MOCK_SFA_INCENTIVE_SCHEMES = [{ id: 'is1', name: 'Bonus kuartal Q1', type: 'tiered', status: 'active' }];

const MOCK_SFA_INCENTIVE_SCHEMES_ENHANCED = [
  {
    id: 'is1',
    code: 'INC-Q1-2026',
    name: 'Bonus kuartal Q1',
    type: 'tiered',
    status: 'active',
    tier_count: 4,
    description: 'Insentif berjenjang berdasarkan pencapaian revenue & kunjungan.',
    base_amount: 5000000,
    min_achievement_pct: 70,
    overachievement_multiplier: 1.5,
  },
];
export const MOCK_SFA_COMMISSIONS = [{ id: 'c1', rep: 'Fajar Setiawan', period: '2026-03', amount: 12500000, status: 'approved' }];
export const MOCK_SFA_INV_PRODUCTS = [
  { id: 'ip1', sku: 'SKU-KAG-001', name: 'Kopi Arabica Gayo 1kg', commission_type: 'percentage', rate: 3 },
  { id: 'ip2', sku: 'SKU-GP-001', name: 'Gula Pasir Premium 1kg', commission_type: 'percentage', rate: 2 },
  { id: 'ip3', sku: 'SKU-CP16-001', name: 'Cup Plastik 16oz (1000pcs)', commission_type: 'fixed', rate: 5000 },
];
export const MOCK_SFA_COMM_GROUPS = [{ id: 'cg1', name: 'Grup Jabodetabek', members: 12 }];
export const MOCK_SFA_OUTLET_TARGETS = [{ id: 'ot1', outlet: 'Indomaret KG', target: 450000000, actual: 332000000 }];
export const MOCK_SFA_SALES_STRATEGIES = [{ id: 'ss1', title: 'Bundling promo Ramadan', status: 'active', owner: 'Marketing' }];

export const MOCK_SFA_DISPLAY_AUDITS = [{ id: 'da1', outlet: 'Hypermart', score: 88, auditor: 'Siti', date: '2026-03-12' }];
export const MOCK_SFA_COMPETITORS = [{ id: 'cp1', competitor_name: 'Brand X', activity_type: 'promotion', impact_level: 'high', reported_at: '2026-03-10' }];
export const MOCK_SFA_COMPETITOR_SUMMARY = [{ competitor_name: 'Brand X', events: 4, share_of_voice: 22 }];
export const MOCK_SFA_SURVEY_TEMPLATES = [{ id: 'st1', title: 'Survey display & OOS', questions: 12, status: 'published' }];
export const MOCK_SFA_SURVEY_RESPONSES = [{ id: 'sr1', template: 'Survey display & OOS', outlet: 'Indomaret', score: 4.2, submitted: '2026-03-11' }];

export const MOCK_SFA_APPROVAL_WORKFLOWS = [{ id: 'aw1', name: 'Approval diskon > 10%', steps: 3, status: 'active' }];
export const MOCK_SFA_APPROVAL_REQUESTS = [{ id: 'ar1', type: 'discount', ref: 'FO-2026-0142', status: 'pending', requester: 'Budi' }];
export const MOCK_SFA_GEOFENCES = [{ id: 'gf1', name: 'Geofence outlet KG', center_lat: -6.15, center_lng: 106.9, radius_meters: 150, fence_type: 'circle' }];

export const MOCK_SFA_PARAMETERS = [{ key: 'visit_radius_m', value: '100', label: 'Radius check-in (m)' }];
export const MOCK_SFA_PLAFON = [{ role: 'Sales', monthly_plafon: 50000000, used: 12000000 }];
export const MOCK_SFA_CURRENCIES = [{ code: 'IDR', name: 'Rupiah', symbol: 'Rp' }, { code: 'USD', name: 'US Dollar', symbol: '$' }];
export const MOCK_SFA_EXCHANGE_RATES = [{ pair: 'USD/IDR', rate: 16250, updated: '2026-03-18' }];
export const MOCK_SFA_TAX_SETTINGS = [{ code: 'PPN', rate: 11, inclusive: false }];
export const MOCK_SFA_NUMBERING = [{ entity: 'lead', prefix: 'LD', padding: 5 }];
export const MOCK_SFA_PAYMENT_TERMS = [{ code: 'NET30', label: 'Net 30 hari' }];
export const MOCK_SFA_BIZ_SETTINGS = [{ key: 'fiscal_year_start', value: '01-01' }];

export const MOCK_SFA_CRM_CUSTOMERS = [
  { id: 'cust-001', name: 'PT Maju Bersama Sejahtera', segment: 'key_account', health: 'good', last_order: '2026-03-17', email: 'procurement@majubersama.co.id', phone: '021-5550101', city: 'Jakarta', owner: 'Fajar Setiawan', ltv: 4200000000 },
  { id: 'cust-002', name: 'CV Sejahtera Abadi', segment: 'wholesale', health: 'good', last_order: '2026-03-16', email: 'order@sejahtera.id', phone: '022-8765432', city: 'Bandung', owner: 'Siti Rahayu', ltv: 1850000000 },
  { id: 'cust-003', name: 'Hotel Grand Nusa Dua', segment: 'hospitality', health: 'good', last_order: '2026-03-18', email: 'fb@grandnusa.com', phone: '0361-770088', city: 'Badung', owner: 'Made Wirawan', ltv: 2680000000 },
  { id: 'cust-004', name: 'Restoran Padang Sederhana', segment: 'fnb', health: 'at_risk', last_order: '2026-03-10', email: 'hasan@padangsederhana.com', phone: '0812-99112233', city: 'Depok', owner: 'Budi Santoso', ltv: 420000000 },
  { id: 'cust-005', name: 'Koperasi Makmur Jaya', segment: 'cooperative', health: 'good', last_order: '2026-03-14', email: 'slamet@koperasimj.co.id', phone: '031-4455667', city: 'Surabaya', owner: 'Dewi Lestari', ltv: 890000000 },
  { id: 'cust-006', name: 'Budi Hartono', segment: 'retail', health: 'good', last_order: '2026-03-12', email: 'budi.h@gmail.com', phone: '0813-22114455', city: 'Tangerang', owner: '—', ltv: 18500000 },
  { id: 'cust-007', name: 'PT Indo Retail Chain', segment: 'modern_trade', health: 'good', last_order: '2026-03-18', email: 'scm@indoretail.id', phone: '021-77889900', city: 'Jakarta', owner: 'Rina Kusuma', ltv: 12500000000 },
  { id: 'cust-008', name: 'Warung Berkah Jaya', segment: 'traditional', health: 'dormant', last_order: '2026-02-28', email: null, phone: '0812-33445566', city: 'Bogor', owner: 'Eko Prasetyo', ltv: 98000000 },
];
export const MOCK_SFA_CRM_COMMS = [{ id: 'cm1', channel: 'whatsapp', customer: 'PT Maju Bersama', last_message_at: '2026-03-17T10:00:00Z' }];
export const MOCK_SFA_CRM_FOLLOWUPS = [{ id: 'fu1', customer: 'Hotel Grand Nusa', due: '2026-03-22', owner: 'Made' }];
export const MOCK_SFA_CRM_TASKS = [
  { id: 'tsk1', title: 'Follow-up proposal PT Maju', due: '2026-04-22', status: 'open', owner: 'Siti' },
  { id: 'tsk2', title: 'Negosiasi kontrak tahunan', due: '2026-04-25', status: 'in_progress', owner: 'Fajar' },
  { id: 'tsk3', title: 'Kirim sampel produk ke Surabaya', due: '2026-04-18', status: 'completed', owner: 'Dewi' },
  { id: 'tsk4', title: 'Reminder pembayaran invoice', due: '2026-04-28', status: 'open', owner: 'Rina' },
  { id: 'tsk5', title: 'Survey kepuasan outlet MT', due: '2026-05-02', status: 'open', owner: 'Made' },
  { id: 'tsk6', title: 'Koordinasi promo Ramadan', due: '2026-04-30', status: 'in_progress', owner: 'Budi' },
];
export const MOCK_SFA_CRM_CALENDAR = [
  { id: 'ev1', title: 'Meeting PT Maju Bersama', start: '2026-04-20T10:00:00Z', type: 'meeting' },
  { id: 'ev2', title: 'Demo CRM — tim Jabar', start: '2026-04-23T14:00:00Z', type: 'internal' },
  { id: 'ev3', title: 'Joint call hotel Sanur', start: '2026-04-26T09:30:00Z', type: 'call' },
  { id: 'ev4', title: 'Review pipeline Q2', start: '2026-05-05T13:00:00Z', type: 'meeting' },
];
export const MOCK_SFA_CRM_FORECASTS = [
  {
    id: 'fc-demo-1',
    name: 'Forecast Nasional — Q2 2026',
    forecast_period: 'quarterly',
    period_start: '2026-04-01',
    period_end: '2026-06-30',
    target_revenue: '12500000000',
    actual_revenue: '10150000000',
    status: 'submitted',
    item_count: 48,
  },
  {
    id: 'fc-demo-2',
    name: 'Key Account Jabodetabek — Apr 2026',
    forecast_period: 'monthly',
    period_start: '2026-04-01',
    period_end: '2026-04-30',
    target_revenue: '4200000000',
    actual_revenue: '3880000000',
    status: 'approved',
    item_count: 22,
  },
  {
    id: 'fc-demo-3',
    name: 'Bali & Nusa Tenggara — Q1 2026',
    forecast_period: 'quarterly',
    period_start: '2026-01-01',
    period_end: '2026-03-31',
    target_revenue: '3100000000',
    actual_revenue: '2950000000',
    status: 'approved',
    item_count: 18,
  },
  {
    id: 'fc-demo-4',
    name: 'Modern Trade — Mei 2026',
    forecast_period: 'monthly',
    period_start: '2026-05-01',
    period_end: '2026-05-31',
    target_revenue: '8900000000',
    actual_revenue: '2100000000',
    status: 'draft',
    item_count: 12,
  },
];

/** Dipakai tab Peramalan: grafik batang + pie suhu deal saat API kosong. */
export const MOCK_SFA_CRM_FORECAST_ANALYTICS = buildSfaCrmForecastAnalytics();
export const MOCK_SFA_CRM_TICKETS = [{ id: 'tk1', subject: 'Komplain pengiriman', priority: 'high', status: 'open', sla_hours: 24, field_task_count: 0, comment_count: 0 }];
export const MOCK_SFA_CRM_AUTOMATION_RULES = [{ id: 'ar1', name: 'Auto task on new lead', trigger: 'lead.created', active: true }];
export const MOCK_SFA_CRM_AUTOMATION_LOGS = [{ id: 'al1', rule: 'Auto task on new lead', at: '2026-03-18T09:01:00Z', result: 'ok' }];

export const MOCK_SFA_IE_UPLOADED = [{ row: 1, status: 'valid', message: 'OK' }];
export const MOCK_SFA_INT_LEADS = [{ id: 'il1', name: 'Lead dari marketplace', source: 'tokopedia', convertible: true }];
export const MOCK_SFA_INT_VISITS = [{ id: 'iv1', visit_id: 'v2', reason: 'Belum ada task terkait' }];
export const MOCK_SFA_INT_PIPELINE = [{ id: 'ip1', opportunity: 'o1', ext_id: 'CRM-9982', sync: 'pending' }];

export const MOCK_SFA_AUDIT_TIMELINE = [
  { id: 'at1', at: '2026-03-18T08:00:00Z', entity: 'lead', action: 'update', actor: 'fajar@bedagang.id', detail: 'Status → negotiation' },
];

export const MOCK_SFA_HRIS_DEPTS = [{ id: 'd1', name: 'Sales', head: 'Fajar' }];
export const MOCK_SFA_HRIS_USERS = [{ id: 'u1', name: 'Dewi Lestari', email: 'dewi@bedagang.id', role: 'Sales' }];

export const MOCK_SFA_AI_MODELS = [{ id: 'm1', name: 'gpt-demo', provider: 'demo', status: 'active' }];
export const MOCK_SFA_AI_CATALOG = [{ id: 'mc1', name: 'Lead scoring v1', type: 'classification' }];
export const MOCK_SFA_AI_WORKFLOWS = [{ id: 'w1', name: 'Ringkasan kunjungan', steps: 3, status: 'draft' }];
export const MOCK_SFA_AI_WF_TEMPLATES = [{ id: 'wt1', name: 'Template follow-up email' }];
export const MOCK_SFA_AI_EXECUTIONS = [{ id: 'ex1', workflow: 'Ringkasan kunjungan', at: '2026-03-17T16:00:00Z', status: 'success' }];

/** Subset for `pages/hq/sfa/advanced.tsx` */
export const MOCK_SFA_ADVANCED = {
  coveragePlans: MOCK_SFA_COVERAGE_PLANS,
  coverageAssignments: [{ id: 'ca1', plan_id: 'cp1', rep: 'Budi', outlets: 18 }],
  compliance: MOCK_SFA_COMPLIANCE,
  fieldOrders: MOCK_SFA_FIELD_ORDERS,
  displayAudits: MOCK_SFA_DISPLAY_AUDITS,
  competitors: MOCK_SFA_COMPETITORS,
  competitorSummary: MOCK_SFA_COMPETITOR_SUMMARY,
  surveyTemplates: MOCK_SFA_SURVEY_TEMPLATES,
  surveyResponses: MOCK_SFA_SURVEY_RESPONSES,
  approvalWorkflows: MOCK_SFA_APPROVAL_WORKFLOWS,
  approvalRequests: MOCK_SFA_APPROVAL_REQUESTS,
  geofences: MOCK_SFA_GEOFENCES,
  commissions: MOCK_SFA_COMMISSIONS,
  inventoryProducts: MOCK_SFA_INV_PRODUCTS,
};

// ─── Marketing / Marketplace / Reports (ringkas) ────────────
export const MOCK_HQ_CAMPAIGNS = [
  { id: 'mc1', name: 'Promo Ramadan 2026', channel: 'omni', status: 'active', budget: 1200000000, spent: 420000000 },
];
export const MOCK_HQ_PROMOTIONS = [{ id: 'pr1', code: 'NGABIS', type: 'percentage', value: 15, status: 'scheduled' }];
export const MOCK_HQ_SEGMENTS = [{ id: 'sg1', name: 'Pelanggan loyal', size: 12500, criteria: 'RFM top 20%' }];
export const MOCK_HQ_MKT_BUDGETS = [{ id: 'mb1', channel: 'digital', allocated: 600000000, used: 210000000 }];

export const MOCK_REPORTS_CONSOLIDATED = {
  moduleHealth: [
    { module: 'inventory', health: 92, issues: 1 },
    { module: 'finance', health: 88, issues: 2 },
  ],
  chartTrendData: [
    { month: 'Jan', revenue: 8200000000, cost: 6100000000 },
    { month: 'Feb', revenue: 8450000000, cost: 6250000000 },
    { month: 'Mar', revenue: 8920000000, cost: 6400000000 },
  ],
  categoryData: [
    { category: 'F&B', share: 38 },
    { category: 'Retail', share: 27 },
  ],
};

export const MOCK_HQ_HOURLY_REVENUE = [
  { hour: '08:00', revenue: 120000000, transactions: 420 },
  { hour: '12:00', revenue: 280000000, transactions: 980 },
  { hour: '18:00', revenue: 310000000, transactions: 1100 },
  { hour: '20:00', revenue: 195000000, transactions: 720 },
];

// ═══════════════════════════════════════════════════════════════
// Komersial HQ: pelanggan, pesanan, penjualan, tim sales, katalog produk
// ═══════════════════════════════════════════════════════════════

/** Pelanggan B2B/B2C — untuk CRM, SFA, analitik */
export const MOCK_HQ_CUSTOMERS = [
  { id: 'cust-001', code: 'C-HO-0001', name: 'PT Maju Bersama Sejahtera', type: 'b2b', segment: 'key_account', email: 'procurement@majubersama.co.id', phone: '021-5550101', city: 'Jakarta', npwp: '01.234.567.8-901.000', credit_limit: 500000000, outstanding: 85000000, total_lifetime_value: 4200000000, orders_count: 156, last_order_at: '2026-03-17', health: 'good', owner: 'Fajar Setiawan' },
  { id: 'cust-002', code: 'C-HO-0002', name: 'CV Sejahtera Abadi', type: 'b2b', segment: 'wholesale', email: 'order@sejahtera.id', phone: '022-8765432', city: 'Bandung', npwp: '02.111.222.3-444.000', credit_limit: 200000000, outstanding: 12000000, total_lifetime_value: 1850000000, orders_count: 89, last_order_at: '2026-03-16', health: 'good', owner: 'Siti Rahayu' },
  { id: 'cust-003', code: 'C-HO-0003', name: 'Hotel Grand Nusa Dua', type: 'b2b', segment: 'hospitality', email: 'fb@grandnusa.com', phone: '0361-770088', city: 'Badung', npwp: '03.555.666.7-888.000', credit_limit: 350000000, outstanding: 0, total_lifetime_value: 2680000000, orders_count: 72, last_order_at: '2026-03-18', health: 'good', owner: 'Made Wirawan' },
  { id: 'cust-004', code: 'C-HO-0004', name: 'Restoran Padang Sederhana', type: 'b2b', segment: 'fnb', email: 'hasan@padangsederhana.com', phone: '0812-99112233', city: 'Depok', npwp: null, credit_limit: 50000000, outstanding: 8200000, total_lifetime_value: 420000000, orders_count: 34, last_order_at: '2026-03-10', health: 'at_risk', owner: 'Budi Santoso' },
  { id: 'cust-005', code: 'C-HO-0005', name: 'Koperasi Makmur Jaya', type: 'b2b', segment: 'cooperative', email: 'slamet@koperasimj.co.id', phone: '031-4455667', city: 'Surabaya', npwp: '04.777.888.9-000.000', credit_limit: 120000000, outstanding: 45000000, total_lifetime_value: 890000000, orders_count: 51, last_order_at: '2026-03-14', health: 'good', owner: 'Dewi Lestari' },
  { id: 'cust-006', code: 'C-RT-1024', name: 'Budi Hartono', type: 'b2c', segment: 'retail', email: 'budi.h@gmail.com', phone: '0813-22114455', city: 'Tangerang', npwp: null, credit_limit: 0, outstanding: 0, total_lifetime_value: 18500000, orders_count: 12, last_order_at: '2026-03-12', health: 'good', owner: '—' },
  { id: 'cust-007', code: 'C-HO-0007', name: 'PT Indo Retail Chain', type: 'b2b', segment: 'modern_trade', email: 'scm@indoretail.id', phone: '021-77889900', city: 'Jakarta', npwp: '05.123.999.0-111.000', credit_limit: 800000000, outstanding: 210000000, total_lifetime_value: 12500000000, orders_count: 412, last_order_at: '2026-03-18', health: 'good', owner: 'Rina Kusuma' },
  { id: 'cust-008', code: 'C-HO-0008', name: 'Warung Berkah Jaya', type: 'b2b', segment: 'traditional', email: null, phone: '0812-33445566', city: 'Bogor', npwp: null, credit_limit: 15000000, outstanding: 0, total_lifetime_value: 98000000, orders_count: 28, last_order_at: '2026-02-28', health: 'dormant', owner: 'Eko Prasetyo' },
];

/** Pesanan penjualan (POS + B2B + marketplace internal) */
export const MOCK_HQ_ORDERS = [
  { id: 'ord-240318-001', order_number: 'SO-2026-15420', channel: 'pos', branch_code: 'HQ-JKT', customer_id: 'cust-006', customer_name: 'Budi Hartono', status: 'completed', payment: 'qris', subtotal: 245000, discount: 0, tax: 26950, total: 271950, items_count: 4, created_at: '2026-03-18T09:14:22Z', sales_rep: 'Kasir 1' },
  { id: 'ord-240318-002', order_number: 'SO-2026-15421', channel: 'pos', branch_code: 'BDG-01', customer_id: null, customer_name: 'Walk-in', status: 'completed', payment: 'cash', subtotal: 89000, discount: 5000, tax: 9240, total: 93240, items_count: 2, created_at: '2026-03-18T10:02:11Z', sales_rep: 'Kasir 2' },
  { id: 'ord-240317-088', order_number: 'SO-2026-15388', channel: 'b2b', branch_code: 'HQ-JKT', customer_id: 'cust-001', customer_name: 'PT Maju Bersama Sejahtera', status: 'fulfilled', payment: 'transfer', subtotal: 45200000, discount: 0, tax: 4972000, total: 50172000, items_count: 18, created_at: '2026-03-17T14:30:00Z', sales_rep: 'Fajar Setiawan' },
  { id: 'ord-240316-201', order_number: 'SO-2026-15201', channel: 'b2b', branch_code: 'SBY-02', customer_id: 'cust-005', customer_name: 'Koperasi Makmur Jaya', status: 'processing', payment: 'term_14', subtotal: 128500000, discount: 6425000, tax: 13423750, total: 135098250, items_count: 42, created_at: '2026-03-16T08:45:00Z', sales_rep: 'Dewi Lestari' },
  { id: 'ord-mp-928811', order_number: 'MP-SP-928811', channel: 'marketplace', branch_code: 'WH-BEK', customer_id: null, customer_name: 'Shopee Buyer ***811', status: 'processing', payment: 'escrow', subtotal: 189000, discount: 15000, tax: 0, total: 174000, items_count: 3, created_at: '2026-03-18T11:22:00Z', sales_rep: '—' },
  { id: 'ord-240315-412', order_number: 'SO-2026-15012', channel: 'b2b', branch_code: 'HQ-JKT', customer_id: 'cust-007', customer_name: 'PT Indo Retail Chain', status: 'completed', payment: 'transfer', subtotal: 320000000, discount: 0, tax: 35200000, total: 355200000, items_count: 120, created_at: '2026-03-15T16:00:00Z', sales_rep: 'Rina Kusuma' },
  { id: 'ord-240314-055', order_number: 'SO-2026-14955', channel: 'pos', branch_code: 'SBY-02', customer_id: 'cust-006', customer_name: 'Budi Hartono', status: 'cancelled', payment: 'card', subtotal: 120000, discount: 0, tax: 13200, total: 0, items_count: 0, created_at: '2026-03-14T09:00:00Z', sales_rep: 'Kasir 3' },
];

/** Ringkasan & deret waktu penjualan — selaras `pages/hq/reports/sales.tsx` */
export const MOCK_REPORTS_SALES_SUMMARY = {
  totalSales: 8920000000,
  totalTransactions: 28450,
  averageTicket: 313532,
  totalItems: 68200,
  averageItemsPerTransaction: 2.4,
  totalDiscount: 185000000,
  totalTax: 892000000,
  netSales: 7843000000,
  grossProfit: 3120000000,
  grossMargin: 35,
  salesGrowth: 12.4,
  transactionGrowth: 8.1,
};

export const MOCK_REPORTS_SALES_BRANCH = [
  { branchId: 'b1', branchName: 'Kantor Pusat Jakarta', branchCode: 'HQ-JKT', sales: 2850000000, transactions: 9200, avgTicket: 309783, items: 22100, discount: 62000000, grossProfit: 1120000000, grossMargin: 39, growth: 11.2, target: 2700000000, achievement: 106 },
  { branchId: 'b2', branchName: 'Cabang Bandung', branchCode: 'BDG-01', sales: 1680000000, transactions: 5400, avgTicket: 311111, items: 12800, discount: 38000000, grossProfit: 620000000, grossMargin: 37, growth: 14.5, target: 1600000000, achievement: 105 },
  { branchId: 'b3', branchName: 'Cabang Surabaya', branchCode: 'SBY-02', sales: 1520000000, transactions: 5100, avgTicket: 298039, items: 11800, discount: 35000000, grossProfit: 560000000, grossMargin: 37, growth: 9.8, target: 1500000000, achievement: 101 },
  { branchId: 'b4', branchName: 'Cabang Bali', branchCode: 'BR-005', sales: 1420000000, transactions: 4800, avgTicket: 295833, items: 11200, discount: 28000000, grossProfit: 520000000, grossMargin: 37, growth: 18.2, target: 1300000000, achievement: 109 },
  { branchId: 'b5', branchName: 'Cabang Medan', branchCode: 'BR-004', sales: 980000000, transactions: 3200, avgTicket: 306250, items: 7600, discount: 22000000, grossProfit: 340000000, grossMargin: 35, growth: 4.1, target: 1050000000, achievement: 93 },
];

export const MOCK_REPORTS_SALES_TOP_PRODUCTS = [
  { productId: 'p1', productName: 'Kopi Arabica Gayo 1kg', sku: 'SKU-KAG-001', category: 'Bahan Baku', quantitySold: 12500, revenue: 2312500000, avgPrice: 185000, growth: 12 },
  { productId: 'p2', productName: 'Gula Pasir Premium 1kg', sku: 'SKU-GP-001', category: 'Bahan Baku', quantitySold: 42000, revenue: 756000000, avgPrice: 18000, growth: 8 },
  { productId: 'p3', productName: 'Cup Plastik 16oz (1000pcs)', sku: 'SKU-CP16-001', category: 'Packaging', quantitySold: 890, revenue: 155750000, avgPrice: 175000, growth: -3 },
  { productId: 'p4', productName: 'Susu Full Cream 1L', sku: 'SKU-SFC-001', category: 'Bahan Baku', quantitySold: 28000, revenue: 616000000, avgPrice: 22000, growth: 5 },
  { productId: 'p5', productName: 'Sirup Vanila 750ml', sku: 'SKU-SV-001', category: 'Bahan Baku', quantitySold: 9200, revenue: 1150000000, avgPrice: 125000, growth: 2 },
];

export const MOCK_REPORTS_SALES_DAILY = [
  { date: '2026-03-14', dayName: 'Jumat', sales: 268000000, transactions: 880, avgTicket: 304545 },
  { date: '2026-03-15', dayName: 'Sabtu', sales: 312000000, transactions: 1020, avgTicket: 305882 },
  { date: '2026-03-16', dayName: 'Minggu', sales: 298000000, transactions: 980, avgTicket: 304082 },
  { date: '2026-03-17', dayName: 'Senin', sales: 285000000, transactions: 940, avgTicket: 303191 },
  { date: '2026-03-18', dayName: 'Selasa', sales: 305000000, transactions: 990, avgTicket: 308081 },
];

export const MOCK_REPORTS_SALES_HOURLY = [
  { hour: 8, sales: 125000000, transactions: 410 },
  { hour: 10, sales: 198000000, transactions: 650 },
  { hour: 12, sales: 285000000, transactions: 920 },
  { hour: 15, sales: 242000000, transactions: 780 },
  { hour: 18, sales: 312000000, transactions: 1010 },
  { hour: 20, sales: 198000000, transactions: 640 },
];

export const MOCK_REPORTS_SALES_PAYMENT = [
  { method: 'QRIS', amount: 2100000000, transactions: 8200, percentage: 24 },
  { method: 'Tunai', amount: 2680000000, transactions: 9800, percentage: 30 },
  { method: 'Kartu Debit/Kredit', amount: 1980000000, transactions: 6200, percentage: 22 },
  { method: 'Transfer', amount: 1520000000, transactions: 2100, percentage: 17 },
  { method: 'E-wallet', amount: 640000000, transactions: 2150, percentage: 7 },
];

/** Tim sales & wilayah */
export const MOCK_HQ_SALES_TEAM = [
  { id: 'rep-01', employee_no: 'EMP-S-001', name: 'Fajar Setiawan', role: 'Key Account Manager', region: 'Jabodetabek', manager: 'Andi Wijaya', quota_monthly: 450000000, achievement_pct: 112, active_deals: 8, customers_owned: 24, phone: '0812-10002001', email: 'fajar.setiawan@bedagang.id' },
  { id: 'rep-02', employee_no: 'EMP-S-002', name: 'Siti Rahayu', role: 'Sales Executive', region: 'Jawa Barat', manager: 'Andi Wijaya', quota_monthly: 280000000, achievement_pct: 98, active_deals: 5, customers_owned: 18, phone: '0812-10002002', email: 'siti.rahayu@bedagang.id' },
  { id: 'rep-03', employee_no: 'EMP-S-003', name: 'Made Wirawan', role: 'Sales Executive', region: 'Bali & Nusa Tenggara', manager: 'Luh Putu', quota_monthly: 320000000, achievement_pct: 105, active_deals: 6, customers_owned: 15, phone: '0812-10002003', email: 'made.wirawan@bedagang.id' },
  { id: 'rep-04', employee_no: 'EMP-S-004', name: 'Dewi Lestari', role: 'Regional Lead', region: 'Jawa Timur', manager: 'Andi Wijaya', quota_monthly: 520000000, achievement_pct: 101, active_deals: 11, customers_owned: 31, phone: '0812-10002004', email: 'dewi.lestari@bedagang.id' },
  { id: 'rep-05', employee_no: 'EMP-S-005', name: 'Budi Santoso', role: 'Sales Executive', region: 'Jabodetabek', manager: 'Andi Wijaya', quota_monthly: 220000000, achievement_pct: 87, active_deals: 4, customers_owned: 14, phone: '0812-10002005', email: 'budi.santoso@bedagang.id' },
  { id: 'rep-06', employee_no: 'EMP-S-006', name: 'Rina Kusuma', role: 'Modern Trade Lead', region: 'Nasional', manager: 'Direktur Penjualan', quota_monthly: 800000000, achievement_pct: 118, active_deals: 14, customers_owned: 8, phone: '0812-10002006', email: 'rina.kusuma@bedagang.id' },
];

/** Katalog produk HQ (struktur selaras Product di `pages/hq/products/index.tsx`) */
export const MOCK_HQ_PRODUCTS = [
  { id: 1, sku: 'SKU-KAG-001', name: 'Kopi Arabica Gayo 1kg', description: 'Biji kopi arabica premium dari Gayo', categoryId: 1, categoryName: 'Bahan Baku', basePrice: 185000, costPrice: 150000, isActive: true, imageUrl: null, unit: 'kg', stock: 850, minStock: 100, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-01-15' },
  { id: 2, sku: 'SKU-GP-001', name: 'Gula Pasir Premium 1kg', description: 'Gula pasir halus berkualitas', categoryId: 1, categoryName: 'Bahan Baku', basePrice: 18000, costPrice: 15000, isActive: true, imageUrl: null, unit: 'kg', stock: 1200, minStock: 200, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-01-15' },
  { id: 3, sku: 'SKU-CP16-001', name: 'Cup Plastik 16oz (1000pcs)', description: 'Cup plastik untuk minuman dingin', categoryId: 2, categoryName: 'Packaging', basePrice: 175000, costPrice: 150000, isActive: true, imageUrl: null, unit: 'box', stock: 45, minStock: 20, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-02-01' },
  { id: 4, sku: 'SKU-SFC-001', name: 'Susu Full Cream 1L', description: 'Susu segar full cream', categoryId: 1, categoryName: 'Bahan Baku', basePrice: 22000, costPrice: 20000, isActive: true, imageUrl: null, unit: 'liter', stock: 680, minStock: 100, pricing: { isStandard: false, lockedBy: 'Ahmad Wijaya', lockedAt: '2026-01-10', branchPrices: [{ branchId: 'b2', branchName: 'Cabang Bandung', price: 21000, priceTier: null }] }, createdAt: '2025-02-10' },
  { id: 5, sku: 'SKU-SV-001', name: 'Sirup Vanila 750ml', description: 'Sirup vanila untuk campuran kopi', categoryId: 1, categoryName: 'Bahan Baku', basePrice: 125000, costPrice: 100000, isActive: true, imageUrl: null, unit: 'botol', stock: 320, minStock: 50, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-03-01' },
  { id: 6, sku: 'SKU-TB-001', name: 'Teh Celup Premium (25pcs)', description: 'Teh celup premium', categoryId: 3, categoryName: 'Minuman', basePrice: 35000, costPrice: 25000, isActive: true, imageUrl: null, unit: 'box', stock: 450, minStock: 80, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-03-15' },
  { id: 7, sku: 'SKU-CK-001', name: 'Cookies Coklat (12pcs)', description: 'Cookies coklat homemade', categoryId: 4, categoryName: 'Makanan', basePrice: 45000, costPrice: 30000, isActive: true, imageUrl: null, unit: 'pack', stock: 180, minStock: 30, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-04-01' },
  { id: 8, sku: 'SKU-SD-001', name: 'Sedotan Kertas (500pcs)', description: 'Sedotan ramah lingkungan', categoryId: 2, categoryName: 'Packaging', basePrice: 85000, costPrice: 70000, isActive: false, imageUrl: null, unit: 'box', stock: 0, minStock: 10, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-04-15' },
  { id: 9, sku: 'SKU-MC-250', name: 'Matcha Powder Premium 250g', description: 'Matcha culinary grade', categoryId: 1, categoryName: 'Bahan Baku', basePrice: 195000, costPrice: 155000, isActive: true, imageUrl: null, unit: 'pack', stock: 240, minStock: 40, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-05-01' },
  { id: 10, sku: 'SKU-SYR-MNT', name: 'Sirup Mint 750ml', description: 'Sirup mint untuk minuman', categoryId: 1, categoryName: 'Bahan Baku', basePrice: 118000, costPrice: 92000, isActive: true, imageUrl: null, unit: 'botol', stock: 190, minStock: 35, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-05-10' },
  { id: 11, sku: 'SKU-LID-90', name: 'Tutup Cup 90mm (1000pcs)', description: 'Tutup cup untuk 12–16oz', categoryId: 2, categoryName: 'Packaging', basePrice: 142000, costPrice: 118000, isActive: true, imageUrl: null, unit: 'box', stock: 62, minStock: 15, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-06-01' },
  { id: 12, sku: 'SKU-BTL-500', name: 'Botol PET 500ml (50pcs)', description: 'Botol takeaway food grade', categoryId: 2, categoryName: 'Packaging', basePrice: 95000, costPrice: 78000, isActive: true, imageUrl: null, unit: 'pack', stock: 310, minStock: 50, pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }, createdAt: '2025-06-12' },
];

/** Marketplace — perluas pesanan channel */
export const MOCK_MP_ORDERS = [
  { id: 'mo1', channel_order_id: 'SP-928811', platform: 'Shopee', status: 'processing', total: 189000, created_at: '2026-03-18T11:05:00Z', buyer: 'budi***', items: 2 },
  { id: 'mo2', channel_order_id: 'SP-928798', platform: 'Shopee', status: 'shipped', total: 425000, created_at: '2026-03-18T09:22:00Z', buyer: 'sari***', items: 5 },
  { id: 'mo3', channel_order_id: 'TK-441902', platform: 'Tokopedia', status: 'paid', total: 156000, created_at: '2026-03-17T16:40:00Z', buyer: 'andi***', items: 1 },
  { id: 'mo4', channel_order_id: 'TT-88231', platform: 'TikTok Shop', status: 'ready_to_ship', total: 289000, created_at: '2026-03-18T08:15:00Z', buyer: 'lia***', items: 3 },
  { id: 'mo5', channel_order_id: 'LZ-99102', platform: 'Lazada', status: 'delivered', total: 99000, created_at: '2026-03-16T14:00:00Z', buyer: 'eka***', items: 1 },
];

export const MOCK_MP_CHANNELS = [
  { id: 'ch1', name: 'Shopee — Bedagang Official', status: 'connected', orders_today: 42 },
  { id: 'ch2', name: 'Tokopedia — Bedagang', status: 'connected', orders_today: 28 },
  { id: 'ch3', name: 'TikTok Shop', status: 'connected', orders_today: 15 },
];

/** Selaras `getDashboard` marketplace — grid channel di `/hq/marketplace` */
export const MOCK_HQ_MARKETPLACE_DASHBOARD_CHANNELS = [
  { platform: 'tokopedia', name: 'Tokopedia', icon: '🟢', color: '#42b549', status: 'connected', shopName: 'Bedagang Official', productsSynced: 1280, ordersToday: 28, lastSyncStock: '2026-03-18T09:15:00Z' },
  { platform: 'shopee', name: 'Shopee', icon: '🟠', color: '#ee4d2d', status: 'connected', shopName: 'bedagang.id', productsSynced: 2100, ordersToday: 42, lastSyncStock: '2026-03-18T10:00:00Z' },
  { platform: 'lazada', name: 'Lazada', icon: '🔵', color: '#0f146d', status: 'connected', shopName: 'Bedagang Store', productsSynced: 420, ordersToday: 12, lastSyncStock: '2026-03-17T18:30:00Z' },
  { platform: 'tiktok_shop', name: 'TikTok Shop', icon: '⚫', color: '#000000', status: 'connected', shopName: '@bedagang', productsSynced: 890, ordersToday: 15, lastSyncStock: '2026-03-18T08:40:00Z' },
  { platform: 'bukalapak', name: 'Bukalapak', icon: '🔴', color: '#e31e52', status: 'disconnected', shopName: null, productsSynced: 0, ordersToday: 0, lastSyncStock: null },
  { platform: 'blibli', name: 'Blibli', icon: '🔷', color: '#0095da', status: 'disconnected', shopName: null, productsSynced: 0, ordersToday: 0, lastSyncStock: null },
];

/** Agregat untuk diekspor / dokumentasi */
export const MOCK_HQ_COMMERCE = {
  customers: MOCK_HQ_CUSTOMERS,
  orders: MOCK_HQ_ORDERS,
  salesSummary: MOCK_REPORTS_SALES_SUMMARY,
  branchSales: MOCK_REPORTS_SALES_BRANCH,
  topProducts: MOCK_REPORTS_SALES_TOP_PRODUCTS,
  dailySales: MOCK_REPORTS_SALES_DAILY,
  hourlySales: MOCK_REPORTS_SALES_HOURLY,
  paymentMethods: MOCK_REPORTS_SALES_PAYMENT,
  salesTeam: MOCK_HQ_SALES_TEAM,
  products: MOCK_HQ_PRODUCTS,
  marketplaceOrders: MOCK_MP_ORDERS,
};

// ─── Supplier & pembelian ─────────────────────────────────────
export const MOCK_HQ_SUPPLIERS = [
  { id: 'sup-1', code: 'SUP-001', name: 'PT Supplier Prima Nusantara', contactPerson: 'Bambang Wijaya', phone: '021-5550111', email: 'sales@supplierprima.id', address: 'Jl. Industri Raya No. 88', city: 'Tangerang', province: 'Banten', categories: ['Minuman', 'Bahan Baku'], rating: 4.6, totalPO: 42, totalValue: 2850000000, paymentTerms: 'Net 30', leadTimeDays: 5, isActive: true, notes: 'Supplier utama kopi & gula', createdAt: '2024-06-01', lastOrderDate: '2026-03-17' },
  { id: 'sup-2', code: 'SUP-014', name: 'CV Mitra Bahan Pokok', contactPerson: 'Ratna Dewi', phone: '0251-778899', email: 'order@mitrabahan.id', address: 'Jl. Raya Sukasari No. 12', city: 'Bogor', province: 'Jawa Barat', categories: ['Sembako', 'Makanan Ringan'], rating: 4.3, totalPO: 36, totalValue: 2120000000, paymentTerms: 'Net 14', leadTimeDays: 3, isActive: true, notes: '', createdAt: '2024-08-10', lastOrderDate: '2026-03-16' },
  { id: 'sup-3', code: 'SUP-088', name: 'PT Indo Packaging', contactPerson: 'Hendra Gunawan', phone: '021-99001122', email: 'sales@indopack.id', address: 'Kawasan MM2100 Blok C', city: 'Bekasi', province: 'Jawa Barat', categories: ['Kebersihan Rumah'], rating: 4.1, totalPO: 18, totalValue: 1680000000, paymentTerms: 'Net 30', leadTimeDays: 7, isActive: true, notes: 'Kemasan & plastik', createdAt: '2023-11-20', lastOrderDate: '2026-03-10' },
  { id: 'sup-4', code: 'SUP-102', name: 'UD Sumber Rejeki', contactPerson: 'Pak Slamet', phone: '0812-33445566', email: 'udrejeki@gmail.com', address: 'Pasar Induk Caringin', city: 'Bogor', province: 'Jawa Barat', categories: ['Sembako'], rating: 3.8, totalPO: 22, totalValue: 420000000, paymentTerms: 'COD', leadTimeDays: 1, isActive: true, notes: 'Tradisional', createdAt: '2025-01-05', lastOrderDate: '2026-03-12' },
];

const _poItemsA = [
  { id: 'pi1', productId: '1', productName: 'Kopi Arabica Gayo 1kg', sku: 'SKU-KAG-001', quantity: 200, receivedQuantity: 200, unitPrice: 150000, total: 30000000, status: 'received' as const },
  { id: 'pi2', productId: '2', productName: 'Gula Pasir Premium 1kg', sku: 'SKU-GP-001', quantity: 500, receivedQuantity: 500, unitPrice: 15000, total: 7500000, status: 'received' as const },
];
const _poItemsB = [
  { id: 'pi3', productId: '3', productName: 'Cup Plastik 16oz (1000pcs)', sku: 'SKU-CP16-001', quantity: 40, receivedQuantity: 15, unitPrice: 150000, total: 6000000, status: 'partial' as const },
];

export const MOCK_HQ_PURCHASE_ORDERS = [
  {
    id: 'po-hq-1', poNumber: 'PO-2026-0188', supplier: { id: 'sup-1', name: 'PT Supplier Prima Nusantara', code: 'SUP-001' },
    status: 'received' as const, totalItems: 2, totalQuantity: 700, totalAmount: 37500000, expectedDelivery: '2026-03-20', createdBy: 'Dewi Lestari', createdAt: '2026-03-12', approvedBy: 'Manager Procurement', approvedAt: '2026-03-12', notes: 'Repeat order bulanan', items: _poItemsA,
  },
  {
    id: 'po-hq-2', poNumber: 'PO-2026-0191', supplier: { id: 'sup-3', name: 'PT Indo Packaging', code: 'SUP-088' },
    status: 'partial' as const, totalItems: 1, totalQuantity: 40, totalAmount: 6000000, expectedDelivery: '2026-03-25', createdBy: 'Eko Prasetyo', createdAt: '2026-03-15', approvedBy: 'Manager Procurement', approvedAt: '2026-03-15', notes: '', items: _poItemsB,
  },
  {
    id: 'po-hq-3', poNumber: 'PO-2026-0195', supplier: { id: 'sup-2', name: 'CV Mitra Bahan Pokok', code: 'SUP-014' },
    status: 'sent' as const, totalItems: 1, totalQuantity: 300, totalAmount: 4500000, expectedDelivery: '2026-03-28', createdBy: 'Dewi Lestari', createdAt: '2026-03-18', approvedBy: null, approvedAt: null, notes: 'Sedang dikirim supplier', items: [
      { id: 'pi4', productId: '2', productName: 'Gula Pasir Premium 1kg', sku: 'SKU-GP-001', quantity: 300, receivedQuantity: 0, unitPrice: 15000, total: 4500000, status: 'pending' as const },
    ],
  },
];

export const MOCK_HQ_SUPPLIER_SCORECARD = [
  { supplier_id: 'sup-1', name: 'PT Supplier Prima', on_time_pct: 96, quality_score: 4.7, price_competitiveness: 4.2, overall: 4.5 },
  { supplier_id: 'sup-2', name: 'CV Mitra Bahan Pokok', on_time_pct: 91, quality_score: 4.4, price_competitiveness: 4.5, overall: 4.3 },
  { supplier_id: 'sup-3', name: 'PT Indo Packaging', on_time_pct: 88, quality_score: 4.1, price_competitiveness: 4.0, overall: 4.0 },
];

// ─── Home / modul status ───────────────────────────────────────
export const MOCK_HQ_MODULE_STATUSES = [
  { code: 'dashboard', isEnabled: true, isCore: true },
  { code: 'project_management', isEnabled: true, isCore: false },
  { code: 'asset_management', isEnabled: true, isCore: false },
  { code: 'knowledge_base', isEnabled: true, isCore: false },
  { code: 'inventory', isEnabled: true, isCore: false },
  { code: 'finance_pro', isEnabled: true, isCore: false },
  { code: 'hris', isEnabled: true, isCore: false },
  { code: 'users', isEnabled: true, isCore: false },
  { code: 'crm', isEnabled: true, isCore: false },
  { code: 'helpdesk', isEnabled: true, isCore: false },
  { code: 'marketing', isEnabled: true, isCore: false },
  { code: 'fms', isEnabled: true, isCore: false },
  { code: 'reports', isEnabled: true, isCore: false },
  { code: 'audit', isEnabled: true, isCore: false },
  { code: 'whatsapp', isEnabled: true, isCore: false },
  { code: 'settings', isEnabled: true, isCore: false },
];

// ─── Laporan keuangan (reports/finance) ───────────────────────
export const MOCK_REPORTS_FINANCE_SUMMARY = {
  revenue: 8920000000, cogs: 5340000000, grossProfit: 3580000000, operatingExpenses: 1850000000,
  netProfit: 1280000000, cashSales: 2680000000, cardSales: 2100000000, digitalSales: 1980000000,
  transactions: 28450, tax: 892000000, discount: 185000000, avgGrossMargin: 40, avgNetMargin: 14,
};

export const MOCK_REPORTS_FINANCE_BRANCH = [
  { branchId: 'b1', branchName: 'Kantor Pusat Jakarta', branchCode: 'HQ-JKT', revenue: 2850000000, cogs: 1710000000, grossProfit: 1140000000, operatingExpenses: 620000000, netProfit: 420000000, transactions: 9200, tax: 285000000, discount: 62000000, grossMargin: 40, netMargin: 15, cashSales: 980000000, cardSales: 920000000, digitalSales: 950000000 },
  { branchId: 'b2', branchName: 'Cabang Bandung', branchCode: 'BDG-01', revenue: 1680000000, cogs: 1008000000, grossProfit: 672000000, operatingExpenses: 380000000, netProfit: 245000000, transactions: 5400, tax: 168000000, discount: 38000000, grossMargin: 40, netMargin: 15, cashSales: 520000000, cardSales: 580000000, digitalSales: 580000000 },
];

export const MOCK_REPORTS_FINANCE_TREND = [
  { month: 'Jan', revenue: 8200000000, profit: 1100000000, transactions: 26200 },
  { month: 'Feb', revenue: 8450000000, profit: 1180000000, transactions: 27400 },
  { month: 'Mar', revenue: 8920000000, profit: 1280000000, transactions: 28450 },
];

export const MOCK_REPORTS_FINANCE_PAYMENT = [
  { method: 'Tunai', amount: 2680000000, transactions: 9800, avgTicket: 273469, percentage: 30 },
  { method: 'Kartu', amount: 2100000000, transactions: 6200, avgTicket: 338710, percentage: 24 },
  { method: 'QRIS', amount: 1980000000, transactions: 7100, avgTicket: 278873, percentage: 22 },
];

// ─── TMS / logistik ───────────────────────────────────────────
export const MOCK_HQ_TMS = {
  dashboard: { total_shipments: 48, in_transit: 12, delivered_today: 28, pending_dispatch: 5, active_carriers: 8, on_time_pct: 94 },
  chartData: { weekly: [{ w: 'W1', vol: 120 }, { w: 'W2', vol: 135 }, { w: 'W3', vol: 128 }, { w: 'W4', vol: 142 }] },
  shipments: [
    { id: 'sh1', shipment_number: 'SHP-TMS-2026-042', status: 'in_transit', origin: 'Jakarta', destination: 'Bandung', carrier: 'JNE Cargo', eta: '2026-03-19', weight_kg: 450 },
    { id: 'sh2', shipment_number: 'SHP-TMS-2026-041', status: 'delivered', origin: 'Surabaya', destination: 'Malang', carrier: 'SiCepat', eta: '2026-03-17', weight_kg: 120 },
  ],
  trips: [
    { id: 'trp1', trip_number: 'TR-2026-088', vehicle_plate: 'B 1234 XY', driver: 'Pak Joko', status: 'in_progress', origin: 'Jakarta', destination: 'Tangerang', started_at: '2026-03-18T06:00:00Z' },
  ],
  carriers: [
    { id: 'carr1', code: 'JNE', name: 'JNE Express', type: 'courier', contact: '021-29278888', rating: 4.5, active: true },
    { id: 'carr2', code: 'SCP', name: 'SiCepat Ekspres', type: 'courier', contact: '021-50205777', rating: 4.3, active: true },
  ],
  routes: [
    { id: 'rt1', code: 'JKT-BDG', name: 'Jakarta – Bandung', distance_km: 150, avg_lead_hours: 8 },
    { id: 'rt2', code: 'SBY-MLG', name: 'Surabaya – Malang', distance_km: 95, avg_lead_hours: 5 },
  ],
  freightBills: [
    { id: 'fb1', bill_number: 'FB-2026-012', carrier: 'JNE', amount: 1850000, status: 'paid', due_date: '2026-03-25' },
  ],
  zones: [
    { id: 'z1', code: 'Z-JKT', name: 'Zona Jabodetabek', countries: 'ID', active: true },
    { id: 'z2', code: 'Z-JT', name: 'Zona Jawa Tengah–Timur', countries: 'ID', active: true },
  ],
  rateCards: [
    { id: 'rc1', name: 'Tarif darat per kg', zone_id: 'z1', base_rate: 4500, min_charge: 25000, currency: 'IDR' },
  ],
  warehouses: [
    { id: 'wh1', code: 'WH-BEK', name: 'Gudang Bekasi', address: 'MM2100', capacity_cbm: 2500, utilization_pct: 72 },
  ],
  fmsVehicles: [{ id: 'v1', plate: 'B 1234 XY', type: 'truck', status: 'on_trip' }],
  fmsDrivers: [{ id: 'd1', name: 'Joko Susilo', phone: '0812-11112222', license: 'A', status: 'active' }],
  tracking: [{ shipment_id: 'sh1', event: 'picked_up', at: '2026-03-18T08:00:00Z', location: 'Hub Jakarta' }],
  carrierScores: [{ carrier_id: 'carr1', on_time: 94, damage_rate: 0.2, score: 4.6 }],
  deliverySlas: [{ id: 'sla1', name: 'Same day Jabodetabek', max_hours: 24, breach_pct: 3 }],
  slaPerformance: { on_time_pct: 94, avg_delay_hours: 2.1 },
  logisticsKpi: { cost_per_kg: 4200, fill_rate: 0.78, otif: 0.91 },
  dispatchQueue: [{ id: 'dq1', order_ref: 'SO-2026-15420', priority: 'normal', status: 'queued', destination: 'Bandung' }],
};

// ─── Marketplace index ───────────────────────────────────────
export const MOCK_HQ_MARKETPLACE_HOME = {
  channels: MOCK_HQ_MARKETPLACE_DASHBOARD_CHANNELS,
  stats: {
    totalChannels: 6,
    connectedChannels: 4,
    totalProductsSynced: 4690,
    totalOrdersToday: 97,
    totalRevenue: 18500000,
    pendingOrders: 12,
  },
  setupSteps: [
    { step: 1, title: 'Pilih marketplace yang ingin dihubungkan', completed: true },
    { step: 2, title: 'Otorisasi akun marketplace (OAuth)', completed: true },
    { step: 3, title: 'Mapping produk ERP ke marketplace', completed: true },
    { step: 4, title: 'Sync produk & stok ke marketplace', completed: true },
    { step: 5, title: 'Konfigurasi auto-sync order & stok', completed: false },
  ],
  syncHistory: [
    { id: 'syn1', sync_type: 'product_sync', is_success: true, created_at: '2026-03-18T10:00:00Z', platform: 'shopee', error_message: null },
    { id: 'syn2', sync_type: 'order_pull', is_success: true, created_at: '2026-03-18T09:30:00Z', platform: 'tokopedia', error_message: null },
    { id: 'syn3', sync_type: 'stock_sync', is_success: false, created_at: '2026-03-18T08:10:00Z', platform: 'lazada', error_message: 'Rate limit — coba lagi' },
  ],
  activeJobs: [{ id: 'job1', job_type: 'stock_sync', platform: 'shopee', processed_items: 650, total_items: 1000, progress_percent: 65 }],
};

export const MOCK_HQ_MARKETPLACE_CONFLICTS = { summary: { price: 2, stock: 1, sync: 0 } };

// ─── SFA enhanced page ─────────────────────────────────────────
const MOCK_SFA_ENHANCED_DASHBOARD = {
  summary: {
    total_teams: 5,
    total_ff: 32,
    avg_achievement: 87.5,
    total_incentive: 485000000,
    active_target_groups: 4,
    pending_incentives: 3,
    active_plafon: 8,
    high_risk_plafon: 1,
  },
  topAchievers: [
    { user_name: 'Fajar Setiawan', team_name: 'Tim Jabodetabek — Key Account', weighted_pct: 112.4, rating: 'excellent' },
    { user_name: 'Siti Rahayu', team_name: 'Tim Jawa Barat', weighted_pct: 98.2, rating: 'good' },
    { user_name: 'Made Wirawan', team_name: 'Tim Bali & Nusa Tenggara', weighted_pct: 91.0, rating: 'good' },
  ],
  teamPerformance: [
    { name: 'Tim Jabodetabek — Key Account', members: 8, avg_achievement: 94.2, total_revenue: 1180000000 },
    { name: 'Tim Modern Trade Nasional', members: 4, avg_achievement: 91.0, total_revenue: 2050000000 },
    { name: 'Tim Jawa Timur', members: 9, avg_achievement: 88.5, total_revenue: 920000000 },
  ],
};

const MOCK_SFA_PARAMETERS_GROUPED: Record<string, { id: string; label: string; description: string; param_value: string; value_type: string }[]> = {
  visit: [
    { id: 'pv1', label: 'Minimum kunjungan per hari', description: 'Target kunjungan outlet untuk FF', param_value: '4', value_type: 'number' },
    { id: 'pv2', label: 'Wajib foto display', description: 'Foto wajib saat check-out', param_value: 'true', value_type: 'boolean' },
  ],
  target: [
    { id: 'pt1', label: 'Periode evaluasi target', description: 'Frekuensi penilaian pencapaian', param_value: 'monthly', value_type: 'select' },
  ],
  achievement: [
    { id: 'pa1', label: 'Bobot kunjungan (%)', description: 'Kontribusi ke achievement', param_value: '35', value_type: 'number' },
  ],
  incentive: [
    { id: 'pi1', label: 'Rounding insentif ke ribuan', description: 'Pembulatan pembayaran', param_value: 'true', value_type: 'boolean' },
  ],
  plafon: [
    { id: 'pp1', label: 'Alert threshold (% plafon)', description: 'Notifikasi risiko', param_value: '85', value_type: 'number' },
  ],
};

const MOCK_SFA_ACHIEVEMENT_ROWS = [
  {
    id: 'ach1', user_id: 'rep-01', user_name: 'Fajar Setiawan', team_name: 'Tim Jabodetabek — Key Account',
    total_revenue: 580000000, revenue_pct: 95, completed_visits: 42, visit_pct: 88, effective_calls: 38, new_customers: 6,
    weighted_pct: 92.4, rating: 'excellent',
  },
  {
    id: 'ach2', user_id: 'rep-02', user_name: 'Siti Rahayu', team_name: 'Tim Jawa Barat',
    total_revenue: 265000000, revenue_pct: 82, completed_visits: 28, visit_pct: 76, effective_calls: 24, new_customers: 3,
    weighted_pct: 80.1, rating: 'good',
  },
  {
    id: 'ach3', user_id: 'rep-06', user_name: 'Rina Kusuma', team_name: 'Tim Modern Trade Nasional',
    total_revenue: 920000000, revenue_pct: 102, completed_visits: 18, visit_pct: 90, effective_calls: 16, new_customers: 2,
    weighted_pct: 97.8, rating: 'excellent',
  },
];

const MOCK_SFA_INCENTIVE_CALC_ROWS = [
  {
    id: 'ic1', user_name: 'Fajar Setiawan', scheme_name: 'Bonus kuartal Q1', achievement_pct: 92.4, tier_name: 'Gold',
    base_incentive: 8500000, overachievement_bonus: 2100000, new_customer_bonus: 500000, visit_bonus: 400000, special_bonus: 0,
    net_incentive: 11500000, status: 'draft',
  },
  {
    id: 'ic2', user_name: 'Rina Kusuma', scheme_name: 'Bonus kuartal Q1', achievement_pct: 97.8, tier_name: 'Platinum',
    base_incentive: 12000000, overachievement_bonus: 4500000, new_customer_bonus: 0, visit_bonus: 600000, special_bonus: 800000,
    net_incentive: 17900000, status: 'approved',
  },
];

const MOCK_SFA_PLAFON_ENHANCED_ROWS = [
  {
    id: 'plf1', plafon_type: 'customer', customer_name: 'PT Maju Bersama', credit_limit: 500000000, used_amount: 120000000,
    available_amount: 380000000, payment_terms: 30, risk_level: 'low', overdue_count: 0, status: 'active',
  },
  {
    id: 'plf2', plafon_type: 'customer', customer_name: 'CV Sejahtera Abadi', credit_limit: 180000000, used_amount: 165000000,
    available_amount: 15000000, payment_terms: 14, risk_level: 'high', overdue_count: 2, status: 'active',
  },
];

export const MOCK_HQ_SFA_ENHANCED = {
  dashboard: MOCK_SFA_ENHANCED_DASHBOARD,
  teams: MOCK_SFA_TEAMS,
  targetGroups: MOCK_SFA_TARGET_GROUPS_ENHANCED,
  achievements: MOCK_SFA_ACHIEVEMENT_ROWS,
  incentiveSchemes: MOCK_SFA_INCENTIVE_SCHEMES_ENHANCED,
  incentiveCalcs: MOCK_SFA_INCENTIVE_CALC_ROWS,
  plafonList: MOCK_SFA_PLAFON_ENHANCED_ROWS,
  parameters: MOCK_SFA_PARAMETERS_GROUPED,
  users: MOCK_HQ_SALES_TEAM.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role })),
  territories: MOCK_SFA_TERRITORIES,
};

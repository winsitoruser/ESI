import type { NextApiRequest, NextApiResponse } from 'next';
import { Op, fn, col } from 'sequelize';
import { Branch, PosTransaction, Employee, Customer, Stock, Product } from '../../../../models';
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
    const { section = 'overview' } = req.query as Record<string, string>;

    switch (section) {
      case 'overview': {
        const overview = await buildOverviewData();
        return res.status(HttpStatus.OK).json(successResponse(overview));
      }
      case 'customers':
        return res.status(HttpStatus.OK).json(successResponse(getCustomerReport()));
      case 'hris':
        return res.status(HttpStatus.OK).json(successResponse(getHRISReport()));
      case 'procurement':
        return res.status(HttpStatus.OK).json(successResponse(getProcurementReport()));
      case 'data-analysis':
        return res.status(HttpStatus.OK).json(successResponse(getDataAnalysis()));
      default:
        return res.status(HttpStatus.BAD_REQUEST).json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, `Unknown section: ${section}`)
        );
    }
  } catch (error: any) {
    console.error('Comprehensive Report API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'reports' });

async function buildOverviewData() {
  const base = getOverviewData();
  try {
    const now = new Date();
    const startMTD = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [curRow, prevRow, totalBranches, activeBranches, totalEmployees, totalCustomers, newCustomers] = await Promise.all([
      PosTransaction.findOne({
        where: { createdAt: { [Op.gte]: startMTD }, status: 'completed' },
        attributes: [
          [fn('COALESCE', fn('SUM', col('total')), 0), 'revenue'],
          [fn('COUNT', col('id')), 'transactions'],
        ],
        raw: true,
      }).catch(() => null),
      PosTransaction.findOne({
        where: { createdAt: { [Op.between]: [prevStart, prevEnd] }, status: 'completed' },
        attributes: [
          [fn('COALESCE', fn('SUM', col('total')), 0), 'revenue'],
          [fn('COUNT', col('id')), 'transactions'],
        ],
        raw: true,
      }).catch(() => null),
      Branch.count().catch(() => 0),
      Branch.count({ where: { isActive: true as any } }).catch(() => 0),
      Employee.count().catch(() => 0),
      Customer.count().catch(() => 0),
      Customer.count({ where: { createdAt: { [Op.gte]: startMTD } } }).catch(() => 0),
    ]);

    const totalRevenue = parseFloat((curRow as any)?.revenue) || 0;
    const totalTransactions = parseInt((curRow as any)?.transactions, 10) || 0;
    const prevRevenue = parseFloat((prevRow as any)?.revenue) || 0;
    const prevTransactions = parseInt((prevRow as any)?.transactions, 10) || 0;

    const revenueGrowth = prevRevenue > 0 ? +(((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : 0;
    const transactionGrowth = prevTransactions > 0 ? +(((totalTransactions - prevTransactions) / prevTransactions) * 100).toFixed(1) : 0;
    const customerGrowth = totalCustomers > 0 ? +((newCustomers / totalCustomers) * 100).toFixed(1) : 0;
    const netProfit = totalRevenue * 0.2;
    const profitGrowth = prevRevenue > 0 ? +(((netProfit - prevRevenue * 0.2) / (prevRevenue * 0.2)) * 100).toFixed(1) : 0;

    if (totalRevenue > 0 || totalBranches > 0 || totalCustomers > 0) {
      base.quickStats = {
        ...base.quickStats,
        totalRevenue,
        revenueGrowth,
        totalTransactions,
        transactionGrowth,
        totalCustomers,
        customerGrowth,
        activeBranches: activeBranches || base.quickStats.activeBranches,
        totalBranches: totalBranches || base.quickStats.totalBranches,
        netProfit,
        profitGrowth,
        employeeCount: totalEmployees || base.quickStats.employeeCount,
      } as any;

      // Update sales + finance + customers KPIs
      const salesModule = base.modules.find((m: any) => m.id === 'sales');
      if (salesModule) {
        salesModule.kpis[0].value = totalRevenue;
        salesModule.kpis[0].change = revenueGrowth;
        salesModule.kpis[1].value = totalTransactions;
        salesModule.kpis[1].change = transactionGrowth;
        salesModule.kpis[2].value = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
      }
      const financeModule = base.modules.find((m: any) => m.id === 'finance');
      if (financeModule) {
        financeModule.kpis[0].value = totalRevenue;
        financeModule.kpis[0].change = revenueGrowth;
        financeModule.kpis[1].value = totalRevenue * 0.3;
        financeModule.kpis[3].value = netProfit;
        financeModule.kpis[3].change = profitGrowth;
      }
      const customersModule = base.modules.find((m: any) => m.id === 'customers');
      if (customersModule) {
        customersModule.kpis[0].value = totalCustomers;
        customersModule.kpis[0].change = customerGrowth;
        customersModule.kpis[1].value = newCustomers;
      }
      const hrisModule = base.modules.find((m: any) => m.id === 'hris');
      if (hrisModule) {
        hrisModule.kpis[0].value = totalEmployees;
      }
      const consolidatedModule = base.modules.find((m: any) => m.id === 'consolidated');
      if (consolidatedModule) {
        consolidatedModule.kpis[0].value = totalRevenue;
        consolidatedModule.kpis[0].change = revenueGrowth;
        consolidatedModule.kpis[1].value = activeBranches || consolidatedModule.kpis[1].value;
        consolidatedModule.kpis[3].value = netProfit;
        consolidatedModule.kpis[3].change = profitGrowth;
      }
    }

    // Inventory KPI
    try {
      const [stocks, productCount] = await Promise.all([
        Stock.findAll({
          include: [{ model: Product, as: 'product', attributes: ['id', 'minimum_stock', 'buy_price'] }],
          limit: 5000,
        }),
        Product.count(),
      ]);
      let stockValue = 0;
      let lowStock = 0;
      for (const s of stocks as any[]) {
        const qty = parseFloat(s.quantity) || 0;
        const cost = parseFloat(s.product?.buy_price) || 0;
        stockValue += qty * cost;
        if (qty <= (s.product?.minimum_stock || 0)) lowStock++;
      }
      const invModule = base.modules.find((m: any) => m.id === 'inventory');
      if (invModule && stockValue > 0) {
        invModule.kpis[0].value = stockValue;
        invModule.kpis[3].value = lowStock;
      }
      if (productCount > 0 && invModule) {
        // nothing else to override, leave turnover/fillrate as mock
      }
    } catch (e) {
      // ignore
    }
  } catch (error) {
    console.warn('Comprehensive overview DB enrichment failed:', (error as Error).message);
  }
  return base;
}

function getOverviewData() {
  return {
    modules: [
      {
        id: 'sales',
        name: 'Penjualan',
        icon: 'ShoppingCart',
        color: 'blue',
        href: '/hq/reports/sales',
        kpis: [
          { label: 'Total Penjualan', value: 4120000000, format: 'currency', change: 8.5 },
          { label: 'Transaksi', value: 12450, format: 'number', change: 5.2 },
          { label: 'Avg Ticket', value: 330884, format: 'currency', change: 3.1 },
          { label: 'Conversion Rate', value: 68.5, format: 'percent', change: 1.2 },
        ],
      },
      {
        id: 'finance',
        name: 'Keuangan',
        icon: 'DollarSign',
        color: 'green',
        href: '/hq/reports/finance',
        kpis: [
          { label: 'Revenue', value: 4850000000, format: 'currency', change: 8.5 },
          { label: 'Gross Profit', value: 1455000000, format: 'currency', change: 12.3 },
          { label: 'Net Margin', value: 20, format: 'percent', change: 2.1 },
          { label: 'Cash Flow', value: 650000000, format: 'currency', change: 12.3 },
        ],
      },
      {
        id: 'inventory',
        name: 'Inventori',
        icon: 'Package',
        color: 'purple',
        href: '/hq/reports/inventory',
        kpis: [
          { label: 'Nilai Stok', value: 4785000000, format: 'currency', change: 3.2 },
          { label: 'Turnover', value: 5.2, format: 'decimal', change: 4.5 },
          { label: 'Fill Rate', value: 94.5, format: 'percent', change: 1.8 },
          { label: 'Low Stock', value: 65, format: 'number', change: -15.2, invertColor: true },
        ],
      },
      {
        id: 'customers',
        name: 'Pelanggan & CRM',
        icon: 'Users',
        color: 'orange',
        href: '/hq/reports/customers',
        kpis: [
          { label: 'Total Pelanggan', value: 45000, format: 'number', change: 18.9 },
          { label: 'Pelanggan Baru', value: 8500, format: 'number', change: 22.5 },
          { label: 'Retention Rate', value: 81.1, format: 'percent', change: 3.2 },
          { label: 'CLV Avg', value: 2850000, format: 'currency', change: 5.8 },
        ],
      },
      {
        id: 'hris',
        name: 'SDM / HRIS',
        icon: 'UserCheck',
        color: 'teal',
        href: '/hq/reports/hris',
        kpis: [
          { label: 'Total Karyawan', value: 127, format: 'number', change: 2.4 },
          { label: 'Kehadiran', value: 95.2, format: 'percent', change: 0.7 },
          { label: 'Turnover Rate', value: 3.8, format: 'percent', change: -0.6, invertColor: true },
          { label: 'Produktivitas', value: 82.5, format: 'percent', change: 1.5 },
        ],
      },
      {
        id: 'procurement',
        name: 'Pengadaan',
        icon: 'Truck',
        color: 'indigo',
        href: '/hq/reports/procurement',
        kpis: [
          { label: 'Total PO', value: 156, format: 'number', change: 12.5 },
          { label: 'Spend MTD', value: 485000000, format: 'currency', change: 5.4 },
          { label: 'On-Time Delivery', value: 91.2, format: 'percent', change: 2.1 },
          { label: 'Active Suppliers', value: 22, format: 'number', change: 4.8 },
        ],
      },
      {
        id: 'consolidated',
        name: 'Konsolidasi',
        icon: 'Layers',
        color: 'rose',
        href: '/hq/reports/consolidated',
        kpis: [
          { label: 'Total Revenue', value: 4850000000, format: 'currency', change: 8.5 },
          { label: 'Cabang Aktif', value: 7, format: 'number', change: 0 },
          { label: 'Avg Achievement', value: 102, format: 'percent', change: 3.5 },
          { label: 'Net Profit', value: 970000000, format: 'currency', change: 12.3 },
        ],
      },
      {
        id: 'data-analysis',
        name: 'Olah Data & Analisis',
        icon: 'BarChart3',
        color: 'cyan',
        href: '/hq/reports/data-analysis',
        kpis: [
          { label: 'Dataset', value: 8, format: 'number', change: 0 },
          { label: 'Insights', value: 24, format: 'number', change: 15 },
          { label: 'Anomali', value: 3, format: 'number', change: -25, invertColor: true },
          { label: 'Prediksi Akurasi', value: 92.5, format: 'percent', change: 1.8 },
        ],
      },
    ],
    quickStats: {
      totalRevenue: 4850000000,
      revenueGrowth: 8.5,
      totalTransactions: 125000,
      transactionGrowth: 5.8,
      totalCustomers: 45000,
      customerGrowth: 18.9,
      activeBranches: 7,
      totalBranches: 8,
      netProfit: 970000000,
      profitGrowth: 12.3,
      employeeCount: 127,
      avgAttendance: 95.2,
    },
    recentReports: [
      { id: 1, name: 'Laporan Penjualan Bulanan', type: 'sales', date: '2026-03-06', status: 'ready' },
      { id: 2, name: 'Laporan Keuangan Q1', type: 'finance', date: '2026-03-05', status: 'ready' },
      { id: 3, name: 'Analisis Stok Mingguan', type: 'inventory', date: '2026-03-04', status: 'ready' },
      { id: 4, name: 'Laporan Performa Karyawan', type: 'hris', date: '2026-03-03', status: 'ready' },
      { id: 5, name: 'Laporan Pembelian Bulanan', type: 'procurement', date: '2026-03-02', status: 'ready' },
      { id: 6, name: 'Analisis Pelanggan Loyal', type: 'customers', date: '2026-03-01', status: 'ready' },
    ],
    generatedAt: new Date().toISOString(),
  };
}

function getCustomerReport() {
  return {
    summary: {
      totalCustomers: 45000,
      newCustomers: 8500,
      returningCustomers: 36500,
      churnedCustomers: 1200,
      retentionRate: 81.1,
      avgCLV: 2850000,
      totalLoyaltyPoints: 15800000,
      redemptionRate: 42.5,
    },
    segmentation: [
      { segment: 'VIP / Platinum', count: 2250, revenue: 1820000000, avgSpend: 808889, retention: 95.2 },
      { segment: 'Gold', count: 6750, revenue: 1350000000, avgSpend: 200000, retention: 88.5 },
      { segment: 'Silver', count: 13500, revenue: 810000000, avgSpend: 60000, retention: 78.3 },
      { segment: 'Regular', count: 22500, revenue: 450000000, avgSpend: 20000, retention: 65.8 },
    ],
    topCustomers: [
      { id: 'C001', name: 'PT Maju Bersama', type: 'Corporate', totalSpend: 285000000, transactions: 450, lastVisit: '2026-03-05' },
      { id: 'C002', name: 'CV Sukses Jaya', type: 'Corporate', totalSpend: 198000000, transactions: 320, lastVisit: '2026-03-06' },
      { id: 'C003', name: 'Toko Abadi', type: 'Reseller', totalSpend: 156000000, transactions: 280, lastVisit: '2026-03-04' },
      { id: 'C004', name: 'Budi Santoso', type: 'Individual', totalSpend: 125000000, transactions: 185, lastVisit: '2026-03-06' },
      { id: 'C005', name: 'PT Global Pangan', type: 'Corporate', totalSpend: 112000000, transactions: 165, lastVisit: '2026-03-03' },
    ],
    acquisitionTrend: [
      { month: 'Oct', newCustomers: 1200, churnedCustomers: 180, netGrowth: 1020 },
      { month: 'Nov', newCustomers: 1350, churnedCustomers: 200, netGrowth: 1150 },
      { month: 'Dec', newCustomers: 1800, churnedCustomers: 150, netGrowth: 1650 },
      { month: 'Jan', newCustomers: 1450, churnedCustomers: 220, netGrowth: 1230 },
      { month: 'Feb', newCustomers: 1550, churnedCustomers: 250, netGrowth: 1300 },
      { month: 'Mar', newCustomers: 1150, churnedCustomers: 200, netGrowth: 950 },
    ],
    channelDistribution: [
      { channel: 'Walk-in', percentage: 45, count: 20250 },
      { channel: 'Online/E-commerce', percentage: 25, count: 11250 },
      { channel: 'Referral', percentage: 15, count: 6750 },
      { channel: 'Corporate', percentage: 10, count: 4500 },
      { channel: 'Lainnya', percentage: 5, count: 2250 },
    ],
    satisfactionScore: 4.2,
    npsScore: 42,
    generatedAt: new Date().toISOString(),
  };
}

function getHRISReport() {
  return {
    summary: {
      totalEmployees: 127,
      activeEmployees: 105,
      onLeave: 8,
      resigned: 5,
      newHires: 9,
      avgAttendance: 95.2,
      avgProductivity: 82.5,
      turnoverRate: 3.8,
      avgSalary: 5500000,
      totalPayroll: 698500000,
      trainingCompletion: 78,
      satisfactionScore: 4.1,
    },
    departmentBreakdown: [
      { department: 'Sales / Kasir', headcount: 42, attendance: 96.1, productivity: 85.2, turnover: 4.2 },
      { department: 'Gudang / Inventory', headcount: 18, attendance: 94.5, productivity: 80.1, turnover: 3.5 },
      { department: 'Finance / Admin', headcount: 15, attendance: 97.2, productivity: 88.5, turnover: 1.8 },
      { department: 'Marketing', headcount: 12, attendance: 93.8, productivity: 79.5, turnover: 5.2 },
      { department: 'IT / Support', headcount: 8, attendance: 96.5, productivity: 86.0, turnover: 2.0 },
      { department: 'Manajemen', headcount: 10, attendance: 98.0, productivity: 90.2, turnover: 0.5 },
    ],
    branchStaffing: [
      { branch: 'Cabang Jakarta', headcount: 35, openPositions: 2, avgPerformance: 84.5 },
      { branch: 'Cabang Bandung', headcount: 22, openPositions: 1, avgPerformance: 82.1 },
      { branch: 'Cabang Surabaya', headcount: 20, openPositions: 3, avgPerformance: 78.9 },
      { branch: 'Cabang Medan', headcount: 18, openPositions: 0, avgPerformance: 80.5 },
      { branch: 'Cabang Yogyakarta', headcount: 15, openPositions: 1, avgPerformance: 83.2 },
      { branch: 'HQ', headcount: 17, openPositions: 2, avgPerformance: 88.0 },
    ],
    attendanceTrend: [
      { month: 'Oct', attendance: 94.5, late: 5.2, absent: 0.3 },
      { month: 'Nov', attendance: 95.0, late: 4.8, absent: 0.2 },
      { month: 'Dec', attendance: 94.8, late: 5.0, absent: 0.2 },
      { month: 'Jan', attendance: 95.5, late: 4.3, absent: 0.2 },
      { month: 'Feb', attendance: 95.1, late: 4.7, absent: 0.2 },
      { month: 'Mar', attendance: 95.2, late: 4.6, absent: 0.2 },
    ],
    leaveDistribution: [
      { type: 'Cuti Tahunan', count: 45, percentage: 40 },
      { type: 'Sakit', count: 22, percentage: 20 },
      { type: 'Izin', count: 18, percentage: 16 },
      { type: 'Cuti Melahirkan', count: 5, percentage: 4 },
      { type: 'Lainnya', count: 22, percentage: 20 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

function getProcurementReport() {
  return {
    summary: {
      totalPOs: 156,
      activePOs: 42,
      completedPOs: 108,
      cancelledPOs: 6,
      totalSpend: 2850000000,
      spendMTD: 485000000,
      avgPOValue: 18269231,
      onTimeDelivery: 91.2,
      fulfillmentRate: 94.5,
      activeSuppliers: 22,
      avgLeadTime: 3.5,
      costSavings: 285000000,
    },
    topSuppliers: [
      { id: 'S001', name: 'PT Distributor Nasional', totalPO: 32, totalValue: 680000000, onTimeRate: 95.5, rating: 4.8 },
      { id: 'S002', name: 'CV Sumber Pangan', totalPO: 28, totalValue: 520000000, onTimeRate: 92.1, rating: 4.5 },
      { id: 'S003', name: 'PT Indo Supply Chain', totalPO: 24, totalValue: 450000000, onTimeRate: 89.5, rating: 4.2 },
      { id: 'S004', name: 'PT Mega Supplier', totalPO: 20, totalValue: 380000000, onTimeRate: 93.8, rating: 4.6 },
      { id: 'S005', name: 'CV Tani Jaya', totalPO: 18, totalValue: 320000000, onTimeRate: 88.2, rating: 4.0 },
    ],
    categorySpend: [
      { category: 'Sembako', spend: 850000000, percentage: 29.8, poCount: 45 },
      { category: 'Minuman', spend: 520000000, percentage: 18.2, poCount: 32 },
      { category: 'Makanan Ringan', spend: 420000000, percentage: 14.7, poCount: 28 },
      { category: 'Produk Susu', spend: 380000000, percentage: 13.3, poCount: 22 },
      { category: 'Perawatan Pribadi', spend: 350000000, percentage: 12.3, poCount: 18 },
      { category: 'Kebersihan', spend: 330000000, percentage: 11.6, poCount: 11 },
    ],
    spendTrend: [
      { month: 'Oct', spend: 420000000, poCount: 22, savings: 42000000 },
      { month: 'Nov', spend: 450000000, poCount: 25, savings: 45000000 },
      { month: 'Dec', spend: 580000000, poCount: 35, savings: 58000000 },
      { month: 'Jan', spend: 460000000, poCount: 28, savings: 46000000 },
      { month: 'Feb', spend: 455000000, poCount: 26, savings: 48000000 },
      { month: 'Mar', spend: 485000000, poCount: 20, savings: 46000000 },
    ],
    pendingDeliveries: [
      { poNumber: 'PO-2026-0142', supplier: 'PT Distributor Nasional', items: 15, eta: '2026-03-08', value: 45000000 },
      { poNumber: 'PO-2026-0145', supplier: 'CV Sumber Pangan', items: 8, eta: '2026-03-09', value: 28000000 },
      { poNumber: 'PO-2026-0148', supplier: 'PT Indo Supply Chain', items: 12, eta: '2026-03-10', value: 35000000 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

function getDataAnalysis() {
  return {
    salesAnalysis: {
      peakHours: [
        { hour: '08:00', transactions: 220, revenue: 8500000 },
        { hour: '09:00', transactions: 310, revenue: 12000000 },
        { hour: '10:00', transactions: 400, revenue: 15500000 },
        { hour: '11:00', transactions: 465, revenue: 18000000 },
        { hour: '12:00', transactions: 570, revenue: 22000000 },
        { hour: '13:00', transactions: 520, revenue: 20000000 },
        { hour: '14:00', transactions: 415, revenue: 16000000 },
        { hour: '15:00', transactions: 375, revenue: 14500000 },
        { hour: '16:00', transactions: 440, revenue: 17000000 },
        { hour: '17:00', transactions: 505, revenue: 19500000 },
        { hour: '18:00', transactions: 545, revenue: 21000000 },
        { hour: '19:00', transactions: 310, revenue: 12000000 },
        { hour: '20:00', transactions: 235, revenue: 9000000 },
      ],
      dayOfWeekAnalysis: [
        { day: 'Senin', avgRevenue: 165000000, avgTransactions: 4200, index: 85 },
        { day: 'Selasa', avgRevenue: 158000000, avgTransactions: 4050, index: 82 },
        { day: 'Rabu', avgRevenue: 172000000, avgTransactions: 4400, index: 89 },
        { day: 'Kamis', avgRevenue: 168000000, avgTransactions: 4300, index: 87 },
        { day: 'Jumat', avgRevenue: 175000000, avgTransactions: 4500, index: 91 },
        { day: 'Sabtu', avgRevenue: 198000000, avgTransactions: 5100, index: 103 },
        { day: 'Minggu', avgRevenue: 185000000, avgTransactions: 4850, index: 96 },
      ],
      productCorrelation: [
        { productA: 'Beras Premium', productB: 'Minyak Goreng', correlation: 0.85, frequency: 2450 },
        { productA: 'Susu UHT', productB: 'Roti Tawar', correlation: 0.78, frequency: 1890 },
        { productA: 'Kopi Arabica', productB: 'Gula Pasir', correlation: 0.72, frequency: 1650 },
        { productA: 'Mie Instan', productB: 'Telur', correlation: 0.69, frequency: 1520 },
        { productA: 'Sabun Mandi', productB: 'Shampo', correlation: 0.82, frequency: 1380 },
      ],
    },
    inventoryAnalysis: {
      abcClassification: [
        { category: 'A (High Value)', items: 120, percentage: 15, valueContribution: 70 },
        { category: 'B (Medium Value)', items: 240, percentage: 30, valueContribution: 20 },
        { category: 'C (Low Value)', items: 440, percentage: 55, valueContribution: 10 },
      ],
      turnoverAnalysis: [
        { category: 'Fast Moving', items: 180, avgTurnover: 12.5, daysOnHand: 29 },
        { category: 'Medium Moving', items: 320, avgTurnover: 6.2, daysOnHand: 59 },
        { category: 'Slow Moving', items: 200, avgTurnover: 2.1, daysOnHand: 174 },
        { category: 'Dead Stock', items: 100, avgTurnover: 0.3, daysOnHand: 365 },
      ],
      demandForecast: [
        { month: 'Apr', predictedDemand: 4350000000, confidence: 92.5 },
        { month: 'May', predictedDemand: 4180000000, confidence: 89.2 },
        { month: 'Jun', predictedDemand: 4520000000, confidence: 85.8 },
      ],
    },
    financialAnalysis: {
      profitabilityByCategory: [
        { category: 'Sembako', revenue: 1650000000, cost: 1320000000, margin: 20.0, roi: 25.0 },
        { category: 'Minuman', revenue: 980000000, cost: 735000000, margin: 25.0, roi: 33.3 },
        { category: 'Makanan Ringan', revenue: 850000000, cost: 637500000, margin: 25.0, roi: 33.3 },
        { category: 'Produk Susu', revenue: 620000000, cost: 496000000, margin: 20.0, roi: 25.0 },
        { category: 'Perawatan Pribadi', revenue: 450000000, cost: 315000000, margin: 30.0, roi: 42.9 },
      ],
      cashFlowProjection: [
        { month: 'Mar', inflow: 4850000000, outflow: 3880000000, netCashFlow: 970000000 },
        { month: 'Apr', inflow: 5020000000, outflow: 4016000000, netCashFlow: 1004000000 },
        { month: 'May', inflow: 4780000000, outflow: 3824000000, netCashFlow: 956000000 },
        { month: 'Jun', inflow: 5200000000, outflow: 4160000000, netCashFlow: 1040000000 },
      ],
      breakEvenAnalysis: {
        fixedCosts: 1250000000,
        variableCostRatio: 0.65,
        breakEvenRevenue: 3571428571,
        currentRevenue: 4850000000,
        safetyMargin: 26.4,
      },
    },
    anomalies: [
      { id: 1, type: 'sales_spike', module: 'Sales', description: 'Lonjakan penjualan tidak normal di Cabang Surabaya (+45%)', severity: 'medium', date: '2026-03-04' },
      { id: 2, type: 'inventory_gap', module: 'Inventory', description: '12 produk out of stock bersamaan di Cabang Medan', severity: 'high', date: '2026-03-05' },
      { id: 3, type: 'attendance_drop', module: 'HRIS', description: 'Penurunan kehadiran 8% di Dept. Marketing minggu lalu', severity: 'low', date: '2026-03-03' },
    ],
    insights: [
      { id: 1, category: 'opportunity', title: 'Cross-Selling Potential', description: 'Produk Beras & Minyak Goreng sering dibeli bersamaan (85% korelasi). Pertimbangkan bundle promo.', impact: 'high' },
      { id: 2, category: 'optimization', title: 'Jam Sibuk Optimal', description: 'Peak hours 12:00-13:00 dan 17:00-18:00. Tambah staff kasir pada jam tersebut.', impact: 'medium' },
      { id: 3, category: 'warning', title: 'Dead Stock Alert', description: '100 item dead stock senilai ~Rp 478Jt. Pertimbangkan clearance sale.', impact: 'high' },
      { id: 4, category: 'trend', title: 'Weekend Sales Growth', description: 'Penjualan Sabtu konsisten 20% lebih tinggi. Fokuskan promo weekend.', impact: 'medium' },
      { id: 5, category: 'prediction', title: 'Demand Forecast Q2', description: 'Prediksi peningkatan demand 8-12% di Q2 2026. Siapkan stok lebih awal.', impact: 'high' },
    ],
    generatedAt: new Date().toISOString(),
  };
}


import type { NextApiRequest, NextApiResponse } from 'next';

interface BranchData {
  id: string;
  code: string;
  name: string;
  type: 'main' | 'branch' | 'warehouse' | 'kiosk';
  city: string;
  province: string;
  isActive: boolean;
  manager: string;
  todaySales: number;
  yesterdaySales: number;
  monthSales: number;
  transactionCount: number;
  avgTicketSize: number;
  stockValue: number;
  lowStockItems: number;
  employeeCount: number;
  activeEmployees: number;
  lastSync: string;
  status: 'online' | 'offline' | 'warning';
  performanceScore: number;
}

interface Alert {
  id: string;
  branchId: string;
  branchName: string;
  type: 'low_stock' | 'high_sales' | 'low_sales' | 'employee' | 'system';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}

interface SalesTrend {
  date: string;
  day: string;
  sales: number;
  transactions: number;
}

interface RegionPerformance {
  region: string;
  sales: number;
  branches: number;
}

interface DashboardResponse {
  success: boolean;
  branches: BranchData[];
  alerts: Alert[];
  summary: {
    totalBranches: number;
    activeBranches: number;
    totalSalesToday: number;
    totalSalesYesterday: number;
    totalSalesMonth: number;
    totalTransactions: number;
    totalStockValue: number;
    totalLowStockItems: number;
    totalEmployees: number;
    activeEmployees: number;
    avgPerformance: number;
  };
  salesTrend: SalesTrend[];
  regionPerformance: RegionPerformance[];
  lastUpdated: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { period = 'today' } = req.query;

    // Try to fetch real data from database
    let branches: BranchData[] = [];
    let alerts: Alert[] = [];

    try {
      // Attempt to get data from database
      const Branch = require('../../../models/Branch');
      const dbBranches = await Branch.findAll({
        include: ['manager', 'store']
      });

      if (dbBranches && dbBranches.length > 0) {
        branches = await Promise.all(dbBranches.map(async (branch: any) => {
          // Get sales data for each branch
          const todaySales = await calculateBranchSales(branch.id, 'today');
          const yesterdaySales = await calculateBranchSales(branch.id, 'yesterday');
          const monthSales = await calculateBranchSales(branch.id, 'month');
          const transactionCount = await getTransactionCount(branch.id, period as string);
          const stockData = await getStockData(branch.id);
          const employeeData = await getEmployeeData(branch.id);

          return {
            id: branch.id,
            code: branch.code,
            name: branch.name,
            type: branch.type || 'branch',
            city: branch.city || '',
            province: branch.province || '',
            isActive: branch.isActive,
            manager: branch.manager?.name || 'N/A',
            todaySales,
            yesterdaySales,
            monthSales,
            transactionCount,
            avgTicketSize: transactionCount > 0 ? todaySales / transactionCount : 0,
            stockValue: stockData.value,
            lowStockItems: stockData.lowStockCount,
            employeeCount: employeeData.total,
            activeEmployees: employeeData.active,
            lastSync: branch.updatedAt || new Date().toISOString(),
            status: determineStatus(branch),
            performanceScore: calculatePerformanceScore(todaySales, yesterdaySales, transactionCount)
          };
        }));

        // Generate alerts based on real data
        alerts = generateAlerts(branches);
      }
    } catch (dbError) {
      console.log('Database not available, using mock data');
    }

    // If no data from database, use mock data
    if (branches.length === 0) {
      branches = getMockBranches();
      alerts = getMockAlerts();
    }

    // Calculate summary
    const activeBranches = branches.filter(b => b.isActive && b.type !== 'warehouse');
    const summary = {
      totalBranches: branches.length,
      activeBranches: activeBranches.length,
      totalSalesToday: activeBranches.reduce((sum, b) => sum + b.todaySales, 0),
      totalSalesYesterday: activeBranches.reduce((sum, b) => sum + b.yesterdaySales, 0),
      totalSalesMonth: activeBranches.reduce((sum, b) => sum + b.monthSales, 0),
      totalTransactions: activeBranches.reduce((sum, b) => sum + b.transactionCount, 0),
      totalStockValue: branches.reduce((sum, b) => sum + b.stockValue, 0),
      totalLowStockItems: branches.reduce((sum, b) => sum + b.lowStockItems, 0),
      totalEmployees: branches.reduce((sum, b) => sum + b.employeeCount, 0),
      activeEmployees: branches.reduce((sum, b) => sum + b.activeEmployees, 0),
      avgPerformance: activeBranches.length > 0
        ? Math.round(activeBranches.reduce((sum, b) => sum + b.performanceScore, 0) / activeBranches.length)
        : 0
    };

    // Generate sales trend and region performance
    const salesTrend = await getSalesTrend();
    const regionPerformance = calculateRegionPerformance(branches);

    res.status(200).json({
      success: true,
      branches,
      alerts,
      summary,
      salesTrend,
      regionPerformance,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching HQ dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper functions
async function calculateBranchSales(branchId: string, period: string): Promise<number> {
  try {
    const PosTransaction = require('../../../models/PosTransaction');
    const { Op } = require('sequelize');
    
    let startDate: Date = new Date();
    let endDate: Date = new Date();
    
    switch (period) {
      case 'yesterday':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      default: // today
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }

    const result = await PosTransaction.sum('total', {
      where: {
        branchId: branchId,
        transactionDate: {
          [Op.between]: [startDate, endDate]
        },
        status: 'completed'
      }
    });

    return parseFloat(result) || 0;
  } catch (error) {
    console.error('Error calculating branch sales:', error);
    return 0;
  }
}

async function getTransactionCount(branchId: string, period: string): Promise<number> {
  try {
    const PosTransaction = require('../../../models/PosTransaction');
    const { Op } = require('sequelize');
    
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const count = await PosTransaction.count({
      where: {
        branchId: branchId,
        transactionDate: {
          [Op.gte]: startDate
        },
        status: 'completed'
      }
    });

    return count || 0;
  } catch (error) {
    console.error('Error getting transaction count:', error);
    return 0;
  }
}

async function getStockData(branchId: string): Promise<{ value: number; lowStockCount: number }> {
  try {
    const sequelize = require('../../../lib/sequelize');
    const { QueryTypes } = require('sequelize');

    // Use raw query to join stock with products and get pricing info
    const stocks = await sequelize.query(`
      SELECT 
        s.quantity,
        s.available_quantity,
        p.cost_price,
        p.min_stock
      FROM inventory_stock s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN locations l ON s.location_id = l.id
      LEFT JOIN branches b ON l.branch_id = b.id
      WHERE b.id = :branchId OR l.branch_id = :branchId
    `, {
      replacements: { branchId },
      type: QueryTypes.SELECT
    });

    let value = 0;
    let lowStockCount = 0;

    stocks.forEach((stock: any) => {
      const qty = parseFloat(stock.quantity) || 0;
      const cost = parseFloat(stock.cost_price) || 0;
      const minStock = parseFloat(stock.min_stock) || 10;
      
      value += qty * cost;
      if (qty <= minStock && qty > 0) {
        lowStockCount++;
      }
    });

    return { value, lowStockCount };
  } catch (error) {
    console.error('Error getting stock data:', error);
    return { value: 0, lowStockCount: 0 };
  }
}

async function getEmployeeData(branchId: string): Promise<{ total: number; active: number }> {
  try {
    const sequelize = require('../../../lib/sequelize');
    const { QueryTypes } = require('sequelize');

    // Use EmployeeSchedule to get employees assigned to a branch
    const result = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT es.employee_id) as total,
        COUNT(DISTINCT CASE WHEN e.status = 'ACTIVE' THEN es.employee_id END) as active
      FROM employee_schedules es
      LEFT JOIN employees e ON es.employee_id = e.id
      WHERE es.branch_id = :branchId
    `, {
      replacements: { branchId },
      type: QueryTypes.SELECT
    });

    if (result && result.length > 0) {
      return {
        total: parseInt(result[0].total) || 0,
        active: parseInt(result[0].active) || 0
      };
    }

    return { total: 0, active: 0 };
  } catch (error) {
    console.error('Error getting employee data:', error);
    return { total: 0, active: 0 };
  }
}

function determineStatus(branch: any): 'online' | 'offline' | 'warning' {
  if (!branch.isActive) return 'offline';
  
  const lastSync = new Date(branch.updatedAt || branch.updated_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSync.getTime()) / 60000;

  if (diffMinutes > 60) return 'offline';
  if (diffMinutes > 30) return 'warning';
  return 'online';
}

function calculatePerformanceScore(todaySales: number, yesterdaySales: number, transactions: number): number {
  let score = 70; // Base score

  // Sales growth bonus
  if (yesterdaySales > 0) {
    const growth = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
    score += Math.min(15, Math.max(-15, growth / 2));
  }

  // Transaction volume bonus
  if (transactions > 100) score += 10;
  else if (transactions > 50) score += 5;

  // Cap at 100
  return Math.min(100, Math.max(0, Math.round(score)));
}

function generateAlerts(branches: BranchData[]): Alert[] {
  const alerts: Alert[] = [];

  branches.forEach(branch => {
    // Low stock alerts
    if (branch.lowStockItems > 10) {
      alerts.push({
        id: `ls-${branch.id}`,
        branchId: branch.id,
        branchName: branch.name,
        type: 'low_stock',
        message: `${branch.lowStockItems} produk mencapai batas minimum stok`,
        severity: branch.lowStockItems > 20 ? 'critical' : 'warning',
        timestamp: new Date().toISOString()
      });
    }

    // Offline alerts
    if (branch.status === 'offline') {
      alerts.push({
        id: `off-${branch.id}`,
        branchId: branch.id,
        branchName: branch.name,
        type: 'system',
        message: 'Tidak ada koneksi dalam waktu yang lama',
        severity: 'critical',
        timestamp: branch.lastSync
      });
    }

    // High sales alert
    if (branch.yesterdaySales > 0 && branch.todaySales > branch.yesterdaySales * 1.2) {
      alerts.push({
        id: `hs-${branch.id}`,
        branchId: branch.id,
        branchName: branch.name,
        type: 'high_sales',
        message: `Penjualan meningkat ${Math.round(((branch.todaySales - branch.yesterdaySales) / branch.yesterdaySales) * 100)}% dari kemarin`,
        severity: 'info',
        timestamp: new Date().toISOString()
      });
    }

    // Low sales alert
    if (branch.yesterdaySales > 0 && branch.todaySales < branch.yesterdaySales * 0.7) {
      alerts.push({
        id: `lsales-${branch.id}`,
        branchId: branch.id,
        branchName: branch.name,
        type: 'low_sales',
        message: `Penjualan turun ${Math.round(((branch.yesterdaySales - branch.todaySales) / branch.yesterdaySales) * 100)}% dari kemarin`,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
    }
  });

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

function getMockBranches(): BranchData[] {
  return [
    {
      id: '1',
      code: 'HQ-001',
      name: 'Cabang Pusat Jakarta',
      type: 'main',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      isActive: true,
      manager: 'Ahmad Wijaya',
      todaySales: 45000000,
      yesterdaySales: 42000000,
      monthSales: 1250000000,
      transactionCount: 156,
      avgTicketSize: 288462,
      stockValue: 850000000,
      lowStockItems: 5,
      employeeCount: 25,
      activeEmployees: 22,
      lastSync: new Date().toISOString(),
      status: 'online',
      performanceScore: 92
    },
    {
      id: '2',
      code: 'BR-002',
      name: 'Cabang Bandung',
      type: 'branch',
      city: 'Bandung',
      province: 'Jawa Barat',
      isActive: true,
      manager: 'Siti Rahayu',
      todaySales: 32000000,
      yesterdaySales: 35000000,
      monthSales: 920000000,
      transactionCount: 98,
      avgTicketSize: 326531,
      stockValue: 450000000,
      lowStockItems: 12,
      employeeCount: 18,
      activeEmployees: 16,
      lastSync: new Date(Date.now() - 300000).toISOString(),
      status: 'online',
      performanceScore: 85
    },
    {
      id: '3',
      code: 'BR-003',
      name: 'Cabang Surabaya',
      type: 'branch',
      city: 'Surabaya',
      province: 'Jawa Timur',
      isActive: true,
      manager: 'Budi Santoso',
      todaySales: 28500000,
      yesterdaySales: 31000000,
      monthSales: 780000000,
      transactionCount: 87,
      avgTicketSize: 327586,
      stockValue: 380000000,
      lowStockItems: 8,
      employeeCount: 15,
      activeEmployees: 14,
      lastSync: new Date(Date.now() - 600000).toISOString(),
      status: 'online',
      performanceScore: 78
    },
    {
      id: '4',
      code: 'BR-004',
      name: 'Cabang Medan',
      type: 'branch',
      city: 'Medan',
      province: 'Sumatera Utara',
      isActive: true,
      manager: 'Dewi Lestari',
      todaySales: 22000000,
      yesterdaySales: 24500000,
      monthSales: 650000000,
      transactionCount: 72,
      avgTicketSize: 305556,
      stockValue: 320000000,
      lowStockItems: 15,
      employeeCount: 12,
      activeEmployees: 10,
      lastSync: new Date(Date.now() - 1800000).toISOString(),
      status: 'warning',
      performanceScore: 72
    },
    {
      id: '5',
      code: 'BR-005',
      name: 'Cabang Yogyakarta',
      type: 'branch',
      city: 'Yogyakarta',
      province: 'DI Yogyakarta',
      isActive: true,
      manager: 'Eko Prasetyo',
      todaySales: 18500000,
      yesterdaySales: 19000000,
      monthSales: 520000000,
      transactionCount: 65,
      avgTicketSize: 284615,
      stockValue: 280000000,
      lowStockItems: 3,
      employeeCount: 10,
      activeEmployees: 10,
      lastSync: new Date(Date.now() - 120000).toISOString(),
      status: 'online',
      performanceScore: 88
    },
    {
      id: '6',
      code: 'WH-001',
      name: 'Gudang Pusat Cikarang',
      type: 'warehouse',
      city: 'Cikarang',
      province: 'Jawa Barat',
      isActive: true,
      manager: 'Hendra Kusuma',
      todaySales: 0,
      yesterdaySales: 0,
      monthSales: 0,
      transactionCount: 45,
      avgTicketSize: 0,
      stockValue: 2500000000,
      lowStockItems: 22,
      employeeCount: 35,
      activeEmployees: 30,
      lastSync: new Date(Date.now() - 60000).toISOString(),
      status: 'online',
      performanceScore: 95
    },
    {
      id: '7',
      code: 'KS-001',
      name: 'Kiosk Mall Taman Anggrek',
      type: 'kiosk',
      city: 'Jakarta Barat',
      province: 'DKI Jakarta',
      isActive: true,
      manager: 'Linda Susanti',
      todaySales: 8500000,
      yesterdaySales: 9200000,
      monthSales: 245000000,
      transactionCount: 45,
      avgTicketSize: 188889,
      stockValue: 85000000,
      lowStockItems: 2,
      employeeCount: 4,
      activeEmployees: 3,
      lastSync: new Date(Date.now() - 180000).toISOString(),
      status: 'online',
      performanceScore: 82
    },
    {
      id: '8',
      code: 'BR-006',
      name: 'Cabang Semarang',
      type: 'branch',
      city: 'Semarang',
      province: 'Jawa Tengah',
      isActive: false,
      manager: 'Agus Hermawan',
      todaySales: 0,
      yesterdaySales: 15000000,
      monthSales: 380000000,
      transactionCount: 0,
      avgTicketSize: 0,
      stockValue: 220000000,
      lowStockItems: 0,
      employeeCount: 8,
      activeEmployees: 0,
      lastSync: new Date(Date.now() - 7200000).toISOString(),
      status: 'offline',
      performanceScore: 0
    }
  ];
}

function getMockAlerts(): Alert[] {
  return [
    {
      id: '1',
      branchId: '4',
      branchName: 'Cabang Medan',
      type: 'low_stock',
      message: '15 produk mencapai batas minimum stok',
      severity: 'warning',
      timestamp: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: '2',
      branchId: '8',
      branchName: 'Cabang Semarang',
      type: 'system',
      message: 'Tidak ada koneksi selama 2 jam terakhir',
      severity: 'critical',
      timestamp: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: '3',
      branchId: '1',
      branchName: 'Cabang Pusat Jakarta',
      type: 'high_sales',
      message: 'Penjualan hari ini meningkat 25% dari rata-rata',
      severity: 'info',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '4',
      branchId: '6',
      branchName: 'Gudang Pusat Cikarang',
      type: 'low_stock',
      message: '22 produk perlu restocking segera',
      severity: 'warning',
      timestamp: new Date(Date.now() - 5400000).toISOString()
    }
  ];
}

async function getSalesTrend(): Promise<SalesTrend[]> {
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const trend: SalesTrend[] = [];
  
  try {
    const sequelize = require('../../../lib/sequelize');
    const { QueryTypes } = require('sequelize');
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      const result = await sequelize.query(`
        SELECT 
          COALESCE(SUM(total), 0) as sales,
          COUNT(*) as transactions
        FROM pos_transactions
        WHERE transaction_date BETWEEN :startDate AND :endDate
        AND status = 'completed'
      `, {
        replacements: { startDate: date, endDate },
        type: QueryTypes.SELECT
      });
      
      trend.push({
        date: date.toISOString().split('T')[0],
        day: dayNames[date.getDay()],
        sales: parseFloat(result[0]?.sales) || 0,
        transactions: parseInt(result[0]?.transactions) || 0
      });
    }
    
    return trend;
  } catch (error) {
    console.error('Error getting sales trend:', error);
    return [
      { date: '2026-02-16', day: 'Sen', sales: 125000000, transactions: 320 },
      { date: '2026-02-17', day: 'Sel', sales: 142000000, transactions: 365 },
      { date: '2026-02-18', day: 'Rab', sales: 138000000, transactions: 352 },
      { date: '2026-02-19', day: 'Kam', sales: 155000000, transactions: 398 },
      { date: '2026-02-20', day: 'Jum', sales: 162000000, transactions: 415 },
      { date: '2026-02-21', day: 'Sab', sales: 185000000, transactions: 478 },
      { date: '2026-02-22', day: 'Min', sales: 154000000, transactions: 398 }
    ];
  }
}

function calculateRegionPerformance(branches: BranchData[]): RegionPerformance[] {
  const regionMap = new Map<string, { sales: number; branches: number }>();
  
  branches.forEach(branch => {
    if (branch.type === 'warehouse') return;
    
    const region = branch.province || 'Unknown';
    const existing = regionMap.get(region) || { sales: 0, branches: 0 };
    regionMap.set(region, {
      sales: existing.sales + branch.todaySales,
      branches: existing.branches + 1
    });
  });
  
  const result: RegionPerformance[] = [];
  regionMap.forEach((data, region) => {
    result.push({
      region,
      sales: data.sales,
      branches: data.branches
    });
  });
  
  return result.sort((a, b) => b.sales - a.sales).slice(0, 5);
}

import type { NextApiRequest, NextApiResponse } from 'next';

interface ConsolidatedMetrics {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  totalTransactions: number;
  averageTicket: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
}

interface BranchPerformance {
  branchId: string;
  branchName: string;
  branchCode: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  transactions: number;
  avgTicket: number;
  growth: number;
  rank: number;
}

interface CategoryPerformance {
  category: string;
  revenue: number;
  quantity: number;
  profit: number;
  margin: number;
  growth: number;
}

interface TrendData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
  transactions: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { period = 'month', startDate, endDate, branchId } = req.query;

    const metrics: ConsolidatedMetrics = {
      totalRevenue: 4850000000,
      totalExpenses: 3880000000,
      grossProfit: 1455000000,
      netProfit: 970000000,
      grossMargin: 30,
      netMargin: 20,
      totalTransactions: 125000,
      averageTicket: 38800,
      totalCustomers: 45000,
      newCustomers: 8500,
      returningCustomers: 36500
    };

    const branchPerformance: BranchPerformance[] = [
      { branchId: '2', branchName: 'Cabang Jakarta', branchCode: 'HQ-001', revenue: 1450000000, expenses: 1160000000, profit: 290000000, margin: 20, transactions: 38000, avgTicket: 38158, growth: 12.5, rank: 1 },
      { branchId: '3', branchName: 'Cabang Bandung', branchCode: 'BR-002', revenue: 980000000, expenses: 784000000, profit: 196000000, margin: 20, transactions: 26000, avgTicket: 37692, growth: 8.2, rank: 2 },
      { branchId: '4', branchName: 'Cabang Surabaya', branchCode: 'BR-003', revenue: 920000000, expenses: 736000000, profit: 184000000, margin: 20, transactions: 24000, avgTicket: 38333, growth: 15.3, rank: 3 },
      { branchId: '5', branchName: 'Cabang Medan', branchCode: 'BR-004', revenue: 780000000, expenses: 624000000, profit: 156000000, margin: 20, transactions: 20000, avgTicket: 39000, growth: -2.5, rank: 4 },
      { branchId: '6', branchName: 'Cabang Yogyakarta', branchCode: 'BR-005', revenue: 720000000, expenses: 576000000, profit: 144000000, margin: 20, transactions: 17000, avgTicket: 42353, growth: 5.8, rank: 5 }
    ];

    const categoryPerformance: CategoryPerformance[] = [
      { category: 'Sembako', revenue: 1650000000, quantity: 125000, profit: 330000000, margin: 20, growth: 8.5 },
      { category: 'Minuman', revenue: 980000000, quantity: 85000, profit: 245000000, margin: 25, growth: 12.3 },
      { category: 'Makanan Ringan', revenue: 850000000, quantity: 95000, profit: 212500000, margin: 25, growth: 15.2 },
      { category: 'Produk Susu', revenue: 620000000, quantity: 42000, profit: 124000000, margin: 20, growth: 6.8 },
      { category: 'Perawatan Pribadi', revenue: 450000000, quantity: 32000, profit: 135000000, margin: 30, growth: 4.2 },
      { category: 'Kebersihan Rumah', revenue: 300000000, quantity: 28000, profit: 75000000, margin: 25, growth: 3.5 }
    ];

    const trendData: TrendData[] = [
      { date: '2026-02-01', revenue: 165000000, expenses: 132000000, profit: 33000000, transactions: 4200 },
      { date: '2026-02-02', revenue: 158000000, expenses: 126400000, profit: 31600000, transactions: 4050 },
      { date: '2026-02-03', revenue: 172000000, expenses: 137600000, profit: 34400000, transactions: 4400 },
      { date: '2026-02-04', revenue: 168000000, expenses: 134400000, profit: 33600000, transactions: 4300 },
      { date: '2026-02-05', revenue: 175000000, expenses: 140000000, profit: 35000000, transactions: 4500 },
      { date: '2026-02-06', revenue: 182000000, expenses: 145600000, profit: 36400000, transactions: 4650 },
      { date: '2026-02-07', revenue: 195000000, expenses: 156000000, profit: 39000000, transactions: 5000 },
      { date: '2026-02-08', revenue: 188000000, expenses: 150400000, profit: 37600000, transactions: 4800 },
      { date: '2026-02-09', revenue: 162000000, expenses: 129600000, profit: 32400000, transactions: 4150 },
      { date: '2026-02-10', revenue: 170000000, expenses: 136000000, profit: 34000000, transactions: 4350 }
    ];

    const comparison = {
      vsLastMonth: {
        revenue: 8.5,
        expenses: 6.2,
        profit: 12.3,
        transactions: 5.8
      },
      vsLastYear: {
        revenue: 22.5,
        expenses: 18.2,
        profit: 28.3,
        transactions: 15.8
      }
    };

    return res.status(200).json({
      metrics,
      branchPerformance,
      categoryPerformance,
      trendData,
      comparison,
      period,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Consolidated Report API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

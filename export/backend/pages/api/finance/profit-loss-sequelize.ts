import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * Finance Profit & Loss Report API - Implementasi Sequelize
 * Menyediakan data laporan laba rugi
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verifikasi autentikasi
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Pastikan request memiliki tenantId (dari session)
  const tenantId = (session?.user as any)?.tenantId;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }
  
  try {
    // Import adapter functions
    const { getProfitLossReport } = require('../../../../server/sequelize/adapters/finance-adapter');
    
    // Handle berdasarkan HTTP method
    if (req.method === 'GET') {
      // Extract query parameters
      const { 
        period = 'monthly',  // monthly, quarterly, yearly
        year = new Date().getFullYear(),
        month,
        quarter,
        branchId = 'all'
      } = req.query;
      
      // Format parameters
      const params = {
        period: period as string,
        year: parseInt(year as string),
        month: month ? parseInt(month as string) : undefined,
        quarter: quarter ? parseInt(quarter as string) : undefined,
        branchId: branchId as string
      };
      
      // Get profit-loss report data
      const reportData = await getProfitLossReport(tenantId, params);
      
      return res.status(200).json({
        success: true,
        data: reportData,
        theme: {
          primary: '#ef4444',    // Merah
          secondary: '#f97316',  // Oranye
          gradient: 'from-red-600 to-orange-500',
          income: '#10b981',     // Hijau untuk income
          expense: '#ef4444'     // Merah untuk expense
        }
      });
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} Not Allowed`
      });
    }
  } catch (error: any) {
    console.error('Error in finance profit-loss report API:', error);
    
    // Fallback ke mock data jika database gagal
    return res.status(200).json({
      success: true,
      data: generateMockData(),
      isLive: false,
      message: 'Using mock data due to database error',
      theme: {
        primary: '#ef4444',    // Merah
        secondary: '#f97316',  // Oranye
        gradient: 'from-red-600 to-orange-500',
        income: '#10b981',     // Hijau untuk income
        expense: '#ef4444'     // Merah untuk expense
      }
    });
  }
}

/**
 * Generate mock data untuk fallback
 */
function generateMockData() {
  // Income categories
  const incomeCategories = [
    { id: 'INC001', name: 'Penjualan Obat Resep', amount: 452000000 },
    { id: 'INC002', name: 'Penjualan OTC', amount: 318000000 },
    { id: 'INC003', name: 'Jasa Konsultasi', amount: 115000000 },
    { id: 'INC004', name: 'Layanan Klinik', amount: 95000000 },
    { id: 'INC005', name: 'Penjualan Alat Kesehatan', amount: 83000000 }
  ];
  
  // Expense categories
  const expenseCategories = [
    { id: 'EXP001', name: 'Pembelian Stok', amount: 385000000 },
    { id: 'EXP002', name: 'Gaji Karyawan', amount: 210000000 },
    { id: 'EXP003', name: 'Biaya Operasional', amount: 95000000 },
    { id: 'EXP004', name: 'Sewa Bangunan', amount: 75000000 },
    { id: 'EXP005', name: 'Peralatan & Maintenance', amount: 42000000 },
    { id: 'EXP006', name: 'Biaya Pemasaran', amount: 35000000 },
    { id: 'EXP007', name: 'Utilitas', amount: 28000000 },
    { id: 'EXP008', name: 'Lain-lain', amount: 18500000 }
  ];
  
  // Calculate totals
  const totalIncome = incomeCategories.reduce((sum, category) => sum + category.amount, 0);
  const totalExpense = expenseCategories.reduce((sum, category) => sum + category.amount, 0);
  const grossProfit = totalIncome - totalExpense;
  const profitMargin = Math.round((grossProfit / totalIncome) * 100);
  
  // Monthly breakdown for the year
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const monthlyData = months.map((month, index) => {
    // Simulate seasonal variations
    const seasonMultiplier = 
      index < 3 ? 0.9 :  // Q1: slightly lower
      index < 6 ? 1.1 :  // Q2: slightly higher
      index < 9 ? 1.2 :  // Q3: higher
      1.0;               // Q4: normal
    
    // Income is about 1/12 of total with some variation
    const income = Math.round((totalIncome / 12) * seasonMultiplier * (0.9 + Math.random() * 0.2));
    
    // Expense is about 1/12 of total with less variation
    const expense = Math.round((totalExpense / 12) * seasonMultiplier * (0.95 + Math.random() * 0.1));
    
    // Calculate profit
    const profit = income - expense;
    const margin = Math.round((profit / income) * 100);
    
    return {
      month,
      monthIndex: index,
      income,
      expense,
      profit,
      margin
    };
  });
  
  // Quarterly breakdown
  const quarters = [
    {
      quarter: 'Q1',
      income: monthlyData.slice(0, 3).reduce((sum, month) => sum + month.income, 0),
      expense: monthlyData.slice(0, 3).reduce((sum, month) => sum + month.expense, 0)
    },
    {
      quarter: 'Q2',
      income: monthlyData.slice(3, 6).reduce((sum, month) => sum + month.income, 0),
      expense: monthlyData.slice(3, 6).reduce((sum, month) => sum + month.expense, 0)
    },
    {
      quarter: 'Q3',
      income: monthlyData.slice(6, 9).reduce((sum, month) => sum + month.income, 0),
      expense: monthlyData.slice(6, 9).reduce((sum, month) => sum + month.expense, 0)
    },
    {
      quarter: 'Q4',
      income: monthlyData.slice(9, 12).reduce((sum, month) => sum + month.income, 0),
      expense: monthlyData.slice(9, 12).reduce((sum, month) => sum + month.expense, 0)
    }
  ];
  
  // Calculate profit and margin for each quarter
  quarters.forEach(quarter => {
    quarter.profit = quarter.income - quarter.expense;
    quarter.margin = Math.round((quarter.profit / quarter.income) * 100);
  });
  
  // Compare with previous year (mock data)
  const previousYearTotalIncome = Math.round(totalIncome * 0.85); // Assume 15% growth
  const previousYearTotalExpense = Math.round(totalExpense * 0.88); // Assume 12% growth
  const previousYearProfit = previousYearTotalIncome - previousYearTotalExpense;
  const previousYearMargin = Math.round((previousYearProfit / previousYearTotalIncome) * 100);
  
  const incomeGrowth = Math.round((totalIncome - previousYearTotalIncome) / previousYearTotalIncome * 100);
  const expenseGrowth = Math.round((totalExpense - previousYearTotalExpense) / previousYearTotalExpense * 100);
  const profitGrowth = Math.round((grossProfit - previousYearProfit) / previousYearProfit * 100);
  
  return {
    summary: {
      totalIncome,
      totalExpense,
      grossProfit,
      profitMargin,
      compareWithPreviousYear: {
        income: {
          current: totalIncome,
          previous: previousYearTotalIncome,
          growth: incomeGrowth
        },
        expense: {
          current: totalExpense,
          previous: previousYearTotalExpense,
          growth: expenseGrowth
        },
        profit: {
          current: grossProfit,
          previous: previousYearProfit,
          growth: profitGrowth
        },
        margin: {
          current: profitMargin,
          previous: previousYearMargin,
          difference: profitMargin - previousYearMargin
        }
      }
    },
    incomeCategories,
    expenseCategories,
    monthlyData,
    quarters
  };
}

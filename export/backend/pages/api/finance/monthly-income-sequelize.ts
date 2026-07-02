import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * Finance Monthly Income Report API - Implementasi Sequelize
 * Menyediakan data laporan pendapatan bulanan
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
    const { getMonthlyIncomeReport } = require('../../../../server/sequelize/adapters/finance-adapter');
    
    // Handle berdasarkan HTTP method
    if (req.method === 'GET') {
      // Extract query parameters
      const { 
        year = new Date().getFullYear(),
        branchId = 'all',
        filter = 'all',
        categoryId = 'all'
      } = req.query;
      
      // Format parameters
      const params = {
        year: parseInt(year as string),
        branchId: branchId as string,
        filter: filter as string,
        categoryId: categoryId as string
      };
      
      // Get monthly income report data
      const reportData = await getMonthlyIncomeReport(tenantId, params);
      
      return res.status(200).json({
        success: true,
        data: reportData,
        theme: {
          primary: '#ef4444',    // Merah
          secondary: '#f97316',  // Oranye
          gradient: 'from-red-600 to-orange-500'
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
    console.error('Error in finance monthly income report API:', error);
    
    // Fallback ke mock data jika database gagal
    return res.status(200).json({
      success: true,
      data: generateMockData(),
      isLive: false,
      message: 'Using mock data due to database error',
      theme: {
        primary: '#ef4444',    // Merah
        secondary: '#f97316',  // Oranye
        gradient: 'from-red-600 to-orange-500'
      }
    });
  }
}

/**
 * Generate mock data untuk fallback
 */
function generateMockData() {
  // Categories
  const categories = [
    { id: 'CAT001', name: 'Penjualan Obat Resep', color: '#10b981' },
    { id: 'CAT002', name: 'Penjualan OTC', color: '#3b82f6' },
    { id: 'CAT003', name: 'Jasa Konsultasi', color: '#f97316' },
    { id: 'CAT004', name: 'Layanan Klinik', color: '#8b5cf6' }
  ];
  
  // Months
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  // Generate monthly data
  const monthlyData = months.map((month, index) => {
    // Simulate seasonal variations
    const seasonMultiplier = 
      index < 3 ? 0.9 :  // Q1: slightly lower
      index < 6 ? 1.1 :  // Q2: slightly higher
      index < 9 ? 1.2 :  // Q3: higher
      1.0;               // Q4: normal
    
    // Generate random income data for each category
    const categoryIncomes = categories.map(category => {
      // Base amount plus random variation and seasonal adjustment
      const baseAmount = category.id === 'CAT001' ? 45000000 : 
                        (category.id === 'CAT002' ? 35000000 : 
                         (category.id === 'CAT003' ? 20000000 : 15000000));
      
      const amount = Math.round(
        (baseAmount + (Math.random() * 10000000 - 5000000)) * seasonMultiplier
      );
      
      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        amount
      };
    });
    
    // Calculate total
    const totalIncome = categoryIncomes.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      month,
      monthIndex: index,
      total: totalIncome,
      categories: categoryIncomes,
      transactions: Math.floor(Math.random() * 500) + 1000 // Random number of transactions
    };
  });
  
  // Summary data
  const totalIncome = monthlyData.reduce((sum, month) => sum + month.total, 0);
  const averageIncome = Math.round(totalIncome / monthlyData.length);
  const totalTransactions = monthlyData.reduce((sum, month) => sum + month.transactions, 0);
  
  // Find best and worst months
  const sortedMonths = [...monthlyData].sort((a, b) => b.total - a.total);
  const bestMonth = sortedMonths[0];
  const worstMonth = sortedMonths[sortedMonths.length - 1];
  
  // Compare with previous year (mock data)
  const previousYearTotal = Math.round(totalIncome * 0.88); // Assume 12% growth
  const percentGrowth = Math.round((totalIncome - previousYearTotal) / previousYearTotal * 100);
  
  // Quarterly breakdown
  const quarters = [
    {
      quarter: 'Q1',
      total: monthlyData.slice(0, 3).reduce((sum, month) => sum + month.total, 0)
    },
    {
      quarter: 'Q2',
      total: monthlyData.slice(3, 6).reduce((sum, month) => sum + month.total, 0)
    },
    {
      quarter: 'Q3',
      total: monthlyData.slice(6, 9).reduce((sum, month) => sum + month.total, 0)
    },
    {
      quarter: 'Q4',
      total: monthlyData.slice(9, 12).reduce((sum, month) => sum + month.total, 0)
    }
  ];
  
  return {
    monthlyData,
    summary: {
      totalIncome,
      averageIncome,
      totalTransactions,
      bestMonth: {
        month: bestMonth.month,
        amount: bestMonth.total
      },
      worstMonth: {
        month: worstMonth.month,
        amount: worstMonth.total
      },
      previousYearTotal,
      percentGrowth,
      quarters
    },
    categories
  };
}

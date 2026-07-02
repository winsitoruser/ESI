import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * Finance Daily Income Report API - Implementasi Sequelize
 * Menyediakan data laporan pendapatan harian
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
    const { getDailyIncomeReport } = require('../../../../server/sequelize/adapters/finance-adapter');
    
    // Handle berdasarkan HTTP method
    if (req.method === 'GET') {
      // Extract query parameters
      const { 
        startDate = new Date().toISOString().split('T')[0],
        endDate,
        branchId = 'all',
        filter = 'all',
        categoryId = 'all'
      } = req.query;
      
      // Format parameters
      const params = {
        startDate: startDate as string,
        endDate: (endDate || startDate) as string,
        branchId: branchId as string,
        filter: filter as string,
        categoryId: categoryId as string
      };
      
      // Get daily income report data
      const reportData = await getDailyIncomeReport(tenantId, params);
      
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
    console.error('Error in finance daily income report API:', error);
    
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
  // Create date range for the current month
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const days = [];
  const currentDate = new Date(startOfMonth);
  
  // Categories
  const categories = [
    { id: 'CAT001', name: 'Penjualan Obat Resep', color: '#10b981' },
    { id: 'CAT002', name: 'Penjualan OTC', color: '#3b82f6' },
    { id: 'CAT003', name: 'Jasa Konsultasi', color: '#f97316' },
    { id: 'CAT004', name: 'Layanan Klinik', color: '#8b5cf6' }
  ];
  
  // Generate daily data
  while (currentDate <= endOfMonth) {
    const formattedDate = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Lower income on weekends
    const multiplier = dayOfWeek === 0 ? 0.6 : (dayOfWeek === 6 ? 0.8 : 1);
    
    // Generate random income data for each category
    const categoryIncomes = categories.map(category => {
      // Base amount plus random variation and day of week adjustment
      const baseAmount = category.id === 'CAT001' ? 3500000 : 
                        (category.id === 'CAT002' ? 2800000 : 
                         (category.id === 'CAT003' ? 1500000 : 900000));
      
      const amount = Math.round(
        (baseAmount + (Math.random() * 1000000 - 500000)) * multiplier
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
    
    days.push({
      date: formattedDate,
      displayDate: new Date(formattedDate).toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      }),
      total: totalIncome,
      categories: categoryIncomes,
      transactions: Math.floor(Math.random() * 50) + 50 // Random number of transactions
    });
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Summary data
  const totalIncome = days.reduce((sum, day) => sum + day.total, 0);
  const averageIncome = Math.round(totalIncome / days.length);
  const totalTransactions = days.reduce((sum, day) => sum + day.transactions, 0);
  
  // Find best and worst days
  const sortedDays = [...days].sort((a, b) => b.total - a.total);
  const bestDay = sortedDays[0];
  const worstDay = sortedDays[sortedDays.length - 1];
  
  return {
    dailyData: days,
    summary: {
      totalIncome,
      averageIncome,
      totalDays: days.length,
      totalTransactions,
      bestDay: {
        date: bestDay.displayDate,
        amount: bestDay.total
      },
      worstDay: {
        date: worstDay.displayDate,
        amount: worstDay.total
      }
    },
    categories
  };
}

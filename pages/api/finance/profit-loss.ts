import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Op, fn, col, literal, Sequelize } from 'sequelize';
import db from '@/models';

// Definisi tipe untuk Session
interface UserSession {
  user: {
    name?: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
};
import { 
  startOfMonth, 
  endOfMonth, 
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  format, 
  parseISO,
  eachMonthOfInterval,
  getYear,
  getMonth
} from 'date-fns';
import { id } from 'date-fns/locale';

// Kategori pendapatan untuk simulasi data
const revenueCategories = [
  { id: 'rev_prescription', name: 'Obat Resep', subcategories: ['Antibiotik', 'Antidiabetik', 'Kardiovaskular', 'Analgesik', 'Lainnya'] },
  { id: 'rev_otc', name: 'Obat Bebas', subcategories: ['Vitamin', 'Suplemen', 'Obat Batuk & Flu', 'Obat Sakit Kepala', 'Lainnya'] },
  { id: 'rev_consultation', name: 'Konsultasi Medis', subcategories: ['Konsultasi Umum', 'Konsultasi Spesialis', 'Telemedicine'] },
  { id: 'rev_service', name: 'Layanan Medis', subcategories: ['Pemeriksaan Dasar', 'Tindakan Medis', 'Tes Laboratorium'] },
  { id: 'rev_device', name: 'Alat Kesehatan', subcategories: ['Alat Bantu', 'Perawatan Luka', 'Diagnostik'] },
  { id: 'rev_other', name: 'Pendapatan Lain', subcategories: ['Administrasi', 'Delivery', 'Lainnya'] }
];

// Kategori pengeluaran untuk simulasi data
const expenseCategories = [
  { id: 'exp_inventory', name: 'Inventori', subcategories: ['Pembelian Obat', 'Alat Medis', 'Packaging', 'Lainnya'] },
  { id: 'exp_salary', name: 'Gaji & Bonus', subcategories: ['Dokter', 'Apoteker', 'Admin', 'Staff Lainnya'] },
  { id: 'exp_operating', name: 'Operasional', subcategories: ['Utilitas', 'Sewa', 'Perawatan', 'Lainnya'] },
  { id: 'exp_marketing', name: 'Marketing', subcategories: ['Online', 'Offline', 'Promosi', 'Iklan'] },
  { id: 'exp_tax', name: 'Pajak', subcategories: ['PPh', 'PPN', 'Pajak Daerah', 'Lainnya'] },
  { id: 'exp_other', name: 'Lainnya', subcategories: ['Transportasi', 'Asuransi', 'Jasa Profesional', 'Lainnya'] }
];

// Generate mock data untuk laporan laba rugi
const generateMockProfitLossData = (period: string, periodType: string = 'MONTH') => {
  // Parse periode
  let startDate, endDate, periodLabel, year;
  let previousStartDate, previousEndDate;
  
  if (periodType === 'YEAR') {
    // Mode tahunan
    year = parseInt(period);
    startDate = startOfYear(new Date(year, 0, 1));
    endDate = endOfYear(new Date(year, 0, 1));
    periodLabel = `Tahun ${year}`;
    
    // Periode sebelumnya (tahun lalu)
    previousStartDate = startOfYear(new Date(year - 1, 0, 1));
    previousEndDate = endOfYear(new Date(year - 1, 0, 1));
  } else {
    // Mode bulanan (default)
    const parsedDate = parseISO(`${period}-01`);
    startDate = startOfMonth(parsedDate);
    endDate = endOfMonth(parsedDate);
    year = getYear(parsedDate);
    periodLabel = format(parsedDate, 'MMMM yyyy', { locale: id });
    
    // Periode sebelumnya (bulan lalu)
    const previousMonth = subMonths(parsedDate, 1);
    previousStartDate = startOfMonth(previousMonth);
    previousEndDate = endOfMonth(previousMonth);
  }
  
  // Generate data pendapatan
  const totalRevenue = generateTotalAmount(periodType === 'YEAR' ? 5000000000 : 500000000);
  const totalPreviousRevenue = totalRevenue * (1 + (Math.random() * 0.4 - 0.2)); // -20% to +20% variance
  
  // Generate data pengeluaran
  const expensePercentage = 0.7 + (Math.random() * 0.2 - 0.1); // 60-80% dari pendapatan
  const totalExpense = totalRevenue * expensePercentage;
  const totalPreviousExpense = totalPreviousRevenue * (expensePercentage + (Math.random() * 0.1 - 0.05)); // slight variance
  
  // Hitung laba
  const netProfit = totalRevenue - totalExpense;
  const previousProfit = totalPreviousRevenue - totalPreviousExpense;
  const profitMargin = (netProfit / totalRevenue) * 100;
  
  // Buat detail pendapatan per kategori
  const revenues = generateCategoryItems(revenueCategories, totalRevenue);
  
  // Buat detail pengeluaran per kategori
  const expenses = generateCategoryItems(expenseCategories, totalExpense);
  
  // Buat data trend
  let trend = [];
  if (periodType === 'YEAR') {
    // Trend bulanan untuk mode tahunan
    const monthsInYear = eachMonthOfInterval({ start: startDate, end: endDate });
    trend = monthsInYear.map(month => {
      const monthName = format(month, 'MMM', { locale: id });
      const monthRevenue = generateMonthlyAmount(totalRevenue / 12);
      const monthExpense = generateMonthlyAmount(totalExpense / 12);
      return {
        month: monthName,
        revenue: monthRevenue,
        expense: monthExpense,
        profit: monthRevenue - monthExpense
      };
    });
  } else {
    // Trend 6 bulan terakhir untuk mode bulanan
    const sixMonths: Date[] = [];
    for (let i = 5; i >= 0; i--) {
      sixMonths.push(subMonths(startDate, i));
    }
    
    trend = sixMonths.map(month => {
      const monthName = format(month, 'MMM yy', { locale: id });
      const isCurrentMonth = getMonth(month) === getMonth(startDate) && getYear(month) === getYear(startDate);
      
      // Jika bulan saat ini, gunakan data yang sudah dihitung
      if (isCurrentMonth) {
        return {
          month: monthName,
          revenue: totalRevenue,
          expense: totalExpense,
          profit: netProfit
        };
      } else {
        // Untuk bulan lain, generate random dengan tren naik mendekati bulan saat ini
        const factor = 0.7 + (0.3 * (5 - (sixMonths.length - 1 - sixMonths.indexOf(month))) / 5);
        const monthRevenue = generateMonthlyAmount(totalRevenue * factor);
        const monthExpense = generateMonthlyAmount(totalExpense * factor);
        return {
          month: monthName,
          revenue: monthRevenue,
          expense: monthExpense,
          profit: monthRevenue - monthExpense
        };
      }
    });
  }
  
  // Hitung persentase perubahan
  const revenueChange = calculatePercentageChange(totalRevenue, totalPreviousRevenue);
  const expenseChange = calculatePercentageChange(totalExpense, totalPreviousExpense);
  const profitChange = calculatePercentageChange(netProfit, previousProfit);
  
  return {
    // Periode informasi
    period: periodLabel,
    periodType: periodType === 'YEAR' ? 'YEAR' : 'MONTH',
    year,
    
    // Ringkasan
    totalRevenue,
    totalExpense,
    netProfit,
    profitMargin,
    
    // Data detail
    revenues,
    expenses,
    
    // Perbandingan dengan periode sebelumnya
    comparison: {
      revenue: {
        value: totalPreviousRevenue,
        percentage: revenueChange
      },
      expense: {
        value: totalPreviousExpense,
        percentage: expenseChange
      },
      profit: {
        value: previousProfit,
        percentage: profitChange
      }
    },
    
    // Data trend
    trend
  };
};

// Helpers
function generateTotalAmount(baseAmount: number): number {
  // Randomly adjust the base amount by ±20%
  const adjustmentFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
  return Math.round(baseAmount * adjustmentFactor);
}

function generateMonthlyAmount(baseAmount: number): number {
  // Randomly adjust by ±15%
  const adjustmentFactor = 0.85 + (Math.random() * 0.3); // 0.85 to 1.15
  return Math.round(baseAmount * adjustmentFactor);
}

function generateCategoryItems(categories: any[], totalAmount: number) {
  const items: any[] = [];
  let remainingAmount = totalAmount;
  
  // Alokasikan persentase untuk setiap kategori
  const categoryCount = categories.length;
  const lastCategoryIndex = categoryCount - 1;
  
  categories.forEach((category, index) => {
    // Tentukan persentase untuk kategori ini
    let percentage: number;
    
    if (index === lastCategoryIndex) {
      // Kategori terakhir mendapatkan sisa
      percentage = 100;
    } else {
      // Alokasikan secara acak dengan bias tergantung kategori
      switch (index) {
        case 0: // Kategori utama mendapatkan porsi lebih besar
          percentage = 20 + (Math.random() * 15);
          break;
        case 1: // Kategori kedua juga penting
          percentage = 15 + (Math.random() * 10);
          break;
        default: // Kategori lainnya lebih kecil
          percentage = 5 + (Math.random() * 10);
          break;
      }
    }
    
    // Hitung jumlah untuk kategori ini
    const amount = index === lastCategoryIndex 
      ? remainingAmount 
      : Math.round(totalAmount * (percentage / 100));
    
    remainingAmount -= amount;
    
    // Tambahkan item kategori
    items.push({
      id: category.id,
      category: category.name,
      subcategory: '',
      amount,
      percentage: (amount / totalAmount) * 100
    });
    
    // Tambahkan beberapa subcategory jika ada
    if (category.subcategories && category.subcategories.length > 0) {
      const subcategories = category.subcategories;
      let remainingSubAmount = amount;
      
      // Take 2-3 random subcategories
      const selectedCount = Math.floor(Math.random() * 2) + 2; // 2-3
      const selectedSubcategories = subcategories
        .sort(() => 0.5 - Math.random()) // shuffle
        .slice(0, Math.min(selectedCount, subcategories.length));
      
      selectedSubcategories.forEach((subcategory: string, subIndex: number) => {
        // Last subcategory gets the remainder
        if (subIndex === selectedSubcategories.length - 1) {
          items.push({
            id: `${category.id}_sub${subIndex}`,
            category: '', // blank to indicate it's a subcategory
            subcategory,
            amount: remainingSubAmount,
            percentage: (remainingSubAmount / totalAmount) * 100
          });
        } else {
          // Random allocation for other subcategories
          const subPercentage = 20 + (Math.random() * 60); // 20-80% of category
          const subAmount = Math.round(amount * (subPercentage / 100) / selectedSubcategories.length);
          remainingSubAmount -= subAmount;
          
          items.push({
            id: `${category.id}_sub${subIndex}`,
            category: '', // blank to indicate it's a subcategory
            subcategory,
            amount: subAmount,
            percentage: (subAmount / totalAmount) * 100
          });
        }
      });
    }
  });
  
  return items;
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verifikasi autentikasi
  const session = await getServerSession(req, res, authOptions) as UserSession | null;
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Periksa hak akses
  const allowedRoles = ['ADMIN', 'MANAGER', 'FINANCE', 'ACCOUNTANT'];
  if (!session.user?.role || !allowedRoles.includes(session.user.role)) {
    return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
  }

  // Hanya method GET yang diizinkan
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ambil parameter
  const { period, periodType = 'MONTH' } = req.query;
  
  if (!period || (typeof period !== 'string')) {
    return res.status(400).json({ error: 'Period parameter is required' });
  }

  try {
    // TODO: Implementasi database dengan Sequelize
    /*
    // Parse periode
    let startDate, endDate;
    if (periodType === 'YEAR') {
      const year = parseInt(period as string);
      startDate = startOfYear(new Date(year, 0, 1));
      endDate = endOfYear(new Date(year, 0, 1));
    } else {
      const parsedDate = parseISO(`${period}-01`);
      startDate = startOfMonth(parsedDate);
      endDate = endOfMonth(parsedDate);
    }
    
    // Ambil data pendapatan dengan Sequelize
    const revenues = await db.Transaction.findAll({
      attributes: [
        'category',
        [fn('SUM', col('amount')), 'totalAmount']
      ],
      where: {
        type: 'REVENUE',
        date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      group: ['category'],
      order: [[fn('SUM', col('amount')), 'DESC']],
      raw: true
    });
    
    // Ambil data pengeluaran dengan Sequelize
    const expenses = await db.Transaction.findAll({
      attributes: [
        'category',
        [fn('SUM', col('amount')), 'totalAmount']
      ],
      where: {
        type: 'EXPENSE',
        date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      group: ['category'],
      order: [[fn('SUM', col('amount')), 'DESC']],
      raw: true
    });
    
    // ... format data ...
    
    return {
      revenues: formattedRevenues,
      expenses: formattedExpenses,
      // ... data lainnya
    };
    */
    
    // Kirim data laba rugi
    const profitLossData = generateMockProfitLossData(period as string, periodType as string);
    return res.status(200).json(profitLossData);
  } catch (error: unknown) {
    console.error('Error fetching profit/loss data:', error);
    
    // Fallback ke mock data
    console.log('Using mock profit/loss data');
    const profitLossData = generateMockProfitLossData(period as string, periodType as string);
    return res.status(200).json(profitLossData);
  }
}

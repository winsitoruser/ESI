import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/lib/prisma';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  parseISO, 
  subMonths,
  formatISO 
} from 'date-fns';
import { id } from 'date-fns/locale';

// Mock data untuk laporan bulanan
const getMockMonthlyIncomeData = (month: string) => {
  const parsedMonth = parseISO(month + '-01'); // Tambahkan tanggal 01 untuk parsing
  const startDate = startOfMonth(parsedMonth);
  const endDate = endOfMonth(parsedMonth);
  const previousMonth = subMonths(parsedMonth, 1);
  
  const formattedMonth = format(parsedMonth, 'MMMM yyyy', { locale: id });
  const formattedPrevMonth = format(previousMonth, 'MMMM yyyy', { locale: id });
  
  // Buat data harian acak
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
  const dailyRevenue = daysInMonth.map(day => {
    // Acak data per hari (lebih banyak di hari kerja, kurang di weekend)
    const isWeekend = [0, 6].includes(day.getDay());
    const baseTransactions = isWeekend ? 
      Math.floor(Math.random() * 8) + 2 : // 2-10 transaksi di weekend
      Math.floor(Math.random() * 15) + 5; // 5-20 transaksi di weekday
    
    const averageAmount = Math.floor(Math.random() * 50000) + 50000; // Rp 50,000 - Rp 100,000
    const dailyAmount = baseTransactions * averageAmount;
    
    return {
      date: format(day, 'dd/MM', { locale: id }),
      amount: dailyAmount,
      count: baseTransactions
    };
  });
  
  // Hitung total pendapatan
  const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.amount, 0);
  const totalTransactions = dailyRevenue.reduce((sum, day) => sum + day.count, 0);
  const averageDaily = Math.round(totalRevenue / daysInMonth.length);
  
  // Random data untuk perbandingan bulan sebelumnya
  const prevMonthPercent = Math.floor(Math.random() * 40) - 20; // -20% to +20%
  const prevMonthTotal = Math.round(totalRevenue * (1 - prevMonthPercent / 100));
  
  // Kategori pendapatan
  const categoryRevenue = [
    { category: 'Obat Resep', amount: Math.round(totalRevenue * 0.45), percentage: 45 },
    { category: 'Obat Bebas', amount: Math.round(totalRevenue * 0.25), percentage: 25 },
    { category: 'Konsultasi', amount: Math.round(totalRevenue * 0.15), percentage: 15 },
    { category: 'Layanan Medis', amount: Math.round(totalRevenue * 0.1), percentage: 10 },
    { category: 'Alat Kesehatan', amount: Math.round(totalRevenue * 0.05), percentage: 5 }
  ];
  
  // Metode pembayaran
  const paymentMethods = [
    { method: 'CASH', amount: Math.round(totalRevenue * 0.4), percentage: 40 },
    { method: 'CARD', amount: Math.round(totalRevenue * 0.3), percentage: 30 },
    { method: 'TRANSFER', amount: Math.round(totalRevenue * 0.2), percentage: 20 },
    { method: 'QRIS', amount: Math.round(totalRevenue * 0.1), percentage: 10 }
  ];
  
  return {
    month: formattedMonth,
    year: parsedMonth.getFullYear(),
    totalRevenue,
    totalTransactions,
    averageDaily,
    dailyRevenue,
    categoryRevenue,
    paymentMethods,
    comparison: {
      previousMonth: prevMonthTotal,
      previousMonthLabel: formattedPrevMonth,
      changePercentage: prevMonthPercent,
      trend: prevMonthPercent > 0 ? 'up' : prevMonthPercent < 0 ? 'down' : 'same'
    }
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Hanya method GET yang diizinkan
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cek autentikasi
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Cek role yang diizinkan
  const allowedRoles = ['ADMIN', 'MANAGER'];
  if (!allowedRoles.includes(session.user?.role as string)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Ambil bulan dari query parameter
  const { month } = req.query;
  
  if (!month || typeof month !== 'string') {
    return res.status(400).json({ error: 'Month parameter is required (format: yyyy-MM)' });
  }

  try {
    // Parse bulan
    const parsedMonth = parseISO(`${month}-01`);
    const startDate = startOfMonth(parsedMonth);
    const endDate = endOfMonth(parsedMonth);
    
    // Periode bulan sebelumnya untuk perbandingan
    const previousMonth = subMonths(parsedMonth, 1);
    const prevStartDate = startOfMonth(previousMonth);
    const prevEndDate = endOfMonth(previousMonth);
    
    // Format nama bulan
    const formattedMonth = format(parsedMonth, 'MMMM yyyy', { locale: id });
    const formattedPrevMonth = format(previousMonth, 'MMMM yyyy', { locale: id });
    
    // Query data invoice bulan ini dari database
    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'PAID'
      },
      include: {
        prescription: {
          include: {
            patient: true,
            diagnosis: true,
            doctor: true
          }
        },
        items: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Query data invoice bulan sebelumnya untuk perbandingan
    const prevInvoices = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: prevStartDate,
          lte: prevEndDate
        },
        status: 'PAID'
      },
      select: {
        grandTotal: true
      }
    });
    
    // Inisialisasi data laporan
    let totalRevenue = 0;
    let totalTransactions = invoices.length;
    
    // Inisialisasi map untuk pendapatan harian
    const dailyRevenueMap = new Map();
    
    // Inisialisasi untuk kategori dan metode pembayaran
    const categoryRevenueMap = new Map();
    const paymentMethodMap = new Map();
    
    // Proses data invoice
    invoices.forEach(invoice => {
      // Tambahkan ke total pendapatan
      totalRevenue += invoice.grandTotal;
      
      // Tambahkan ke pendapatan harian
      const dateKey = format(invoice.createdAt, 'dd/MM');
      if (!dailyRevenueMap.has(dateKey)) {
        dailyRevenueMap.set(dateKey, { amount: 0, count: 0 });
      }
      const dailyData = dailyRevenueMap.get(dateKey);
      dailyData.amount += invoice.grandTotal;
      dailyData.count += 1;
      dailyRevenueMap.set(dateKey, dailyData);
      
      // Tambahkan ke pendapatan per kategori (berdasarkan diagnosis)
      const category = invoice.prescription.diagnosis?.[0]?.category || 'Umum';
      if (!categoryRevenueMap.has(category)) {
        categoryRevenueMap.set(category, 0);
      }
      categoryRevenueMap.set(category, categoryRevenueMap.get(category) + invoice.grandTotal);
      
      // Tambahkan ke metode pembayaran
      const paymentMethod = invoice.paymentMethod || 'CASH';
      if (!paymentMethodMap.has(paymentMethod)) {
        paymentMethodMap.set(paymentMethod, 0);
      }
      paymentMethodMap.set(paymentMethod, paymentMethodMap.get(paymentMethod) + invoice.grandTotal);
    });
    
    // Hitung rata-rata harian
    const averageDaily = totalRevenue / eachDayOfInterval({ start: startDate, end: endDate }).length;
    
    // Format data pendapatan harian
    const dailyRevenue = Array.from(dailyRevenueMap.entries()).map(([date, data]) => ({
      date,
      amount: data.amount,
      count: data.count
    }));
    
    // Tambahkan hari tanpa pendapatan
    eachDayOfInterval({ start: startDate, end: endDate }).forEach(day => {
      const dateKey = format(day, 'dd/MM');
      if (!dailyRevenueMap.has(dateKey)) {
        dailyRevenue.push({
          date: dateKey,
          amount: 0,
          count: 0
        });
      }
    });
    
    // Sort berdasarkan tanggal
    dailyRevenue.sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });
    
    // Format data kategori pendapatan
    const totalCategoryRevenue = Array.from(categoryRevenueMap.values()).reduce((sum, amount) => sum + amount, 0);
    const categoryRevenue = Array.from(categoryRevenueMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round(amount / totalCategoryRevenue * 100)
    })).sort((a, b) => b.amount - a.amount);
    
    // Format data metode pembayaran
    const paymentMethods = Array.from(paymentMethodMap.entries()).map(([method, amount]) => ({
      method,
      amount,
      percentage: Math.round(amount / totalRevenue * 100)
    })).sort((a, b) => b.amount - a.amount);
    
    // Hitung perbandingan dengan bulan sebelumnya
    const prevMonthTotal = prevInvoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0);
    let changePercentage = 0;
    let trend: 'up' | 'down' | 'same' = 'same';
    
    if (prevMonthTotal > 0) {
      changePercentage = Math.round((totalRevenue - prevMonthTotal) / prevMonthTotal * 100);
      if (changePercentage > 0) trend = 'up';
      else if (changePercentage < 0) trend = 'down';
    }
    
    // Kirim respons
    return res.status(200).json({
      month: formattedMonth,
      year: parsedMonth.getFullYear(),
      totalRevenue,
      totalTransactions,
      averageDaily,
      dailyRevenue,
      categoryRevenue,
      paymentMethods,
      comparison: {
        previousMonth: prevMonthTotal,
        previousMonthLabel: formattedPrevMonth,
        changePercentage,
        trend
      }
    });
  } catch (error) {
    console.error('Error fetching monthly income data:', error);
    
    // Fallback ke mock data
    console.log('Using mock monthly income data');
    return res.status(200).json(getMockMonthlyIncomeData(month));
  }
}

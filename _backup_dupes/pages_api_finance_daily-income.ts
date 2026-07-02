import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

// Mock data untuk laporan pendapatan harian
const getMockDailyIncomeData = (date: string) => {
  const parsedDate = parseISO(date);
  const formattedDate = format(parsedDate, 'dd MMMM yyyy', { locale: id });
  
  // Buat data invoice acak
  const invoices = [];
  const invoiceCount = Math.floor(Math.random() * 15) + 5; // 5-20 invoice per hari
  
  let totalAmount = 0;
  const paymentCounts = {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
    QRIS: 0
  };
  const paymentAmounts = {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
    QRIS: 0
  };
  
  // Item top selling
  const drugSales = {
    'Paracetamol 500mg': { count: 0, amount: 0 },
    'Amoxicillin 500mg': { count: 0, amount: 0 },
    'Omeprazole 20mg': { count: 0, amount: 0 },
    'Cetirizine 10mg': { count: 0, amount: 0 },
    'Metformin 500mg': { count: 0, amount: 0 },
    'Amlodipine 10mg': { count: 0, amount: 0 },
    'Simvastatin 20mg': { count: 0, amount: 0 },
    'Antasida Tablet': { count: 0, amount: 0 },
    'Vitamin C 500mg': { count: 0, amount: 0 },
    'Ibuprofen 400mg': { count: 0, amount: 0 }
  };
  
  const patientNames = [
    'Ahmad Dahlan', 'Budi Santoso', 'Cindy Wijaya', 'Dewi Sartika', 
    'Eko Prasojo', 'Farah Diba', 'Gunawan Wibisono', 'Hana Permata',
    'Irfan Bakti', 'Jasmine Putri', 'Kartini Lestari', 'Lukman Hakim'
  ];
  
  // Contoh harga obat
  const drugPrices = {
    'Paracetamol 500mg': 5000,
    'Amoxicillin 500mg': 15000,
    'Omeprazole 20mg': 20000,
    'Cetirizine 10mg': 8000,
    'Metformin 500mg': 12000,
    'Amlodipine 10mg': 18000,
    'Simvastatin 20mg': 22000,
    'Antasida Tablet': 5000,
    'Vitamin C 500mg': 7000,
    'Ibuprofen 400mg': 9000
  };
  
  // Buat data invoice
  for (let i = 0; i < invoiceCount; i++) {
    // Buat data invoice acak
    const hour = Math.floor(Math.random() * 9) + 8; // jam 8 pagi - 5 sore
    const minute = Math.floor(Math.random() * 60);
    const paymentMethods = ['CASH', 'CARD', 'TRANSFER', 'QRIS'];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    // Acak jumlah item dalam resep
    const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 item per resep
    let invoiceAmount = 0;
    
    // Simulasi item yang dibeli
    const drugNames = Object.keys(drugSales);
    for (let j = 0; j < itemCount; j++) {
      const drugName = drugNames[Math.floor(Math.random() * drugNames.length)];
      const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 per item
      const price = drugPrices[drugName as keyof typeof drugPrices];
      const subtotal = price * quantity;
      
      // Update statistik penjualan
      drugSales[drugName as keyof typeof drugSales].count += quantity;
      drugSales[drugName as keyof typeof drugSales].amount += subtotal;
      
      invoiceAmount += subtotal;
    }
    
    // Tambahkan biaya layanan
    const serviceFee = 15000;
    invoiceAmount += serviceFee;
    
    // Data invoice
    const invoice = {
      id: `inv-${date}-${i + 1}`,
      invoiceNumber: `INV/${format(parsedDate, 'yyyyMMdd')}/${String(i + 1).padStart(3, '0')}`,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      patientName: patientNames[Math.floor(Math.random() * patientNames.length)],
      prescriptionId: `presc-${date}-${i + 1}`,
      paymentMethod,
      amount: invoiceAmount
    };
    
    // Tambahkan ke list invoice
    invoices.push(invoice);
    
    // Update statistik total
    totalAmount += invoiceAmount;
    paymentCounts[paymentMethod as keyof typeof paymentCounts]++;
    paymentAmounts[paymentMethod as keyof typeof paymentAmounts] += invoiceAmount;
  }
  
  // Buat list payment methods
  const paymentMethods = [
    { method: 'CASH', count: paymentCounts.CASH, amount: paymentAmounts.CASH },
    { method: 'CARD', count: paymentCounts.CARD, amount: paymentAmounts.CARD },
    { method: 'TRANSFER', count: paymentCounts.TRANSFER, amount: paymentAmounts.TRANSFER },
    { method: 'QRIS', count: paymentCounts.QRIS, amount: paymentAmounts.QRIS }
  ].filter(method => method.count > 0);
  
  // Buat list top items
  const topItems = Object.entries(drugSales)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5)
    .map(([name, data]) => ({
      name,
      count: data.count,
      amount: data.amount
    }));
  
  // Sort invoices by time
  invoices.sort((a, b) => {
    return a.time.localeCompare(b.time);
  });
  
  return {
    date: formattedDate,
    totalAmount,
    invoiceCount,
    paymentMethods,
    invoices,
    topItems
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
  const allowedRoles = ['ADMIN', 'CASHIER', 'MANAGER'];
  if (!allowedRoles.includes(session.user?.role as string)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Ambil tanggal dari query parameter
  const { date } = req.query;
  
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Date parameter is required' });
  }

  try {
    // Parse tanggal
    const parsedDate = parseISO(date);
    const startDate = startOfDay(parsedDate);
    const endDate = endOfDay(parsedDate);
    
    // Query data invoice dari database
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
            patient: true
          }
        },
        items: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Inisialisasi data laporan
    let totalAmount = 0;
    const paymentCounts: Record<string, number> = {};
    const paymentAmounts: Record<string, number> = {};
    const drugSales: Record<string, { count: number; amount: number }> = {};
    
    // Format data invoice
    const formattedInvoices = invoices.map(invoice => {
      // Hitung data statistik
      totalAmount += invoice.grandTotal;
      
      // Hitung per metode pembayaran
      const paymentMethod = invoice.paymentMethod || 'CASH';
      paymentCounts[paymentMethod] = (paymentCounts[paymentMethod] || 0) + 1;
      paymentAmounts[paymentMethod] = (paymentAmounts[paymentMethod] || 0) + invoice.grandTotal;
      
      // Hitung penjualan per obat
      invoice.items.forEach(item => {
        if (!drugSales[item.drugName]) {
          drugSales[item.drugName] = { count: 0, amount: 0 };
        }
        drugSales[item.drugName].count += item.quantity;
        drugSales[item.drugName].amount += item.subtotal;
      });
      
      // Format waktu
      const invoiceTime = format(invoice.createdAt, 'HH:mm');
      
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        time: invoiceTime,
        patientName: invoice.prescription.patient.name,
        prescriptionId: invoice.prescriptionId,
        paymentMethod: invoice.paymentMethod,
        amount: invoice.grandTotal
      };
    });
    
    // Format payment methods
    const paymentMethods = Object.keys(paymentCounts).map(method => ({
      method,
      count: paymentCounts[method],
      amount: paymentAmounts[method]
    }));
    
    // Format top items
    const topItems = Object.entries(drugSales)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount
      }));
    
    const formattedDate = format(parsedDate, 'dd MMMM yyyy', { locale: id });
    
    // Kirim respons
    return res.status(200).json({
      date: formattedDate,
      totalAmount,
      invoiceCount: formattedInvoices.length,
      paymentMethods,
      invoices: formattedInvoices,
      topItems
    });
  } catch (error) {
    console.error('Error fetching daily income data:', error);
    
    // Fallback ke mock data
    console.log('Using mock daily income data');
    return res.status(200).json(getMockDailyIncomeData(date));
  }
}

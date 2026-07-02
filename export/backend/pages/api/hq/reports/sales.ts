import type { NextApiRequest, NextApiResponse } from 'next';

interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  totalItems: number;
  averageItemsPerTransaction: number;
  totalDiscount: number;
  netSales: number;
}

interface BranchSales {
  branchId: string;
  branchName: string;
  branchCode: string;
  sales: number;
  transactions: number;
  avgTicket: number;
  items: number;
  discount: number;
  growth: number;
  target: number;
  achievement: number;
}

interface ProductSales {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quantitySold: number;
  revenue: number;
  avgPrice: number;
  growth: number;
}

interface HourlySales {
  hour: number;
  sales: number;
  transactions: number;
}

interface DailySales {
  date: string;
  dayName: string;
  sales: number;
  transactions: number;
  avgTicket: number;
}

interface PaymentMethodSales {
  method: string;
  amount: number;
  transactions: number;
  percentage: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { period = 'today', branchId, startDate, endDate } = req.query;

    const summary: SalesSummary = {
      totalSales: 185000000,
      totalTransactions: 4850,
      averageTicket: 38144,
      totalItems: 28500,
      averageItemsPerTransaction: 5.88,
      totalDiscount: 9250000,
      netSales: 175750000
    };

    const branchSales: BranchSales[] = [
      { branchId: '2', branchName: 'Cabang Jakarta', branchCode: 'HQ-001', sales: 55000000, transactions: 1450, avgTicket: 37931, items: 8500, discount: 2750000, growth: 12.5, target: 50000000, achievement: 110 },
      { branchId: '3', branchName: 'Cabang Bandung', branchCode: 'BR-002', sales: 38000000, transactions: 980, avgTicket: 38776, items: 5800, discount: 1900000, growth: 8.2, target: 35000000, achievement: 108.6 },
      { branchId: '4', branchName: 'Cabang Surabaya', branchCode: 'BR-003', sales: 35000000, transactions: 920, avgTicket: 38043, items: 5400, discount: 1750000, growth: 15.3, target: 32000000, achievement: 109.4 },
      { branchId: '5', branchName: 'Cabang Medan', branchCode: 'BR-004', sales: 30000000, transactions: 780, avgTicket: 38462, items: 4600, discount: 1500000, growth: -2.5, target: 32000000, achievement: 93.8 },
      { branchId: '6', branchName: 'Cabang Yogyakarta', branchCode: 'BR-005', sales: 27000000, transactions: 720, avgTicket: 37500, items: 4200, discount: 1350000, growth: 5.8, target: 25000000, achievement: 108 }
    ];

    const topProducts: ProductSales[] = [
      { productId: '1', productName: 'Beras Premium 5kg', sku: 'BRS-001', category: 'Sembako', quantitySold: 850, revenue: 63750000, avgPrice: 75000, growth: 12 },
      { productId: '2', productName: 'Minyak Goreng 2L', sku: 'MYK-001', category: 'Sembako', quantitySold: 720, revenue: 25200000, avgPrice: 35000, growth: 8 },
      { productId: '5', productName: 'Susu UHT 1L', sku: 'SSU-001', category: 'Minuman', quantitySold: 650, revenue: 11700000, avgPrice: 18000, growth: 15 },
      { productId: '3', productName: 'Gula Pasir 1kg', sku: 'GLA-001', category: 'Sembako', quantitySold: 580, revenue: 8700000, avgPrice: 15000, growth: 5 },
      { productId: '4', productName: 'Kopi Arabica 250g', sku: 'KPI-001', category: 'Minuman', quantitySold: 320, revenue: 27200000, avgPrice: 85000, growth: 22 },
      { productId: '6', productName: 'Tepung Terigu 1kg', sku: 'TPG-001', category: 'Sembako', quantitySold: 280, revenue: 3920000, avgPrice: 14000, growth: -8 },
      { productId: '7', productName: 'Keripik Kentang 100g', sku: 'KRP-001', category: 'Snack', quantitySold: 450, revenue: 6750000, avgPrice: 15000, growth: 18 },
      { productId: '8', productName: 'Air Mineral 600ml', sku: 'AIR-001', category: 'Minuman', quantitySold: 1200, revenue: 4800000, avgPrice: 4000, growth: 10 }
    ];

    const hourlySales: HourlySales[] = [
      { hour: 8, sales: 8500000, transactions: 220 },
      { hour: 9, sales: 12000000, transactions: 310 },
      { hour: 10, sales: 15500000, transactions: 400 },
      { hour: 11, sales: 18000000, transactions: 465 },
      { hour: 12, sales: 22000000, transactions: 570 },
      { hour: 13, sales: 20000000, transactions: 520 },
      { hour: 14, sales: 16000000, transactions: 415 },
      { hour: 15, sales: 14500000, transactions: 375 },
      { hour: 16, sales: 17000000, transactions: 440 },
      { hour: 17, sales: 19500000, transactions: 505 },
      { hour: 18, sales: 21000000, transactions: 545 },
      { hour: 19, sales: 12000000, transactions: 310 },
      { hour: 20, sales: 9000000, transactions: 235 }
    ];

    const dailySales: DailySales[] = [
      { date: '2026-02-16', dayName: 'Senin', sales: 165000000, transactions: 4200, avgTicket: 39286 },
      { date: '2026-02-17', dayName: 'Selasa', sales: 158000000, transactions: 4050, avgTicket: 39012 },
      { date: '2026-02-18', dayName: 'Rabu', sales: 172000000, transactions: 4400, avgTicket: 39091 },
      { date: '2026-02-19', dayName: 'Kamis', sales: 168000000, transactions: 4300, avgTicket: 39070 },
      { date: '2026-02-20', dayName: 'Jumat', sales: 175000000, transactions: 4500, avgTicket: 38889 },
      { date: '2026-02-21', dayName: 'Sabtu', sales: 198000000, transactions: 5100, avgTicket: 38824 },
      { date: '2026-02-22', dayName: 'Minggu', sales: 185000000, transactions: 4850, avgTicket: 38144 }
    ];

    const paymentMethods: PaymentMethodSales[] = [
      { method: 'Tunai', amount: 74000000, transactions: 2180, percentage: 40 },
      { method: 'QRIS', amount: 55500000, transactions: 1455, percentage: 30 },
      { method: 'Debit', amount: 37000000, transactions: 873, percentage: 20 },
      { method: 'Kredit', amount: 18500000, transactions: 342, percentage: 10 }
    ];

    return res.status(200).json({
      summary,
      branchSales,
      topProducts,
      hourlySales,
      dailySales,
      paymentMethods,
      period,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sales Report API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

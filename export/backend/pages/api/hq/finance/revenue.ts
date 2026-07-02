import type { NextApiRequest, NextApiResponse } from 'next';

const mockRevenueData = {
  totalRevenue: 4120000000,
  previousRevenue: 3665000000,
  growth: 12.4,
  avgDailyRevenue: 137333333,
  avgTicketSize: 185000,
  totalTransactions: 22270,
  cashSales: 1580000000,
  cardSales: 1520000000,
  digitalSales: 1020000000,
  onlineSales: 1450000000,
  offlineSales: 2670000000
};

const mockBranchRevenue = [
  { id: '1', name: 'Cabang Pusat Jakarta', code: 'HQ-001', revenue: 1250000000, transactions: 6757, avgTicket: 185000, growth: 15.2, contribution: 30.3 },
  { id: '2', name: 'Cabang Bandung', code: 'BR-002', revenue: 920000000, transactions: 4973, avgTicket: 185000, growth: 12.8, contribution: 22.3 },
  { id: '3', name: 'Cabang Surabaya', code: 'BR-003', revenue: 780000000, transactions: 4216, avgTicket: 185000, growth: 8.5, contribution: 18.9 },
  { id: '4', name: 'Cabang Medan', code: 'BR-004', revenue: 650000000, transactions: 3514, avgTicket: 185000, growth: 5.2, contribution: 15.8 },
  { id: '5', name: 'Cabang Yogyakarta', code: 'BR-005', revenue: 520000000, transactions: 2811, avgTicket: 185000, growth: -2.3, contribution: 12.6 }
];

const mockProductRevenue = [
  { id: '1', name: 'Nasi Goreng Special', category: 'Main Course', revenue: 450000000, quantity: 12500, avgPrice: 36000, growth: 18.5 },
  { id: '2', name: 'Ayam Bakar Madu', category: 'Main Course', revenue: 380000000, quantity: 9500, avgPrice: 40000, growth: 12.3 },
  { id: '3', name: 'Es Teh Manis', category: 'Beverages', revenue: 320000000, quantity: 32000, avgPrice: 10000, growth: 8.7 },
  { id: '4', name: 'Sate Ayam', category: 'Appetizer', revenue: 280000000, quantity: 7000, avgPrice: 40000, growth: 15.2 },
  { id: '5', name: 'Mie Goreng Seafood', category: 'Main Course', revenue: 250000000, quantity: 6250, avgPrice: 40000, growth: 10.1 }
];

const mockHourlyRevenue = [
  { hour: '08:00', revenue: 85000000, transactions: 459 },
  { hour: '09:00', revenue: 120000000, transactions: 649 },
  { hour: '10:00', revenue: 180000000, transactions: 973 },
  { hour: '11:00', revenue: 320000000, transactions: 1730 },
  { hour: '12:00', revenue: 520000000, transactions: 2811 },
  { hour: '13:00', revenue: 480000000, transactions: 2595 },
  { hour: '14:00', revenue: 280000000, transactions: 1514 },
  { hour: '15:00', revenue: 200000000, transactions: 1081 },
  { hour: '16:00', revenue: 220000000, transactions: 1189 },
  { hour: '17:00', revenue: 350000000, transactions: 1892 },
  { hour: '18:00', revenue: 520000000, transactions: 2811 },
  { hour: '19:00', revenue: 480000000, transactions: 2595 },
  { hour: '20:00', revenue: 320000000, transactions: 1730 },
  { hour: '21:00', revenue: 180000000, transactions: 973 }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { period = 'month', branchId } = req.query;

    return res.status(200).json({
      summary: mockRevenueData,
      branches: mockBranchRevenue,
      products: mockProductRevenue,
      hourly: mockHourlyRevenue,
      period
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

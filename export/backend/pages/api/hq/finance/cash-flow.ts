import type { NextApiRequest, NextApiResponse } from 'next';

const mockSummary = {
  openingBalance: 980000000,
  closingBalance: 1250000000,
  netChange: 270000000,
  cashInflow: 4350000000,
  cashOutflow: 4080000000,
  operatingCashFlow: 850000000,
  investingCashFlow: -150000000,
  financingCashFlow: -430000000,
  freeCashFlow: 700000000
};

const mockCashFlowItems = [
  { id: '1', date: '2026-02-22', description: 'Penjualan Harian - All Branches', category: 'Operating', type: 'inflow', source: 'Sales', destination: 'BCA Main', amount: 185000000, status: 'completed', reference: 'TRX-20260222-001' },
  { id: '2', date: '2026-02-22', description: 'Pembayaran Supplier PT Sukses', category: 'Operating', type: 'outflow', source: 'BCA Main', destination: 'PT Sukses Makmur', amount: 75000000, status: 'completed', reference: 'PAY-20260222-001' },
  { id: '3', date: '2026-02-22', description: 'Transfer ke Cabang Bandung', category: 'Internal', type: 'transfer', source: 'BCA Main', destination: 'BCA Bandung', amount: 50000000, status: 'pending', reference: 'TRF-20260222-001' },
  { id: '4', date: '2026-02-21', description: 'Pembayaran Gaji Karyawan', category: 'Operating', type: 'outflow', source: 'Mandiri Payroll', destination: 'Employees', amount: 150000000, status: 'completed', reference: 'PAY-20260221-001' },
  { id: '5', date: '2026-02-21', description: 'Penerimaan Piutang Customer', category: 'Operating', type: 'inflow', source: 'PT ABC Corp', destination: 'BCA Main', amount: 45000000, status: 'completed', reference: 'RCV-20260221-001' }
];

const mockBankAccounts = [
  { id: '1', name: 'BCA Main Account', bank: 'BCA', accountNumber: '123-456-7890', type: 'checking', balance: 850000000, currency: 'IDR' },
  { id: '2', name: 'Mandiri Payroll', bank: 'Mandiri', accountNumber: '987-654-3210', type: 'checking', balance: 250000000, currency: 'IDR' },
  { id: '3', name: 'BCA Savings', bank: 'BCA', accountNumber: '111-222-3333', type: 'savings', balance: 120000000, currency: 'IDR' },
  { id: '4', name: 'Petty Cash HQ', bank: '-', accountNumber: '-', type: 'petty_cash', balance: 15000000, currency: 'IDR' },
  { id: '5', name: 'Petty Cash Branches', bank: '-', accountNumber: '-', type: 'petty_cash', balance: 15000000, currency: 'IDR' }
];

const mockForecast = [
  { date: 'Week 1', projected: 1100000000, actual: 1120000000, variance: 20000000 },
  { date: 'Week 2', projected: 1150000000, actual: 1180000000, variance: 30000000 },
  { date: 'Week 3', projected: 1200000000, actual: 1210000000, variance: 10000000 },
  { date: 'Week 4', projected: 1250000000, actual: 1250000000, variance: 0 },
  { date: 'Week 5', projected: 1300000000 },
  { date: 'Week 6', projected: 1350000000 }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { period = 'month' } = req.query;

    return res.status(200).json({
      summary: mockSummary,
      items: mockCashFlowItems,
      accounts: mockBankAccounts,
      forecast: mockForecast,
      period
    });
  } catch (error) {
    console.error('Error fetching cash flow data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

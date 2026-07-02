import type { NextApiRequest, NextApiResponse } from 'next';

const mockPLSummary = {
  revenue: 4120000000,
  cogs: 2472000000,
  grossProfit: 1648000000,
  grossMargin: 40,
  operatingExpenses: 618000000,
  operatingIncome: 1030000000,
  operatingMargin: 25,
  otherIncome: 45000000,
  otherExpenses: 25000000,
  ebitda: 1050000000,
  depreciation: 85000000,
  interestExpense: 35000000,
  taxExpense: 206000000,
  netIncome: 824000000,
  netMargin: 20,
  previousNetIncome: 735000000,
  growth: 12.1
};

const mockPLItems = [
  { id: '1', name: 'Revenue', currentPeriod: 4120000000, previousPeriod: 3665000000, change: 455000000, changePercent: 12.4, isSubtotal: true },
  { id: '2', name: 'Sales - Dine In', currentPeriod: 2060000000, previousPeriod: 1832500000, change: 227500000, changePercent: 12.4, indent: 1 },
  { id: '3', name: 'Sales - Takeaway', currentPeriod: 1236000000, previousPeriod: 1099500000, change: 136500000, changePercent: 12.4, indent: 1 },
  { id: '4', name: 'Sales - Delivery', currentPeriod: 824000000, previousPeriod: 733000000, change: 91000000, changePercent: 12.4, indent: 1 },
  { id: '5', name: 'Cost of Goods Sold', currentPeriod: 2472000000, previousPeriod: 2199000000, change: 273000000, changePercent: 12.4, isSubtotal: true },
  { id: '9', name: 'Gross Profit', currentPeriod: 1648000000, previousPeriod: 1466000000, change: 182000000, changePercent: 12.4, isTotal: true },
  { id: '10', name: 'Operating Expenses', currentPeriod: 618000000, previousPeriod: 550000000, change: 68000000, changePercent: 12.4, isSubtotal: true },
  { id: '16', name: 'Operating Income', currentPeriod: 1030000000, previousPeriod: 916000000, change: 114000000, changePercent: 12.4, isTotal: true },
  { id: '22', name: 'Net Income', currentPeriod: 761250000, previousPeriod: 672000000, change: 89250000, changePercent: 13.3, isTotal: true }
];

const mockBranchPL = [
  { id: '1', name: 'Cabang Pusat Jakarta', code: 'HQ-001', revenue: 1250000000, cogs: 750000000, grossProfit: 500000000, opex: 187500000, netIncome: 250000000, margin: 20 },
  { id: '2', name: 'Cabang Bandung', code: 'BR-002', revenue: 920000000, cogs: 552000000, grossProfit: 368000000, opex: 138000000, netIncome: 184000000, margin: 20 },
  { id: '3', name: 'Cabang Surabaya', code: 'BR-003', revenue: 780000000, cogs: 468000000, grossProfit: 312000000, opex: 117000000, netIncome: 156000000, margin: 20 },
  { id: '4', name: 'Cabang Medan', code: 'BR-004', revenue: 650000000, cogs: 390000000, grossProfit: 260000000, opex: 97500000, netIncome: 130000000, margin: 20 },
  { id: '5', name: 'Cabang Yogyakarta', code: 'BR-005', revenue: 520000000, cogs: 312000000, grossProfit: 208000000, opex: 78000000, netIncome: 104000000, margin: 20 }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { period = 'month' } = req.query;

    return res.status(200).json({
      summary: mockPLSummary,
      items: mockPLItems,
      branches: mockBranchPL,
      period
    });
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

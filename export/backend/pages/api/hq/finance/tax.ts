import type { NextApiRequest, NextApiResponse } from 'next';

interface TaxObligation {
  id: string;
  type: 'ppn' | 'pph21' | 'pph23' | 'pph25' | 'pph29';
  name: string;
  period: string;
  dueDate: string;
  amount: number;
  status: 'pending' | 'calculated' | 'reported' | 'paid';
  paidDate?: string;
  reference?: string;
}

interface TaxSummary {
  year: number;
  totalPPN: number;
  totalPPh21: number;
  totalPPh23: number;
  totalPPh25: number;
  totalPPh29: number;
  totalPaid: number;
  totalPending: number;
}

interface BranchTax {
  branchId: string;
  branchName: string;
  branchCode: string;
  revenue: number;
  ppnOut: number;
  ppnIn: number;
  ppnPayable: number;
  pph21: number;
  pph23: number;
}

const mockTaxObligations: TaxObligation[] = [
  { id: '1', type: 'ppn', name: 'PPN Masa Februari 2026', period: '2026-02', dueDate: '2026-03-31', amount: 125000000, status: 'calculated' },
  { id: '2', type: 'pph21', name: 'PPh 21 Masa Februari 2026', period: '2026-02', dueDate: '2026-03-10', amount: 45000000, status: 'pending' },
  { id: '3', type: 'pph23', name: 'PPh 23 Masa Februari 2026', period: '2026-02', dueDate: '2026-03-10', amount: 8500000, status: 'pending' },
  { id: '4', type: 'pph25', name: 'PPh 25 Masa Februari 2026', period: '2026-02', dueDate: '2026-03-15', amount: 35000000, status: 'calculated' },
  { id: '5', type: 'ppn', name: 'PPN Masa Januari 2026', period: '2026-01', dueDate: '2026-02-28', amount: 118000000, status: 'paid', paidDate: '2026-02-25', reference: 'NTPN-2026-001' },
  { id: '6', type: 'pph21', name: 'PPh 21 Masa Januari 2026', period: '2026-01', dueDate: '2026-02-10', amount: 42000000, status: 'paid', paidDate: '2026-02-08', reference: 'NTPN-2026-002' },
  { id: '7', type: 'pph25', name: 'PPh 25 Masa Januari 2026', period: '2026-01', dueDate: '2026-02-15', amount: 35000000, status: 'paid', paidDate: '2026-02-12', reference: 'NTPN-2026-003' }
];

const mockBranchTax: BranchTax[] = [
  { branchId: '1', branchName: 'Gudang Pusat', branchCode: 'WH-001', revenue: 0, ppnOut: 0, ppnIn: 85000000, ppnPayable: -85000000, pph21: 12000000, pph23: 2500000 },
  { branchId: '2', branchName: 'Cabang Jakarta', branchCode: 'HQ-001', revenue: 850000000, ppnOut: 85000000, ppnIn: 25000000, ppnPayable: 60000000, pph21: 18000000, pph23: 3500000 },
  { branchId: '3', branchName: 'Cabang Bandung', branchCode: 'BR-002', revenue: 520000000, ppnOut: 52000000, ppnIn: 15000000, ppnPayable: 37000000, pph21: 8000000, pph23: 1500000 },
  { branchId: '4', branchName: 'Cabang Surabaya', branchCode: 'BR-003', revenue: 480000000, ppnOut: 48000000, ppnIn: 12000000, ppnPayable: 36000000, pph21: 7000000, pph23: 1000000 }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getTaxData(req, res);
      case 'POST':
        return calculateTax(req, res);
      case 'PUT':
        return updateTaxStatus(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Tax API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getTaxData(req: NextApiRequest, res: NextApiResponse) {
  const { year, type, status } = req.query;
  
  let filteredObligations = [...mockTaxObligations];
  
  if (year) {
    filteredObligations = filteredObligations.filter(t => t.period.startsWith(year as string));
  }
  
  if (type && type !== 'all') {
    filteredObligations = filteredObligations.filter(t => t.type === type);
  }
  
  if (status && status !== 'all') {
    filteredObligations = filteredObligations.filter(t => t.status === status);
  }

  const summary: TaxSummary = {
    year: parseInt(year as string) || 2026,
    totalPPN: filteredObligations.filter(t => t.type === 'ppn').reduce((sum, t) => sum + t.amount, 0),
    totalPPh21: filteredObligations.filter(t => t.type === 'pph21').reduce((sum, t) => sum + t.amount, 0),
    totalPPh23: filteredObligations.filter(t => t.type === 'pph23').reduce((sum, t) => sum + t.amount, 0),
    totalPPh25: filteredObligations.filter(t => t.type === 'pph25').reduce((sum, t) => sum + t.amount, 0),
    totalPPh29: filteredObligations.filter(t => t.type === 'pph29').reduce((sum, t) => sum + t.amount, 0),
    totalPaid: filteredObligations.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0),
    totalPending: filteredObligations.filter(t => t.status !== 'paid').reduce((sum, t) => sum + t.amount, 0)
  };

  return res.status(200).json({
    obligations: filteredObligations,
    branchTax: mockBranchTax,
    summary
  });
}

function calculateTax(req: NextApiRequest, res: NextApiResponse) {
  const { type, period, branchId, revenue, expenses, salaries } = req.body;
  
  if (!type || !period) {
    return res.status(400).json({ error: 'Tax type and period are required' });
  }

  let calculatedAmount = 0;
  let details: any = {};

  switch (type) {
    case 'ppn':
      const ppnOut = (revenue || 0) * 0.11;
      const ppnIn = (expenses || 0) * 0.11;
      calculatedAmount = ppnOut - ppnIn;
      details = { ppnOut, ppnIn, ppnPayable: calculatedAmount };
      break;
    case 'pph21':
      calculatedAmount = (salaries || 0) * 0.05; // Simplified
      details = { grossSalaries: salaries, taxRate: '5%', taxAmount: calculatedAmount };
      break;
    case 'pph23':
      calculatedAmount = (expenses || 0) * 0.02;
      details = { serviceExpenses: expenses, taxRate: '2%', taxAmount: calculatedAmount };
      break;
    case 'pph25':
      calculatedAmount = (revenue || 0) * 0.005; // Simplified monthly installment
      details = { monthlyRevenue: revenue, taxRate: '0.5%', taxAmount: calculatedAmount };
      break;
  }

  return res.status(200).json({
    type,
    period,
    calculatedAmount,
    details,
    message: 'Tax calculated successfully'
  });
}

function updateTaxStatus(req: NextApiRequest, res: NextApiResponse) {
  const { id, status, paidDate, reference } = req.body;
  
  if (!id || !status) {
    return res.status(400).json({ error: 'Tax ID and status are required' });
  }

  const obligation = mockTaxObligations.find(t => t.id === id);
  if (!obligation) {
    return res.status(404).json({ error: 'Tax obligation not found' });
  }

  obligation.status = status;
  if (status === 'paid') {
    obligation.paidDate = paidDate || new Date().toISOString().split('T')[0];
    obligation.reference = reference;
  }

  return res.status(200).json({ obligation, message: 'Tax status updated successfully' });
}

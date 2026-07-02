import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.error('Tax API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

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

  // PPN Masukan vs Keluaran reconciliation
  const totalPpnKeluaran = mockBranchTax.reduce((s, b) => s + b.ppnOut, 0);
  const totalPpnMasukan = mockBranchTax.reduce((s, b) => s + b.ppnIn, 0);
  const ppnPayable = totalPpnKeluaran - totalPpnMasukan;

  const ppnReconciliation = {
    ppnKeluaran: {
      label: 'PPN Keluaran (Penjualan)',
      total: totalPpnKeluaran,
      branches: mockBranchTax.map(b => ({ branchId: b.branchId, branchName: b.branchName, branchCode: b.branchCode, amount: b.ppnOut, revenue: b.revenue })),
    },
    ppnMasukan: {
      label: 'PPN Masukan (Pembelian)',
      total: totalPpnMasukan,
      branches: mockBranchTax.map(b => ({ branchId: b.branchId, branchName: b.branchName, branchCode: b.branchCode, amount: b.ppnIn })),
    },
    ppnPayable: {
      label: ppnPayable >= 0 ? 'PPN Kurang Bayar' : 'PPN Lebih Bayar',
      total: ppnPayable,
      status: ppnPayable >= 0 ? 'kurang_bayar' : 'lebih_bayar',
      branches: mockBranchTax.map(b => ({ branchId: b.branchId, branchName: b.branchName, branchCode: b.branchCode, amount: b.ppnPayable })),
    },
    ppnRate: 12,
  };

  return res.status(HttpStatus.OK).json(
    successResponse({
      obligations: filteredObligations,
      branchTax: mockBranchTax,
      summary,
      ppnReconciliation
    })
  );
}

function calculateTax(req: NextApiRequest, res: NextApiResponse) {
  const { type, period, branchId, revenue, expenses, salaries } = req.body;
  
  if (!type || !period) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Tax type and period are required')
    );
  }

  let calculatedAmount = 0;
  let details: any = {};

  switch (type) {
    case 'ppn': {
      // PPN 12% effective 1 Jan 2025 (UU HPP No.7/2021)
      const ppnRate = 0.12;
      const ppnOut = (revenue || 0) * ppnRate;
      const ppnIn = (expenses || 0) * ppnRate;
      calculatedAmount = ppnOut - ppnIn;
      details = { ppnRate: '12%', ppnOut, ppnIn, ppnPayable: calculatedAmount };
      break;
    }
    case 'pph21': {
      // PPh 21 progressive rates (UU HPP No.7/2021, effective 2022+)
      // Bracket 1: 0 - 60jt = 5%
      // Bracket 2: 60jt - 250jt = 15%
      // Bracket 3: 250jt - 500jt = 25%
      // Bracket 4: 500jt - 5M = 30%
      // Bracket 5: > 5M = 35%
      const annualTaxableIncome = salaries || 0;
      let taxAmount = 0;
      const brackets = [
        { limit: 60000000, rate: 0.05 },
        { limit: 250000000, rate: 0.15 },
        { limit: 500000000, rate: 0.25 },
        { limit: 5000000000, rate: 0.30 },
        { limit: Infinity, rate: 0.35 },
      ];
      let remaining = annualTaxableIncome;
      let prevLimit = 0;
      const bracketDetails: { bracket: string; taxableAmount: number; rate: string; tax: number }[] = [];
      for (const b of brackets) {
        if (remaining <= 0) break;
        const taxable = Math.min(remaining, b.limit - prevLimit);
        const tax = taxable * b.rate;
        taxAmount += tax;
        bracketDetails.push({
          bracket: `${prevLimit.toLocaleString('id-ID')} - ${b.limit === Infinity ? '∞' : b.limit.toLocaleString('id-ID')}`,
          taxableAmount: taxable, rate: `${b.rate * 100}%`, tax
        });
        remaining -= taxable;
        prevLimit = b.limit;
      }
      calculatedAmount = taxAmount;
      details = { annualTaxableIncome, brackets: bracketDetails, totalTax: taxAmount };
      break;
    }
    case 'pph23': {
      // PPh 23: 2% for services, 15% for dividends/interest/royalties
      // Default to 2% for service expenses
      const pph23Rate = 0.02;
      calculatedAmount = (expenses || 0) * pph23Rate;
      details = { serviceExpenses: expenses, taxRate: '2%', taxAmount: calculatedAmount, note: 'Rate 15% applies for dividends, interest, and royalties' };
      break;
    }
    case 'pph25': {
      // PPh 25: Monthly installment = (Prior year PPh 29 liability) / 12
      // Simplified: use estimated annual tax / 12
      const annualRevenue = (revenue || 0) * 12;
      const estimatedProfit = annualRevenue * 0.20; // 20% net margin estimate
      const estimatedAnnualTax = estimatedProfit * 0.22; // PPh Badan 22%
      calculatedAmount = Math.round(estimatedAnnualTax / 12);
      details = { monthlyRevenue: revenue, estimatedAnnualProfit: estimatedProfit, pphBadanRate: '22%', monthlyInstallment: calculatedAmount };
      break;
    }
  }

  return res.status(HttpStatus.OK).json(
    successResponse({
      type,
      period,
      calculatedAmount,
      details
    }, undefined, 'Tax calculated successfully')
  );
}

function updateTaxStatus(req: NextApiRequest, res: NextApiResponse) {
  const { id, status, paidDate, reference } = req.body;
  
  if (!id || !status) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Tax ID and status are required')
    );
  }

  const obligation = mockTaxObligations.find(t => t.id === id);
  if (!obligation) {
    return res.status(HttpStatus.NOT_FOUND).json(
      errorResponse(ErrorCodes.NOT_FOUND, 'Tax obligation not found')
    );
  }

  obligation.status = status;
  if (status === 'paid') {
    obligation.paidDate = paidDate || new Date().toISOString().split('T')[0];
    obligation.reference = reference;
  }

  return res.status(HttpStatus.OK).json(
    successResponse(obligation, undefined, 'Tax status updated successfully')
  );
}

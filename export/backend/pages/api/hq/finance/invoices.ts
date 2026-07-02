import type { NextApiRequest, NextApiResponse } from 'next';

const mockInvoices = [
  {
    id: '1',
    invoiceNumber: 'INV-2026-0245',
    customer: 'PT ABC Corporation',
    customerType: 'corporate',
    branch: 'Cabang Pusat Jakarta',
    branchCode: 'HQ-001',
    issueDate: '2026-02-20',
    dueDate: '2026-03-20',
    total: 85250000,
    status: 'sent',
    paidAmount: 0
  },
  {
    id: '2',
    invoiceNumber: 'INV-2026-0244',
    customer: 'Hotel Grand Indonesia',
    customerType: 'corporate',
    branch: 'Cabang Pusat Jakarta',
    branchCode: 'HQ-001',
    issueDate: '2026-02-18',
    dueDate: '2026-03-18',
    total: 127000000,
    status: 'partial',
    paidAmount: 60000000
  },
  {
    id: '3',
    invoiceNumber: 'INV-2026-0240',
    customer: 'CV Maju Jaya',
    customerType: 'corporate',
    branch: 'Cabang Bandung',
    branchCode: 'BR-002',
    issueDate: '2026-02-10',
    dueDate: '2026-02-25',
    total: 46750000,
    status: 'overdue',
    paidAmount: 0
  },
  {
    id: '4',
    invoiceNumber: 'INV-2026-0238',
    customer: 'Restaurant Chain XYZ',
    customerType: 'corporate',
    branch: 'Cabang Surabaya',
    branchCode: 'BR-003',
    issueDate: '2026-02-05',
    dueDate: '2026-02-20',
    total: 102000000,
    status: 'paid',
    paidAmount: 102000000
  }
];

const mockSummary = {
  totalInvoices: 156,
  totalAmount: 2850000000,
  paidAmount: 2150000000,
  pendingAmount: 520000000,
  overdueAmount: 180000000,
  draftCount: 8,
  sentCount: 32,
  paidCount: 98,
  overdueCount: 18
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { status, branchId } = req.query;
    
    let filteredInvoices = mockInvoices;
    
    if (status && status !== 'all') {
      filteredInvoices = filteredInvoices.filter(inv => inv.status === status);
    }
    
    if (branchId && branchId !== 'all') {
      filteredInvoices = filteredInvoices.filter(inv => inv.branchCode === branchId);
    }
    
    return res.status(200).json({
      summary: mockSummary,
      invoices: filteredInvoices
    });
  }
  
  if (req.method === 'POST') {
    const newInvoice = req.body;
    // In production, save to database
    return res.status(201).json({
      success: true,
      invoice: {
        id: String(mockInvoices.length + 1),
        invoiceNumber: `INV-2026-${String(mockInvoices.length + 246).padStart(4, '0')}`,
        ...newInvoice,
        status: 'draft',
        paidAmount: 0
      }
    });
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}

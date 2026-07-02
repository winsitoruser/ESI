import type { NextApiRequest, NextApiResponse } from 'next';

const mockSummary = {
  totalReceivables: 450000000,
  totalPayables: 320000000,
  netPosition: 130000000,
  overdueReceivables: 85000000,
  overduePayables: 45000000,
  dueThisWeek: 120000000,
  collectedThisMonth: 380000000,
  paidThisMonth: 290000000
};

const mockReceivables = [
  { id: '1', invoiceNumber: 'INV-2026-0215', customer: 'PT ABC Corporation', customerType: 'corporate', issueDate: '2026-02-01', dueDate: '2026-02-15', amount: 75000000, paid: 0, balance: 75000000, status: 'overdue', daysOverdue: 7, contact: 'Budi Santoso', phone: '08123456789' },
  { id: '2', invoiceNumber: 'INV-2026-0218', customer: 'CV Maju Jaya', customerType: 'corporate', issueDate: '2026-02-05', dueDate: '2026-02-25', amount: 45000000, paid: 20000000, balance: 25000000, status: 'partial', daysOverdue: 0, contact: 'Siti Rahayu', phone: '08234567890' },
  { id: '3', invoiceNumber: 'INV-2026-0220', customer: 'Hotel Grand Indonesia', customerType: 'corporate', issueDate: '2026-02-10', dueDate: '2026-03-10', amount: 120000000, paid: 0, balance: 120000000, status: 'current', daysOverdue: 0, contact: 'Ahmad Wijaya', phone: '08345678901' },
  { id: '4', invoiceNumber: 'INV-2026-0198', customer: 'Restaurant Chain XYZ', customerType: 'corporate', issueDate: '2026-01-15', dueDate: '2026-01-30', amount: 85000000, paid: 85000000, balance: 0, status: 'paid', daysOverdue: 0, contact: 'Diana Kusuma', phone: '08456789012' }
];

const mockPayables = [
  { id: '1', invoiceNumber: 'PO-2026-0445', supplier: 'PT Sukses Makmur', category: 'Raw Materials', issueDate: '2026-02-10', dueDate: '2026-02-25', amount: 85000000, paid: 0, balance: 85000000, status: 'current', daysOverdue: 0, priority: 'high' },
  { id: '2', invoiceNumber: 'PO-2026-0438', supplier: 'CV Packaging Indo', category: 'Packaging', issueDate: '2026-02-05', dueDate: '2026-02-20', amount: 25000000, paid: 25000000, balance: 0, status: 'paid', daysOverdue: 0, priority: 'medium' },
  { id: '3', invoiceNumber: 'PO-2026-0420', supplier: 'PT Segar Selalu', category: 'Fresh Produce', issueDate: '2026-01-28', dueDate: '2026-02-12', amount: 45000000, paid: 0, balance: 45000000, status: 'overdue', daysOverdue: 10, priority: 'high' },
  { id: '4', invoiceNumber: 'PO-2026-0450', supplier: 'PLN', category: 'Utilities', issueDate: '2026-02-15', dueDate: '2026-02-28', amount: 35000000, paid: 0, balance: 35000000, status: 'current', daysOverdue: 0, priority: 'high' }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    return res.status(200).json({
      summary: mockSummary,
      receivables: mockReceivables,
      payables: mockPayables
    });
  } catch (error) {
    console.error('Error fetching accounts data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

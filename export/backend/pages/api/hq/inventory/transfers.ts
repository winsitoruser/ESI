import type { NextApiRequest, NextApiResponse } from 'next';

const mockTransfers = [
  {
    id: '1', transferNumber: 'TRF-2026-0089',
    fromBranch: { id: '1', name: 'Gudang Pusat', code: 'WH-001' },
    toBranch: { id: '3', name: 'Cabang Bandung', code: 'BR-002' },
    items: [
      { productId: '1', productName: 'Beras Premium 5kg', sku: 'BRS-001', quantity: 200, unit: 'pcs' },
      { productId: '2', productName: 'Minyak Goreng 2L', sku: 'MYK-001', quantity: 150, unit: 'pcs' }
    ],
    totalItems: 2, totalQuantity: 350, status: 'pending', priority: 'high',
    requestDate: '2026-02-22T08:00:00', requestedBy: 'Manager Bandung', notes: 'Stok menipis, butuh segera'
  },
  {
    id: '2', transferNumber: 'TRF-2026-0088',
    fromBranch: { id: '1', name: 'Gudang Pusat', code: 'WH-001' },
    toBranch: { id: '5', name: 'Cabang Medan', code: 'BR-004' },
    items: [
      { productId: '6', productName: 'Tepung Terigu 1kg', sku: 'TPG-001', quantity: 500, unit: 'pcs' }
    ],
    totalItems: 1, totalQuantity: 500, status: 'approved', priority: 'urgent',
    requestDate: '2026-02-21T14:00:00', approvedDate: '2026-02-21T16:00:00',
    requestedBy: 'Manager Medan', approvedBy: 'Admin HQ', notes: 'Out of stock - urgent'
  },
  {
    id: '3', transferNumber: 'TRF-2026-0087',
    fromBranch: { id: '1', name: 'Gudang Pusat', code: 'WH-001' },
    toBranch: { id: '4', name: 'Cabang Surabaya', code: 'BR-003' },
    items: [
      { productId: '3', productName: 'Gula Pasir 1kg', sku: 'GLA-001', quantity: 300, unit: 'pcs' },
      { productId: '4', productName: 'Kopi Arabica 250g', sku: 'KPI-001', quantity: 100, unit: 'pcs' },
      { productId: '5', productName: 'Susu UHT 1L', sku: 'SSU-001', quantity: 200, unit: 'pcs' }
    ],
    totalItems: 3, totalQuantity: 600, status: 'shipped', priority: 'normal',
    requestDate: '2026-02-20T10:00:00', approvedDate: '2026-02-20T12:00:00', shippedDate: '2026-02-21T08:00:00',
    requestedBy: 'Manager Surabaya', approvedBy: 'Admin HQ'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { status, fromBranch, toBranch } = req.query;
    
    let filteredTransfers = mockTransfers;
    
    if (status && status !== 'all') {
      filteredTransfers = filteredTransfers.filter(t => t.status === status);
    }
    
    if (fromBranch) {
      filteredTransfers = filteredTransfers.filter(t => t.fromBranch.code === fromBranch);
    }
    
    if (toBranch) {
      filteredTransfers = filteredTransfers.filter(t => t.toBranch.code === toBranch);
    }
    
    const stats = {
      pending: mockTransfers.filter(t => t.status === 'pending').length,
      approved: mockTransfers.filter(t => t.status === 'approved').length,
      shipped: mockTransfers.filter(t => t.status === 'shipped').length,
      received: mockTransfers.filter(t => t.status === 'received').length
    };
    
    return res.status(200).json({
      transfers: filteredTransfers,
      stats
    });
  }
  
  if (req.method === 'POST') {
    const newTransfer = req.body;
    return res.status(201).json({
      success: true,
      transfer: {
        id: String(mockTransfers.length + 1),
        transferNumber: `TRF-2026-${String(mockTransfers.length + 90).padStart(4, '0')}`,
        ...newTransfer,
        status: 'pending',
        requestDate: new Date().toISOString()
      }
    });
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}

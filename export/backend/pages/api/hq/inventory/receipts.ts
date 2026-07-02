import type { NextApiRequest, NextApiResponse } from 'next';

interface ReceiptItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'partial' | 'complete' | 'rejected';
  notes?: string;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  poNumber: string;
  supplier: { id: string; name: string; code: string };
  branch: { id: string; name: string; code: string };
  status: 'pending' | 'partial' | 'complete' | 'cancelled';
  receiptDate: string;
  expectedDate: string;
  items: ReceiptItem[];
  totalItems: number;
  totalValue: number;
  receivedValue: number;
  receivedBy?: string;
  verifiedBy?: string;
  notes?: string;
}

const mockReceipts: GoodsReceipt[] = [
  {
    id: '1', receiptNumber: 'GR-2026-0125', poNumber: 'PO-2026-0089',
    supplier: { id: '1', name: 'PT Supplier Utama', code: 'SUP-001' },
    branch: { id: '1', name: 'Gudang Pusat', code: 'WH-001' },
    status: 'pending', receiptDate: '2026-02-22', expectedDate: '2026-02-22',
    items: [
      { productId: '1', productName: 'Beras Premium 5kg', sku: 'BRS-001', orderedQty: 500, receivedQty: 0, unit: 'pcs', unitPrice: 75000, totalPrice: 37500000, status: 'pending' },
      { productId: '2', productName: 'Minyak Goreng 2L', sku: 'MYK-001', orderedQty: 300, receivedQty: 0, unit: 'pcs', unitPrice: 35000, totalPrice: 10500000, status: 'pending' }
    ],
    totalItems: 2, totalValue: 48000000, receivedValue: 0
  },
  {
    id: '2', receiptNumber: 'GR-2026-0124', poNumber: 'PO-2026-0087',
    supplier: { id: '2', name: 'CV Distributor Jaya', code: 'SUP-002' },
    branch: { id: '1', name: 'Gudang Pusat', code: 'WH-001' },
    status: 'partial', receiptDate: '2026-02-21', expectedDate: '2026-02-21',
    items: [
      { productId: '6', productName: 'Tepung Terigu 1kg', sku: 'TPG-001', orderedQty: 1000, receivedQty: 600, unit: 'pcs', unitPrice: 14000, totalPrice: 14000000, status: 'partial', notes: 'Sisa 400 akan dikirim besok' },
      { productId: '3', productName: 'Gula Pasir 1kg', sku: 'GLA-001', orderedQty: 500, receivedQty: 500, unit: 'pcs', unitPrice: 16000, totalPrice: 8000000, status: 'complete' }
    ],
    totalItems: 2, totalValue: 22000000, receivedValue: 16400000,
    receivedBy: 'Staff Gudang 1'
  },
  {
    id: '3', receiptNumber: 'GR-2026-0123', poNumber: 'PO-2026-0085',
    supplier: { id: '1', name: 'PT Supplier Utama', code: 'SUP-001' },
    branch: { id: '1', name: 'Gudang Pusat', code: 'WH-001' },
    status: 'complete', receiptDate: '2026-02-20', expectedDate: '2026-02-20',
    items: [
      { productId: '4', productName: 'Kopi Arabica 250g', sku: 'KPI-001', orderedQty: 200, receivedQty: 200, unit: 'pcs', unitPrice: 85000, totalPrice: 17000000, status: 'complete' }
    ],
    totalItems: 1, totalValue: 17000000, receivedValue: 17000000,
    receivedBy: 'Staff Gudang 2', verifiedBy: 'Supervisor Gudang'
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getReceipts(req, res);
      case 'POST':
        return createReceipt(req, res);
      case 'PUT':
        return updateReceipt(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Goods Receipt API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getReceipts(req: NextApiRequest, res: NextApiResponse) {
  const { status, supplierId, branchId, search } = req.query;
  
  let filtered = [...mockReceipts];
  
  if (status && status !== 'all') {
    filtered = filtered.filter(r => r.status === status);
  }
  
  if (supplierId) {
    filtered = filtered.filter(r => r.supplier.id === supplierId);
  }
  
  if (branchId) {
    filtered = filtered.filter(r => r.branch.id === branchId || r.branch.code === branchId);
  }
  
  if (search) {
    const searchStr = (search as string).toLowerCase();
    filtered = filtered.filter(r => 
      r.receiptNumber.toLowerCase().includes(searchStr) ||
      r.poNumber.toLowerCase().includes(searchStr) ||
      r.supplier.name.toLowerCase().includes(searchStr)
    );
  }

  const stats = {
    pending: mockReceipts.filter(r => r.status === 'pending').length,
    partial: mockReceipts.filter(r => r.status === 'partial').length,
    complete: mockReceipts.filter(r => r.status === 'complete').length,
    totalValue: mockReceipts.reduce((sum, r) => sum + r.totalValue, 0),
    receivedValue: mockReceipts.reduce((sum, r) => sum + r.receivedValue, 0)
  };

  return res.status(200).json({ receipts: filtered, stats });
}

function createReceipt(req: NextApiRequest, res: NextApiResponse) {
  const { poNumber, supplierId, supplierName, branchId, branchName, expectedDate, items } = req.body;
  
  if (!poNumber || !supplierId || !branchId) {
    return res.status(400).json({ error: 'PO number, supplier, and branch are required' });
  }

  const newReceipt: GoodsReceipt = {
    id: Date.now().toString(),
    receiptNumber: `GR-2026-${String(mockReceipts.length + 126).padStart(4, '0')}`,
    poNumber,
    supplier: { id: supplierId, name: supplierName || 'Unknown', code: `SUP-${supplierId}` },
    branch: { id: branchId, name: branchName || 'Unknown', code: `BR-${branchId}` },
    status: 'pending',
    receiptDate: new Date().toISOString().split('T')[0],
    expectedDate: expectedDate || new Date().toISOString().split('T')[0],
    items: items || [],
    totalItems: items?.length || 0,
    totalValue: items?.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0) || 0,
    receivedValue: 0
  };

  return res.status(201).json({ receipt: newReceipt, message: 'Goods receipt created successfully' });
}

function updateReceipt(req: NextApiRequest, res: NextApiResponse) {
  const { id, action, items, receivedBy, verifiedBy, notes } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Receipt ID is required' });
  }

  const receipt = mockReceipts.find(r => r.id === id);
  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }

  if (action === 'receive') {
    if (items) {
      receipt.items = items;
      const allComplete = items.every((i: ReceiptItem) => i.receivedQty >= i.orderedQty);
      const anyReceived = items.some((i: ReceiptItem) => i.receivedQty > 0);
      receipt.status = allComplete ? 'complete' : (anyReceived ? 'partial' : 'pending');
      receipt.receivedValue = items.reduce((sum: number, i: ReceiptItem) => sum + (i.receivedQty * i.unitPrice), 0);
    }
    if (receivedBy) receipt.receivedBy = receivedBy;
  } else if (action === 'verify') {
    if (verifiedBy) receipt.verifiedBy = verifiedBy;
  } else if (action === 'cancel') {
    receipt.status = 'cancelled';
  }

  if (notes) receipt.notes = notes;

  return res.status(200).json({ receipt, message: 'Receipt updated successfully' });
}

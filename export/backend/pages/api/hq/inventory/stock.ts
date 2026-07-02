import type { NextApiRequest, NextApiResponse } from 'next';

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  totalStock: number;
  minStock: number;
  maxStock: number;
  avgCost: number;
  stockValue: number;
  movement: 'fast' | 'medium' | 'slow';
  branches: BranchStockDetail[];
}

interface BranchStockDetail {
  branchId: string;
  branchName: string;
  branchCode: string;
  stock: number;
  minStock: number;
  maxStock: number;
  status: 'normal' | 'low' | 'out' | 'over';
  lastUpdated: string;
}

const mockProducts: ProductStock[] = [
  {
    id: '1', name: 'Beras Premium 5kg', sku: 'BRS-001', barcode: '8991234567001', category: 'Bahan Pokok', unit: 'pcs',
    totalStock: 2500, minStock: 500, maxStock: 5000, avgCost: 75000, stockValue: 187500000, movement: 'fast',
    branches: [
      { branchId: '1', branchName: 'Gudang Pusat', branchCode: 'WH-001', stock: 1200, minStock: 200, maxStock: 2000, status: 'normal', lastUpdated: '2026-02-22T10:00:00' },
      { branchId: '2', branchName: 'Cabang Jakarta', branchCode: 'HQ-001', stock: 450, minStock: 100, maxStock: 800, status: 'normal', lastUpdated: '2026-02-22T09:30:00' },
      { branchId: '3', branchName: 'Cabang Bandung', branchCode: 'BR-002', stock: 320, minStock: 100, maxStock: 600, status: 'normal', lastUpdated: '2026-02-22T09:00:00' },
      { branchId: '4', branchName: 'Cabang Surabaya', branchCode: 'BR-003', stock: 280, minStock: 100, maxStock: 600, status: 'normal', lastUpdated: '2026-02-22T08:30:00' },
      { branchId: '5', branchName: 'Cabang Medan', branchCode: 'BR-004', stock: 150, minStock: 100, maxStock: 500, status: 'low', lastUpdated: '2026-02-22T08:00:00' },
      { branchId: '6', branchName: 'Cabang Yogyakarta', branchCode: 'BR-005', stock: 100, minStock: 80, maxStock: 400, status: 'normal', lastUpdated: '2026-02-22T07:30:00' }
    ]
  },
  {
    id: '2', name: 'Minyak Goreng 2L', sku: 'MYK-001', barcode: '8991234567002', category: 'Bahan Pokok', unit: 'pcs',
    totalStock: 1800, minStock: 400, maxStock: 3500, avgCost: 35000, stockValue: 63000000, movement: 'fast',
    branches: [
      { branchId: '1', branchName: 'Gudang Pusat', branchCode: 'WH-001', stock: 800, minStock: 150, maxStock: 1500, status: 'normal', lastUpdated: '2026-02-22T10:00:00' },
      { branchId: '2', branchName: 'Cabang Jakarta', branchCode: 'HQ-001', stock: 350, minStock: 80, maxStock: 500, status: 'normal', lastUpdated: '2026-02-22T09:30:00' },
      { branchId: '3', branchName: 'Cabang Bandung', branchCode: 'BR-002', stock: 250, minStock: 60, maxStock: 400, status: 'normal', lastUpdated: '2026-02-22T09:00:00' }
    ]
  },
  {
    id: '3', name: 'Tepung Terigu 1kg', sku: 'TPG-001', barcode: '8991234567006', category: 'Bahan Pokok', unit: 'pcs',
    totalStock: 85, minStock: 300, maxStock: 2000, avgCost: 14000, stockValue: 1190000, movement: 'slow',
    branches: [
      { branchId: '1', branchName: 'Gudang Pusat', branchCode: 'WH-001', stock: 50, minStock: 100, maxStock: 800, status: 'low', lastUpdated: '2026-02-22T10:00:00' },
      { branchId: '2', branchName: 'Cabang Jakarta', branchCode: 'HQ-001', stock: 15, minStock: 50, maxStock: 300, status: 'low', lastUpdated: '2026-02-22T09:30:00' },
      { branchId: '5', branchName: 'Cabang Medan', branchCode: 'BR-004', stock: 0, minStock: 30, maxStock: 200, status: 'out', lastUpdated: '2026-02-22T08:00:00' }
    ]
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getStock(req, res);
      case 'PUT':
        return updateStock(req, res);
      case 'POST':
        return transferStock(req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Inventory Stock API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getStock(req: NextApiRequest, res: NextApiResponse) {
  const { search, category, branch, stockFilter, page = '1', limit = '20' } = req.query;
  
  let filtered = [...mockProducts];
  
  if (search) {
    const searchStr = (search as string).toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchStr) ||
      p.sku.toLowerCase().includes(searchStr) ||
      p.barcode.includes(searchStr)
    );
  }
  
  if (category && category !== 'Semua Kategori') {
    filtered = filtered.filter(p => p.category === category);
  }
  
  if (stockFilter && stockFilter !== 'all') {
    filtered = filtered.filter(p => p.branches.some(b => b.status === stockFilter));
  }

  const stats = {
    totalProducts: filtered.length,
    totalStock: filtered.reduce((sum, p) => sum + p.totalStock, 0),
    totalValue: filtered.reduce((sum, p) => sum + p.stockValue, 0),
    lowStockCount: filtered.filter(p => p.branches.some(b => b.status === 'low')).length,
    outOfStockCount: filtered.filter(p => p.branches.some(b => b.status === 'out')).length
  };

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const startIdx = (pageNum - 1) * limitNum;
  const paginatedProducts = filtered.slice(startIdx, startIdx + limitNum);

  return res.status(200).json({
    products: paginatedProducts,
    stats,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limitNum)
    }
  });
}

function updateStock(req: NextApiRequest, res: NextApiResponse) {
  const { productId, branchId, adjustment, reason } = req.body;
  
  if (!productId || !branchId || adjustment === undefined) {
    return res.status(400).json({ error: 'Product ID, Branch ID, and adjustment are required' });
  }

  return res.status(200).json({
    success: true,
    message: `Stock adjusted by ${adjustment} for product ${productId} at branch ${branchId}`,
    reason
  });
}

function transferStock(req: NextApiRequest, res: NextApiResponse) {
  const { productId, fromBranch, toBranch, quantity, notes } = req.body;
  
  if (!productId || !fromBranch || !toBranch || !quantity) {
    return res.status(400).json({ error: 'All transfer fields are required' });
  }

  return res.status(201).json({
    success: true,
    transfer: {
      id: Date.now().toString(),
      transferNumber: `TRF-${Date.now()}`,
      productId,
      fromBranch,
      toBranch,
      quantity,
      notes,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  });
}

import type { NextApiRequest, NextApiResponse } from 'next';

const mockAlerts = [
  {
    id: '1', type: 'out_of_stock', priority: 'critical',
    product: { id: '6', name: 'Tepung Terigu 1kg', sku: 'TPG-001', category: 'Bahan Pokok' },
    branch: { id: '5', name: 'Cabang Medan', code: 'BR-004' },
    currentStock: 0, minStock: 30, maxStock: 200,
    suggestedAction: 'Transfer dari Gudang Pusat atau buat PO ke supplier',
    createdAt: '2026-02-22T08:00:00', isRead: false, isResolved: false
  },
  {
    id: '2', type: 'low_stock', priority: 'high',
    product: { id: '6', name: 'Tepung Terigu 1kg', sku: 'TPG-001', category: 'Bahan Pokok' },
    branch: { id: '1', name: 'Gudang Pusat', code: 'WH-001' },
    currentStock: 50, minStock: 100, maxStock: 800,
    suggestedAction: 'Buat Purchase Order ke supplier utama',
    createdAt: '2026-02-22T07:30:00', isRead: false, isResolved: false
  },
  {
    id: '3', type: 'low_stock', priority: 'high',
    product: { id: '6', name: 'Tepung Terigu 1kg', sku: 'TPG-001', category: 'Bahan Pokok' },
    branch: { id: '2', name: 'Cabang Jakarta', code: 'HQ-001' },
    currentStock: 15, minStock: 50, maxStock: 300,
    suggestedAction: 'Transfer dari Gudang Pusat',
    createdAt: '2026-02-22T07:00:00', isRead: true, isResolved: false
  },
  {
    id: '4', type: 'low_stock', priority: 'medium',
    product: { id: '1', name: 'Beras Premium 5kg', sku: 'BRS-001', category: 'Bahan Pokok' },
    branch: { id: '5', name: 'Cabang Medan', code: 'BR-004' },
    currentStock: 150, minStock: 100, maxStock: 500,
    suggestedAction: 'Monitor atau transfer dari Gudang Pusat',
    createdAt: '2026-02-22T06:00:00', isRead: true, isResolved: false
  },
  {
    id: '5', type: 'overstock', priority: 'low',
    product: { id: '3', name: 'Gula Pasir 1kg', sku: 'GLA-001', category: 'Bahan Pokok' },
    branch: { id: '1', name: 'Gudang Pusat', code: 'WH-001' },
    currentStock: 1500, minStock: 250, maxStock: 1200,
    suggestedAction: 'Distribusikan ke cabang atau buat promo',
    createdAt: '2026-02-21T14:00:00', isRead: true, isResolved: false
  },
  {
    id: '6', type: 'expiring', priority: 'high',
    product: { id: '5', name: 'Susu UHT 1L', sku: 'SSU-001', category: 'Minuman' },
    branch: { id: '3', name: 'Cabang Bandung', code: 'BR-002' },
    currentStock: 50, minStock: 80, maxStock: 500,
    suggestedAction: 'Buat promo atau retur ke supplier (exp: 7 hari lagi)',
    createdAt: '2026-02-21T10:00:00', isRead: false, isResolved: false
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { type, priority, branchId, includeResolved } = req.query;
    
    let filteredAlerts = mockAlerts;
    
    if (type && type !== 'all') {
      filteredAlerts = filteredAlerts.filter(a => a.type === type);
    }
    
    if (priority && priority !== 'all') {
      filteredAlerts = filteredAlerts.filter(a => a.priority === priority);
    }
    
    if (branchId) {
      filteredAlerts = filteredAlerts.filter(a => a.branch.code === branchId);
    }
    
    if (includeResolved !== 'true') {
      filteredAlerts = filteredAlerts.filter(a => !a.isResolved);
    }
    
    const stats = {
      total: mockAlerts.filter(a => !a.isResolved).length,
      critical: mockAlerts.filter(a => a.priority === 'critical' && !a.isResolved).length,
      high: mockAlerts.filter(a => a.priority === 'high' && !a.isResolved).length,
      unread: mockAlerts.filter(a => !a.isRead && !a.isResolved).length
    };
    
    return res.status(200).json({
      alerts: filteredAlerts,
      stats
    });
  }
  
  if (req.method === 'PATCH') {
    const { id, action } = req.body;
    return res.status(200).json({
      success: true,
      message: `Alert ${id} ${action} successfully`
    });
  }
  
  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}

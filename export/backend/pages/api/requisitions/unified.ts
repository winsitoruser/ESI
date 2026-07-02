import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

/**
 * Unified Requisition Management API
 * Integrates RAC (branch-level) with HQ Requisitions
 * Provides bidirectional sync between inventory/rac and hq/requisitions
 */

// Status flow for requisitions
const STATUS_FLOW = {
  draft: ['submitted'],
  submitted: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'partially_approved', 'rejected'],
  approved: ['processing'],
  partially_approved: ['processing'],
  rejected: [],
  processing: ['ready_to_ship'],
  ready_to_ship: ['in_transit'],
  in_transit: ['delivered'],
  delivered: ['completed', 'partially_received'],
  partially_received: ['completed'],
  completed: [],
  cancelled: []
};

// Priority weights for sorting
const PRIORITY_WEIGHTS: Record<string, number> = {
  critical: 4,
  urgent: 3,
  high: 2,
  normal: 1,
  low: 0
};

// Branch data (mock - in production from database)
const BRANCHES: Record<string, any> = {
  '1': { id: '1', code: 'HQ-001', name: 'Kantor Pusat Jakarta', city: 'Jakarta', type: 'headquarters' },
  '2': { id: '2', code: 'BR-002', name: 'Cabang Bandung', city: 'Bandung', type: 'branch' },
  '3': { id: '3', code: 'BR-003', name: 'Cabang Surabaya', city: 'Surabaya', type: 'branch' },
  '4': { id: '4', code: 'BR-004', name: 'Cabang Medan', city: 'Medan', type: 'branch' },
  '5': { id: '5', code: 'BR-005', name: 'Cabang Yogyakarta', city: 'Yogyakarta', type: 'branch' },
  '6': { id: '6', code: 'WH-001', name: 'Gudang Pusat Cikarang', city: 'Cikarang', type: 'warehouse' },
  '7': { id: '7', code: 'WH-002', name: 'Gudang Regional Surabaya', city: 'Surabaya', type: 'warehouse' }
};

// Product data (mock)
const PRODUCTS = [
  { id: 1, name: 'Beras Premium 5kg', sku: 'BRS-001', unit: 'karung', price: 75000 },
  { id: 2, name: 'Minyak Goreng 2L', sku: 'MYK-001', unit: 'botol', price: 35000 },
  { id: 3, name: 'Gula Pasir 1kg', sku: 'GLP-001', unit: 'pack', price: 18000 },
  { id: 4, name: 'Tepung Terigu 1kg', sku: 'TPG-001', unit: 'pack', price: 15000 },
  { id: 5, name: 'Kecap Manis 600ml', sku: 'KCP-001', unit: 'botol', price: 22000 },
  { id: 6, name: 'Susu UHT 1L', sku: 'SSU-001', unit: 'kotak', price: 18000 },
  { id: 7, name: 'Telur Ayam 1kg', sku: 'TLR-001', unit: 'kg', price: 28000 },
  { id: 8, name: 'Kopi Bubuk 250g', sku: 'KOP-001', unit: 'bungkus', price: 45000 }
];

// Unified requisition interface
interface UnifiedRequisition {
  id: string;
  
  // Identifiers
  requestNumber: string;      // RAC format: RAC-2026-0001
  irNumber: string;           // IR format: IR-BR002-2602-0001
  
  // Source info
  source: 'rac' | 'hq' | 'auto';
  
  // Location info
  requestingBranch: {
    id: string;
    code: string;
    name: string;
    city: string;
    type: string;
  };
  fulfillingBranch: {
    id: string;
    code: string;
    name: string;
    type: string;
  } | null;
  
  // Request details
  requestType: 'rac' | 'restock' | 'emergency' | 'scheduled' | 'transfer' | 'new_item';
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  status: string;
  
  // Dates
  requestDate: string;
  requiredDate: string;
  requestedDeliveryDate: string | null;
  
  // Summary
  totalItems: number;
  totalQuantity: number;
  estimatedValue: number;
  
  // Items
  items: RequisitionItem[];
  
  // People
  requestedBy: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  
  // Notes & reason
  reason: string;
  notes: string | null;
  rejectionReason: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  
  // Tracking
  history: RequisitionHistory[];
  
  // Sync status
  syncedToHq: boolean;
  hqRequisitionId: string | null;
}

interface RequisitionItem {
  id: string;
  productId: number;
  productName: string;
  productSku: string;
  unit: string;
  currentStock: number;
  minStock: number;
  requestedQty: number;
  approvedQty: number | null;
  fulfilledQty: number;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'fulfilled';
  urgency: 'normal' | 'high' | 'critical';
  notes: string | null;
}

interface RequisitionHistory {
  id: string;
  timestamp: string;
  statusFrom: string | null;
  statusTo: string;
  changedBy: string;
  notes: string;
  action: string;
}

// In-memory storage (replace with database)
let requisitions: UnifiedRequisition[] = [];
let sequenceCounter = {
  rac: 10,
  ir: 10
};

// Initialize mock data
function initializeMockData() {
  if (requisitions.length > 0) return;
  
  const now = new Date();
  const requesters = ['Siti Rahayu', 'Budi Santoso', 'Dewi Lestari', 'Eko Prasetyo', 'Ahmad Hidayat'];
  const statuses = ['submitted', 'under_review', 'approved', 'processing', 'in_transit', 'completed'];
  const priorities = ['low', 'normal', 'high', 'urgent', 'critical'];
  const requestTypes = ['rac', 'restock', 'emergency', 'scheduled'];
  const reasons = [
    'Stok menipis, perlu restock segera',
    'Permintaan dari pelanggan tinggi',
    'Stok habis total - URGENT',
    'Persiapan promo akhir bulan',
    'Transfer stok ke cabang baru',
    'Restock rutin mingguan'
  ];
  
  // Generate 15 requisitions
  for (let i = 1; i <= 15; i++) {
    const branchId = String(Math.floor(Math.random() * 5) + 2); // 2-6
    const branch = BRANCHES[branchId];
    const warehouseId = Math.random() > 0.3 ? '6' : '7';
    const warehouse = BRANCHES[warehouseId];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)] as any;
    const requestType = requestTypes[Math.floor(Math.random() * requestTypes.length)] as any;
    const requester = requesters[Math.floor(Math.random() * requesters.length)];
    const daysAgo = Math.floor(Math.random() * 7);
    const requestDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const requiredDate = new Date(requestDate.getTime() + (Math.floor(Math.random() * 5) + 2) * 24 * 60 * 60 * 1000);
    
    // Generate items
    const itemCount = Math.floor(Math.random() * 5) + 1;
    const items: RequisitionItem[] = [];
    let totalQty = 0;
    let totalValue = 0;
    
    const usedProducts = new Set<number>();
    for (let j = 0; j < itemCount; j++) {
      let product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
      while (usedProducts.has(product.id)) {
        product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
      }
      usedProducts.add(product.id);
      
      const currentStock = Math.floor(Math.random() * 20);
      const minStock = Math.floor(Math.random() * 30) + 20;
      const requestedQty = Math.floor(Math.random() * 50) + 20;
      const approvedQty = ['approved', 'processing', 'in_transit', 'delivered', 'completed'].includes(status) 
        ? (Math.random() > 0.2 ? requestedQty : Math.floor(requestedQty * 0.8))
        : null;
      const fulfilledQty = ['delivered', 'completed'].includes(status) ? (approvedQty || 0) : 0;
      
      totalQty += requestedQty;
      totalValue += requestedQty * product.price;
      
      items.push({
        id: `item-${i}-${j}`,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unit: product.unit,
        currentStock,
        minStock,
        requestedQty,
        approvedQty,
        fulfilledQty,
        estimatedUnitCost: product.price,
        estimatedTotalCost: requestedQty * product.price,
        status: fulfilledQty > 0 ? 'fulfilled' : (approvedQty ? 'approved' : 'pending'),
        urgency: currentStock === 0 ? 'critical' : (currentStock < minStock / 2 ? 'high' : 'normal'),
        notes: null
      });
    }
    
    // Generate history
    const history: RequisitionHistory[] = [
      {
        id: `hist-${i}-1`,
        timestamp: requestDate.toISOString(),
        statusFrom: null,
        statusTo: 'submitted',
        changedBy: requester,
        notes: 'Request dibuat',
        action: 'create'
      }
    ];
    
    if (['under_review', 'approved', 'processing', 'in_transit', 'completed'].includes(status)) {
      history.push({
        id: `hist-${i}-2`,
        timestamp: new Date(requestDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        statusFrom: 'submitted',
        statusTo: 'under_review',
        changedBy: 'HQ Admin',
        notes: 'Sedang direview oleh HQ',
        action: 'review'
      });
    }
    
    if (['approved', 'processing', 'in_transit', 'completed'].includes(status)) {
      history.push({
        id: `hist-${i}-3`,
        timestamp: new Date(requestDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        statusFrom: 'under_review',
        statusTo: 'approved',
        changedBy: 'Manager HQ',
        notes: 'Disetujui oleh HQ',
        action: 'approve'
      });
    }
    
    const year = requestDate.getFullYear();
    const month = String(requestDate.getMonth() + 1).padStart(2, '0');
    const seq = String(i).padStart(4, '0');
    
    requisitions.push({
      id: `req-${i}`,
      requestNumber: `RAC-${year}-${seq}`,
      irNumber: `IR-${branch.code}-${month}${String(requestDate.getDate()).padStart(2, '0')}-${seq}`,
      source: 'rac',
      requestingBranch: branch,
      fulfillingBranch: ['approved', 'processing', 'in_transit', 'delivered', 'completed'].includes(status) ? warehouse : null,
      requestType,
      priority,
      status,
      requestDate: requestDate.toISOString(),
      requiredDate: requiredDate.toISOString(),
      requestedDeliveryDate: requiredDate.toISOString(),
      totalItems: items.length,
      totalQuantity: totalQty,
      estimatedValue: totalValue,
      items,
      requestedBy: requester,
      reviewedBy: ['under_review', 'approved', 'processing', 'in_transit', 'completed'].includes(status) ? 'HQ Admin' : null,
      approvedBy: ['approved', 'processing', 'in_transit', 'completed'].includes(status) ? 'Manager HQ' : null,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      notes: Math.random() > 0.5 ? 'Mohon diprioritaskan' : null,
      rejectionReason: null,
      createdAt: requestDate.toISOString(),
      updatedAt: new Date().toISOString(),
      reviewedAt: ['under_review', 'approved', 'processing', 'in_transit', 'completed'].includes(status) 
        ? new Date(requestDate.getTime() + 2 * 60 * 60 * 1000).toISOString() : null,
      approvedAt: ['approved', 'processing', 'in_transit', 'completed'].includes(status)
        ? new Date(requestDate.getTime() + 4 * 60 * 60 * 1000).toISOString() : null,
      shippedAt: ['in_transit', 'delivered', 'completed'].includes(status)
        ? new Date(requestDate.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
      deliveredAt: ['delivered', 'completed'].includes(status)
        ? new Date(requestDate.getTime() + 48 * 60 * 60 * 1000).toISOString() : null,
      completedAt: status === 'completed'
        ? new Date(requestDate.getTime() + 50 * 60 * 60 * 1000).toISOString() : null,
      history,
      syncedToHq: true,
      hqRequisitionId: `hq-${i}`
    });
  }
  
  sequenceCounter.rac = 15;
  sequenceCounter.ir = 15;
}

// Generate request numbers
function generateRequestNumber(): string {
  sequenceCounter.rac++;
  const year = new Date().getFullYear();
  return `RAC-${year}-${String(sequenceCounter.rac).padStart(4, '0')}`;
}

function generateIRNumber(branchCode: string): string {
  sequenceCounter.ir++;
  const now = new Date();
  const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `IR-${branchCode}-${monthDay}-${String(sequenceCounter.ir).padStart(4, '0')}`;
}

// Calculate stats
function calculateStats(reqs: UnifiedRequisition[]) {
  return {
    total: reqs.length,
    byStatus: {
      draft: reqs.filter(r => r.status === 'draft').length,
      submitted: reqs.filter(r => r.status === 'submitted').length,
      under_review: reqs.filter(r => r.status === 'under_review').length,
      approved: reqs.filter(r => r.status === 'approved').length,
      partially_approved: reqs.filter(r => r.status === 'partially_approved').length,
      rejected: reqs.filter(r => r.status === 'rejected').length,
      processing: reqs.filter(r => r.status === 'processing').length,
      in_transit: reqs.filter(r => r.status === 'in_transit').length,
      delivered: reqs.filter(r => r.status === 'delivered').length,
      completed: reqs.filter(r => r.status === 'completed').length
    },
    byPriority: {
      low: reqs.filter(r => r.priority === 'low').length,
      normal: reqs.filter(r => r.priority === 'normal').length,
      high: reqs.filter(r => r.priority === 'high').length,
      urgent: reqs.filter(r => r.priority === 'urgent').length,
      critical: reqs.filter(r => r.priority === 'critical').length
    },
    byType: {
      rac: reqs.filter(r => r.requestType === 'rac').length,
      restock: reqs.filter(r => r.requestType === 'restock').length,
      emergency: reqs.filter(r => r.requestType === 'emergency').length,
      scheduled: reqs.filter(r => r.requestType === 'scheduled').length,
      transfer: reqs.filter(r => r.requestType === 'transfer').length
    },
    pendingCount: reqs.filter(r => ['submitted', 'under_review'].includes(r.status)).length,
    approvedCount: reqs.filter(r => ['approved', 'partially_approved'].includes(r.status)).length,
    inProgressCount: reqs.filter(r => ['processing', 'ready_to_ship', 'in_transit'].includes(r.status)).length,
    completedCount: reqs.filter(r => r.status === 'completed').length,
    criticalCount: reqs.filter(r => r.priority === 'critical' || r.priority === 'urgent').length,
    totalValue: reqs.reduce((sum, r) => sum + r.estimatedValue, 0),
    totalItems: reqs.reduce((sum, r) => sum + r.totalItems, 0)
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    initializeMockData();

    // GET - Fetch requisitions
    if (req.method === 'GET') {
      const {
        source,          // 'rac' | 'hq' | 'all'
        status,
        priority,
        requestType,
        branchId,
        search,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = '1',
        limit = '20',
        includeStats = 'false'
      } = req.query;

      let filtered = [...requisitions];

      // Apply filters
      if (source && source !== 'all') {
        filtered = filtered.filter(r => r.source === source);
      }
      
      if (status && status !== 'all') {
        const statuses = (status as string).split(',');
        filtered = filtered.filter(r => statuses.includes(r.status));
      }
      
      if (priority && priority !== 'all') {
        filtered = filtered.filter(r => r.priority === priority);
      }
      
      if (requestType && requestType !== 'all') {
        filtered = filtered.filter(r => r.requestType === requestType);
      }
      
      if (branchId) {
        filtered = filtered.filter(r => r.requestingBranch.id === branchId);
      }
      
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filtered = filtered.filter(r =>
          r.requestNumber.toLowerCase().includes(searchLower) ||
          r.irNumber.toLowerCase().includes(searchLower) ||
          r.requestingBranch.name.toLowerCase().includes(searchLower) ||
          r.requestedBy.toLowerCase().includes(searchLower) ||
          r.reason.toLowerCase().includes(searchLower)
        );
      }
      
      if (startDate) {
        filtered = filtered.filter(r => new Date(r.requestDate) >= new Date(startDate as string));
      }
      
      if (endDate) {
        filtered = filtered.filter(r => new Date(r.requestDate) <= new Date(endDate as string));
      }

      // Sort
      filtered.sort((a, b) => {
        // Priority sort first
        if (sortBy === 'priority') {
          const aWeight = PRIORITY_WEIGHTS[a.priority] || 0;
          const bWeight = PRIORITY_WEIGHTS[b.priority] || 0;
          if (aWeight !== bWeight) {
            return sortOrder === 'desc' ? bWeight - aWeight : aWeight - bWeight;
          }
        }
        
        // Then by the specified field
        const aVal = a[sortBy as keyof UnifiedRequisition] as any;
        const bVal = b[sortBy as keyof UnifiedRequisition] as any;
        
        if (aVal === undefined || bVal === undefined) return 0;
        
        if (sortOrder === 'desc') {
          return aVal < bVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const total = filtered.length;
      const totalPages = Math.ceil(total / limitNum);
      const data = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      const response: any = {
        success: true,
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasMore: pageNum < totalPages
        }
      };

      // Include stats if requested
      if (includeStats === 'true') {
        response.stats = calculateStats(requisitions);
      }

      // Also return in format expected by both RAC and HQ pages
      response.requisitions = data.map(r => ({
        // RAC format
        id: parseInt(r.id.replace('req-', '')),
        request_number: r.requestNumber,
        request_type: r.requestType,
        from_location_id: parseInt(r.requestingBranch.id),
        to_location_id: r.fulfillingBranch ? parseInt(r.fulfillingBranch.id) : null,
        from_location: r.requestingBranch.name,
        to_location: r.fulfillingBranch?.name,
        request_date: r.requestDate,
        required_date: r.requiredDate,
        status: r.status,
        priority: r.priority,
        reason: r.reason,
        notes: r.notes,
        items_count: r.totalItems,
        total_qty_requested: r.totalQuantity,
        requested_by: r.requestedBy,
        approved_by: r.approvedBy,
        approval_date: r.approvedAt,
        items: r.items,
        history: r.history,
        
        // HQ format
        irNumber: r.irNumber,
        requestingBranch: r.requestingBranch,
        fulfillingBranch: r.fulfillingBranch,
        totalItems: r.totalItems,
        totalQuantity: r.totalQuantity,
        estimatedValue: r.estimatedValue,
        requester: r.requestedBy,
        createdAt: r.createdAt,
        requestedDeliveryDate: r.requestedDeliveryDate
      }));

      return res.status(200).json(response);
    }

    // POST - Create new requisition
    if (req.method === 'POST') {
      const {
        source = 'rac',
        requestingBranchId,
        fulfillingBranchId,
        requestType = 'restock',
        priority = 'normal',
        requiredDate,
        requestedDeliveryDate,
        reason,
        notes,
        items
      } = req.body;

      // Validation
      if (!requestingBranchId || !reason) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields',
          required: ['requestingBranchId', 'reason']
        });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one item is required' 
        });
      }

      const requestingBranch = BRANCHES[requestingBranchId];
      if (!requestingBranch) {
        return res.status(404).json({ success: false, error: 'Requesting branch not found' });
      }

      const fulfillingBranch = fulfillingBranchId ? BRANCHES[fulfillingBranchId] : null;

      // Calculate totals
      let totalQty = 0;
      let totalValue = 0;
      const processedItems: RequisitionItem[] = items.map((item: any, idx: number) => {
        const qty = item.requestedQty || item.requested_qty || item.requestedQuantity || 0;
        const unitCost = item.estimatedUnitCost || item.estimated_unit_cost || item.price || 0;
        totalQty += qty;
        totalValue += qty * unitCost;

        return {
          id: `item-new-${idx}`,
          productId: item.productId || item.product_id,
          productName: item.productName || item.product_name,
          productSku: item.productSku || item.product_sku || item.sku,
          unit: item.unit || 'pcs',
          currentStock: item.currentStock || item.current_stock || 0,
          minStock: item.minStock || item.min_stock || 0,
          requestedQty: qty,
          approvedQty: null,
          fulfilledQty: 0,
          estimatedUnitCost: unitCost,
          estimatedTotalCost: qty * unitCost,
          status: 'pending' as const,
          urgency: (item.urgency || 'normal') as any,
          notes: item.notes || null
        };
      });

      const now = new Date();
      const requestNumber = generateRequestNumber();
      const irNumber = generateIRNumber(requestingBranch.code);

      const newRequisition: UnifiedRequisition = {
        id: `req-${Date.now()}`,
        requestNumber,
        irNumber,
        source: source as any,
        requestingBranch,
        fulfillingBranch,
        requestType: requestType as any,
        priority: priority as any,
        status: 'submitted',
        requestDate: now.toISOString(),
        requiredDate: requiredDate || new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        requestedDeliveryDate: requestedDeliveryDate || null,
        totalItems: processedItems.length,
        totalQuantity: totalQty,
        estimatedValue: totalValue,
        items: processedItems,
        requestedBy: session.user.name || session.user.email || 'Unknown',
        reviewedBy: null,
        approvedBy: null,
        reason,
        notes: notes || null,
        rejectionReason: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        reviewedAt: null,
        approvedAt: null,
        shippedAt: null,
        deliveredAt: null,
        completedAt: null,
        history: [{
          id: `hist-new-1`,
          timestamp: now.toISOString(),
          statusFrom: null,
          statusTo: 'submitted',
          changedBy: session.user.name || session.user.email || 'Unknown',
          notes: 'Request dibuat dan diajukan',
          action: 'create'
        }],
        syncedToHq: true,
        hqRequisitionId: `hq-${Date.now()}`
      };

      requisitions.push(newRequisition);

      return res.status(201).json({
        success: true,
        message: 'Requisition created successfully',
        data: newRequisition,
        requestNumber,
        irNumber
      });
    }

    // PUT - Update requisition (approve, reject, process, etc.)
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { action, items, rejectionReason, fulfillingBranchId, notes, approvalNotes } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Requisition ID required' });
      }

      const reqIndex = requisitions.findIndex(r => 
        r.id === id || 
        r.requestNumber === id || 
        r.irNumber === id ||
        r.id === `req-${id}`
      );

      if (reqIndex === -1) {
        return res.status(404).json({ success: false, error: 'Requisition not found' });
      }

      const requisition = requisitions[reqIndex];
      const now = new Date();
      const userName = session.user.name || session.user.email || 'Unknown';
      let newStatus = requisition.status;
      let message = '';

      switch (action) {
        case 'review':
          newStatus = 'under_review';
          requisition.reviewedBy = userName;
          requisition.reviewedAt = now.toISOString();
          message = 'Requisition sedang direview';
          break;

        case 'approve':
          newStatus = 'approved';
          requisition.approvedBy = userName;
          requisition.approvedAt = now.toISOString();
          
          // Update item statuses
          if (items && items.length > 0) {
            requisition.items.forEach(item => {
              const updateItem = items.find((i: any) => i.id === item.id);
              if (updateItem) {
                item.approvedQty = updateItem.approvedQty !== undefined ? updateItem.approvedQty : item.requestedQty;
                item.status = (item.approvedQty ?? 0) > 0 ? 'approved' : 'rejected';
              }
            });
          } else {
            requisition.items.forEach(item => {
              item.approvedQty = item.requestedQty;
              item.status = 'approved';
            });
          }
          
          if (fulfillingBranchId && BRANCHES[fulfillingBranchId]) {
            requisition.fulfillingBranch = BRANCHES[fulfillingBranchId];
          } else if (!requisition.fulfillingBranch) {
            requisition.fulfillingBranch = BRANCHES['6']; // Default warehouse
          }
          
          message = 'Requisition disetujui';
          break;

        case 'partially_approve':
          newStatus = 'partially_approved';
          requisition.approvedBy = userName;
          requisition.approvedAt = now.toISOString();
          message = 'Requisition disetujui sebagian';
          break;

        case 'reject':
          newStatus = 'rejected';
          requisition.rejectionReason = rejectionReason || 'Tidak memenuhi kriteria';
          requisition.items.forEach(item => {
            item.status = 'rejected';
          });
          message = 'Requisition ditolak';
          break;

        case 'process':
          newStatus = 'processing';
          message = 'Requisition sedang diproses';
          break;

        case 'ready_to_ship':
          newStatus = 'ready_to_ship';
          message = 'Requisition siap dikirim';
          break;

        case 'ship':
          newStatus = 'in_transit';
          requisition.shippedAt = now.toISOString();
          message = 'Requisition dalam pengiriman';
          break;

        case 'deliver':
          newStatus = 'delivered';
          requisition.deliveredAt = now.toISOString();
          message = 'Requisition sudah diterima';
          break;

        case 'complete':
          newStatus = 'completed';
          requisition.completedAt = now.toISOString();
          requisition.items.forEach(item => {
            if (item.status === 'approved') {
              item.fulfilledQty = item.approvedQty ?? item.requestedQty;
              item.status = 'fulfilled';
            }
          });
          message = 'Requisition selesai';
          break;

        case 'cancel':
          newStatus = 'cancelled';
          message = 'Requisition dibatalkan';
          break;

        default:
          return res.status(400).json({ success: false, error: 'Invalid action' });
      }

      // Add to history
      requisition.history.push({
        id: `hist-${Date.now()}`,
        timestamp: now.toISOString(),
        statusFrom: requisition.status,
        statusTo: newStatus,
        changedBy: userName,
        notes: approvalNotes || notes || message,
        action
      });

      requisition.status = newStatus;
      requisition.updatedAt = now.toISOString();
      requisitions[reqIndex] = requisition;

      return res.status(200).json({
        success: true,
        message,
        data: requisition
      });
    }

    // DELETE - Cancel requisition
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const { reason } = req.body;

      const reqIndex = requisitions.findIndex(r => r.id === id || r.id === `req-${id}`);
      if (reqIndex === -1) {
        return res.status(404).json({ success: false, error: 'Requisition not found' });
      }

      requisitions[reqIndex].status = 'cancelled';
      requisitions[reqIndex].notes = reason || 'Dibatalkan';
      requisitions[reqIndex].updatedAt = new Date().toISOString();

      return res.status(200).json({
        success: true,
        message: 'Requisition cancelled'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Unified requisitions API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createLogger } from '../../../lib/logger-factory';
import { InventoryAdjustmentAdapter } from '../../../server/sequelize/adapters/inventory-adjustment-adapter';
import { sequelize } from '../../../server/sequelize/connection-simple';

const logger = createLogger('inventory-adjustments-api');

// Types for adjustment data
export interface AdjustmentItem {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  newStock: number;
  adjustmentQuantity: number;
  adjustmentType: "increase" | "decrease";
  reason: string;
  notes?: string;
}

export interface AdjustmentRequest {
  adjustmentNumber?: string;
  date: string;
  adjustedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  items: AdjustmentItem[];
}

export interface AdjustmentResponse {
  id: string;
  adjustmentNumber: string;
  date: string;
  adjustedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  totalItems: number;
  items: AdjustmentItem[];
  createdAt: string;
  updatedAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestLogger = logger.child({ 
    method: req.method, 
    url: req.url,
    timestamp: new Date().toISOString()
  });

  try {
    // Authentication check (disabled for development)
    // const session = await getServerSession(req, res, authOptions);
    // if (!session) {
    //   return res.status(401).json({ 
    //     success: false, 
    //     error: 'Unauthorized access' 
    //   });
    // }

    const adapter = new InventoryAdjustmentAdapter(sequelize);

    switch (req.method) {
      case 'GET':
        return await handleGetAdjustments(req, res, adapter, requestLogger);
      case 'POST':
        return await handleCreateAdjustment(req, res, adapter, requestLogger);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }
  } catch (error) {
    requestLogger.error('API handler error', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: (error as Error).message,
      isFromMock: false,
      timestamp: new Date().toISOString()
    });
  }
}

async function handleGetAdjustments(
  req: NextApiRequest, 
  res: NextApiResponse, 
  adapter: InventoryAdjustmentAdapter,
  logger: any
) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '',
      adjustmentType = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const filters = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      status: status as string,
      adjustmentType: adjustmentType as string,
      startDate: startDate as string,
      endDate: endDate as string
    };

    logger.info('Fetching adjustments with filters', { filters });

    // Try to get real data from database
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), 10000);
    });

    try {
      const result = await Promise.race([
        adapter.getAdjustments(filters),
        timeoutPromise
      ]);

      logger.info('Successfully fetched adjustments from database', { 
        count: result.adjustments.length,
        total: result.pagination.total 
      });

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Adjustments berhasil diambil dari database',
        isFromMock: false,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      logger.warn('Database query failed, using mock data', { error: (dbError as Error).message });
      
      // Fallback to mock data
      const mockData = generateMockAdjustments(filters);
      
      return res.status(200).json({
        success: true,
        data: mockData,
        message: 'Adjustments berhasil diambil (simulasi)',
        isFromMock: true,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Error in handleGetAdjustments', { error: (error as Error).message });
    throw error;
  }
}

async function handleCreateAdjustment(
  req: NextApiRequest, 
  res: NextApiResponse, 
  adapter: InventoryAdjustmentAdapter,
  logger: any
) {
  try {
    const adjustmentData: AdjustmentRequest = req.body;

    // Validate required fields
    if (!adjustmentData.items || adjustmentData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items adjustment harus diisi'
      });
    }

    if (!adjustmentData.adjustedBy) {
      return res.status(400).json({
        success: false,
        error: 'Penanggung jawab adjustment harus diisi'
      });
    }

    logger.info('Creating new adjustment', { 
      itemsCount: adjustmentData.items.length,
      adjustedBy: adjustmentData.adjustedBy 
    });

    // Try to create in database
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), 10000);
    });

    try {
      const result = await Promise.race([
        adapter.createAdjustment(adjustmentData),
        timeoutPromise
      ]);

      logger.info('Successfully created adjustment in database', { 
        adjustmentId: result.id,
        adjustmentNumber: result.adjustmentNumber 
      });

      return res.status(201).json({
        success: true,
        data: result,
        message: 'Adjustment berhasil dibuat',
        isFromMock: false,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      logger.warn('Database creation failed, using mock response', { error: (dbError as Error).message });
      
      // Fallback to mock response
      const mockResult = generateMockAdjustmentResponse(adjustmentData);
      
      return res.status(201).json({
        success: true,
        data: mockResult,
        message: 'Adjustment berhasil dibuat (simulasi)',
        isFromMock: true,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Error in handleCreateAdjustment', { error: (error as Error).message });
    throw error;
  }
}

function generateMockAdjustments(filters: any) {
  const mockAdjustments: AdjustmentResponse[] = [
    {
      id: 'adj-001',
      adjustmentNumber: 'ADJ-2025-001',
      date: '2025-08-30',
      adjustedBy: 'Eko Santoso',
      approvedBy: 'Budi Hartono',
      status: 'approved',
      notes: 'Penyesuaian stok bulanan',
      totalItems: 3,
      items: [
        {
          id: 'adj-item-001',
          productId: 'prod-001',
          productName: 'Paracetamol 500mg',
          sku: 'MED-PCT-500',
          currentStock: 120,
          newStock: 112,
          adjustmentQuantity: -8,
          adjustmentType: 'decrease',
          reason: 'Produk rusak',
          notes: 'Kemasan rusak ditemukan saat stock opname'
        },
        {
          id: 'adj-item-002',
          productId: 'prod-002',
          productName: 'Amoxicillin 500mg',
          sku: 'MED-AMX-500',
          currentStock: 85,
          newStock: 90,
          adjustmentQuantity: 5,
          adjustmentType: 'increase',
          reason: 'Barang ditemukan',
          notes: 'Ditemukan barang yang belum terinput'
        },
        {
          id: 'adj-item-003',
          productId: 'prod-003',
          productName: 'Vitamin C 1000mg',
          sku: 'SUP-VTC-1000',
          currentStock: 200,
          newStock: 195,
          adjustmentQuantity: -5,
          adjustmentType: 'decrease',
          reason: 'Produk kadaluarsa',
          notes: 'Produk mendekati kadaluarsa'
        }
      ],
      createdAt: '2025-08-30T16:00:00.000Z',
      updatedAt: '2025-08-30T16:00:00.000Z'
    },
    {
      id: 'adj-002',
      adjustmentNumber: 'ADJ-2025-002',
      date: '2025-08-28',
      adjustedBy: 'Sari Dewi',
      status: 'pending',
      notes: 'Penyesuaian berdasarkan stock opname',
      totalItems: 2,
      items: [
        {
          id: 'adj-item-004',
          productId: 'prod-004',
          productName: 'Vitamin B Complex',
          sku: 'SUP-VTB-COMP',
          currentStock: 150,
          newStock: 145,
          adjustmentQuantity: -5,
          adjustmentType: 'decrease',
          reason: 'Selisih stock opname',
          notes: 'Ditemukan selisih saat stock opname'
        },
        {
          id: 'adj-item-005',
          productId: 'prod-005',
          productName: 'Ibuprofen 400mg',
          sku: 'MED-IBU-400',
          currentStock: 75,
          newStock: 80,
          adjustmentQuantity: 5,
          adjustmentType: 'increase',
          reason: 'Koreksi input',
          notes: 'Koreksi kesalahan input sebelumnya'
        }
      ],
      createdAt: '2025-08-28T14:30:00.000Z',
      updatedAt: '2025-08-28T14:30:00.000Z'
    }
  ];

  // Apply filters
  let filteredAdjustments = mockAdjustments;

  if (filters.search) {
    filteredAdjustments = filteredAdjustments.filter(adj => 
      adj.adjustmentNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
      adj.adjustedBy.toLowerCase().includes(filters.search.toLowerCase()) ||
      adj.items.some(item => 
        item.productName.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.sku.toLowerCase().includes(filters.search.toLowerCase())
      )
    );
  }

  if (filters.status) {
    filteredAdjustments = filteredAdjustments.filter(adj => adj.status === filters.status);
  }

  // Pagination
  const total = filteredAdjustments.length;
  const startIndex = (filters.page - 1) * filters.limit;
  const endIndex = startIndex + filters.limit;
  const paginatedAdjustments = filteredAdjustments.slice(startIndex, endIndex);

  return {
    adjustments: paginatedAdjustments,
    pagination: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    }
  };
}

function generateMockAdjustmentResponse(data: AdjustmentRequest): AdjustmentResponse {
  return {
    id: `adj-mock-${Date.now()}`,
    adjustmentNumber: data.adjustmentNumber || `ADJ-${Date.now()}`,
    date: data.date,
    adjustedBy: data.adjustedBy,
    approvedBy: data.approvedBy,
    status: data.status,
    notes: data.notes,
    totalItems: data.items.length,
    items: data.items.map((item, index) => ({
      ...item,
      id: `adj-item-mock-${Date.now()}-${index}`
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

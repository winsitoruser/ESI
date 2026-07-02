import { NextApiRequest, NextApiResponse } from 'next';
import { createLogger } from '@/lib/logger-factory';
import * as XLSX from 'xlsx';

const logger = createLogger('api-inventory-pricelists');

// Types
interface PricelistItem {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  sku: string;
  price: number;
  unit: string;
  minOrder: number;
  validFrom: string;
  validTo: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// Mock data
const mockPricelists: PricelistItem[] = [
  {
    id: 'PL001',
    supplierId: 'S001',
    supplierName: 'PT Pharma Indonesia',
    productId: 'P001',
    productName: 'Paracetamol 500mg',
    sku: 'MED-PCT-500',
    price: 2500,
    unit: 'Strip',
    minOrder: 10,
    validFrom: '2025-01-01',
    validTo: '2025-12-31',
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'PL002',
    supplierId: 'S001',
    supplierName: 'PT Pharma Indonesia',
    productId: 'P002',
    productName: 'Amoxicillin 500mg',
    sku: 'MED-AMX-500',
    price: 4500,
    unit: 'Strip',
    minOrder: 5,
    validFrom: '2025-01-01',
    validTo: '2025-12-31',
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  }
];

// File validation helper
const validateFileType = (mimetype: string): boolean => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];
  return allowedTypes.includes(mimetype);
};

// GET handler
async function handleGetPricelists(req: NextApiRequest, res: NextApiResponse, requestLogger: any) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      supplierId = '',
      status = 'active'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    requestLogger.info('Fetching pricelists', { 
      page: pageNum, 
      limit: limitNum, 
      search, 
      supplierId,
      status 
    });

    // Simulate database query
    const queryPromise = new Promise((resolve) => {
      setTimeout(() => {
        let data = [...mockPricelists];
        
        // Apply search filter
        if (search) {
          const searchLower = (search as string).toLowerCase();
          data = data.filter(item => 
            item.productName.toLowerCase().includes(searchLower) ||
            item.sku.toLowerCase().includes(searchLower) ||
            item.supplierName.toLowerCase().includes(searchLower)
          );
        }

        // Apply supplier filter
        if (supplierId && supplierId !== 'all') {
          data = data.filter(item => item.supplierId === supplierId);
        }

        // Apply status filter
        if (status && status !== 'all') {
          data = data.filter(item => item.status === status);
        }

        // Pagination
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = pageNum * limitNum;
        const paginatedData = data.slice(startIndex, endIndex);

        resolve({
          data: paginatedData,
          pagination: {
            total: data.length,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(data.length / limitNum)
          }
        });
      }, 100);
    });

    const result = await queryPromise as any;

    requestLogger.info('Successfully fetched pricelists', { 
      count: result.data.length,
      total: result.pagination.total 
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: 'Pricelists berhasil diambil (simulasi)',
      isFromMock: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    requestLogger.error('Error in GET handler', { error: (error as Error).message });
    
    return res.status(200).json({
      success: true,
      data: mockPricelists.slice(0, 2),
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      },
      message: 'Menggunakan data fallback',
      isFromMock: true,
      timestamp: new Date().toISOString()
    });
  }
}

// POST handler for creating pricelist items
async function handleCreatePricelist(req: NextApiRequest, res: NextApiResponse, requestLogger: any) {
  try {
    const data = req.body;

    requestLogger.info('Creating new pricelist item', { data });

    // Validate required fields
    if (!data.supplierId || !data.productId || !data.price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: supplierId, productId, price',
        timestamp: new Date().toISOString()
      });
    }

    // Simulate database creation
    const createPromise = new Promise((resolve) => {
      setTimeout(() => {
        const newId = `PL${String(mockPricelists.length + 1).padStart(3, '0')}`;

        const newPricelist: PricelistItem = {
          id: newId,
          supplierId: data.supplierId,
          supplierName: data.supplierName || 'Unknown Supplier',
          productId: data.productId,
          productName: data.productName || 'Unknown Product',
          sku: data.sku || '',
          price: parseFloat(data.price),
          unit: data.unit || 'Pcs',
          minOrder: parseInt(data.minOrder) || 1,
          validFrom: data.validFrom || new Date().toISOString().split('T')[0],
          validTo: data.validTo || '2025-12-31',
          status: data.status || 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        mockPricelists.push(newPricelist);
        resolve(newPricelist);
      }, 200);
    });

    const result = await createPromise;

    requestLogger.info('Successfully created pricelist item', { id: (result as any).id });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Pricelist item berhasil dibuat (simulasi)',
      isFromMock: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    requestLogger.error('Error in POST handler', { error: (error as Error).message });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
}

// File upload handler
async function handleFileUpload(req: NextApiRequest, res: NextApiResponse, requestLogger: any) {
  try {
    // This would normally use multer middleware
    // For now, simulate file processing
    const { supplierId, fileName } = req.body;

    requestLogger.info('Processing pricelist file upload', { supplierId, fileName });

    // Simulate file processing
    const processPromise = new Promise((resolve) => {
      setTimeout(() => {
        // Mock processed data from Excel/CSV
        const processedItems = [
          {
            productName: 'Paracetamol 500mg',
            sku: 'MED-PCT-500',
            price: 2500,
            unit: 'Strip',
            minOrder: 10
          },
          {
            productName: 'Ibuprofen 400mg',
            sku: 'MED-IBU-400',
            price: 3500,
            unit: 'Strip',
            minOrder: 5
          }
        ];

        // Create pricelist items
        const newItems = processedItems.map((item, index) => ({
          id: `PL${String(mockPricelists.length + index + 1).padStart(3, '0')}`,
          supplierId,
          supplierName: 'Uploaded Supplier',
          productId: `P${String(index + 100).padStart(3, '0')}`,
          productName: item.productName,
          sku: item.sku,
          price: item.price,
          unit: item.unit,
          minOrder: item.minOrder,
          validFrom: new Date().toISOString().split('T')[0],
          validTo: '2025-12-31',
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        mockPricelists.push(...newItems);
        resolve({
          processed: newItems.length,
          items: newItems
        });
      }, 1000);
    });

    const result = await processPromise as any;

    requestLogger.info('Successfully processed file upload', { 
      processed: result.processed 
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: `${result.processed} item pricelist berhasil diproses dari file`,
      isFromMock: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    requestLogger.error('Error in file upload handler', { error: (error as Error).message });
    
    return res.status(500).json({
      success: false,
      error: 'File upload failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestLogger = logger.child({ 
    method: req.method, 
    url: req.url,
    timestamp: new Date().toISOString()
  });

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetPricelists(req, res, requestLogger);
      case 'POST':
        // Check if this is a file upload request
        if (req.headers['content-type']?.includes('multipart/form-data')) {
          return await handleFileUpload(req, res, requestLogger);
        } else {
          return await handleCreatePricelist(req, res, requestLogger);
        }
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
      timestamp: new Date().toISOString()
    });
  }
}

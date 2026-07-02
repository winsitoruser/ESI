import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { withApiHandler, success, error, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import { DatabaseService } from '@/services/database-service';

// Extend ApiContext to include session
interface ExtendedApiContext extends ApiContext {
  session?: {
    user?: {
      tenantId?: string;
    };
  };
}

// Tipo para el modelo de Price Group
type PriceGroupModel = {
  findAll: (options: any) => Promise<any[]>;
  create: (data: any) => Promise<any>;
  update: (data: any, options: any) => Promise<[number, any[]]>;
  destroy: (options: any) => Promise<number>;
};

// Extend DatabaseService para nuestro uso
interface DatabaseWithModels extends DatabaseService {
  models?: {
    PriceGroup: PriceGroupModel;
    [key: string]: any;
  };
}

// Mock data untuk group harga dengan skema warna merah-oranye
const mockPriceGroups = [
  {
    id: '1',
    name: 'Retail',
    marginPercentage: 25,
    description: 'Harga jual untuk konsumen retail',
    productCount: 35,
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-03-15')
  },
  {
    id: '2',
    name: 'Grosir',
    marginPercentage: 15,
    description: 'Harga jual untuk pembelian dalam jumlah besar',
    productCount: 42,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-04-10')
  },
  {
    id: '3',
    name: 'Resep',
    marginPercentage: 30,
    description: 'Harga khusus untuk obat resep',
    productCount: 18,
    createdAt: new Date('2025-02-20'),
    updatedAt: new Date('2025-04-05')
  },
  {
    id: '4',
    name: 'BPJS',
    marginPercentage: 12,
    description: 'Harga untuk program BPJS',
    productCount: 25,
    createdAt: new Date('2025-02-15'),
    updatedAt: new Date('2025-04-18')
  },
  {
    id: '5',
    name: 'Partner Apotek',
    marginPercentage: 10,
    description: 'Harga khusus untuk partner apotek',
    productCount: 15,
    createdAt: new Date('2025-03-10'),
    updatedAt: new Date('2025-04-25')
  }
];

/**
 * Handle price groups requests
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ExtendedApiContext
) {
  // Authenticate user for all requests
  const user = await authenticateUser(req);
  
  // Ensure user is authorized for inventory module
  if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER', 'STAFF'])) {
    throw new ApiError(403, 'Anda tidak memiliki akses ke modul inventory', 'FORBIDDEN');
  }
  
  // Deny write operations for read-only users
  const isReadOnlyUser = user.role === 'CASHIER' || user.role === 'STAFF';
  if (isReadOnlyUser && req.method !== 'GET') {
    throw new ApiError(403, 'Anda hanya memiliki akses baca untuk modul ini', 'FORBIDDEN');
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getPriceGroups(req, res, context);
    case 'POST':
      return createPriceGroup(req, res, context);
    case 'PUT':
      return updatePriceGroup(req, res, context);
    case 'DELETE':
      return deletePriceGroup(req, res, context);
    default:
      throw new ApiError(405, 'Metode tidak diperbolehkan', 'METHOD_NOT_ALLOWED');
  }
}

/**
 * GET - get all price groups
 */
async function getPriceGroups(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    // Attempt to fetch from database
    const result = await fetchPriceGroupsFromDatabase(context);
    
    return success(res, {
      message: result.isFromMock ? 'Data group harga (simulasi)' : 'Data group harga',
      data: result.priceGroups,
      isFromMock: result.isFromMock
    });
  } catch (err) {
    console.error('Error fetching price groups:', err);
    return error(res, 'Terjadi kesalahan saat mengambil data group harga', 500);
  }
}

/**
 * POST - create a new price group
 */
async function createPriceGroup(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    const priceGroupData = req.body;
    
    if (!priceGroupData.name) {
      throw new ApiError(400, 'Nama group harga tidak boleh kosong', 'VALIDATION_ERROR');
    }
    
    if (priceGroupData.marginPercentage === undefined || priceGroupData.marginPercentage === null) {
      throw new ApiError(400, 'Persentase margin tidak boleh kosong', 'VALIDATION_ERROR');
    }
    
    // Create in database
    const result = await createPriceGroupInDatabase(context, priceGroupData);
    
    return success(res, {
      message: result.isFromMock ? 'Group harga berhasil ditambahkan (simulasi)' : 'Group harga berhasil ditambahkan',
      data: result.data,
      isFromMock: result.isFromMock
    });
  } catch (err) {
    console.error('Error creating price group:', err);
    const statusCode = err instanceof ApiError ? err.statusCode : 500;
    return error(res, 'Terjadi kesalahan saat menambahkan group harga', statusCode);
  }
}

/**
 * PUT - update an existing price group
 */
async function updatePriceGroup(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    const priceGroupData = req.body;
    
    if (!priceGroupData.id) {
      throw new ApiError(400, 'ID group harga diperlukan', 'VALIDATION_ERROR');
    }
    
    if (!priceGroupData.name) {
      throw new ApiError(400, 'Nama group harga tidak boleh kosong', 'VALIDATION_ERROR');
    }
    
    if (priceGroupData.marginPercentage === undefined || priceGroupData.marginPercentage === null) {
      throw new ApiError(400, 'Persentase margin tidak boleh kosong', 'VALIDATION_ERROR');
    }
    
    // Update in database
    const result = await updatePriceGroupInDatabase(context, priceGroupData);
    
    return success(res, {
      message: result.isFromMock ? 'Group harga berhasil diperbarui (simulasi)' : 'Group harga berhasil diperbarui',
      data: result.data,
      isFromMock: result.isFromMock
    });
  } catch (err) {
    console.error('Error updating price group:', err);
    const statusCode = err instanceof ApiError ? err.statusCode : 500;
    return error(res, 'Terjadi kesalahan saat memperbarui group harga', statusCode);
  }
}

/**
 * DELETE - delete a price group
 */
async function deletePriceGroup(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    const { id } = req.query;
    
    if (!id) {
      throw new ApiError(400, 'ID group harga diperlukan', 'VALIDATION_ERROR');
    }
    
    // Delete from database
    const result = await deletePriceGroupFromDatabase(context, id as string);
    
    return success(res, {
      message: result.isFromMock ? 'Group harga berhasil dihapus (simulasi)' : 'Group harga berhasil dihapus',
      data: { id },
      isFromMock: result.isFromMock
    });
  } catch (err) {
    console.error('Error deleting price group:', err);
    const statusCode = err instanceof ApiError ? err.statusCode : 500;
    return error(res, 'Terjadi kesalahan saat menghapus group harga', statusCode);
  }
}

/**
 * Fetch price groups from database with fallback to mock data
 */
async function fetchPriceGroupsFromDatabase(context: ExtendedApiContext) {
  try {
    const { db } = context;
    const tenantId = context.session?.user?.tenantId || 'default-tenant';
    const dbWithModels = db as DatabaseWithModels;
    
    if (!dbWithModels || !dbWithModels.models) {
      console.warn('Database connection not available, falling back to mock price groups data');
      return { priceGroups: mockPriceGroups, isFromMock: true };
    }
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });
    
    // Race between DB query and timeout
    let result;
    try {
      result = await Promise.race([
        dbWithModels.models.PriceGroup.findAll({
          where: { tenantId },
          order: [['updatedAt', 'DESC']]
        }),
        timeoutPromise
      ]);
      
      return { priceGroups: result, isFromMock: false };
    } catch (error) {
      throw new Error(`Database query failed: ${(error as Error).message}`);
    }
  } catch (err) {
    console.error('Error fetching price groups from database:', err);
    return { priceGroups: mockPriceGroups, isFromMock: true };
  }
}

/**
 * Create a new price group in the database with fallback to mock data
 */
async function createPriceGroupInDatabase(context: ExtendedApiContext, priceGroupData: any) {
  try {
    const { db } = context;
    const tenantId = context.session?.user?.tenantId || 'default-tenant';
    const dbWithModels = db as DatabaseWithModels;
    
    if (!dbWithModels || !dbWithModels.models) {
      console.warn('Database connection not available, using mock price group data');
      // Generate mock data with id
      const mockData = {
        id: `${mockPriceGroups.length + 1}`,
        ...priceGroupData,
        productCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPriceGroups.push(mockData);
      return { data: mockData, isFromMock: true };
    }
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), 5000);
    });
    
    // Add tenant ID
    priceGroupData.tenantId = tenantId;
    
    // Race between DB operation and timeout
    let result;
    try {
      result = await Promise.race([
        dbWithModels.models.PriceGroup.create(priceGroupData),
        timeoutPromise
      ]);
      return { data: result, isFromMock: false };
    } catch (error) {
      throw new Error(`Database operation failed: ${(error as Error).message}`);
    }
  } catch (err) {
    console.error('Error creating price group in database:', err);
    // Fallback to mock data
    const mockData = {
      id: `${mockPriceGroups.length + 1}`,
      ...priceGroupData,
      productCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    mockPriceGroups.push(mockData);
    return { data: mockData, isFromMock: true, error: (err as Error).message };
  }
}

/**
 * Update a price group in the database with fallback to mock data
 */
async function updatePriceGroupInDatabase(context: ExtendedApiContext, priceGroupData: any) {
  try {
    const { db } = context;
    const dbWithModels = db as DatabaseWithModels;
    
    if (!dbWithModels || !dbWithModels.models) {
      console.warn('Database connection not available, using mock price group data');
      // Update in mock data
      const index = mockPriceGroups.findIndex(pg => pg.id === priceGroupData.id);
      if (index === -1) {
        throw new ApiError(404, 'Group harga tidak ditemukan', 'NOT_FOUND');
      }
      
      mockPriceGroups[index] = {
        ...mockPriceGroups[index],
        ...priceGroupData,
        updatedAt: new Date()
      };
      
      return { data: mockPriceGroups[index], isFromMock: true };
    }
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), 5000);
    });
    
    // Race between DB operation and timeout
    let result;
    try {
      const [updateCount, updatedPriceGroups] = await Promise.race([
        dbWithModels.models.PriceGroup.update(priceGroupData, {
          where: { id: priceGroupData.id },
          returning: true
        }),
        timeoutPromise
      ]);
      
      if (updateCount === 0) {
        throw new ApiError(404, 'Group harga tidak ditemukan', 'NOT_FOUND');
      }
      
      return { data: updatedPriceGroups[0], isFromMock: false };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error(`Database operation failed: ${(error as Error).message}`);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    
    console.error('Error updating price group in database:', err);
    
    // Fallback to mock data
    const index = mockPriceGroups.findIndex(pg => pg.id === priceGroupData.id);
    if (index === -1) {
      throw new ApiError(404, 'Group harga tidak ditemukan', 'NOT_FOUND');
    }
    
    mockPriceGroups[index] = {
      ...mockPriceGroups[index],
      ...priceGroupData,
      updatedAt: new Date()
    };
    
    return { data: mockPriceGroups[index], isFromMock: true, error: (err as Error).message };
  }
}

/**
 * Delete a price group from the database with fallback to mock data
 */
async function deletePriceGroupFromDatabase(context: ExtendedApiContext, id: string) {
  try {
    const { db } = context;
    const dbWithModels = db as DatabaseWithModels;
    
    if (!dbWithModels || !dbWithModels.models) {
      console.warn('Database connection not available, using mock price group data');
      // Delete from mock data
      const index = mockPriceGroups.findIndex(pg => pg.id === id);
      if (index === -1) {
        throw new ApiError(404, 'Group harga tidak ditemukan', 'NOT_FOUND');
      }
      
      mockPriceGroups.splice(index, 1);
      return { isFromMock: true };
    }
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), 5000);
    });
    
    // Race between DB operation and timeout
    let result;
    try {
      result = await Promise.race([
        dbWithModels.models.PriceGroup.destroy({
          where: { id }
        }),
        timeoutPromise
      ]);
      
      if (result === 0) {
        throw new ApiError(404, 'Group harga tidak ditemukan', 'NOT_FOUND');
      }
      
      return { isFromMock: false };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error(`Database operation failed: ${(error as Error).message}`);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    
    console.error('Error deleting price group from database:', err);
    
    // Fallback to mock data
    const index = mockPriceGroups.findIndex(pg => pg.id === id);
    if (index === -1) {
      throw new ApiError(404, 'Group harga tidak ditemukan', 'NOT_FOUND');
    }
    
    mockPriceGroups.splice(index, 1);
    return { isFromMock: true, error: (err as Error).message };
  }
}

// Export the handler with API utilities
export default withApiHandler(handler);

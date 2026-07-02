import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

// Mock adapter for fallback
const mockAdapter = {
  getSuppliers: async (filters: any) => {
    throw new Error('Database not available - using mock data');
  },
  getPrincipals: async (filters: any) => {
    throw new Error('Database not available - using mock data');
  },
  createSupplier: async (data: any) => {
    throw new Error('Database not available - using mock data');
  },
  createPrincipal: async (data: any) => {
    throw new Error('Database not available - using mock data');
  }
};

let adapter = mockAdapter;

// Try to initialize real adapter
try {
  const { SupplierAdapter } = require('@/server/sequelize/adapters/supplier-adapter');
  const { sequelize } = require('@/server/database/connection');
  adapter = new SupplierAdapter(sequelize);
} catch (error) {
  console.warn('Could not initialize database adapter, using mock fallback');
}

const requestLogger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data)
};

// Types
interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  taxId?: string;
  status: 'active' | 'inactive';
  paymentTerms?: string;
  bankName?: string;
  bankAccount?: string;
  notes?: string;
  rating?: number;
  categories?: string[];
  registrationDate?: string;
  lastOrder?: string;
  totalOrders?: number;
  totalSpent?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Principal {
  id: string;
  name: string;
  code: string;
  country: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: 'active' | 'inactive';
  categories?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Mock data for fallback
const mockSuppliers: Supplier[] = [
  {
    id: 'S001',
    name: 'PT Pharma Indonesia',
    code: 'PHARIND',
    contactPerson: 'Budi Dharma',
    email: 'budi@pharmaindonesia.com',
    phone: '021-5551234',
    address: 'Jl. Industri Farmasi No. 45',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '13950',
    taxId: '15.555.612.3-017.000',
    status: 'active',
    paymentTerms: 'NET 30',
    bankName: 'Bank Mandiri',
    bankAccount: '1234567890',
    rating: 5,
    categories: ['Obat Bebas', 'Obat Resep'],
    registrationDate: '2024-01-10',
    lastOrder: '2025-04-10',
    totalOrders: 12,
    totalSpent: 156500000,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2025-04-10T00:00:00.000Z'
  },
  {
    id: 'S002',
    name: 'CV Medika Jaya',
    code: 'MEDJAY',
    contactPerson: 'Siti Nurhaliza',
    email: 'siti@medikajaya.co.id',
    phone: '021-7778888',
    address: 'Jl. Kesehatan Raya No. 123',
    city: 'Bandung',
    province: 'Jawa Barat',
    postalCode: '40123',
    taxId: '02.123.456.7-427.000',
    status: 'active',
    paymentTerms: 'NET 14',
    bankName: 'Bank BCA',
    bankAccount: '9876543210',
    rating: 4,
    categories: ['Suplemen', 'Alat Kesehatan'],
    registrationDate: '2024-03-15',
    lastOrder: '2025-03-20',
    totalOrders: 8,
    totalSpent: 89750000,
    createdAt: '2024-03-15T00:00:00.000Z',
    updatedAt: '2025-03-20T00:00:00.000Z'
  }
];

const mockPrincipals: Principal[] = [
  {
    id: 'P001',
    name: 'Pfizer Inc.',
    code: 'PFIZER',
    country: 'USA',
    contactPerson: 'John Smith',
    email: 'contact@pfizer.com',
    phone: '+1-212-733-2323',
    website: 'https://www.pfizer.com',
    status: 'active',
    categories: ['Antibiotik', 'Vaksin'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'P002',
    name: 'Johnson & Johnson',
    code: 'JNJ',
    country: 'USA',
    contactPerson: 'Mary Johnson',
    email: 'contact@jnj.com',
    phone: '+1-732-524-0400',
    website: 'https://www.jnj.com',
    status: 'active',
    categories: ['Perawatan Luka', 'Obat Bebas'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
];

// GET handler with real database integration
async function handleGetSuppliers(req: NextApiRequest, res: NextApiResponse, requestLogger: any) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      type = 'suppliers',
      city = '',
      province = '',
      country = ''
    } = req.query;

    requestLogger.info('Processing GET request', { page, limit, search, status, type });

    let result: any;
    let isFromMock = false;

    try {
      // Try real database query with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 8000)
      );

      if (type === 'principals') {
        const queryPromise = adapter.getPrincipals({
          page: Number(page),
          limit: Number(limit),
          search: search.toString(),
          status: status.toString(),
          country: country.toString()
        });
        
        result = await Promise.race([queryPromise, timeoutPromise]);
        result.data = result.principals;
      } else {
        const queryPromise = adapter.getSuppliers({
          page: Number(page),
          limit: Number(limit),
          search: search.toString(),
          status: status.toString(),
          city: city.toString(),
          province: province.toString()
        });
        
        result = await Promise.race([queryPromise, timeoutPromise]);
        result.data = result.suppliers;
      }

      requestLogger.info('Database query successful', { 
        total: result.pagination.total,
        hasResults: result.data.length > 0 
      });

    } catch (dbError) {
      requestLogger.warn('Database query failed, using mock data', { error: (dbError as Error).message });
      isFromMock = true;

      // Fallback to mock data
      if (type === 'principals') {
        let filteredPrincipals = mockPrincipals;
        
        if (search) {
          filteredPrincipals = filteredPrincipals.filter(p => 
            p.name.toLowerCase().includes(search.toString().toLowerCase()) ||
            p.code.toLowerCase().includes(search.toString().toLowerCase()) ||
            p.country.toLowerCase().includes(search.toString().toLowerCase())
          );
        }
        
        if (status) {
          filteredPrincipals = filteredPrincipals.filter(p => p.status === status);
        }

        if (country) {
          filteredPrincipals = filteredPrincipals.filter(p => 
            p.country.toLowerCase().includes(country.toString().toLowerCase())
          );
        }

        const total = filteredPrincipals.length;
        const startIndex = (Number(page) - 1) * Number(limit);
        const data = filteredPrincipals.slice(startIndex, startIndex + Number(limit));
        const totalPages = Math.ceil(total / Number(limit));

        result = {
          data,
          pagination: { total, page: Number(page), limit: Number(limit), totalPages }
        };
      } else {
        let filteredSuppliers = mockSuppliers;
        
        if (search) {
          filteredSuppliers = filteredSuppliers.filter(s => 
            s.name.toLowerCase().includes(search.toString().toLowerCase()) ||
            s.code.toLowerCase().includes(search.toString().toLowerCase()) ||
            (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toString().toLowerCase()))
          );
        }
        
        if (status) {
          filteredSuppliers = filteredSuppliers.filter(s => s.status === status);
        }

        if (city) {
          filteredSuppliers = filteredSuppliers.filter(s => 
            s.city && s.city.toLowerCase().includes(city.toString().toLowerCase())
          );
        }

        if (province) {
          filteredSuppliers = filteredSuppliers.filter(s => 
            s.province && s.province.toLowerCase().includes(province.toString().toLowerCase())
          );
        }

        const total = filteredSuppliers.length;
        const startIndex = (Number(page) - 1) * Number(limit);
        const data = filteredSuppliers.slice(startIndex, startIndex + Number(limit));
        const totalPages = Math.ceil(total / Number(limit));

        result = {
          data,
          pagination: { total, page: Number(page), limit: Number(limit), totalPages }
        };
      }
    }

    requestLogger.info('GET request completed', { 
      total: result.pagination.total, 
      page: result.pagination.page, 
      totalPages: result.pagination.totalPages,
      dataType: type,
      hasResults: result.data.length > 0,
      isFromMock
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: `${type === 'principals' ? 'Principals' : 'Suppliers'} retrieved successfully`,
      isFromMock,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    requestLogger.error('Error in GET handler', { error: (error as Error).message });
    
    // Fallback to basic mock data
    const data = req.query.type === 'principals' ? mockPrincipals.slice(0, 2) : mockSuppliers.slice(0, 2);
    
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total: data.length,
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

// POST handler
async function handleCreateSupplier(req: NextApiRequest, res: NextApiResponse, requestLogger: any) {
  try {
    const { type = 'suppliers' } = req.query;
    const data = req.body;

    requestLogger.info('Creating new entry', { type, data });

    // Validate required fields
    if (type === 'suppliers') {
      if (!data.name || !data.code || !data.phone) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, code, phone',
          timestamp: new Date().toISOString()
        });
      }
    } else if (type === 'principals') {
      if (!data.name || !data.code || !data.country) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, code, country',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Simulate database creation
    const createPromise = new Promise((resolve) => {
      setTimeout(() => {
        const newId = type === 'principals' ? 
          `P${String(mockPrincipals.length + 1).padStart(3, '0')}` :
          `S${String(mockSuppliers.length + 1).padStart(3, '0')}`;

        const newEntry = {
          id: newId,
          ...data,
          status: data.status || 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(type === 'suppliers' && {
            registrationDate: new Date().toISOString().split('T')[0],
            totalOrders: 0,
            totalSpent: 0
          })
        };

        if (type === 'principals') {
          mockPrincipals.push(newEntry);
        } else {
          mockSuppliers.push(newEntry);
        }

        resolve(newEntry);
      }, 200);
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database creation timeout')), 10000);
    });

    const result = await Promise.race([createPromise, timeoutPromise]);

    requestLogger.info('Successfully created entry', { id: (result as any).id });

    return res.status(201).json({
      success: true,
      data: result,
      message: `${type === 'principals' ? 'Principal' : 'Supplier'} berhasil dibuat (simulasi)`,
      isFromMock: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    requestLogger.error('Error in POST handler', { error: (error as Error).message });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: (error as Error).message,
      isFromMock: false,
      timestamp: new Date().toISOString()
    });
  }
}

// PUT handler
async function handleUpdateSupplier(req: NextApiRequest, res: NextApiResponse, requestLogger: any) {
  try {
    const { type = 'suppliers' } = req.query;
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: id',
        timestamp: new Date().toISOString()
      });
    }

    requestLogger.info('Updating entry', { type, id, updateData });

    // Simulate database update
    const updatePromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        const dataArray = type === 'principals' ? mockPrincipals : mockSuppliers;
        const index = dataArray.findIndex((item: any) => item.id === id);

        if (index === -1) {
          reject(new Error(`${type === 'principals' ? 'Principal' : 'Supplier'} not found`));
          return;
        }

        const updatedEntry = {
          ...dataArray[index],
          ...updateData,
          updatedAt: new Date().toISOString()
        };

        dataArray[index] = updatedEntry;
        resolve(updatedEntry);
      }, 200);
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database update timeout')), 10000);
    });

    const result = await Promise.race([updatePromise, timeoutPromise]);

    requestLogger.info('Successfully updated entry', { id });

    return res.status(200).json({
      success: true,
      data: result,
      message: `${type === 'principals' ? 'Principal' : 'Supplier'} berhasil diperbarui (simulasi)`,
      isFromMock: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    requestLogger.error('Error in PUT handler', { error: (error as Error).message });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: (error as Error).message,
      isFromMock: false,
      timestamp: new Date().toISOString()
    });
  }
}

// DELETE handler
async function handleDeleteSupplier(req: NextApiRequest, res: NextApiResponse, requestLogger: any) {
  try {
    const { type = 'suppliers', id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: id',
        timestamp: new Date().toISOString()
      });
    }

    requestLogger.info('Deleting entry', { type, id });

    // Simulate database deletion
    const deletePromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        const dataArray = type === 'principals' ? mockPrincipals : mockSuppliers;
        const index = dataArray.findIndex((item: any) => item.id === id);

        if (index === -1) {
          reject(new Error(`${type === 'principals' ? 'Principal' : 'Supplier'} not found`));
          return;
        }

        dataArray.splice(index, 1);
        resolve({ id, deleted: true });
      }, 200);
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database deletion timeout')), 10000);
    });

    const result = await Promise.race([deletePromise, timeoutPromise]);

    requestLogger.info('Successfully deleted entry', { id });

    return res.status(200).json({
      success: true,
      data: result,
      message: `${type === 'principals' ? 'Principal' : 'Supplier'} berhasil dihapus (simulasi)`,
      isFromMock: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    requestLogger.error('Error in DELETE handler', { error: (error as Error).message });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: (error as Error).message,
      isFromMock: false,
      timestamp: new Date().toISOString()
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authentication check for production
  const session = await getServerSession(req, res, {});
  
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  const requestLogger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
    warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data),
    child: (meta: any) => ({
      info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
      warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data),
      error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data)
    })
  };

  const operationLogger = requestLogger.child({ 
    method: req.method, 
    url: req.url,
    userId: session.user?.id || 'unknown',
    timestamp: new Date().toISOString()
  });

  operationLogger.info('Processing authenticated supplier/principal API request');

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetSuppliers(req, res, requestLogger);
      case 'POST':
        return await handleCreateSupplier(req, res, requestLogger);
      case 'PUT':
        return await handleUpdateSupplier(req, res, requestLogger);
      case 'DELETE':
        return await handleDeleteSupplier(req, res, requestLogger);
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

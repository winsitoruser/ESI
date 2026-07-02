import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const db = require('../../../models');
const Customer = db.Customer;

// Sample customer data with red-orange theme for status indicators (used as fallback when database is unavailable)
const mockCustomers = [
  {
    id: 'C001',
    name: 'Budi Santoso',
    memberNumber: 'FM-001-2025',
    gender: 'male',
    birthDate: '1985-06-12',
    email: 'budi.santoso@example.com',
    phone: '081234567890',
    address: 'Jl. Kemanggisan Raya No. 10, Jakarta Barat',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '11480',
    registrationDate: '2025-01-15',
    type: 'regular',
    statusColor: '#f97316', // Orange for regular customers
    points: 450,
    totalSpent: 1250000,
    lastVisit: '2025-04-10',
    medicalInfo: {
      allergies: ['Penisilin', 'Sulfa'],
      chronicConditions: ['Hipertensi'],
      currentMedications: ['Amlodipin 5mg'],
      notes: 'Pasien rutin kontrol tekanan darah setiap bulan'
    }
  },
  {
    id: 'C002',
    name: 'Siti Nurhayati',
    memberNumber: 'FM-002-2025',
    gender: 'female',
    birthDate: '1990-03-25',
    email: 'siti.nurhayati@example.com',
    phone: '081345678901',
    address: 'Jl. Sudirman No. 42, Jakarta Selatan',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '12190',
    registrationDate: '2025-01-20',
    type: 'premium',
    statusColor: '#ef4444', // Red for premium customers
    points: 1250,
    totalSpent: 4750000,
    lastVisit: '2025-04-15',
    medicalInfo: {
      allergies: [],
      chronicConditions: ['Diabetes Tipe 2'],
      currentMedications: ['Metformin 500mg', 'Glimepiride 2mg'],
      notes: 'Pasien rutin cek gula darah setiap minggu'
    }
  },
  {
    id: 'C003',
    name: 'Ahmad Rizki',
    memberNumber: 'FM-003-2025',
    gender: 'male',
    birthDate: '1978-11-17',
    email: 'ahmad.rizki@example.com',
    phone: '081456789012',
    address: 'Jl. Tebet Raya No. 15, Jakarta Selatan',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '12810',
    registrationDate: '2025-02-05',
    type: 'premium',
    statusColor: '#ef4444', // Red for premium customers
    points: 2100,
    totalSpent: 7800000,
    lastVisit: '2025-04-17',
    medicalInfo: {
      allergies: ['Aspirin'],
      chronicConditions: ['Asma'],
      currentMedications: ['Salbutamol Inhaler'],
      notes: 'Pasien memiliki riwayat serangan asma akut'
    }
  },
  {
    id: 'C004',
    name: 'Dewi Lestari',
    memberNumber: 'FM-004-2025',
    gender: 'female',
    birthDate: '1995-08-30',
    email: 'dewi.lestari@example.com',
    phone: '081567890123',
    address: 'Jl. Thamrin No. 5, Jakarta Pusat',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '10350',
    registrationDate: '2025-02-15',
    type: 'regular',
    statusColor: '#f97316', // Orange for regular customers
    points: 300,
    totalSpent: 850000,
    lastVisit: '2025-04-05',
    medicalInfo: {
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      notes: 'Pasien sehat tanpa riwayat penyakit kronis'
    }
  },
  {
    id: 'C005',
    name: 'Rudi Wijaya',
    memberNumber: 'FM-005-2025',
    gender: 'male',
    birthDate: '1982-04-03',
    email: 'rudi.wijaya@example.com',
    phone: '081678901234',
    address: 'Jl. Gatot Subroto No. 25, Jakarta Selatan',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '12950',
    registrationDate: '2025-03-10',
    type: 'corporate',
    statusColor: '#b91c1c', // Dark red for corporate customers
    points: 1600,
    totalSpent: 5500000,
    lastVisit: '2025-04-12',
    medicalInfo: {
      allergies: ['Seafood'],
      chronicConditions: ['Kolesterol Tinggi'],
      currentMedications: ['Simvastatin 20mg'],
      notes: 'Pasien perlu kontrol lipid darah secara berkala'
    },
    company: {
      name: 'PT Teknologi Maju',
      contactPerson: 'Hendra Setiawan',
      contactEmail: 'hendra@teknologimaju.com',
      contactPhone: '02155667788'
    }
  }
];

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ApiContext
) {
  // Authenticate user
  const user = await authenticateUser(req);
  
  // Check if user has permissions to access customer data
  if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'CASHIER', 'PHARMACIST'])) {
    throw new ApiError(403, 'Unauthorized access to customer data', 'PERMISSION_ERROR');
  }
  
  // Get tenant ID from user session
  const tenantId = user?.tenantId;
  
  if (!tenantId) {
    throw new ApiError(400, 'Tenant ID is required', 'VALIDATION_ERROR');
  }
  
  // Handle different HTTP methods
  if (req.method === 'GET') {
    // Parse query parameters with validation
    const params = parseQueryParams<{
      page: number;
      limit: number;
      search: string;
      id: string;
    }>(req, {
      page: { type: 'number', default: 1 },
      limit: { type: 'number', default: 10 },
      search: { type: 'string', default: '' },
      id: { type: 'string' }
    });
    
    try {
      // If specific customer ID is requested
      if (params.id) {
        const customer = await getCustomerById(params.id, tenantId);
        if (!customer) {
          throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
        }
        return success(res, customer);
      }
      
      // Otherwise get all customers with pagination
      const offset = (params.page - 1) * params.limit;
      const customersData = await getCustomers(tenantId, params.limit, offset, { search: params.search });
      return success(res, customersData);
    } catch (dbError) {
      console.error('Database error fetching customers:', dbError);
      
      // Fall back to mock data when database is unavailable
      console.warn('Falling back to mock customer data');
      
      // If specific customer ID is requested in offline mode
      if (params.id) {
        const customer = mockCustomers.find(c => c.id === params.id);
        if (!customer) {
          throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
        }
        
        // Return response with fallback warning header
        res.setHeader('X-Data-Source', 'fallback');
        return success(res, { ...customer, isFallback: true });
      }
      
      // Filter customers based on search query for fallback
      let filteredCustomers = [...mockCustomers];
      
      if (params.search) {
        const searchLower = params.search.toLowerCase();
        filteredCustomers = mockCustomers.filter(c => 
          c.name.toLowerCase().includes(searchLower) || 
          c.phone?.includes(params.search) || 
          c.email?.toLowerCase().includes(searchLower)
        );
      }
      
      // Paginate results
      const startIndex = (params.page - 1) * params.limit;
      const endIndex = startIndex + params.limit;
      const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
      
      // Return response with fallback warning header
      res.setHeader('X-Data-Source', 'fallback');
      return success(res, {
        customers: paginatedCustomers,
        total: filteredCustomers.length,
        hasMore: endIndex < filteredCustomers.length,
        isFallback: true
      });
    }
  } else if (req.method === 'POST') {
    try {
      // Add tenant ID to customer data
      const customerData = {
        ...req.body,
        tenantId
      };
      
      // Create new customer
      const newCustomer = await createCustomer(customerData);
      return success(res, newCustomer, 201);
    } catch (dbError) {
      console.error('Error creating customer:', dbError);
      throw new ApiError(500, 'Failed to create customer', 'DATABASE_ERROR');
    }
  } else if (req.method === 'PUT') {
    // Parse query parameters
    const params = parseQueryParams<{ id: string }>(req, {
      id: { type: 'string', required: true }
    });
    
    try {
      // Update customer
      const updatedCustomer = await updateCustomer(params.id, req.body, tenantId);
      
      if (!updatedCustomer) {
        throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
      }
      
      return success(res, updatedCustomer);
    } catch (dbError) {
      console.error('Error updating customer:', dbError);
      
      // Check if it's a not found error
      if ((dbError as any).code === 'P2025') {
        throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
      }
      
      throw new ApiError(500, 'Failed to update customer', 'DATABASE_ERROR');
    }
  } else if (req.method === 'DELETE') {
    // Parse query parameters
    const params = parseQueryParams<{ id: string }>(req, {
      id: { type: 'string', required: true }
    });
    
    try {
      // Delete customer
      const result = await deleteCustomer(params.id, tenantId);
      
      if (!result) {
        throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
      }
      
      return success(res, { message: 'Customer deleted successfully' });
    } catch (dbError) {
      console.error('Error deleting customer:', dbError);
      
      // Check if it's a not found error
      if ((dbError as any).code === 'P2025') {
        throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
      }
      
      throw new ApiError(500, 'Failed to delete customer', 'DATABASE_ERROR');
    }
  } else {
    throw new ApiError(405, 'Method not allowed', 'METHOD_ERROR');
  }
}

// Export the handler with API utilities
export default withApiHandler(handler);

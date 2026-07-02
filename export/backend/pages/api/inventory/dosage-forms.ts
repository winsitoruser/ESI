import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { withApiHandler, success, error, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import { logger } from '@/server/monitoring';
import dosageAdapter from '@/server/sequelize/adapters/inventory-dosage-adapter';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Extend ApiContext to include session
interface ExtendedApiContext extends ApiContext {
  session?: {
    user?: {
      tenantId?: string;
      id?: string;
      role?: string;
    };
  };
}

// Create a child logger for this API endpoint
const apiLogger = logger.child({
  endpoint: 'api/inventory/dosage-forms',
});

// Mock data is now handled by the adapter
/*const mockDosageForms = [
  {
    id: '1',
    name: 'Tablet',
    description: 'Bentuk sediaan padat yang mengandung bahan obat dengan atau tanpa bahan pengisi',
    productCount: 15,
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-03-15')
  },
  {
    id: '2',
    name: 'Kapsul',
    description: 'Sediaan padat yang terdiri dari obat dalam cangkang keras atau lunak yang dapat larut',
    productCount: 23,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-04-10')
  },
  {
    id: '3',
    name: 'Sirup',
    description: 'Sediaan cair yang mengandung sukrosa atau gula lain yang berasa manis',
    productCount: 8,
    createdAt: new Date('2025-02-20'),
    updatedAt: new Date('2025-04-05')
  },
  {
    id: '4',
    name: 'Suspensi',
    description: 'Sediaan cair yang mengandung partikel padat tidak larut yang terdispersi dalam fase cair',
    productCount: 12,
    createdAt: new Date('2025-02-15'),
    updatedAt: new Date('2025-04-18')
  },
  {
    id: '5',
    name: 'Salep',
    description: 'Sediaan setengah padat yang digunakan untuk aplikasi eksternal pada kulit atau selaput lendir',
    productCount: 5,
    createdAt: new Date('2025-03-10'),
    updatedAt: new Date('2025-04-25')
  }
];*/

/**
 * Handle dosage forms requests
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ExtendedApiContext
) {
  apiLogger.info(`Dosage forms API called`, { method: req.method });

  // Verify authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    apiLogger.warn('Unauthorized access attempt');
    return res.status(401).json({ 
      success: false,
      message: 'Unauthorized',
      meta: { authenticated: false } 
    });
  }

  // Get tenant ID from session
  const tenantId = session.user?.tenantId;
  if (!tenantId) {
    apiLogger.warn('Missing tenant ID in authenticated session');
    return res.status(400).json({ 
      success: false,
      message: 'Missing tenant information',
      meta: { authenticated: true } 
    });
  }
  
  // Ensure user is authorized for inventory module
  const allowedRoles = ['ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER', 'STAFF'];
  if (!allowedRoles.includes(session.user.role)) {
    apiLogger.warn(`Forbidden access attempt by user with role ${session.user.role}`);
    return res.status(403).json({ 
      success: false,
      message: 'Anda tidak memiliki akses ke modul inventory',
      meta: { authenticated: true } 
    });
  }
  
  // Deny write operations for read-only users
  const isReadOnlyUser = session.user.role === 'CASHIER' || session.user.role === 'STAFF';
  if (isReadOnlyUser && req.method !== 'GET') {
    apiLogger.warn(`Read-only user ${session.user.id} attempted write operation`);
    return res.status(403).json({ 
      success: false,
      message: 'Anda hanya memiliki akses baca untuk modul ini',
      meta: { authenticated: true } 
    });
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getDosageForms(req, res, context);
    case 'POST':
      return createDosageForm(req, res, context);
    case 'PUT':
      return updateDosageForm(req, res, context);
    case 'DELETE':
      return deleteDosageForm(req, res, context);
    default:
      throw new ApiError(405, 'Metode tidak diperbolehkan', 'METHOD_NOT_ALLOWED');
  }
}

/**
 * GET - get all dosage forms
 */
async function getDosageForms(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    // Get tenant ID from session
    const session = await getServerSession(req, res, authOptions);
    const tenantId = session?.user?.tenantId;
    
    apiLogger.info('Fetching all dosage forms', { tenantId });
    
    // Set timeout promise (5 seconds for client-facing API)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('API timeout')), 5000)
    );
    
    // Race between adapter call and timeout
    let result;
    try {
      result = await Promise.race([
        dosageAdapter.getDosageForms(tenantId),
        timeoutPromise
      ]);
      
      apiLogger.info('Successfully retrieved dosage forms', { 
        count: result.dosageForms.length,
        isMock: result.isMock 
      });
    } catch (error) {
      apiLogger.error('Error or timeout fetching dosage forms:', error);
      result = await dosageAdapter.getDosageForms(tenantId);
    }
    
    return success(res, {
      message: result.isMock ? 'Data bentuk sediaan (simulasi)' : 'Data bentuk sediaan',
      data: result.dosageForms,
      isFromMock: result.isMock
    });
  } catch (err) {
    apiLogger.error('Unhandled error fetching dosage forms:', err);
    return error(res, 'Terjadi kesalahan saat mengambil data bentuk sediaan', 500);
  }
}

/**
 * POST - create a new dosage form
 */
async function createDosageForm(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    const dosageFormData = req.body;
    
    if (!dosageFormData.name) {
      apiLogger.warn('Validation error: name field is required');
      return error(res, 'Nama bentuk sediaan tidak boleh kosong', 400);
    }
    
    // Get tenant ID from session
    const session = await getServerSession(req, res, authOptions);
    const tenantId = session?.user?.tenantId;
    
    apiLogger.info('Creating new dosage form', { 
      name: dosageFormData.name,
      tenantId 
    });
    
    // Set timeout promise (5 seconds for client-facing API)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('API timeout')), 5000)
    );
    
    // Race between adapter call and timeout
    let result;
    try {
      result = await Promise.race([
        dosageAdapter.createDosageForm(dosageFormData, tenantId),
        timeoutPromise
      ]);
      
      apiLogger.info('Successfully created dosage form', { 
        id: result.data.id,
        name: result.data.name,
        isMock: result.isMock 
      });
    } catch (error) {
      apiLogger.error('Error or timeout creating dosage form:', error);
      result = await dosageAdapter.createDosageForm(dosageFormData, tenantId);
    }
    
    return success(res, {
      message: result.isMock ? 'Bentuk sediaan berhasil ditambahkan (simulasi)' : 'Bentuk sediaan berhasil ditambahkan',
      data: result.data,
      isFromMock: result.isMock
    });
  } catch (err) {
    apiLogger.error('Unhandled error creating dosage form:', err);
    return error(res, 'Terjadi kesalahan saat menambahkan bentuk sediaan', 500);
  }
}

/**
 * PUT - update an existing dosage form
 */
async function updateDosageForm(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    const dosageFormData = req.body;
    
    if (!dosageFormData.id) {
      apiLogger.warn('Validation error: id field is required');
      return error(res, 'ID bentuk sediaan diperlukan', 400);
    }
    
    if (!dosageFormData.name) {
      apiLogger.warn('Validation error: name field is required');
      return error(res, 'Nama bentuk sediaan tidak boleh kosong', 400);
    }
    
    // Get tenant ID from session
    const session = await getServerSession(req, res, authOptions);
    const tenantId = session?.user?.tenantId;
    
    apiLogger.info('Updating dosage form', { 
      id: dosageFormData.id,
      name: dosageFormData.name,
      tenantId 
    });
    
    // Set timeout promise (5 seconds for client-facing API)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('API timeout')), 5000)
    );
    
    // Race between adapter call and timeout
    let result;
    try {
      result = await Promise.race([
        dosageAdapter.updateDosageForm(dosageFormData.id, dosageFormData, tenantId),
        timeoutPromise
      ]);
      
      // Check if dosage form was found
      if (!result.data) {
        apiLogger.warn('Dosage form not found', { id: dosageFormData.id });
        return error(res, 'Bentuk sediaan tidak ditemukan', 404);
      }
      
      apiLogger.info('Successfully updated dosage form', { 
        id: result.data.id,
        isMock: result.isMock 
      });
    } catch (error) {
      apiLogger.error('Error or timeout updating dosage form:', error);
      result = await dosageAdapter.updateDosageForm(dosageFormData.id, dosageFormData, tenantId);
      
      // Check if dosage form was found after fallback
      if (!result.data) {
        return error(res, 'Bentuk sediaan tidak ditemukan', 404);
      }
    }
    
    return success(res, {
      message: result.isMock ? 'Bentuk sediaan berhasil diperbarui (simulasi)' : 'Bentuk sediaan berhasil diperbarui',
      data: result.data,
      isFromMock: result.isMock
    });
  } catch (err) {
    apiLogger.error('Unhandled error updating dosage form:', err);
    return error(res, 'Terjadi kesalahan saat memperbarui bentuk sediaan', 500);
  }
}

/**
 * DELETE - delete a dosage form
 */
async function deleteDosageForm(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    const { id } = req.query;
    
    if (!id) {
      apiLogger.warn('Validation error: id parameter is required');
      return error(res, 'ID bentuk sediaan diperlukan', 400);
    }
    
    // Get tenant ID from session
    const session = await getServerSession(req, res, authOptions);
    const tenantId = session?.user?.tenantId;
    
    apiLogger.info('Deleting dosage form', { 
      id,
      tenantId 
    });
    
    // Set timeout promise (5 seconds for client-facing API)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('API timeout')), 5000)
    );
    
    // Race between adapter call and timeout
    let result;
    try {
      result = await Promise.race([
        dosageAdapter.deleteDosageForm(id as string, tenantId),
        timeoutPromise
      ]);
      
      // Check if deletion was successful
      if (!result.success) {
        apiLogger.warn('Dosage form not found for deletion', { id });
        return error(res, 'Bentuk sediaan tidak ditemukan', 404);
      }
      
      apiLogger.info('Successfully deleted dosage form', { 
        id,
        isMock: result.isMock 
      });
    } catch (error) {
      apiLogger.error('Error or timeout deleting dosage form:', error);
      result = await dosageAdapter.deleteDosageForm(id as string, tenantId);
      
      // Check if deletion was successful after fallback
      if (!result.success) {
        return error(res, 'Bentuk sediaan tidak ditemukan', 404);
      }
    }
    
    return success(res, {
      message: result.isMock ? 'Bentuk sediaan berhasil dihapus (simulasi)' : 'Bentuk sediaan berhasil dihapus',
      data: { id },
      isFromMock: result.isMock
    });
  } catch (err) {
    apiLogger.error('Unhandled error deleting dosage form:', err);
    return error(res, 'Terjadi kesalahan saat menghapus bentuk sediaan', 500);
  }
}

// These functions have been moved to the inventory-dosage-adapter

// Export the handler with API utilities
export default withApiHandler(handler);

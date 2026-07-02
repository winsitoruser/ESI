import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { withApiHandler, success, error, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import logger from '@/lib/logger';

// Extend ApiContext to include session
interface ExtendedApiContext extends ApiContext {
  session?: {
    user?: {
      tenantId?: string;
    };
  };
  user?: {
    tenantId?: string;
  };
  tenantId?: string;
}

// Types
interface ExpiryItem {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  uom: string;
  expiryDate: Date;
  daysRemaining: number;
  status: string;
  price: number;
  totalValue: number;
  location: string;
  supplier: string;
  category: string;
  notificationSent: boolean;
}

// Expiry status thresholds in days
const EXPIRED = 0;
const CRITICAL = 30;  // Less than 30 days
const WARNING = 90;   // Less than 90 days

// Helper function to calculate days between dates
const getDaysBetween = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const timeDiff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Generate mock expiry data
const generateMockExpiryData = (): ExpiryItem[] => {
  const mockItems: ExpiryItem[] = [];
  const today = new Date();
  
  const names = ['Paracetamol 500mg', 'Amoxicillin 500mg', 'Simvastatin 20mg', 'Metformin 850mg', 'Omeprazole 20mg', 
                 'Amlodipine 5mg', 'Loratadine 10mg', 'Cetirizine 10mg', 'Diclofenac 50mg', 'Ibuprofen 400mg'];
  
  const suppliers = ['PT Kimia Farma', 'PT Kalbe Farma', 'PT Sanbe Farma', 'PT Dexa Medica', 'PT Pharos'];
  const locations = ['Rak A', 'Rak B', 'Rak C', 'Gudang Utama', 'Etalase'];
  const categories = ['Analgesik', 'Antibiotik', 'Antihipertensi', 'Antihistamin', 'Antidiabetes'];
  const uoms = ['Tablet', 'Kapsul', 'Strip', 'Botol', 'Box'];
  
  for (let i = 0; i < 10; i++) {
    // Generate random expiry date - Some expired, some critical, some warning, some good
    let expiryDate = new Date();
    let status = '';
    
    // Distribute different expiry ranges
    const rand = Math.random();
    if (rand < 0.2) {
      // Expired
      expiryDate = new Date(today.getTime() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000);
      status = 'expired';
    } else if (rand < 0.4) {
      // Critical (less than 30 days)
      expiryDate = new Date(today.getTime() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
      status = 'critical';
    } else if (rand < 0.7) {
      // Warning (30-90 days)
      expiryDate = new Date(today.getTime() + (30 + Math.floor(Math.random() * 60)) * 24 * 60 * 60 * 1000);
      status = 'warning';
    } else {
      // Good (more than 90 days)
      expiryDate = new Date(today.getTime() + (90 + Math.floor(Math.random() * 180)) * 24 * 60 * 60 * 1000);
      status = 'good';
    }
    
    const daysRemaining = getDaysBetween(today, expiryDate) * (status === 'expired' ? -1 : 1);
    const price = 10000 + Math.floor(Math.random() * 90000);
    const quantity = 5 + Math.floor(Math.random() * 95);
    
    mockItems.push({
      id: `exp-${i + 1}`,
      productId: `prod-${i + 1}`,
      productName: names[i % names.length],
      batchNumber: `B${Math.floor(Math.random() * 9000) + 1000}`,
      quantity,
      uom: uoms[i % uoms.length],
      expiryDate,
      daysRemaining,
      status,
      price,
      totalValue: price * quantity,
      location: locations[i % locations.length],
      supplier: suppliers[i % suppliers.length],
      category: categories[i % categories.length],
      notificationSent: Math.random() > 0.5
    });
  }
  
  return mockItems;
};

// API handler
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ExtendedApiContext
) {
  try {
    // Authenticate user
    const user = await authenticateUser(req, res);
    
    // Check if user is authorized for inventory module
    if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'PHARMACIST'])) {
      throw new ApiError(403, 'Anda tidak memiliki akses ke modul Kadaluarsa', 'FORBIDDEN');
    }
    
    // For GET requests, return expiry data
    if (req.method === 'GET') {
      // Generate mock data (in production, would fetch from database)
      const expiryData = generateMockExpiryData();
      
      // Simulate empty data 20% of the time to test empty state handling
      const shouldReturnEmpty = false; // Set to Math.random() < 0.2 for testing
      
      if (shouldReturnEmpty) {
        return success(res, {
          success: true,
          data: [],
          message: 'Tidak ada data kadaluarsa',
          isFromMock: true
        });
      }
      
      return success(res, {
        success: true,
        data: expiryData,
        message: 'Data produk kadaluarsa',
        isFromMock: true
      });
    }
    
    // For unsupported methods
    throw new ApiError(405, 'Metode tidak diperbolehkan', 'METHOD_NOT_ALLOWED');
    
  } catch (err) {
    logger.error('Error in expiry API:', err);
    
    // Handle known API errors
    if (err instanceof ApiError) {
      return error(res, err.message, err.statusCode);
    }
    
    // Handle unexpected errors
    return error(res, 'Terjadi kesalahan saat mengambil data kadaluarsa', 500);
  }
}

// Export with API utilities wrapper
export default withApiHandler(handler);

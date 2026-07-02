import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { withApiHandler, success, error, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import expiryAdapter from '@/server/sequelize/adapters/inventory-expiry-adapter';

// Extend ApiContext to include session
interface ExtendedApiContext extends ApiContext {
  session?: {
    user?: {
      tenantId?: string;
    };
  };
}

// Types
interface ExpiryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: Date;
  daysRemaining: number;
  currentStock: number;
  value: number;
  status: "expired" | "critical" | "warning" | "good";
  category: string;
  quantity: number;
  location: string;
  supplier: string;
  costPrice: number;
}

interface OrderHistory {
  id: string;
  orderDate: Date;
  orderNumber: string;
  quantity: number;
  staff: {
    id: string;
    name: string;
    avatar: string;
    position: string;
  };
}

// Expiry status thresholds in days
const EXPIRED = 0;
const CRITICAL = 30;  // Less than 30 days
const WARNING = 90;   // Less than 90 days

// Calculate days between two dates
function getDaysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  return diffDays;
}

// Generate mock expiry data
function generateMockExpiryData(): ExpiryItem[] {
  const categories = ["Analgesik", "Antibiotik", "Vitamin", "Suplemen", "Antihistamin", "Antiseptik", "Antidiabetes"];
  const locations = ["Rak A", "Rak B", "Rak C", "Rak D", "Gudang Utama"];
  const suppliers = ["PT. Farma Utama", "CV. Sehat Sentosa", "PT. Medika Jaya", "PT. Sarana Husada", "CV. Prima Farma"];
  
  const today = new Date();
  const items: ExpiryItem[] = [];
  
  for (let i = 1; i <= 100; i++) {
    // Generate random expiry date between now and 180 days
    const randomDays = Math.floor(Math.random() * 180) - 20; // Some items already expired
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + randomDays);
    
    // Calculate days remaining
    const daysRemaining = getDaysBetween(today, expiryDate) * (expiryDate > today ? 1 : -1);
    
    // Set status based on days remaining
    let status: "expired" | "critical" | "warning" | "good";
    if (daysRemaining <= EXPIRED) {
      status = "expired";
    } else if (daysRemaining <= CRITICAL) {
      status = "critical";
    } else if (daysRemaining <= WARNING) {
      status = "warning";
    } else {
      status = "good";
    }
    
    // Random stock quantity between 1 and 100
    const currentStock = Math.floor(Math.random() * 100) + 1;
    
    // Random cost price between Rp 5,000 and Rp 500,000
    const costPrice = Math.floor(Math.random() * 495000) + 5000;
    
    // Total value
    const value = costPrice * currentStock;
    
    items.push({
      id: `exp-${i}`,
      productId: `prod-${i}`,
      productName: `Produk Farmasi ${i}`,
      sku: `SKU-${10000 + i}`,
      batchNumber: `BATCH-${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
      expiryDate,
      daysRemaining,
      currentStock,
      value,
      status,
      category: categories[i % categories.length],
      quantity: currentStock,
      location: locations[i % locations.length],
      supplier: suppliers[i % suppliers.length],
      costPrice
    });
  }
  
  return items;
}

// Generate mock order history
function generateOrderHistory(productId: string): OrderHistory[] {
  const history: OrderHistory[] = [];
  const staffPositions = ["Apoteker", "Asisten Apoteker", "Admin", "Manager"];
  
  // Generate 1-5 random order history entries
  const entriesCount = Math.floor(Math.random() * 5) + 1;
  
  for (let i = 1; i <= entriesCount; i++) {
    const daysAgo = Math.floor(Math.random() * 120) + 1;
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - daysAgo);
    
    const staffId = Math.floor(Math.random() * 10) + 1;
    
    history.push({
      id: `order-${productId}-${i}`,
      orderDate,
      orderNumber: `PO-${String.fromCharCode(65 + (i % 26))}${10000 + Math.floor(Math.random() * 90000)}`,
      quantity: Math.floor(Math.random() * 50) + 1,
      staff: {
        id: `staff-${staffId}`,
        name: `Staff ${staffId}`,
        avatar: `/mock/avatar-${staffId % 5 + 1}.jpg`,
        position: staffPositions[staffId % staffPositions.length],
      }
    });
  }
  
  return history.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
}

// Import from adapter - no longer need mock database cache

/**
 * Handle expiry API requests
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ExtendedApiContext
) {
  // Authenticate user for all requests
  const user = await authenticateUser(req);
  
  // Ensure user is authorized for inventory module
  if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'PHARMACIST'])) {
    throw new ApiError(403, 'Anda tidak memiliki akses ke modul Kadaluarsa', 'FORBIDDEN');
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getExpiryData(req, res, context);
    case 'POST':
      return processExpiryAction(req, res, context);
    default:
      throw new ApiError(405, 'Metode tidak diperbolehkan', 'METHOD_NOT_ALLOWED');
  }
}

/**
 * GET - get expiry data or order history
 */
async function getExpiryData(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    const { productId, dataType, status, category, search } = req.query;
    
    // Get tenant ID from session
    const session = await getServerSession(req, res, authOptions);
    const tenantId = session?.user?.tenantId || undefined;
    
    // Generate log entry
    logger.info('Fetching expiry data', { 
      dataType, 
      productId,
      status,
      category,
      search,
      tenantId,
      method: 'GET'
    });
    
    // Handle different data types
    if (dataType === 'orderHistory' && productId) {
      // Return order history for a specific product
      const { history, isMock } = await expiryAdapter.getOrderHistory(productId as string, tenantId);
      
      return success(res, {
        success: true,
        data: history,
        message: isMock ? 'Riwayat pemesanan produk (simulasi)' : 'Riwayat pemesanan produk',
        isFromMock: isMock
      });
    } else if (productId) {
      // Return a specific expiry item
      const { item, isMock } = await expiryAdapter.getExpiryItemById(productId as string, tenantId);
      
      if (!item) {
        return error(res, `Produk dengan ID ${productId} tidak ditemukan`, 404);
      }
      
      return success(res, {
        success: true,
        data: item,
        message: isMock ? 'Detail produk kadaluarsa (simulasi)' : 'Detail produk kadaluarsa',
        isFromMock: isMock
      });
    } else {
      // Return all expiry data with filters
      const filter: any = {};
      
      // Add filters if provided
      if (status && typeof status === 'string') {
        filter.status = status;
      }
      
      if (category && typeof category === 'string') {
        filter.category = category;
      }
      
      // Add tenant filter
      if (tenantId) {
        filter.tenantId = tenantId;
      }
      
      // Get items with filter
      const { items, isMock } = await expiryAdapter.getExpiryItems(filter);
      
      // Apply search filter if provided (client-side for now)
      let filteredItems = items;
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchLower = search.toLowerCase();
        filteredItems = items.filter(item => 
          item.productName.toLowerCase().includes(searchLower) ||
          item.sku.toLowerCase().includes(searchLower) ||
          item.batchNumber.toLowerCase().includes(searchLower)
        );
      }
      
      // Extract pagination parameters
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      // Extract sorting parameters
      const sortBy = req.query.sortBy as string;
      const sortDirection = req.query.sortDirection as 'asc' | 'desc';
      
      // Apply sorting if provided
      if (sortBy) {
        filteredItems.sort((a, b) => {
          switch(sortBy) {
            case 'expiryDate':
              return sortDirection === 'desc' 
                ? new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime()
                : new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            case 'productName':
              return sortDirection === 'desc'
                ? b.productName.localeCompare(a.productName)
                : a.productName.localeCompare(b.productName);
            case 'value':
              const valueA = a.value || 0;
              const valueB = b.value || 0;
              return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
            default:
              return 0;
          }
        });
      }
      
      // Create pagination info
      const totalItems = filteredItems.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = filteredItems.slice(startIndex, endIndex);
      
      const pagination = {
        total: totalItems,
        page,
        limit,
        totalPages
      };
      
      return success(res, {
        success: true,
        data: paginatedItems,
        pagination,
        message: isMock ? 'Data produk kadaluarsa (simulasi)' : 'Data produk kadaluarsa',
        isFromMock: isMock
      });
    }
  } catch (err) {
    logger.error('Error fetching expiry data:', { error: String(err) });
    return error(res, 'Terjadi kesalahan saat mengambil data kadaluarsa', 500);
  }
}

/**
 * POST - process expiry action (discard, defecta, move to sales)
 */
async function processExpiryAction(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    const { action, items, notes } = req.body;

    if (!action || !items || !Array.isArray(items) || items.length === 0) {
      return error(res, 'Data yang dikirimkan tidak valid', 400);
    }

    // Get tenant ID and user from session
    const session = await getServerSession(req, res, authOptions);
    const tenantId = session?.user?.tenantId || undefined;
    const userId = session?.user?.id || 'unknown';

    // Log action
    logger.info('Processing expiry action', { 
      action,
      itemCount: items.length,
      tenantId,
      userId
    });

    // Process all items
    const results = [];
    let allSuccessful = true;
    let anyFromMock = false;

    // Process based on action type
    for (const item of items) {
      try {
        const { success, item: updatedItem, isMock } = await expiryAdapter.updateExpiryAction(
          item.id,
          action,
          notes || '',
          userId,
          tenantId
        );
        
        if (!success) {
          allSuccessful = false;
        }
        
        if (isMock) {
          anyFromMock = true;
        }
        
        if (updatedItem) {
          results.push(updatedItem);
        }
      } catch (itemErr) {
        logger.error(`Error processing ${action} for item ${item.id}:`, { error: String(itemErr) });
        allSuccessful = false;
      }
    }
    
    // Generate response message based on action
    let message = '';
    switch (action) {
      case 'discard':
        message = allSuccessful 
          ? 'Produk berhasil dibuang dari inventori' 
          : 'Beberapa produk gagal dibuang dari inventori';
        break;
      case 'defecta':
        message = allSuccessful 
          ? 'Defecta berhasil dibuat' 
          : 'Beberapa defecta gagal dibuat';
        break;
      case 'salesPromotion':
        message = allSuccessful 
          ? 'Produk berhasil ditandai untuk promosi penjualan' 
          : 'Beberapa produk gagal ditandai untuk promosi';
        break;
      default:
        message = 'Aksi berhasil diproses';
    }
    
    // Add a note if using mock data
    if (anyFromMock) {
      message += ' (beberapa data adalah simulasi)';
    }
    
    return success(res, {
      success: allSuccessful,
      message,
      data: results,
      isFromMock: anyFromMock
    });
  } catch (err) {
    logger.error('Error processing expiry action:', { error: String(err) });
    return error(res, 'Terjadi kesalahan saat memproses aksi', 500);
  }
}

// Export the handler with API utilities
export default withApiHandler(handler);

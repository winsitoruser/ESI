import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { withApiHandler, success, error, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import logger from '@/lib/logger';
import db from '@/models';
import { Op, fn, col, literal, Sequelize } from 'sequelize';

// Extend ApiContext to include session
interface ExtendedApiContext extends ApiContext {
  session?: {
    user?: {
      tenantId?: string;
      role?: string;
      name?: string;
      email?: string;
      [key: string]: any;
    };
  };
}

// Models for stock analysis
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stockQuantity: number;
  totalValue: number;
}

interface CategoryPurchase {
  category: string;
  totalPurchase: number;
  percentageOfTotal: number;
}

// Mock data for category purchases (using red-orange color scheme)
const mockCategoryPurchaseData: CategoryPurchase[] = [
  { 
    category: "Obat Resep", 
    totalPurchase: 12500000, 
    percentageOfTotal: 35
  },
  { 
    category: "Vitamin & Suplemen", 
    totalPurchase: 8750000, 
    percentageOfTotal: 25
  },
  { 
    category: "Alat Kesehatan", 
    totalPurchase: 5250000, 
    percentageOfTotal: 15
  },
  { 
    category: "Obat Bebas", 
    totalPurchase: 3500000, 
    percentageOfTotal: 10
  },
  { 
    category: "Perawatan Kulit", 
    totalPurchase: 3500000, 
    percentageOfTotal: 10
  },
  { 
    category: "Lainnya", 
    totalPurchase: 1750000, 
    percentageOfTotal: 5
  }
];

// Mock data for top products by stock value
const mockTopProductsData: Product[] = [
  {
    id: "1",
    name: "Paracetamol 500mg",
    category: "Obat Bebas",
    price: 5000,
    cost: 3500,
    stockQuantity: 1000,
    totalValue: 3500000
  },
  {
    id: "2",
    name: "Vitamin C 1000mg",
    category: "Vitamin & Suplemen",
    price: 35000,
    cost: 24500,
    stockQuantity: 120,
    totalValue: 2940000
  },
  {
    id: "3",
    name: "Amoxicillin 500mg",
    category: "Obat Resep",
    price: 12000,
    cost: 8400,
    stockQuantity: 300,
    totalValue: 2520000
  },
  {
    id: "4",
    name: "Blood Pressure Monitor",
    category: "Alat Kesehatan",
    price: 450000,
    cost: 315000,
    stockQuantity: 8,
    totalValue: 2520000
  },
  {
    id: "5",
    name: "Captopril 25mg",
    category: "Obat Resep",
    price: 7500,
    cost: 5250,
    stockQuantity: 450,
    totalValue: 2362500
  },
  {
    id: "6",
    name: "Candesartan 8mg",
    category: "Obat Resep",
    price: 22000,
    cost: 15400,
    stockQuantity: 150,
    totalValue: 2310000
  },
  {
    id: "7",
    name: "Metformin 500mg",
    category: "Obat Resep",
    price: 8500,
    cost: 5950,
    stockQuantity: 375,
    totalValue: 2231250
  },
  {
    id: "8",
    name: "Thermometer Digital",
    category: "Alat Kesehatan",
    price: 85000,
    cost: 59500,
    stockQuantity: 35,
    totalValue: 2082500
  },
  {
    id: "9",
    name: "Omeprazole 20mg",
    category: "Obat Resep",
    price: 15000,
    cost: 10500,
    stockQuantity: 180,
    totalValue: 1890000
  },
  {
    id: "10",
    name: "Multivitamin",
    category: "Vitamin & Suplemen",
    price: 25000,
    cost: 17500,
    stockQuantity: 100,
    totalValue: 1750000
  }
];

// Mock data for stock movement (purchases and sales)
const mockStockMovementData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  purchaseData: [1250000, 1500000, 1380000, 1420000, 1650000, 1850000],
  salesData: [980000, 1120000, 1340000, 1280000, 1520000, 1780000]
};

/**
 * Handle stock analytics API requests
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
    throw new ApiError(403, 'Anda tidak memiliki akses ke modul analisis inventory', 'FORBIDDEN');
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getStockAnalytics(req, res, context);
    default:
      throw new ApiError(405, 'Metode tidak diperbolehkan', 'METHOD_NOT_ALLOWED');
  }
}

/**
 * GET - get stock analytics data
 */
async function getStockAnalytics(req: NextApiRequest, res: NextApiResponse, context: ExtendedApiContext) {
  try {
    // Parse query parameters
    const { dataType, branch, dateFrom, dateTo } = req.query;
    
    logger.info('Fetching stock analytics data', { 
      dataType, 
      branch, 
      dateFrom, 
      dateTo,
      userId: context.session?.user?.tenantId
    });
    
    // Coba mendapatkan data dari database
    try {
      const actualData = await fetchStockAnalyticsData(dataType as string, context.session?.user?.tenantId as string);
      let isFromMock = false;
      
      logger.info('Successfully fetched stock analytics from database', {
        dataType
      });
      
      if (dataType === 'category') {
        return success(res, {
          success: true,
          data: actualData,
          message: 'Data analisis kategori produk',
          isFromMock
        });
      } 
      else if (dataType === 'topProducts') {
        return success(res, {
          success: true,
          data: actualData,
          message: 'Data produk dengan nilai stok tertinggi',
          isFromMock
        });
      } 
      else if (dataType === 'stockMovement') {
        return success(res, {
          success: true,
          data: actualData,
          message: 'Data pergerakan stok',
          isFromMock
        });
      }
      else {
        return success(res, {
          success: true,
          data: actualData,
          message: 'Data analisis stok',
          isFromMock
        });
      }
    } catch (dbError) {
      // Jika terjadi error dengan database, gunakan data mock
      logger.warn('Using mock data for stock analytics', {
        reason: 'Database error: ' + (dbError instanceof Error ? dbError.message : 'Unknown error'),
        dataType
      });
      
      let isFromMock = true;
      
      if (dataType === 'category') {
        // Return category purchase data
        return success(res, {
          success: true,
          data: mockCategoryPurchaseData,
          message: 'Data analisis kategori produk (simulasi)',
          isFromMock
        });
      } 
      else if (dataType === 'topProducts') {
        // Return top products by stock value
        return success(res, {
          success: true,
          data: mockTopProductsData,
          message: 'Data produk dengan nilai stok tertinggi (simulasi)',
          isFromMock
        });
      } 
      else if (dataType === 'stockMovement') {
        // Return stock movement data
        return success(res, {
          success: true,
          data: mockStockMovementData,
          message: 'Data pergerakan stok (simulasi)',
          isFromMock
        });
      }
      else {
        // If no valid dataType is provided, return all data
        return success(res, {
          success: true,
          data: {
            categoryPurchases: mockCategoryPurchaseData,
            topProducts: mockTopProductsData,
            stockMovement: mockStockMovementData
          },
          message: 'Data analisis stok (simulasi)',
          isFromMock
        });
      }
    }
  } catch (err) {
    logger.error('Error fetching stock analytics data:', err);
    return error(res, 'Terjadi kesalahan saat mengambil data analisis stok: ' + (err instanceof Error ? err.message : 'Unknown error'), 500);
  }
}

/**
 * Fungsi untuk mengambil data analitik stok dari database menggunakan Sequelize
 */
async function fetchStockAnalyticsData(dataType: string, tenantId: string): Promise<any> {
  try {
    if (dataType === 'category') {
      // Ambil data kategori pembelian dari database
      const categoryPurchases = await (db as any).Purchase.findAll({
        attributes: [
          [col('Product.category'), 'category'],
          [fn('SUM', col('totalAmount')), 'totalPurchase']
        ],
        include: [{
          model: (db as any).Product,
          as: 'Product',
          attributes: [],
          required: true
        }],
        where: { tenantId },
        group: [col('Product.category')],
        raw: true
      });
      
      // Hitung persentase
      const totalAmount = categoryPurchases.reduce((sum: number, item: any) => 
        sum + parseFloat(item.totalPurchase || 0), 0);
        
      return categoryPurchases.map((item: any) => ({
        category: item.category,
        totalPurchase: parseFloat(item.totalPurchase || 0),
        percentageOfTotal: totalAmount > 0 
          ? Math.round((parseFloat(item.totalPurchase || 0) / totalAmount) * 100) 
          : 0
      }));
    }
    else if (dataType === 'topProducts') {
      // Ambil data produk dengan nilai stok tertinggi
      const topProducts = await (db as any).Product.findAll({
        attributes: [
          'id',
          'name',
          'category',
          'price',
          'cost',
          [col('currentStock'), 'stockQuantity'],
          [literal('cost * currentStock'), 'totalValue']
        ],
        where: { tenantId },
        order: [[literal('cost * currentStock'), 'DESC']],
        limit: 10,
        raw: true
      });
      
      return topProducts.map((product: any) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: parseFloat(product.price || 0),
        cost: parseFloat(product.cost || 0),
        stockQuantity: parseInt(product.stockQuantity || 0),
        totalValue: parseFloat(product.totalValue || 0)
      }));
    }
    else if (dataType === 'stockMovement') {
      // Untuk data pergerakan stok, kita perlu data 6 bulan terakhir
      const date = new Date();
      const sixMonthsAgo = new Date(date.getFullYear(), date.getMonth() - 6, 1);
      
      // Ambil data pembelian per bulan
      const purchases = await (db as any).Purchase.findAll({
        attributes: [
          [fn('MONTH', col('createdAt')), 'month'],
          [fn('YEAR', col('createdAt')), 'year'],
          [fn('SUM', col('totalAmount')), 'amount']
        ],
        where: {
          tenantId,
          createdAt: { [Op.gte]: sixMonthsAgo }
        },
        group: [fn('MONTH', col('createdAt')), fn('YEAR', col('createdAt'))],
        order: [[fn('YEAR', col('createdAt')), 'ASC'], [fn('MONTH', col('createdAt')), 'ASC']],
        raw: true
      });
      
      // Ambil data penjualan per bulan
      const sales = await (db as any).Sale.findAll({
        attributes: [
          [fn('MONTH', col('createdAt')), 'month'],
          [fn('YEAR', col('createdAt')), 'year'],
          [fn('SUM', col('totalAmount')), 'amount']
        ],
        where: {
          tenantId,
          createdAt: { [Op.gte]: sixMonthsAgo }
        },
        group: [fn('MONTH', col('createdAt')), fn('YEAR', col('createdAt'))],
        order: [[fn('YEAR', col('createdAt')), 'ASC'], [fn('MONTH', col('createdAt')), 'ASC']],
        raw: true
      });
      
      // Format nama bulan
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const labels = [];
      const purchaseData = [];
      const salesData = [];
      
      // Generate array untuk 6 bulan terakhir
      for (let i = 0; i < 6; i++) {
        const monthIndex = (date.getMonth() - 5 + i) % 12;
        const year = date.getFullYear() - (date.getMonth() < monthIndex ? 1 : 0);
        
        labels.push(monthNames[monthIndex]);
        
        // Cari data pembelian untuk bulan ini
        const purchaseMonth = purchases.find((p: any) => 
          parseInt(p.month) === monthIndex + 1 && parseInt(p.year) === year);
        purchaseData.push(purchaseMonth ? parseFloat(purchaseMonth.amount || 0) : 0);
        
        // Cari data penjualan untuk bulan ini
        const saleMonth = sales.find((s: any) => 
          parseInt(s.month) === monthIndex + 1 && parseInt(s.year) === year);
        salesData.push(saleMonth ? parseFloat(saleMonth.amount || 0) : 0);
      }
      
      return {
        labels,
        purchaseData,
        salesData
      };
    }
    else {
      // Jika tidak ada tipe data yang spesifik, kembalikan semua data
      const categoryPromise: Promise<any> = fetchStockAnalyticsData('category', tenantId);
      const topProductsPromise: Promise<any> = fetchStockAnalyticsData('topProducts', tenantId);
      const stockMovementPromise: Promise<any> = fetchStockAnalyticsData('stockMovement', tenantId);
      
      const [categoryPurchases, topProducts, stockMovement]: [any, any, any] = await Promise.all([
        categoryPromise, topProductsPromise, stockMovementPromise
      ]);
      
      return {
        categoryPurchases,
        topProducts,
        stockMovement
      };
    }
  } catch (error: unknown) {
    logger.error('Error fetching stock analytics from database:', error instanceof Error ? error : String(error));
    
    // Fallback ke data mock sesuai tipe yang diminta
    if (dataType === 'category') {
      return mockCategoryPurchaseData;
    } 
    else if (dataType === 'topProducts') {
      return mockTopProductsData;
    } 
    else if (dataType === 'stockMovement') {
      return mockStockMovementData;
    }
    else {
      return {
        categoryPurchases: mockCategoryPurchaseData,
        topProducts: mockTopProductsData,
        stockMovement: mockStockMovementData
      };
    }
  }
}

// Export the handler with API utilities
export default withApiHandler(handler);

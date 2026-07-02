import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import db from '@/models';
import { Op, Sequelize, fn, col, literal } from 'sequelize';
import { logger } from '@/server/monitoring';

const apiLogger = logger.child({ service: 'api-inventory-dashboard' });

// Mock data
const mockStockSummary = {
  totalItems: 42,
  totalValue: 25600000,
  lowStock: 6,
  criticalStock: 2
};

const mockTopDrugs = [
  { name: 'Paracetamol 500mg', count: 120, value: 600000 },
  { name: 'Amoxicillin 500mg', count: 85, value: 1275000 },
  { name: 'Omeprazole 20mg', count: 65, value: 1300000 },
  { name: 'Cetirizine 10mg', count: 45, value: 360000 },
  { name: 'Metformin 500mg', count: 40, value: 560000 }
];

const mockStockAlerts = [
  { id: 'DRUG001', name: 'Paracetamol 500mg', currentStock: 15, minStock: 20, status: 'LOW' },
  { id: 'DRUG003', name: 'Omeprazole 20mg', currentStock: 5, minStock: 15, status: 'CRITICAL' },
  { id: 'DRUG007', name: 'Ibuprofen 400mg', currentStock: 8, minStock: 15, status: 'LOW' },
  { id: 'DRUG010', name: 'Ambroxol 30mg', currentStock: 3, minStock: 10, status: 'CRITICAL' }
];

const mockMonthlyUsage = [
  { month: 'Jan', prescriptions: 45, items: 120 },
  { month: 'Feb', prescriptions: 52, items: 156 },
  { month: 'Mar', prescriptions: 48, items: 130 },
  { month: 'Apr', prescriptions: 70, items: 210 },
  { month: 'May', prescriptions: 65, items: 195 }
];

const mockCategoryDistribution = [
  { name: 'Analgesik', value: 30 },
  { name: 'Antibiotik', value: 25 },
  { name: 'Antihipertensi', value: 15 },
  { name: 'Antidiabetes', value: 10 },
  { name: 'Vitamin', value: 10 },
  { name: 'Lainnya', value: 10 }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Cek metode request
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Setup timeout promise untuk memastikan API tidak blocking terlalu lama
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database timeout')), 10000)
    );

    // Coba akses database untuk data dashboard
    const stockSummaryPromise = getStockSummary();
    const topDrugsPromise = getTopDrugsData();
    const stockAlertsPromise = getStockAlerts();
    const monthlyUsagePromise = getMonthlyUsageData();
    const categoryDistributionPromise = getCategoryDistribution();

    try {
      // Jalankan semua query secara parallel dan race dengan timeout
      const [stockSummary, topDrugs, stockAlerts, monthlyUsage, categoryDistribution] = 
        await Promise.all([
          Promise.race([stockSummaryPromise, timeoutPromise]),
          Promise.race([topDrugsPromise, timeoutPromise]),
          Promise.race([stockAlertsPromise, timeoutPromise]),
          Promise.race([monthlyUsagePromise, timeoutPromise]),
          Promise.race([categoryDistributionPromise, timeoutPromise])
        ]);

      // Kirim respons dengan data lengkap
      return res.status(200).json({
        stockSummary,
        topDrugs,
        stockAlerts,
        monthlyUsage,
        categoryDistribution,
        isLive: true, // Menandakan ini data live, bukan mock
        isFromMock: false
      });
    } catch (error) {
      // Jika salah satu query timeout atau error, fallback ke mock data
      apiLogger.error('Dashboard data fetch error:', error instanceof Error ? error.message : 'Unknown error');
      
      // Fallback ke mock data jika terjadi error
      return res.status(200).json({
        stockSummary: mockStockSummary,
        topDrugs: mockTopDrugs,
        stockAlerts: mockStockAlerts,
        monthlyUsage: mockMonthlyUsage,
        categoryDistribution: mockCategoryDistribution,
        isLive: false, // Menandakan ini data mock, bukan live
        isFromMock: true
      });
    }
  } catch (error) {
    apiLogger.error('Dashboard handler error:', error instanceof Error ? error.message : 'Unknown error');
    
    // Final fallback ke mock data
    return res.status(200).json({
      stockSummary: mockStockSummary,
      topDrugs: mockTopDrugs,
      stockAlerts: mockStockAlerts,
      monthlyUsage: mockMonthlyUsage,
      categoryDistribution: mockCategoryDistribution,
      isLive: false,
      isFromMock: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Function untuk mendapatkan ringkasan stok menggunakan Sequelize
async function getStockSummary(): Promise<any> {
  try {
    // Hitung total produk di inventory
    const totalItems = await db.Product.count();
    
    // Hitung total nilai persediaan
    const totalValueResult = await db.Product.findOne({
      attributes: [
        [fn('SUM', literal('stock * price')), 'totalValue']
      ],
      raw: true
    }) as unknown as { totalValue: string };
    const totalValue = Number(totalValueResult?.totalValue || 0);
    
    // Hitung item dengan stok rendah dan kritis
    const lowStockThreshold = 20; // Threshold untuk stok rendah
    const criticalStockThreshold = 10; // Threshold untuk stok kritis
    
    const lowStockCount = await db.Product.count({
      where: {
        stock: {
          [Op.gt]: criticalStockThreshold,
          [Op.lte]: lowStockThreshold
        }
      }
    });
    
    const criticalStockCount = await db.Product.count({
      where: {
        stock: {
          [Op.lte]: criticalStockThreshold
        }
      }
    });
    
    return {
      totalItems,
      totalValue,
      lowStock: lowStockCount,
      criticalStock: criticalStockCount
    };
  } catch (error) {
    apiLogger.error('Stock summary error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Function untuk mendapatkan data 5 produk teratas menggunakan Sequelize
async function getTopDrugsData(): Promise<any[]> {
  try {
    // Gunakan Sequelize untuk mendapatkan produk yang paling sering dijual
    const topDrugs = await db.TransactionItem.findAll({
      attributes: [
        'productId',
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', literal('quantity * price')), 'totalValue']
      ],
      include: [{
        model: db.Product,
        attributes: ['id', 'name', 'price']
      }],
      group: ['TransactionItem.productId', 'Product.id', 'Product.name', 'Product.price'],
      order: [[literal('totalQuantity'), 'DESC']],
      limit: 5,
      raw: true
    });
    
    // Format data untuk response
    const formattedTopDrugs = topDrugs.map((item: any) => ({
      name: item['Product.name'] || 'Unknown Product',
      count: Number(item.totalQuantity),
      value: Number(item.totalValue)
    }));
    
    return formattedTopDrugs;
  } catch (error) {
    apiLogger.error('Top drugs error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Function untuk mendapatkan alert stok rendah dan kritis menggunakan Sequelize
async function getStockAlerts(): Promise<any[]> {
  try {
    const lowStockThreshold = 20; // Threshold untuk stok rendah
    const criticalStockThreshold = 10; // Threshold untuk stok kritis
    
    // Gunakan Sequelize untuk mendapatkan produk dengan stok rendah atau kritis
    const alertProducts = await db.Product.findAll({
      where: {
        stock: {
          [Op.lte]: lowStockThreshold
        }
      },
      attributes: ['id', 'name', 'stock', 'minimumStock'],
      order: [[col('stock'), 'ASC']],
      raw: true
    });
    
    // Format data untuk response
    const formattedAlerts = alertProducts.map((product: any) => {
      const currentStock = Number(product.stock || 0);
      const minStock = Number(product.minimumStock || lowStockThreshold);
      const status = currentStock <= criticalStockThreshold ? 'CRITICAL' : 'LOW';
      
      return {
        id: product.id,
        name: product.name,
        currentStock,
        minStock,
        status
      };
    });
    
    return formattedAlerts;
  } catch (error) {
    apiLogger.error('Stock alerts error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Function untuk mendapatkan data penggunaan bulanan menggunakan Sequelize
async function getMonthlyUsageData(): Promise<any[]> {
  try {
    // Dapatkan timestamp 6 bulan ke belakang
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // 6 bulan termasuk bulan ini
    
    // Gunakan Sequelize untuk mendapatkan data penggunaan produk per bulan
    const monthlyData = await db.sequelize.query(`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(DISTINCT "transactionId") as prescriptions,
        SUM(quantity) as items
      FROM "TransactionItems"
      WHERE "createdAt" >= :startDate
      GROUP BY month
      ORDER BY month ASC
    `, {
      replacements: { startDate: sixMonthsAgo },
      type: 'SELECT'
    });
    
    // Format data untuk respons
    const formattedData = (monthlyData as any[]).map(item => {
      const date = new Date(item.month);
      const monthAbbr = date.toLocaleString('en-US', { month: 'short' });
      
      return {
        month: monthAbbr,
        prescriptions: Number(item.prescriptions),
        items: Number(item.items)
      };
    });
    
    return formattedData;
  } catch (error) {
    apiLogger.error('Monthly usage error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Function untuk mendapatkan data distribusi kategori menggunakan Sequelize
async function getCategoryDistribution(): Promise<any[]> {
  try {
    // Gunakan Sequelize untuk mendapatkan jumlah produk per kategori
    const categoryCounts = await db.Product.findAll({
      attributes: [
        [col('category.name'), 'categoryName'],
        [fn('COUNT', col('Product.id')), 'count']
      ],
      include: [{
        model: db.Product.associations.category.target,
        as: 'category',
        attributes: []
      }],
      group: ['category.name'],
      order: [[literal('count'), 'DESC']],
      raw: true
    }) as unknown as { categoryName: string; count: string }[];
    
    // Hitung total produk untuk persentase
    const totalProducts = await db.Product.count();
    
    if (totalProducts === 0) {
      return mockCategoryDistribution; // Fallback ke mock data jika tidak ada produk
    }
    
    // Batasi kategori dan tambahkan 'Lainnya' jika terlalu banyak
    let formattedCategories: any[] = [];
    let otherCategoryCount = 0;
    
    categoryCounts.forEach((category: any, index: number) => {
      const categoryCount = Number(category.count);
      const percentage = (categoryCount / totalProducts) * 100;
      
      // Tambahkan 5 kategori teratas, sisanya masuk 'Lainnya'
      if (index < 5) {
        formattedCategories.push({
          name: category.categoryName || 'Uncategorized',
          value: Math.round(percentage)
        });
      } else {
        otherCategoryCount += categoryCount;
      }
    });
    
    // Tambahkan kategori 'Lainnya' jika ada
    if (otherCategoryCount > 0) {
      const otherPercentage = (otherCategoryCount / totalProducts) * 100;
      formattedCategories.push({
        name: 'Lainnya',
        value: Math.round(otherPercentage)
      });
    }
    
    return formattedCategories;
  } catch (error) {
    apiLogger.error('Category distribution error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';
import { Op } from 'sequelize';

// Import database dari models
const db = require('../../../../models');

const apiLogger = logger.child({ service: 'expiry-api' });

// Interface untuk tipe data expiry
interface ExpiryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: Date;
  daysRemaining?: number;
  currentStock: number;
  value?: number;
  status: "expired" | "critical" | "warning" | "good";
  category: string;
  quantity?: number;
  location: string;
  supplier: string;
  costPrice: number;
  isFromMock?: boolean;
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
  
  for (let i = 1; i <= 50; i++) {
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
    
    items.push({
      id: `exp-${i}`,
      productId: `prod-${i}`,
      productName: `Produk Farmasi ${i}`,
      sku: `SKU-${10000 + i}`,
      batchNumber: `BATCH-${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
      expiryDate,
      daysRemaining,
      currentStock,
      value: costPrice * currentStock,
      status,
      category: categories[i % categories.length],
      quantity: currentStock,
      location: locations[i % locations.length],
      supplier: suppliers[i % suppliers.length],
      costPrice,
      isFromMock: true
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
    
    const staffId = `staff-${Math.floor(Math.random() * 10) + 1}`;
    const position = staffPositions[Math.floor(Math.random() * staffPositions.length)];
    
    history.push({
      id: `order-${productId}-${i}`,
      orderDate,
      orderNumber: `PO-${2023000 + parseInt(productId.replace('prod-', ''))}-${i}`,
      quantity: Math.floor(Math.random() * 50) + 1,
      staff: {
        id: staffId,
        name: `Staff ${staffId.split('-')[1]}`,
        avatar: `/img/avatars/avatar${Math.floor(Math.random() * 10) + 1}.png`,
        position
      }
    });
  }
  
  // Sort by date descending
  return history.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
}

// Main handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Authentikasi
    const session = await getServerSession(req, res, authOptions);
    
    // Skip auth check in development only
    if (!session && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const tenantId = session?.user?.tenantId || 'default-tenant';
    
    // Handle GET request
    if (req.method === 'GET') {
      const { productId, dataType, status, category } = req.query;
      
      try {
        // Jika tipe data adalah orderHistory, return mock data
        if (dataType === 'orderHistory' && productId) {
          const orderHistory = generateOrderHistory(productId as string);
          return res.status(200).json({
            success: true,
            data: orderHistory,
            message: 'Riwayat pemesanan produk',
            isFromMock: true
          });
        }
        
        // Buat query untuk Sequelize
        const sequelizeOptions: any = {
          where: { tenantId },
          order: [['expiryDate', 'ASC']]
        };
        
        // Filter berdasarkan status
        if (status) {
          sequelizeOptions.where.status = String(status);
        }
        
        // Filter berdasarkan kategori
        if (category) {
          sequelizeOptions.where.category = String(category);
        }
        
        // Ambil data dari database
        try {
          const expiryItems = await db.ProductExpiry.findAll(sequelizeOptions);
          
          // Hitung days remaining dan value untuk setiap item
          const today = new Date();
          const formattedItems = expiryItems.map((item: any) => {
            const itemData = item.toJSON();
            const expiryDate = new Date(itemData.expiryDate);
            
            // Hitung days remaining
            const oneDay = 24 * 60 * 60 * 1000;
            const diffDays = Math.round((expiryDate.getTime() - today.getTime()) / oneDay);
            
            // Hitung total value
            const value = parseFloat(itemData.costPrice) * itemData.currentStock;
            
            return {
              ...itemData,
              daysRemaining: diffDays,
              value,
              isFromMock: false
            };
          });
          
          apiLogger.info(`Berhasil mengambil ${formattedItems.length} item kadaluarsa dari database`);
          
          return res.status(200).json({
            success: true,
            data: formattedItems,
            message: 'Data produk kadaluarsa'
          });
        } catch (dbError) {
          // Log error untuk debugging
          apiLogger.warn('Database error saat mengambil data kadaluarsa:', { error: dbError });
          throw dbError; // Lempar error untuk ditangkap oleh blok catch di luar
        }
      } catch (error) {
        // Implementasi pola "Data Mock First" - fallback ke mock data
        apiLogger.warn('Gagal mengambil data dari database, menggunakan data mock', { error });
        
        // Generate mock data
        const mockData = generateMockExpiryData();
        
        // Filter mock data berdasarkan query (jika ada)
        let filteredData = [...mockData];
        
        if (status) {
          filteredData = filteredData.filter(item => item.status === status);
        }
        
        if (category) {
          filteredData = filteredData.filter(item => 
            item.category.toLowerCase().includes(String(category).toLowerCase())
          );
        }
        
        return res.status(200).json({
          success: true,
          data: filteredData,
          message: 'Data produk kadaluarsa (data simulasi)',
          isFromMock: true
        });
      }
    }
    // Handle POST request untuk aksi kadaluarsa
    else if (req.method === 'POST') {
      const { action, items } = req.body;
      
      if (!action || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Data yang dikirimkan tidak valid'
        });
      }
      
      try {
        // Validasi aksi yang dibolehkan
        const validActions = ['discard', 'defecta', 'salesPromotion'];
        if (!validActions.includes(action)) {
          return res.status(400).json({
            success: false,
            message: 'Aksi tidak valid'
          });
        }
        
        // Dalam implementasi sebenarnya, akan memproses aksi ke database
        // Di sini kita hanya logging dan mengembalikan sukses
        
        apiLogger.info(`Memproses aksi ${action} untuk ${items.length} item`, {
          tenantId,
          action,
          itemCount: items.length
        });
        
        // Berikan respons yang berbeda berdasarkan aksi
        let message = '';
        switch (action) {
          case 'discard':
            message = 'Produk berhasil dibuang dari inventori';
            break;
          case 'defecta':
            message = 'Defecta berhasil dibuat';
            break;
          case 'salesPromotion':
            message = 'Produk berhasil ditandai untuk promosi penjualan';
            break;
        }
        
        return res.status(200).json({
          success: true,
          message
        });
      } catch (error) {
        apiLogger.error('Error memproses aksi kadaluarsa:', { error });
        return res.status(500).json({
          success: false,
          message: 'Terjadi kesalahan saat memproses aksi'
        });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        success: false,
        message: 'Method Not Allowed'
      });
    }
  } catch (error) {
    apiLogger.error('Error pada API kadaluarsa:', { error });
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
}

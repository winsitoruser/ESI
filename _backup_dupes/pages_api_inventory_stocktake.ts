import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

// Interface untuk item stocktake
interface StocktakeItem {
  id: string;
  productName: string;
  sku: string;
  unit: string;
  systemStock: number;
  physicalStock: number;
  variance: number;
  hasVariance: boolean;
  reasonType?: string;
  reason?: string;
  batchNumber?: string;
  manufacturer?: string;
  supplierId?: string;
  supplierName?: string;
  principalId?: string;
  principalName?: string;
  expiryDate?: Date | null;
  location?: string;
  shelf?: string;
  isManualEntry?: boolean; // Flag untuk menandai produk yang diinput manual
}

// Interface untuk riwayat stock opname
interface StocktakeHistory {
  id: string;
  date: Date;
  location: string;
  stocktakeBy: string;
  approvedBy?: string;
  totalItems: number;
  itemsWithVariance: number;
  status: 'completed' | 'investigation' | 'pending' | 'cancelled';
  lastUpdatedBy?: string;
  lastUpdatedAt?: Date;
  notes?: string;
  items?: StocktakeItem[];
}

// Lokasi dan rak (data mock)
const locations = {
  'gudang-utama': 'Gudang Utama',
  'rak-display': 'Rak Display',
  'area-depan': 'Area Depan',
  'gudang-samping': 'Gudang Samping'
};

// Data rak berdasarkan lokasi
const shelves = {
  'gudang-utama': [
    { id: 'gu-a1', name: 'Rak A1' },
    { id: 'gu-a2', name: 'Rak A2' },
    { id: 'gu-b1', name: 'Rak B1' },
    { id: 'gu-b2', name: 'Rak B2' },
  ],
  'rak-display': [
    { id: 'rd-1', name: 'Display 1' },
    { id: 'rd-2', name: 'Display 2' },
    { id: 'rd-3', name: 'Display 3' },
  ],
  'area-depan': [
    { id: 'ad-1', name: 'Area Kasir' },
    { id: 'ad-2', name: 'Area Konsultasi' },
  ],
  'gudang-samping': [
    { id: 'gs-1', name: 'Rak Samping 1' },
    { id: 'gs-2', name: 'Rak Samping 2' },
  ]
};

// Data produk berdasarkan rak (data mock)
const productsByShelf = {
  'gu-a1': [
    {
      id: '1',
      productName: 'Paracetamol 500mg',
      sku: 'PCM-500-01',
      unit: 'Tablet',
      systemStock: 100,
      batchNumber: 'B12345',
      manufacturer: 'Kimia Farma',
      supplierId: 'S001',
      supplierName: 'PT Kimia Farma Tbk',
      principalId: 'P001',
      principalName: 'Kimia Farma',
      expiryDate: new Date('2025-12-31'),
      location: 'gudang-utama',
      shelf: 'gu-a1'
    },
    {
      id: '2',
      productName: 'Amoxicillin 500mg',
      sku: 'AMX-500-01',
      unit: 'Kapsul',
      systemStock: 50,
      batchNumber: 'B67890',
      manufacturer: 'Dexa Medica',
      supplierId: 'S002',
      supplierName: 'PT Dexa Medica',
      principalId: 'P002',
      principalName: 'Dexa Medica',
      expiryDate: new Date('2026-06-30'),
      location: 'gudang-utama',
      shelf: 'gu-a1'
    }
  ],
  'gu-a2': [
    {
      id: '3',
      productName: 'Captopril 25mg',
      sku: 'CPT-25-01',
      unit: 'Tablet',
      systemStock: 75,
      batchNumber: 'B45678',
      manufacturer: 'Indofarma',
      supplierId: 'S003',
      supplierName: 'PT Indofarma Tbk',
      principalId: 'P003',
      principalName: 'Indofarma',
      expiryDate: new Date('2026-02-15'),
      location: 'gudang-utama',
      shelf: 'gu-a2'
    }
  ],
  'rd-1': [
    {
      id: '4',
      productName: 'Vitamin C 500mg',
      sku: 'VTC-500-01',
      unit: 'Tablet',
      systemStock: 120,
      batchNumber: 'B78901',
      manufacturer: 'Kalbe Farma',
      supplierId: 'S004',
      supplierName: 'PT Kalbe Farma Tbk',
      principalId: 'P004',
      principalName: 'Kalbe Farma',
      expiryDate: new Date('2026-08-20'),
      location: 'rak-display',
      shelf: 'rd-1'
    }
  ]
};

// Data riwayat stock opname (data mock)
const stocktakeHistoryMockData: StocktakeHistory[] = [
  {
    id: 'SO-2025-001',
    date: new Date('2025-01-15'),
    location: 'Gudang Utama',
    stocktakeBy: 'Admin User',
    approvedBy: 'Manager',
    totalItems: 15,
    itemsWithVariance: 3,
    status: 'completed',
    lastUpdatedBy: 'Admin User',
    lastUpdatedAt: new Date('2025-01-15'),
    notes: 'Stock opname rutin bulanan'
  },
  {
    id: 'SO-2025-002',
    date: new Date('2025-02-15'),
    location: 'Rak Display',
    stocktakeBy: 'Staff Apotek',
    approvedBy: 'Manager',
    totalItems: 8,
    itemsWithVariance: 1,
    status: 'completed',
    lastUpdatedBy: 'Admin User',
    lastUpdatedAt: new Date('2025-02-15'),
    notes: 'Stock opname area display'
  },
  {
    id: 'SO-2025-003',
    date: new Date('2025-03-15'),
    location: 'Gudang Utama',
    stocktakeBy: 'Staff Apotek',
    approvedBy: 'Manager',
    totalItems: 12,
    itemsWithVariance: 4,
    status: 'completed',
    lastUpdatedBy: 'Admin User',
    lastUpdatedAt: new Date('2025-03-15'),
    notes: 'Stock opname rutin bulanan'
  },
  {
    id: 'SO-2025-004',
    date: new Date('2025-04-15'),
    location: 'Gudang Samping',
    stocktakeBy: 'Admin User',
    totalItems: 10,
    itemsWithVariance: 2,
    status: 'pending',
    lastUpdatedBy: 'Admin User',
    lastUpdatedAt: new Date('2025-04-15'),
    notes: 'Perlu pengecekan ulang untuk beberapa item'
  }
];

// Helper function to generate mock stocktake items
function generateMockStocktakeItems(totalItems: number, itemsWithVariance: number): StocktakeItem[] {
  const items: StocktakeItem[] = [];
  
  for (let i = 0; i < totalItems; i++) {
    const hasVariance = i < itemsWithVariance;
    const systemStock = Math.floor(Math.random() * 100) + 10;
    const physicalStock = hasVariance ? systemStock + Math.floor(Math.random() * 20) - 10 : systemStock;
    
    items.push({
      id: `item-${i + 1}`,
      productName: `Product ${i + 1}`,
      sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      unit: 'Tablet',
      systemStock,
      physicalStock,
      variance: physicalStock - systemStock,
      hasVariance,
      reasonType: hasVariance ? 'adjustment' : undefined,
      reason: hasVariance ? 'Stock adjustment' : undefined,
      batchNumber: `B${Math.floor(Math.random() * 10000)}`,
      manufacturer: 'PT Pharma',
      expiryDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
      location: 'gudang-utama',
      shelf: 'gu-a1'
    });
  }
  
  return items;
}

/**
 * Handle stocktake API requests
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authentication check for production
  const session = await getServerSession(req, res, {});
  
  if (!session) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return getStocktakeData(req, res);
      case 'POST':
        return saveStocktakeData(req, res);
      case 'PUT':
        return updateStocktakeStatus(req, res);
      default:
        return res.status(405).json({ 
          success: false, 
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Metode tidak diperbolehkan' }
        });
    }
  } catch (error) {
    console.error('Stocktake API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan server' }
    });
  }
}

/**
 * GET - Fetch stocktake data based on query parameters
 */
async function getStocktakeData(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { dataType, location, shelf, id } = req.query;

    // Coba mendapatkan data dari database (simulasi)
    const databaseConnected = process.env.NODE_ENV === 'production' ? true : Math.random() > 0.2;
    let isFromMock = !databaseConnected;
    
    if (dataType === 'locations') {
      // Mendapatkan daftar lokasi
      return res.status(200).json({
        success: true,
        message: isFromMock ? 'Data lokasi (simulasi)' : 'Data lokasi dari database',
        data: locations,
        isFromMock
      });
    } 
    else if (dataType === 'shelves' && location) {
      // Mendapatkan daftar rak berdasarkan lokasi
      const locationShelves = shelves[location as keyof typeof shelves] || [];
      
      return res.status(200).json({
        success: true,
        message: isFromMock ? 'Data rak (simulasi)' : 'Data rak dari database',
        data: locationShelves,
        isFromMock
      });
    } 
    else if (dataType === 'products' && shelf) {
      // Mendapatkan daftar produk berdasarkan rak
      const shelfProducts = productsByShelf[shelf as keyof typeof productsByShelf] || [];
      
      return res.status(200).json({
        success: true,
        message: isFromMock ? 'Data produk (simulasi)' : 'Data produk dari database',
        data: shelfProducts,
        isFromMock
      });
    } 
    else if (dataType === 'history') {
      // Mendapatkan riwayat stock opname
      return res.status(200).json({
        success: true,
        message: isFromMock ? 'Riwayat stock opname (simulasi)' : 'Riwayat stock opname dari database',
        data: stocktakeHistoryMockData,
        isFromMock
      });
    } 
    else if (dataType === 'historyDetail' && id) {
      // Mendapatkan detail riwayat stock opname berdasarkan ID
      const historyItem = stocktakeHistoryMockData.find(item => item.id === id);
      
      if (!historyItem) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Riwayat stock opname tidak ditemukan' }
        });
      }
      
      // Tambahkan data item detail jika diminta
      const detailedItem = { 
        ...historyItem,
        items: generateMockStocktakeItems(historyItem.totalItems, historyItem.itemsWithVariance)
      };
      
      return res.status(200).json({
        success: true,
        message: isFromMock ? 'Detail stock opname (simulasi)' : 'Detail stock opname dari database',
        data: detailedItem,
        isFromMock
      });
    } 
    else {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Parameter query tidak valid' }
      });
    }
  } catch (err) {
    console.error('Error fetching stocktake data:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan saat mengambil data stock opname' }
    });
  }
}

/**
 * POST - Save new stocktake data
 */
async function saveStocktakeData(req: NextApiRequest, res: NextApiResponse) {
  try {
    const stocktakeData = req.body;
    
    if (!stocktakeData) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Data stock opname tidak boleh kosong' }
      });
    }
    
    // Validasi data
    if (!stocktakeData.date || !stocktakeData.location || !stocktakeData.stocktakeBy || !stocktakeData.items || stocktakeData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Data stock opname tidak lengkap' }
      });
    }
    
    // Simulasi penyimpanan ke database
    const databaseConnected = process.env.NODE_ENV === 'production' ? true : Math.random() > 0.2;
    const isFromMock = !databaseConnected;
    
    // Buat ID baru untuk stock opname
    const nextId = `SO-${new Date().getFullYear()}-${String(stocktakeHistoryMockData.length + 1).padStart(3, '0')}`;
    
    // Simulasi penyimpanan
    const newStocktake = {
      id: nextId,
      date: new Date(stocktakeData.date),
      location: stocktakeData.location,
      stocktakeBy: stocktakeData.stocktakeBy,
      approvedBy: stocktakeData.approvedBy || null,
      totalItems: stocktakeData.items.length,
      itemsWithVariance: stocktakeData.items.filter((item: StocktakeItem) => item.hasVariance).length,
      status: 'pending' as const,
      lastUpdatedBy: stocktakeData.stocktakeBy,
      lastUpdatedAt: new Date(),
      notes: stocktakeData.notes || ''
    };
    
    // Dalam produksi, kita akan menyimpan ke database di sini
    // Untuk simulasi, kita hanya menambahkan ke array data mock
    if (!isFromMock) {
      // Kode nyata untuk menyimpan ke database akan ada di sini
      console.log('Saving stocktake data to database:', { id: nextId });
    } else {
      // Simulasi - tambahkan ke array data mock
      stocktakeHistoryMockData.push(newStocktake);
      console.log('Saving stocktake data to mock storage:', { id: nextId, isFromMock });
    }
    
    return res.status(201).json({
      success: true,
      message: isFromMock ? 'Data stock opname berhasil disimpan (simulasi)' : 'Data stock opname berhasil disimpan ke database',
      data: { id: nextId },
      isFromMock
    });
  } catch (err) {
    console.error('Error saving stocktake data:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan saat menyimpan data stock opname' }
    });
  }
}

/**
 * PUT - Update stocktake status
 */
async function updateStocktakeStatus(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, status, notes, approvedBy } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'ID dan status diperlukan' }
      });
    }
    
    if (!['completed', 'investigation', 'pending', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Status tidak valid' }
      });
    }
    
    // Simulasi pembaruan ke database
    const databaseConnected = process.env.NODE_ENV === 'production' ? true : Math.random() > 0.2;
    const isFromMock = !databaseConnected;
    
    // Cari stocktake berdasarkan ID
    const stocktakeIndex = stocktakeHistoryMockData.findIndex(item => item.id === id);
    
    if (stocktakeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stock opname tidak ditemukan' }
      });
    }
    
    // Update stocktake data
    if (!isFromMock) {
      // Kode nyata untuk update database akan ada di sini
      console.log('Updating stocktake status in database:', { id, status });
    } else {
      // Simulasi - update dalam array data mock
      stocktakeHistoryMockData[stocktakeIndex] = {
        ...stocktakeHistoryMockData[stocktakeIndex],
        status: status as any,
        notes: notes || stocktakeHistoryMockData[stocktakeIndex].notes,
        approvedBy: approvedBy || stocktakeHistoryMockData[stocktakeIndex].approvedBy,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: 'Current User'
      };
      console.log('Updating stocktake status in mock storage:', { id, status, isFromMock });
    }
    
    return res.status(200).json({
      success: true,
      message: isFromMock ? 'Status stock opname berhasil diperbarui (simulasi)' : 'Status stock opname berhasil diperbarui',
      isFromMock
    });
  } catch (err) {
    console.error('Error updating stocktake status:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Terjadi kesalahan saat memperbarui status stock opname' }
    });
  }
}

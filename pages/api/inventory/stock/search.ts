import { NextApiRequest, NextApiResponse } from 'next';

// Mock stock items data
const mockStockItems = [
  {
    id: '1',
    name: 'Paracetamol 500mg',
    sku: 'PAR-500',
    category: 'Obat Bebas',
    currentStock: 150,
    reorderPoint: 50,
    unit: 'Strip',
    location: 'Rak A-1',
    expiry: '2025-12-31',
    supplier: 'PT Kimia Farma',
    price: 5000,
    status: 'normal'
  },
  {
    id: '2',
    name: 'Amoxicillin 500mg',
    sku: 'AMX-500',
    category: 'Obat Keras',
    currentStock: 25,
    reorderPoint: 30,
    unit: 'Strip',
    location: 'Rak B-2',
    expiry: '2025-10-15',
    supplier: 'PT Sanbe Farma',
    price: 15000,
    status: 'low_stock'
  },
  {
    id: '3',
    name: 'Vitamin C 1000mg',
    sku: 'VIT-C-1000',
    category: 'Suplemen',
    currentStock: 0,
    reorderPoint: 20,
    unit: 'Botol',
    location: 'Rak C-3',
    expiry: '2026-03-20',
    supplier: 'PT Kalbe Farma',
    price: 25000,
    status: 'out_of_stock'
  },
  {
    id: '4',
    name: 'Betadine 15ml',
    sku: 'BET-15',
    category: 'Antiseptik',
    currentStock: 80,
    reorderPoint: 25,
    unit: 'Botol',
    location: 'Rak D-1',
    expiry: '2025-09-15',
    supplier: 'PT Mundipharma',
    price: 12000,
    status: 'near_expiry'
  },
  {
    id: '5',
    name: 'Omeprazole 20mg',
    sku: 'OME-20',
    category: 'Obat Keras',
    currentStock: 120,
    reorderPoint: 40,
    unit: 'Strip',
    location: 'Rak B-3',
    expiry: '2026-01-10',
    supplier: 'PT Dexa Medica',
    price: 8000,
    status: 'normal'
  }
];

interface QueryParams {
  term?: string;
  category?: string;
  lowStock?: string;
  outOfStock?: string;
  nearExpiry?: string;
  location?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }
  
  try {
    // Add immediate response for health check
    if (req.query.health === 'check') {
      return res.status(200).json({ success: true, status: 'healthy' });
    }
    
    const { term, category, lowStock, outOfStock, nearExpiry, location, page = '1', limit = '20', sortBy = 'name', sortOrder = 'asc' } = req.query as QueryParams;
    
    const pageNum = parseInt(page.toString(), 10);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit.toString(), 10)));
    
    console.log('Stock search request:', { term, category, lowStock, outOfStock, nearExpiry, location });
    
    // Connect to real database using Sequelize models
    const db = require('@/models');
    const { Op } = require('sequelize');
    
    // Check if Product model exists, if not return empty data
    if (!db.Product) {
      console.warn('Product model not found, returning empty data');
      return res.status(200).json({
        success: true,
        data: [],
        meta: {
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
          isMock: false
        }
      });
    }
    
    const Product = db.Product;
    let whereConditions: any = {};
    
    // Build where conditions for Sequelize
    if (term) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${term}%` } },
        { sku: { [Op.iLike]: `%${term}%` } }
      ];
    }
    
    if (category) {
      whereConditions.category = { [Op.iLike]: `%${category}%` };
    }
    
    if (lowStock === 'true') {
      whereConditions[Op.and] = [
        { stock: { [Op.lte]: require('sequelize').col('reorderPoint') } },
        { stock: { [Op.gt]: 0 } }
      ];
    }
    
    if (outOfStock === 'true') {
      whereConditions.stock = { [Op.lte]: 0 };
    }
    
    if (location) {
      whereConditions.location = { [Op.iLike]: `%${location}%` };
    }
    
    // Query real database
    const { count: totalCount, rows: items } = await Product.findAndCountAll({
      where: whereConditions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      offset: (pageNum - 1) * limitNum,
      limit: limitNum,
      paranoid: true // Exclude soft-deleted items
    });
    
    // Transform database results
    const transformedItems = items.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      sku: item.sku,
      category: item.category || 'Tidak Dikategorikan',
      currentStock: item.stock || 0,
      reorderPoint: item.reorderPoint || 0,
      unit: item.unit || 'Unit',
      location: item.location || 'Tidak Diketahui',
      expiry: item.expiry || null,
      supplier: item.supplier || 'Tidak Diketahui',
      price: parseFloat(item.price) || 0,
      status: (item.stock || 0) <= 0 ? 'out_of_stock' : 
              (item.stock || 0) <= (item.reorderPoint || 0) ? 'low_stock' : 'normal'
    }));
    
    let filteredItems = transformedItems;
    
    console.log(`Retrieved ${filteredItems.length} stock items`, { total: totalCount });

    return res.status(200).json({
      success: true,
      data: filteredItems,
      meta: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        isMock: false
      }
    });
  } catch (error) {
    console.error('Stock search error:', error);
    res.status(500).json({ success: false, message: 'Failed to search stock items' });
  }
};

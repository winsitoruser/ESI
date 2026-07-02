/**
 * API Produk Inventori (Fixed)
 * Versi yang telah diperbaiki dengan penanganan error yang lebih baik
 * Menggunakan pendekatan "Data Mock First" untuk ketahanan UI
 */
import type { NextApiRequest, NextApiResponse } from 'next';

// Mock data untuk produk
const mockProducts = [
  {
    id: 'prod-1',
    name: 'Paracetamol 500mg',
    description: 'Obat pereda nyeri dan demam',
    sku: 'MED-PCT-500',
    category: 'Obat Bebas',
    categoryColor: '#10b981',
    price: 12000,
    stock: 150,
    unit: 'Strip',
    location: 'Rak A-1',
    expiry: '2025-12-31',
    supplier: 'PT Kimia Farma',
    isActive: true
  },
  {
    id: 'prod-2',
    name: 'Amoxicillin 500mg',
    description: 'Antibiotik untuk infeksi bakteri',
    sku: 'MED-AMX-500',
    category: 'Obat Keras',
    categoryColor: '#ef4444',
    price: 25000,
    stock: 75,
    unit: 'Strip',
    location: 'Rak B-2',
    expiry: '2025-08-15',
    supplier: 'PT Dexa Medica',
    isActive: true
  },
  {
    id: 'prod-3',
    name: 'Vitamin C 1000mg',
    description: 'Suplemen vitamin C',
    sku: 'SUP-VTC-1000',
    category: 'Vitamin',
    categoryColor: '#f59e0b',
    price: 15000,
    stock: 200,
    unit: 'Botol',
    location: 'Rak C-3',
    expiry: '2025-06-30',
    supplier: 'PT Bayer Indonesia',
    isActive: true
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, query } = req;

    switch (method) {
      case 'GET':
        return handleGetProducts(req, res);
      case 'POST':
        return handleCreateProduct(req, res);
      case 'PUT':
        return handleUpdateProduct(req, res);
      case 'DELETE':
        return handleDeleteProduct(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          success: false, 
          message: `Method ${method} not allowed` 
        });
    }
  } catch (error: any) {
    console.error('Products API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleGetProducts(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      page = '1', 
      limit = '20', 
      search = '', 
      category = '', 
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    let filteredProducts = [...mockProducts];

    // Filter by search
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.sku.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by category
    if (category && category !== 'all') {
      filteredProducts = filteredProducts.filter(product =>
        product.category === category
      );
    }

    // Sort products
    filteredProducts.sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a];
      let bValue = b[sortBy as keyof typeof b];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    });

    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    return res.status(200).json({
      success: true,
      data: paginatedProducts,
      pagination: {
        total: filteredProducts.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(filteredProducts.length / limitNum)
      },
      message: 'Data produk berhasil diambil (simulasi)',
      isFromMock: true
    });

  } catch (error: any) {
    console.error('Get Products Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data produk',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleCreateProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, description, sku, category, price, stock, unit, location, supplier } = req.body;

    // Validate required fields
    if (!name || !category || !price || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Nama, kategori, harga, dan stok wajib diisi'
      });
    }

    // Check if SKU already exists
    if (sku && mockProducts.some(p => p.sku === sku)) {
      return res.status(400).json({
        success: false,
        message: 'SKU sudah digunakan'
      });
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      name,
      description: description || '',
      sku: sku || `SKU-${Date.now()}`,
      category,
      categoryColor: '#6b7280',
      price: parseFloat(price),
      stock: parseInt(stock),
      unit: unit || 'Pcs',
      location: location || '',
      expiry: '',
      supplier: supplier || '',
      isActive: true
    };

    mockProducts.push(newProduct);

    return res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Produk berhasil dibuat',
      isFromMock: true
    });

  } catch (error: any) {
    console.error('Create Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat produk',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleUpdateProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID produk diperlukan'
      });
    }

    const productIndex = mockProducts.findIndex(p => p.id === id);
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }

    // Update product
    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...updateData,
      id: id as string // Ensure ID doesn't change
    };

    return res.status(200).json({
      success: true,
      data: mockProducts[productIndex],
      message: 'Produk berhasil diperbarui',
      isFromMock: true
    });

  } catch (error: any) {
    console.error('Update Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui produk',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleDeleteProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID produk diperlukan'
      });
    }

    const productIndex = mockProducts.findIndex(p => p.id === id);
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }

    // Remove product
    const deletedProduct = mockProducts.splice(productIndex, 1)[0];

    return res.status(200).json({
      success: true,
      data: deletedProduct,
      message: 'Produk berhasil dihapus',
      isFromMock: true
    });

  } catch (error: any) {
    console.error('Delete Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus produk',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import db from '../../../../server/sequelize/models';
import { Op } from 'sequelize';

const { Product, ProductCategory, InventoryBatch, Supplier } = db;

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // Periksa autentikasi
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = session.user.tenantId;
  
  // Buat handler berdasarkan metode HTTP
  switch (req.method) {
    case 'GET':
      return getProducts(req, res, tenantId);
    case 'POST':
      return createProduct(req, res, tenantId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Mendapatkan daftar produk dengan pagination dan filters
 */
async function getProducts(req, res, tenantId) {
  try {
    const {
      page = 1, 
      limit = 10, 
      search = '', 
      category = '',
      supplier = '',
      drugClass = '',
      lowStock = false,
      nearExpiry = false,
      stockRange = 'all',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Buat query where
    const where = { tenantId };
    
    // Filter berdasarkan pencarian
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Filter berdasarkan kategori
    if (category) {
      where.category = category;
    }
    
    // Filter berdasarkan supplier
    if (supplier) {
      where.supplier = supplier;
    }
    
    // Filter berdasarkan klasifikasi obat
    if (drugClass) {
      where.drugClassification = drugClass;
    }
    
    // Filter berdasarkan stok rendah
    if (lowStock === 'true') {
      where.stockQty = { [Op.lte]: db.sequelize.col('minStockQty') };
    }
    
    // Filter berdasarkan rentang stok
    if (stockRange !== 'all') {
      switch (stockRange) {
        case 'out':
          where.stockQty = 0;
          break;
        case 'low':
          where.stockQty = { 
            [Op.gt]: 0, 
            [Op.lte]: db.sequelize.col('minStockQty') 
          };
          break;
        case 'normal':
          where.stockQty = { 
            [Op.gt]: db.sequelize.col('minStockQty'),
            [Op.lt]: db.sequelize.literal('(3 * "minStockQty")') 
          };
          break;
        case 'high':
          where.stockQty = { 
            [Op.gte]: db.sequelize.literal('(3 * "minStockQty")') 
          };
          break;
      }
    }
    
    // Buat query order
    const order = [[sortBy, sortOrder]];
    
    // Query products dengan pagination
    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: ProductCategory,
          as: 'productCategory',
          attributes: ['name']
        },
        {
          model: InventoryBatch,
          as: 'batches',
          required: false,
          where: nearExpiry === 'true' ? {
            expiryDate: { 
              [Op.not]: null,
              [Op.lte]: new Date(new Date().setDate(new Date().getDate() + 90)) 
            }
          } : {}
        },
        {
          model: Supplier,
          as: 'productSupplier',
          attributes: ['name', 'contact']
        }
      ],
      order,
      limit: parseInt(limit),
      offset
    });
    
    // Hitung jumlah halaman
    const totalPages = Math.ceil(count / parseInt(limit));
    
    // Query kategori unik untuk filter
    const categories = await Product.findAll({
      attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('category')), 'category']],
      where: { tenantId },
      raw: true
    }).then(results => results.map(r => r.category).filter(Boolean));
    
    // Query supplier unik untuk filter
    const suppliers = await Product.findAll({
      attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('supplier')), 'supplier']],
      where: { tenantId },
      raw: true
    }).then(results => results.map(r => r.supplier).filter(Boolean));
    
    // Query manufacturer unik untuk filter
    const manufacturers = await Product.findAll({
      attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('manufacturer')), 'manufacturer']],
      where: { tenantId },
      raw: true
    }).then(results => results.map(r => r.manufacturer).filter(Boolean));
    
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages
      },
      filters: {
        categories,
        suppliers,
        manufacturers
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil data produk',
      message: error.message
    });
  }
}

/**
 * Membuat produk baru
 */
async function createProduct(req, res, tenantId) {
  try {
    const productData = req.body;
    
    // Tambahkan tenantId ke data produk
    productData.tenantId = tenantId;
    
    // Cek kode produk unik
    const existingProduct = await Product.findOne({
      where: {
        tenantId,
        [Op.or]: [
          { code: productData.code },
          { barcode: productData.barcode }
        ]
      }
    });
    
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        error: 'Kode produk atau barcode sudah digunakan'
      });
    }
    
    // Buat produk baru
    const product = await Product.create(productData);
    
    return res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat membuat produk',
      message: error.message
    });
  }
}

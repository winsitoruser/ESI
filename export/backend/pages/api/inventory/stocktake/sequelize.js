import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import db from '../../../../server/sequelize/models';
import { Op } from 'sequelize';

const { Product, StockOpname, StockOpnameItem, StockMovement, Category, User, sequelize } = db;

// Mock data untuk fallback (mengikuti pola "Data Mock First")
const mockStockOpnameData = {
  stockOpnameList: [
    {
      id: 'mock-stockopname-1',
      opnameNumber: 'SOF-20250512-001',
      startDate: new Date(new Date().setDate(new Date().getDate() - 5)),
      endDate: new Date(new Date().setDate(new Date().getDate() - 3)),
      totalItems: 50,
      totalDiscrepancy: 8,
      status: 'completed',
      category: 'Obat Keras',
      createdBy: 'John Doe',
      createdAt: new Date(new Date().setDate(new Date().getDate() - 5))
    },
    {
      id: 'mock-stockopname-2',
      opnameNumber: 'SOF-20250510-002',
      startDate: new Date(new Date().setDate(new Date().getDate() - 15)),
      endDate: new Date(new Date().setDate(new Date().getDate() - 14)),
      totalItems: 35,
      totalDiscrepancy: 4,
      status: 'completed',
      category: 'Vitamin dan Suplemen',
      createdBy: 'Jane Smith',
      createdAt: new Date(new Date().setDate(new Date().getDate() - 15))
    },
    {
      id: 'mock-stockopname-3',
      opnameNumber: 'SOF-20250501-003',
      startDate: new Date(),
      endDate: null,
      totalItems: 42,
      totalDiscrepancy: 0,
      status: 'in_progress',
      category: 'Semua Kategori',
      createdBy: 'John Doe',
      createdAt: new Date()
    }
  ],
  stats: {
    totalCount: 8,
    completedCount: 7,
    inProgressCount: 1,
    discrepancyRate: 4.2,
    lastOpnameDate: new Date(new Date().setDate(new Date().getDate() - 3)),
    categories: [
      { name: 'Semua Kategori', count: 3 },
      { name: 'Obat Keras', count: 2 },
      { name: 'Vitamin dan Suplemen', count: 2 },
      { name: 'Alat Kesehatan', count: 1 }
    ]
  }
};

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
      return getStockOpnameList(req, res, tenantId);
    case 'POST':
      return createStockOpname(req, res, tenantId, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Mendapatkan daftar stock opname dengan pagination dan filters
 */
async function getStockOpnameList(req, res, tenantId) {
  try {
    const {
      page = 1, 
      limit = 10, 
      search = '', 
      startDate = '', 
      endDate = '',
      status = '',
      category = ''
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Buat query where untuk stock opname
    let where = { tenantId };
    
    // Filter berdasarkan status
    if (status) {
      where.status = status;
    }
    
    // Filter berdasarkan rentang tanggal
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { [Op.lte]: new Date(endDate) };
    }
    
    // Filter berdasarkan pencarian
    if (search) {
      where[Op.or] = [
        { opnameNumber: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Filter berdasarkan kategori
    if (category && category !== 'all') {
      where.categoryId = category;
    }
    
    try {
      // Query stock opname dengan pagination
      const { count, rows } = await StockOpname.findAndCountAll({
        where,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'createdByUser',
            attributes: ['id', 'name']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });
      
      // Hitung jumlah halaman
      const totalPages = Math.ceil(count / parseInt(limit));
      
      // Mendapatkan statistik stock opname
      const totalCount = await StockOpname.count({
        where: { tenantId }
      });
      
      const completedCount = await StockOpname.count({
        where: { 
          tenantId,
          status: 'completed'
        }
      });
      
      const inProgressCount = await StockOpname.count({
        where: { 
          tenantId,
          status: 'in_progress'
        }
      });
      
      // Mendapatkan tanggal stock opname terakhir yang selesai
      const lastCompletedOpname = await StockOpname.findOne({
        where: { 
          tenantId,
          status: 'completed'
        },
        order: [['endDate', 'DESC']],
        attributes: ['endDate'],
        raw: true
      });
      
      // Mendapatkan tingkat ketidaksesuaian (discrepancy rate)
      const allCompletedOpnames = await StockOpname.findAll({
        where: { 
          tenantId,
          status: 'completed',
          endDate: {
            [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 90)) // 90 hari terakhir
          }
        },
        attributes: ['totalItems', 'totalDiscrepancy'],
        raw: true
      });
      
      let totalItems = 0;
      let totalDiscrepancies = 0;
      
      allCompletedOpnames.forEach(opname => {
        totalItems += opname.totalItems || 0;
        totalDiscrepancies += opname.totalDiscrepancy || 0;
      });
      
      const discrepancyRate = totalItems > 0
        ? parseFloat(((totalDiscrepancies / totalItems) * 100).toFixed(1))
        : 0;
      
      // Mendapatkan kategori untuk statistik
      const categoryStats = await StockOpname.findAll({
        where: { tenantId },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['name']
          }
        ],
        attributes: [
          'categoryId',
          [sequelize.fn('COUNT', sequelize.col('categoryId')), 'count']
        ],
        group: ['categoryId', 'category.name'],
        raw: true
      });
      
      // Mendapatkan kategori produk untuk filter
      const categories = await Category.findAll({
        where: { tenantId },
        attributes: ['id', 'name'],
        raw: true
      });
      
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
          categories
        },
        stats: {
          totalCount,
          completedCount,
          inProgressCount,
          discrepancyRate,
          lastOpnameDate: lastCompletedOpname ? lastCompletedOpname.endDate : null,
          categories: categoryStats.map(cat => ({
            id: cat.categoryId,
            name: cat['category.name'],
            count: parseInt(cat.count)
          }))
        }
      });
    } catch (dbError) {
      console.error('Database error in getStockOpnameList:', dbError);
      
      // Fallback ke data mock jika terjadi error database (pola "Data Mock First")
      console.log('Falling back to mock data for stock opname list');
      
      return res.status(200).json({
        success: true,
        data: mockStockOpnameData.stockOpnameList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: mockStockOpnameData.stockOpnameList.length,
          totalPages: 1
        },
        stats: mockStockOpnameData.stats,
        isMockData: true // Marker untuk UI bahwa ini adalah data mock
      });
    }
  } catch (error) {
    console.error('Error in getStockOpnameList:', error);
    
    // Fallback ke data mock jika terjadi error di level handler
    return res.status(200).json({
      success: true,
      data: mockStockOpnameData.stockOpnameList,
      pagination: {
        page: 1,
        limit: 10,
        total: mockStockOpnameData.stockOpnameList.length,
        totalPages: 1
      },
      stats: mockStockOpnameData.stats,
      isMockData: true // Marker untuk UI bahwa ini adalah data mock
    });
  }
}

/**
 * Membuat stock opname baru
 */
async function createStockOpname(req, res, tenantId, userId) {
  // Gunakan transaksi database untuk memastikan konsistensi data
  const t = await sequelize.transaction();
  
  try {
    const {
      categoryId,
      products,
      notes
    } = req.body;
    
    // Validasi input
    if (!products || !Array.isArray(products)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Daftar produk wajib diisi'
      });
    }
    
    // Membuat nomor stock opname
    const today = new Date();
    const dateFormatted = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Mendapatkan nomor urut stock opname hari ini
    const opnamesToday = await StockOpname.count({
      where: {
        tenantId,
        createdAt: {
          [Op.gte]: new Date(today.setHours(0, 0, 0, 0)),
          [Op.lt]: new Date(today.setHours(23, 59, 59, 999))
        }
      },
      transaction: t
    });
    
    const opnameNumber = `SOF-${dateFormatted.slice(2)}-${(opnamesToday + 1).toString().padStart(3, '0')}`;
    
    let category = null;
    if (categoryId) {
      category = await Category.findByPk(categoryId, { transaction: t });
    }
    
    // Tentukan apakah ini akan langsung selesai atau berlanjut
    let status = 'in_progress';
    let endDate = null;
    
    if (req.body.status === 'completed') {
      status = 'completed';
      endDate = new Date();
    }
    
    // Membuat record stock opname
    const stockOpname = await StockOpname.create({
      tenantId,
      opnameNumber,
      categoryId,
      startDate: new Date(),
      endDate,
      status,
      totalItems: products.length,
      totalDiscrepancy: 0, // Akan diupdate nanti
      notes,
      createdBy: userId
    }, { transaction: t });
    
    const opnameItems = [];
    let totalDiscrepancy = 0;
    
    // Proses setiap produk
    for (const item of products) {
      if (!item.productId) {
        continue; // Skip item yang tidak memiliki productId
      }
      
      // Cari produk
      const product = await Product.findOne({
        where: { id: item.productId, tenantId },
        transaction: t
      });
      
      if (!product) {
        continue; // Skip produk yang tidak ditemukan
      }
      
      // Hitung ketidaksesuaian
      const systemQty = product.stockQty;
      const actualQty = parseInt(item.actualQty);
      const discrepancy = actualQty - systemQty;
      
      // Buat item stock opname
      const opnameItem = await StockOpnameItem.create({
        tenantId,
        stockOpnameId: stockOpname.id,
        productId: item.productId,
        systemQty,
        actualQty,
        discrepancy,
        notes: item.notes
      }, { transaction: t });
      
      opnameItems.push(opnameItem);
      
      // Update total ketidaksesuaian
      if (discrepancy !== 0) {
        totalDiscrepancy++;
      }
      
      // Jika status completed, update stok produk
      if (status === 'completed') {
        // Update stok produk
        await product.update({ 
          stockQty: actualQty 
        }, { transaction: t });
        
        // Buat catatan pergerakan stok jika ada perbedaan
        if (discrepancy !== 0) {
          await StockMovement.create({
            tenantId,
            productId: item.productId,
            type: 'adjustment',
            quantity: discrepancy,
            notes: `Penyesuaian dari Stock Opname #${opnameNumber}`,
            reason: 'stockopname',
            userId,
            referenceId: stockOpname.id,
            remainingQty: actualQty
          }, { transaction: t });
        }
      }
    }
    
    // Update total ketidaksesuaian di stock opname
    await stockOpname.update({
      totalDiscrepancy
    }, { transaction: t });
    
    // Commit transaksi
    await t.commit();
    
    return res.status(201).json({
      success: true,
      data: {
        stockOpname,
        items: opnameItems
      },
      message: status === 'completed' 
        ? 'Stock opname berhasil diselesaikan' 
        : 'Stock opname berhasil dimulai'
    });
  } catch (error) {
    // Rollback transaksi jika terjadi error
    await t.rollback();
    
    console.error('Error creating stock opname:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat membuat stock opname',
      message: error.message
    });
  }
}

// Handler untuk menyelesaikan stock opname yang sedang berlangsung
export async function completeStockOpname(req, res, tenantId, userId) {
  // Gunakan transaksi database untuk memastikan konsistensi data
  const t = await sequelize.transaction();
  
  try {
    const { id, items } = req.body;
    
    if (!id) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID stock opname wajib diisi'
      });
    }
    
    // Cari stock opname
    const stockOpname = await StockOpname.findOne({
      where: { id, tenantId, status: 'in_progress' },
      transaction: t
    });
    
    if (!stockOpname) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: 'Stock opname tidak ditemukan atau sudah selesai'
      });
    }
    
    // Proses item-item yang telah diupdate
    let totalDiscrepancy = 0;
    
    if (items && Array.isArray(items)) {
      for (const item of items) {
        // Cari item stock opname
        const opnameItem = await StockOpnameItem.findOne({
          where: { id: item.id, stockOpnameId: stockOpname.id },
          transaction: t
        });
        
        if (!opnameItem) continue;
        
        // Ambil produk
        const product = await Product.findByPk(opnameItem.productId, { transaction: t });
        if (!product) continue;
        
        // Update item dengan jumlah yang sebenarnya
        const actualQty = parseInt(item.actualQty);
        const systemQty = opnameItem.systemQty;
        const discrepancy = actualQty - systemQty;
        
        await opnameItem.update({
          actualQty,
          discrepancy,
          notes: item.notes
        }, { transaction: t });
        
        // Update total ketidaksesuaian
        if (discrepancy !== 0) {
          totalDiscrepancy++;
        }
        
        // Update stok produk
        await product.update({ 
          stockQty: actualQty 
        }, { transaction: t });
        
        // Buat catatan pergerakan stok jika ada perbedaan
        if (discrepancy !== 0) {
          await StockMovement.create({
            tenantId,
            productId: product.id,
            type: 'adjustment',
            quantity: discrepancy,
            notes: `Penyesuaian dari Stock Opname #${stockOpname.opnameNumber}`,
            reason: 'stockopname',
            userId,
            referenceId: stockOpname.id,
            remainingQty: actualQty
          }, { transaction: t });
        }
      }
    }
    
    // Update stock opname
    await stockOpname.update({
      status: 'completed',
      endDate: new Date(),
      totalDiscrepancy
    }, { transaction: t });
    
    // Commit transaksi
    await t.commit();
    
    return res.status(200).json({
      success: true,
      data: {
        stockOpname
      },
      message: 'Stock opname berhasil diselesaikan'
    });
  } catch (error) {
    // Rollback transaksi jika terjadi error
    await t.rollback();
    
    console.error('Error completing stock opname:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat menyelesaikan stock opname',
      message: error.message
    });
  }
}

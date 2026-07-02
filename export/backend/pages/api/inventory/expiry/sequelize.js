import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import db from '../../../../server/sequelize/models';
import { Op } from 'sequelize';

const { Product, InventoryBatch, Supplier, sequelize } = db;

// Mock data untuk fallback (mengikuti pola "Data Mock First")
const mockExpiryData = {
  nearExpiry: [
    {
      id: 'mock-batch-1',
      productId: 'mock-product-1',
      batchNumber: 'BATCH001',
      expiryDate: new Date(new Date().setDate(new Date().getDate() + 15)),
      quantity: 35,
      createdAt: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      product: {
        id: 'mock-product-1',
        name: 'Paracetamol 500mg',
        code: 'PARA500',
        unit: 'strip',
        stockQty: 45,
        category: 'Analgesic',
        supplier: 'PT Kalbe Farma'
      }
    },
    {
      id: 'mock-batch-2',
      productId: 'mock-product-2',
      batchNumber: 'BATCH002',
      expiryDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      quantity: 20,
      createdAt: new Date(new Date().setMonth(new Date().getMonth() - 4)),
      product: {
        id: 'mock-product-2',
        name: 'Amoxicillin 500mg',
        code: 'AMOX500',
        unit: 'strip',
        stockQty: 25,
        category: 'Antibiotic',
        supplier: 'PT Kimia Farma'
      }
    }
  ],
  expired: [
    {
      id: 'mock-batch-3',
      productId: 'mock-product-3',
      batchNumber: 'BATCH003',
      expiryDate: new Date(new Date().setDate(new Date().getDate() - 15)),
      quantity: 5,
      createdAt: new Date(new Date().setMonth(new Date().getMonth() - 12)),
      product: {
        id: 'mock-product-3',
        name: 'Vitamin C 500mg',
        code: 'VITC500',
        unit: 'botol',
        stockQty: 10,
        category: 'Vitamin',
        supplier: 'PT Tempo Scan Pacific'
      }
    }
  ],
  stats: {
    totalNearExpiry: 2,
    totalExpired: 1,
    totalCritical: 1,
    percentageNearExpiry: 5.8,
    valueNearExpiry: 1250000,
    valueExpired: 250000
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
      return getExpiryData(req, res, tenantId);
    case 'POST':
      return processExpiredItems(req, res, tenantId, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Mendapatkan data produk yang kadaluarsa dan mendekati kadaluarsa
 */
async function getExpiryData(req, res, tenantId) {
  try {
    const {
      page = 1, 
      limit = 10, 
      search = '', 
      filter = 'all', // 'near', 'expired', atau 'all'
      days = 30, // Produk yang kadaluarsa dalam X hari ke depan
      category = '',
      supplier = ''
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Tanggal untuk filter near expiry
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));
    
    // Buat query where untuk batch
    let batchWhere = { tenantId };
    
    if (filter === 'near') {
      // Produk yang mendekati kadaluarsa (dalam X hari ke depan)
      batchWhere.expiryDate = {
        [Op.and]: [
          { [Op.gt]: today },
          { [Op.lte]: futureDate }
        ]
      };
    } else if (filter === 'expired') {
      // Produk yang sudah kadaluarsa
      batchWhere.expiryDate = { [Op.lt]: today };
    } else {
      // Semua produk dengan tanggal kadaluarsa (termasuk yang sudah kadaluarsa dan mendekati)
      batchWhere.expiryDate = { [Op.not]: null };
    }
    
    // Query untuk produk jika ada pencarian
    let productWhere = { tenantId };
    if (search) {
      productWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Filter berdasarkan kategori
    if (category) {
      productWhere.category = category;
    }
    
    // Filter berdasarkan supplier
    if (supplier) {
      productWhere.supplier = supplier;
    }
    
    try {
      // Query batch kadaluarsa dengan pagination
      const { count, rows } = await InventoryBatch.findAndCountAll({
        where: batchWhere,
        include: [
          {
            model: Product,
            as: 'product',
            where: productWhere,
            include: [
              {
                model: Supplier,
                as: 'productSupplier',
                attributes: ['id', 'name']
              }
            ]
          }
        ],
        order: [['expiryDate', 'ASC']],
        limit: parseInt(limit),
        offset
      });
      
      // Mendapatkan statistik umum
      const totalNearExpiryCount = await InventoryBatch.count({
        where: {
          tenantId,
          expiryDate: {
            [Op.and]: [
              { [Op.gt]: today },
              { [Op.lte]: futureDate }
            ]
          },
          quantity: { [Op.gt]: 0 }
        },
        include: [{
          model: Product,
          as: 'product',
          where: { tenantId }
        }]
      });
      
      const totalExpiredCount = await InventoryBatch.count({
        where: {
          tenantId,
          expiryDate: { [Op.lt]: today },
          quantity: { [Op.gt]: 0 }
        },
        include: [{
          model: Product,
          as: 'product',
          where: { tenantId }
        }]
      });
      
      // Produk kritikal (kadaluarsa dalam 7 hari)
      const criticalDate = new Date();
      criticalDate.setDate(today.getDate() + 7);
      
      const totalCriticalCount = await InventoryBatch.count({
        where: {
          tenantId,
          expiryDate: {
            [Op.and]: [
              { [Op.gt]: today },
              { [Op.lte]: criticalDate }
            ]
          },
          quantity: { [Op.gt]: 0 }
        },
        include: [{
          model: Product,
          as: 'product',
          where: { tenantId }
        }]
      });
      
      // Mendapatkan total nilai produk mendekati kadaluarsa
      const valueNearExpiry = await InventoryBatch.findAll({
        where: {
          tenantId,
          expiryDate: {
            [Op.and]: [
              { [Op.gt]: today },
              { [Op.lte]: futureDate }
            ]
          },
          quantity: { [Op.gt]: 0 }
        },
        include: [{
          model: Product,
          as: 'product',
          where: { tenantId },
          attributes: ['buyPrice']
        }],
        attributes: ['quantity']
      }).then(batches => {
        return batches.reduce((total, batch) => {
          return total + (batch.quantity * batch.product.buyPrice);
        }, 0);
      });
      
      // Mendapatkan total nilai produk yang sudah kadaluarsa
      const valueExpired = await InventoryBatch.findAll({
        where: {
          tenantId,
          expiryDate: { [Op.lt]: today },
          quantity: { [Op.gt]: 0 }
        },
        include: [{
          model: Product,
          as: 'product',
          where: { tenantId },
          attributes: ['buyPrice']
        }],
        attributes: ['quantity']
      }).then(batches => {
        return batches.reduce((total, batch) => {
          return total + (batch.quantity * batch.product.buyPrice);
        }, 0);
      });
      
      // Menghitung persentase produk mendekati kadaluarsa
      const totalProductsCount = await Product.count({
        where: { tenantId }
      });
      
      const percentageNearExpiry = totalProductsCount > 0
        ? (totalNearExpiryCount / totalProductsCount) * 100
        : 0;
      
      // Hitung jumlah halaman
      const totalPages = Math.ceil(count / parseInt(limit));
      
      // Return data expiry
      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages
        },
        stats: {
          totalNearExpiry: totalNearExpiryCount,
          totalExpired: totalExpiredCount,
          totalCritical: totalCriticalCount,
          percentageNearExpiry: parseFloat(percentageNearExpiry.toFixed(2)),
          valueNearExpiry,
          valueExpired
        }
      });
    } catch (dbError) {
      console.error('Database error in getExpiryData:', dbError);
      
      // Fallback ke data mock jika terjadi error database
      console.log('Falling back to mock data for expiry data');
      
      // Implementasi pola "Data Mock First"
      return res.status(200).json({
        success: true,
        data: filter === 'near' 
          ? mockExpiryData.nearExpiry 
          : filter === 'expired' 
            ? mockExpiryData.expired 
            : [...mockExpiryData.nearExpiry, ...mockExpiryData.expired],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filter === 'near' 
            ? mockExpiryData.nearExpiry.length 
            : filter === 'expired' 
              ? mockExpiryData.expired.length 
              : mockExpiryData.nearExpiry.length + mockExpiryData.expired.length,
          totalPages: 1
        },
        stats: mockExpiryData.stats,
        isMockData: true // Marker untuk UI bahwa ini adalah data mock
      });
    }
  } catch (error) {
    console.error('Error in getExpiryData:', error);
    
    // Fallback ke data mock jika terjadi error di level handler
    return res.status(200).json({
      success: true,
      data: mockExpiryData.nearExpiry.concat(mockExpiryData.expired),
      pagination: {
        page: 1,
        limit: 10,
        total: mockExpiryData.nearExpiry.length + mockExpiryData.expired.length,
        totalPages: 1
      },
      stats: mockExpiryData.stats,
      isMockData: true // Marker untuk UI bahwa ini adalah data mock
    });
  }
}

/**
 * Memproses produk kadaluarsa (menghapus atau menandai)
 */
async function processExpiredItems(req, res, tenantId, userId) {
  // Gunakan transaksi database untuk memastikan konsistensi data
  const t = await sequelize.transaction();
  
  try {
    const { batchIds, action, notes } = req.body;
    
    // Validasi input
    if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID batch wajib diisi'
      });
    }
    
    if (!action || !['discard', 'mark'].includes(action)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Tindakan tidak valid. Pilih "discard" untuk membuang atau "mark" untuk menandai'
      });
    }
    
    // Ambil batch-batch yang akan diproses
    const batches = await InventoryBatch.findAll({
      where: {
        id: { [Op.in]: batchIds },
        tenantId
      },
      include: [{
        model: Product,
        as: 'product'
      }],
      transaction: t
    });
    
    if (batches.length === 0) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: 'Batch tidak ditemukan'
      });
    }
    
    const results = [];
    
    // Proses setiap batch
    for (const batch of batches) {
      if (action === 'discard') {
        // Produk dibuang: kurangi stok dan tandai batch sebagai dibuang
        const product = batch.product;
        const newStock = product.stockQty - batch.quantity;
        
        if (newStock < 0) {
          // Skip batch ini jika akan membuat stok negatif
          results.push({
            batchId: batch.id,
            success: false,
            message: `Menghapus batch ${batch.batchNumber} akan membuat stok ${product.name} menjadi negatif`
          });
          continue;
        }
        
        // Update stok produk
        await product.update({ stockQty: newStock }, { transaction: t });
        
        // Tandai batch sebagai dibuang
        await batch.update({ 
          status: 'discarded',
          quantity: 0,
          processedAt: new Date(),
          processedBy: userId,
          notes: notes || 'Produk kadaluarsa dibuang'
        }, { transaction: t });
        
        // Buat catatan pergerakan stok
        await db.StockMovement.create({
          tenantId,
          productId: product.id,
          batchId: batch.id,
          type: 'expiry',
          quantity: -batch.quantity,
          notes: notes || 'Produk kadaluarsa dibuang',
          userId,
          referenceId: `EXP-${Date.now()}-${batch.id}`,
          remainingQty: newStock
        }, { transaction: t });
        
        results.push({
          batchId: batch.id,
          success: true,
          message: `Batch ${batch.batchNumber} berhasil dibuang`
        });
      } else if (action === 'mark') {
        // Produk hanya ditandai sebagai kadaluarsa
        await batch.update({ 
          status: 'expired',
          processedAt: new Date(),
          processedBy: userId,
          notes: notes || 'Produk ditandai kadaluarsa'
        }, { transaction: t });
        
        results.push({
          batchId: batch.id,
          success: true,
          message: `Batch ${batch.batchNumber} berhasil ditandai kadaluarsa`
        });
      }
    }
    
    // Commit transaksi
    await t.commit();
    
    return res.status(200).json({
      success: true,
      results,
      message: `${results.filter(r => r.success).length} dari ${batchIds.length} batch berhasil diproses`
    });
  } catch (error) {
    // Rollback transaksi jika terjadi error
    await t.rollback();
    
    console.error('Error processing expired items:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memproses produk kadaluarsa',
      message: error.message
    });
  }
}

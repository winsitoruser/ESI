import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import db from '../../../../server/sequelize/models';
import { Op } from 'sequelize';

const { Product, GoodsReceipt, GoodsReceiptItem, Supplier, PurchaseOrder, StockMovement, InventoryBatch, User, sequelize } = db;

// Mock data untuk fallback (mengikuti pola "Data Mock First")
const mockReceiptData = {
  receipts: [
    {
      id: 'mock-receipt-1',
      receiptNumber: 'GRN-20250512-001',
      purchaseOrderNumber: 'PO-20250501-001',
      supplierId: 'mock-supplier-1',
      totalItems: 5,
      totalAmount: 2500000,
      receivedDate: new Date(),
      status: 'completed',
      createdAt: new Date(),
      supplier: { name: 'PT Kimia Farma' },
      user: { name: 'John Doe' }
    },
    {
      id: 'mock-receipt-2',
      receiptNumber: 'GRN-20250510-002',
      purchaseOrderNumber: 'PO-20250505-002',
      supplierId: 'mock-supplier-2',
      totalItems: 3,
      totalAmount: 1200000,
      receivedDate: new Date(new Date().setDate(new Date().getDate() - 2)),
      status: 'completed',
      createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
      supplier: { name: 'PT Kalbe Farma' },
      user: { name: 'Jane Smith' }
    }
  ],
  stats: {
    totalReceived: 7150000,
    totalReceiptsCount: 8,
    pendingReceipts: 2,
    supplierPerformance: {
      bestSupplier: 'PT Kimia Farma',
      avgProcessingTime: '2.3 hari'
    }
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
      return getGoodsReceipts(req, res, tenantId);
    case 'POST':
      return createGoodsReceipt(req, res, tenantId, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Mendapatkan daftar penerimaan barang dengan pagination dan filters
 */
async function getGoodsReceipts(req, res, tenantId) {
  try {
    const {
      page = 1, 
      limit = 10, 
      search = '', 
      startDate = '', 
      endDate = '',
      status = '',
      supplier = ''
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Buat query where untuk goods receipt
    let where = { tenantId };
    
    // Filter berdasarkan status
    if (status) {
      where.status = status;
    }
    
    // Filter berdasarkan rentang tanggal
    if (startDate && endDate) {
      where.receivedDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.receivedDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.receivedDate = { [Op.lte]: new Date(endDate) };
    }
    
    // Filter berdasarkan pencarian
    if (search) {
      where[Op.or] = [
        { receiptNumber: { [Op.iLike]: `%${search}%` } },
        { purchaseOrderNumber: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Filter berdasarkan supplier
    let supplierWhere = {};
    if (supplier) {
      supplierWhere.id = supplier;
    }
    
    try {
      // Query goods receipts dengan pagination
      const { count, rows } = await GoodsReceipt.findAndCountAll({
        where,
        include: [
          {
            model: Supplier,
            as: 'supplier',
            where: Object.keys(supplierWhere).length > 0 ? supplierWhere : undefined,
            attributes: ['id', 'name', 'contact']
          },
          {
            model: GoodsReceiptItem,
            as: 'items',
            required: false,
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'code', 'unit']
              }
            ]
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
      
      // Mendapatkan statistik penerimaan barang
      const totalReceived = await GoodsReceipt.sum('totalAmount', {
        where: { 
          tenantId,
          status: 'completed',
          receivedDate: {
            [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30)) // 30 hari terakhir
          }
        }
      }) || 0;
      
      const totalReceiptsCount = await GoodsReceipt.count({
        where: { 
          tenantId,
          receivedDate: {
            [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30)) // 30 hari terakhir
          }
        }
      });
      
      const pendingReceipts = await GoodsReceipt.count({
        where: { 
          tenantId,
          status: 'pending'
        }
      });
      
      // Mendapatkan supplier terbaik berdasarkan frekuensi
      const bestSupplier = await GoodsReceipt.findAll({
        where: { 
          tenantId,
          status: 'completed',
          receivedDate: {
            [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 90)) // 90 hari terakhir
          }
        },
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['name']
          }
        ],
        attributes: [
          'supplierId',
          [sequelize.fn('COUNT', sequelize.col('supplierId')), 'receiptCount']
        ],
        group: ['supplierId', 'supplier.name'],
        order: [[sequelize.literal('receiptCount'), 'DESC']],
        limit: 1,
        raw: true
      });
      
      // Mendapatkan supplier unik untuk filter
      const suppliers = await Supplier.findAll({
        where: { tenantId },
        attributes: ['id', 'name'],
        raw: true
      });
      
      // Mendapatkan rata-rata waktu pemrosesan (dari PO ke penerimaan)
      const receiptsWithPO = await GoodsReceipt.findAll({
        where: { 
          tenantId,
          status: 'completed',
          purchaseOrderId: { [Op.not]: null },
          receivedDate: {
            [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 90)) // 90 hari terakhir
          }
        },
        include: [
          {
            model: PurchaseOrder,
            as: 'purchaseOrder',
            attributes: ['orderDate']
          }
        ],
        attributes: ['receivedDate'],
        raw: true
      });
      
      // Hitung rata-rata waktu pemrosesan dalam hari
      let totalProcessingDays = 0;
      let countValidReceipts = 0;
      
      receiptsWithPO.forEach(receipt => {
        if (receipt['purchaseOrder.orderDate'] && receipt.receivedDate) {
          const orderDate = new Date(receipt['purchaseOrder.orderDate']);
          const receivedDate = new Date(receipt.receivedDate);
          const diffTime = Math.abs(receivedDate - orderDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          totalProcessingDays += diffDays;
          countValidReceipts++;
        }
      });
      
      const avgProcessingTime = countValidReceipts > 0
        ? (totalProcessingDays / countValidReceipts).toFixed(1)
        : 'N/A';
      
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
          suppliers
        },
        stats: {
          totalReceived,
          totalReceiptsCount,
          pendingReceipts,
          supplierPerformance: {
            bestSupplier: bestSupplier.length > 0 ? bestSupplier[0]['supplier.name'] : 'N/A',
            avgProcessingTime: `${avgProcessingTime} hari`
          }
        }
      });
    } catch (dbError) {
      console.error('Database error in getGoodsReceipts:', dbError);
      
      // Fallback ke data mock jika terjadi error database (pola "Data Mock First")
      console.log('Falling back to mock data for goods receipts');
      
      return res.status(200).json({
        success: true,
        data: mockReceiptData.receipts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: mockReceiptData.receipts.length,
          totalPages: 1
        },
        stats: mockReceiptData.stats,
        isMockData: true // Marker untuk UI bahwa ini adalah data mock
      });
    }
  } catch (error) {
    console.error('Error in getGoodsReceipts:', error);
    
    // Fallback ke data mock jika terjadi error di level handler
    return res.status(200).json({
      success: true,
      data: mockReceiptData.receipts,
      pagination: {
        page: 1,
        limit: 10,
        total: mockReceiptData.receipts.length,
        totalPages: 1
      },
      stats: mockReceiptData.stats,
      isMockData: true // Marker untuk UI bahwa ini adalah data mock
    });
  }
}

/**
 * Mencatat penerimaan barang baru
 */
async function createGoodsReceipt(req, res, tenantId, userId) {
  // Gunakan transaksi database untuk memastikan konsistensi data
  const t = await sequelize.transaction();
  
  try {
    const {
      purchaseOrderId,
      supplierId,
      receivedDate,
      notes,
      items
    } = req.body;
    
    // Validasi input
    if (!supplierId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Supplier wajib diisi'
      });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Daftar produk wajib diisi'
      });
    }
    
    // Validasi setiap item
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: 'Setiap item harus memiliki ID produk dan jumlah yang valid'
        });
      }
    }
    
    // Mendapatkan informasi purchase order jika ada
    let purchaseOrder = null;
    let purchaseOrderNumber = null;
    
    if (purchaseOrderId) {
      purchaseOrder = await PurchaseOrder.findOne({
        where: { id: purchaseOrderId, tenantId },
        transaction: t
      });
      
      if (purchaseOrder) {
        purchaseOrderNumber = purchaseOrder.orderNumber;
      }
    }
    
    // Membuat nomor penerimaan barang
    const today = new Date();
    const dateFormatted = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Mendapatkan nomor urut penerimaan hari ini
    const receiptsToday = await GoodsReceipt.count({
      where: {
        tenantId,
        createdAt: {
          [Op.gte]: new Date(today.setHours(0, 0, 0, 0)),
          [Op.lt]: new Date(today.setHours(23, 59, 59, 999))
        }
      },
      transaction: t
    });
    
    const receiptNumber = `GRN-${dateFormatted.slice(2)}-${(receiptsToday + 1).toString().padStart(3, '0')}`;
    
    // Menghitung total jumlah dan nilai barang
    let totalItems = 0;
    let totalAmount = 0;
    
    for (const item of items) {
      totalItems += parseInt(item.quantity);
      totalAmount += (parseFloat(item.buyPrice) * parseInt(item.quantity));
    }
    
    // Membuat record penerimaan barang
    const goodsReceipt = await GoodsReceipt.create({
      tenantId,
      receiptNumber,
      purchaseOrderId,
      purchaseOrderNumber,
      supplierId,
      receivedDate: receivedDate || new Date(),
      totalItems,
      totalAmount,
      status: 'completed',
      notes,
      createdBy: userId
    }, { transaction: t });
    
    // Proses setiap item
    const receiptItems = [];
    for (const item of items) {
      // Cari produk untuk memastikan product ada dan mendapatkan stok saat ini
      const product = await Product.findOne({
        where: { id: item.productId, tenantId },
        transaction: t
      });
      
      if (!product) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          error: `Produk dengan ID ${item.productId} tidak ditemukan`
        });
      }
      
      // Hitung stok baru
      const newStock = product.stockQty + parseInt(item.quantity);
      
      // Buat batch baru jika ada tanggal kadaluarsa
      let batchId = null;
      
      if (item.expiryDate) {
        const batch = await InventoryBatch.create({
          tenantId,
          productId: item.productId,
          batchNumber: item.batchNumber || `BN-${Date.now().toString(36).slice(-8).toUpperCase()}`,
          quantity: parseInt(item.quantity),
          expiryDate: new Date(item.expiryDate),
          manufacturedDate: item.manufacturedDate ? new Date(item.manufacturedDate) : null,
          status: 'active',
          receivedDate: receivedDate || new Date(),
          goodsReceiptId: goodsReceipt.id
        }, { transaction: t });
        
        batchId = batch.id;
      }
      
      // Buat item penerimaan
      const receiptItem = await GoodsReceiptItem.create({
        tenantId,
        goodsReceiptId: goodsReceipt.id,
        productId: item.productId,
        quantity: parseInt(item.quantity),
        buyPrice: parseFloat(item.buyPrice),
        sellPrice: parseFloat(item.sellPrice) || 0,
        discount: parseFloat(item.discount) || 0,
        tax: parseFloat(item.tax) || 0,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        notes: item.notes,
        inventoryBatchId: batchId
      }, { transaction: t });
      
      // Update stok produk
      await product.update({ 
        stockQty: newStock,
        buyPrice: parseFloat(item.buyPrice), // Update harga beli terbaru
        sellPrice: parseFloat(item.sellPrice) || product.sellPrice // Update harga jual jika ada
      }, { transaction: t });
      
      // Buat catatan pergerakan stok
      await StockMovement.create({
        tenantId,
        productId: item.productId,
        batchId,
        type: 'in',
        quantity: parseInt(item.quantity),
        notes: `Penerimaan barang #${receiptNumber}`,
        reason: 'purchase',
        userId,
        referenceId: goodsReceipt.id,
        remainingQty: newStock
      }, { transaction: t });
      
      receiptItems.push(receiptItem);
    }
    
    // Update purchase order jika ada
    if (purchaseOrder) {
      // Cek apakah semua item PO sudah diterima
      // Logika ini tergantung pada implementasi business process yang spesifik
      
      await purchaseOrder.update({
        status: 'received',
        receivedDate: receivedDate || new Date()
      }, { transaction: t });
    }
    
    // Commit transaksi
    await t.commit();
    
    return res.status(201).json({
      success: true,
      data: {
        receipt: goodsReceipt,
        items: receiptItems
      },
      message: 'Penerimaan barang berhasil dicatat'
    });
  } catch (error) {
    // Rollback transaksi jika terjadi error
    await t.rollback();
    
    console.error('Error creating goods receipt:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mencatat penerimaan barang',
      message: error.message
    });
  }
}

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import db from '../../../../server/sequelize/models';
import { Op } from 'sequelize';

const { Product, StockMovement, User, sequelize } = db;

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
      return getAdjustmentHistory(req, res, tenantId);
    case 'POST':
      return createAdjustment(req, res, tenantId, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Mendapatkan riwayat penyesuaian stok dengan pagination dan filters
 */
async function getAdjustmentHistory(req, res, tenantId) {
  try {
    const {
      page = 1, 
      limit = 10, 
      search = '', 
      startDate = '', 
      endDate = '',
      adjustmentType = ''
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Buat query where untuk stock movement
    const where = { 
      tenantId,
      type: 'adjustment'
    };
    
    // Filter berdasarkan tipe penyesuaian (plus/minus)
    if (adjustmentType === 'plus') {
      where.quantity = { [Op.gt]: 0 };
    } else if (adjustmentType === 'minus') {
      where.quantity = { [Op.lt]: 0 };
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
    
    // Query untuk produk jika ada pencarian
    let productWhere = {};
    if (search) {
      productWhere = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { code: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }
    
    // Query adjustments dengan pagination
    const { count, rows } = await StockMovement.findAndCountAll({
      where,
      include: [
        {
          model: Product,
          as: 'product',
          where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
          attributes: ['id', 'name', 'code', 'unit', 'stockQty']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    // Hitung jumlah halaman
    const totalPages = Math.ceil(count / parseInt(limit));
    
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching adjustment history:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil riwayat penyesuaian stok',
      message: error.message
    });
  }
}

/**
 * Membuat penyesuaian stok baru
 */
async function createAdjustment(req, res, tenantId, userId) {
  // Gunakan transaksi database untuk memastikan konsistensi data
  const t = await sequelize.transaction();
  
  try {
    const { productId, quantity, notes, reason } = req.body;
    
    // Validasi input
    if (!productId || !quantity) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID produk dan jumlah penyesuaian wajib diisi'
      });
    }
    
    // Ambil produk
    const product = await Product.findOne({
      where: { id: productId, tenantId },
      transaction: t
    });
    
    if (!product) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: 'Produk tidak ditemukan'
      });
    }
    
    // Hitung stok baru
    const newStock = product.stockQty + parseInt(quantity);
    
    // Pastikan stok tidak negatif
    if (newStock < 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Stok tidak boleh kurang dari 0'
      });
    }
    
    // Update stok produk
    await product.update({ stockQty: newStock }, { transaction: t });
    
    // Buat catatan pergerakan stok
    const stockMovement = await StockMovement.create({
      tenantId,
      productId,
      type: 'adjustment',
      quantity: parseInt(quantity),
      notes,
      reason,
      userId,
      referenceId: `ADJ-${Date.now()}`,
      remainingQty: newStock
    }, { transaction: t });
    
    // Commit transaksi
    await t.commit();
    
    return res.status(201).json({
      success: true,
      data: {
        adjustment: stockMovement,
        newStock
      },
      message: 'Penyesuaian stok berhasil dilakukan'
    });
  } catch (error) {
    // Rollback transaksi jika terjadi error
    await t.rollback();
    
    console.error('Error creating adjustment:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat membuat penyesuaian stok',
      message: error.message
    });
  }
}

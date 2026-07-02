import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import db from '../../../../server/sequelize/models';

const { Product, InventoryBatch, StockMovement, Supplier } = db;

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // Periksa autentikasi
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tenantId = session.user.tenantId;
  const { id } = req.query;
  
  // Validasi id
  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }
  
  // Buat handler berdasarkan metode HTTP
  switch (req.method) {
    case 'GET':
      return getProductById(req, res, id, tenantId);
    case 'PUT':
      return updateProduct(req, res, id, tenantId);
    case 'DELETE':
      return deleteProduct(req, res, id, tenantId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Mendapatkan detail produk berdasarkan ID
 */
async function getProductById(req, res, id, tenantId) {
  try {
    const product = await Product.findOne({
      where: { id, tenantId },
      include: [
        {
          model: InventoryBatch,
          as: 'batches',
          attributes: ['id', 'batchNumber', 'expiryDate', 'quantity', 'createdAt'],
          required: false
        },
        {
          model: Supplier,
          as: 'productSupplier',
          attributes: ['id', 'name', 'contact', 'email', 'address'],
          required: false
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produk tidak ditemukan'
      });
    }
    
    // Ambil riwayat pergerakan stok
    const stockMovements = await StockMovement.findAll({
      where: { productId: id },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    return res.status(200).json({
      success: true,
      data: product,
      stockMovements
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat mengambil detail produk',
      message: error.message
    });
  }
}

/**
 * Memperbarui produk
 */
async function updateProduct(req, res, id, tenantId) {
  try {
    const productData = req.body;
    
    // Cek apakah produk ada
    const product = await Product.findOne({
      where: { id, tenantId }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produk tidak ditemukan'
      });
    }
    
    // Cek kode produk unik (jika diubah)
    if (productData.code !== product.code || productData.barcode !== product.barcode) {
      const existingProduct = await Product.findOne({
        where: {
          tenantId,
          id: { [db.Sequelize.Op.ne]: id },
          [db.Sequelize.Op.or]: [
            { code: productData.code },
            { barcode: productData.barcode }
          ]
        }
      });
      
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          error: 'Kode produk atau barcode sudah digunakan oleh produk lain'
        });
      }
    }
    
    // Update produk
    await product.update(productData);
    
    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memperbarui produk',
      message: error.message
    });
  }
}

/**
 * Menghapus produk
 */
async function deleteProduct(req, res, id, tenantId) {
  try {
    // Cek apakah produk ada
    const product = await Product.findOne({
      where: { id, tenantId }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produk tidak ditemukan'
      });
    }
    
    // Cek apakah produk memiliki transaksi terkait
    const hasTransactions = await StockMovement.findOne({
      where: { productId: id }
    });
    
    if (hasTransactions) {
      // Jika ada transaksi, set status nonaktif saja
      await product.update({ isActive: false });
      
      return res.status(200).json({
        success: true,
        message: 'Produk telah dinonaktifkan karena memiliki riwayat transaksi',
        data: product
      });
    }
    
    // Jika tidak ada transaksi, hapus permanent
    await product.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Produk berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat menghapus produk',
      message: error.message
    });
  }
}

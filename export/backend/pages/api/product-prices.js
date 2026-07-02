const db = require('../../models');
const { ProductPrice, Product, LoyaltyTier } = db;

export default async function handler(req, res) {
  const { method, query } = req;

  try {
    switch (method) {
      case 'GET':
        const { product_id, price_type } = query;
        
        let where = { is_active: true };
        
        if (product_id) {
          where.product_id = parseInt(product_id);
        }
        
        if (price_type) {
          where.price_type = price_type;
        }
        
        const prices = await ProductPrice.findAll({
          where,
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku']
            },
            {
              model: LoyaltyTier,
              as: 'tier',
              attributes: ['id', 'tierName', 'tierLevel'],
              required: false
            }
          ],
          order: [['priority', 'DESC'], ['price_type', 'ASC']]
        });
        
        return res.status(200).json({
          success: true,
          data: prices
        });

      case 'POST':
        const pricesData = Array.isArray(req.body) ? req.body : [req.body];
        
        const createdPrices = await ProductPrice.bulkCreate(pricesData);
        
        return res.status(201).json({
          success: true,
          data: createdPrices,
          message: 'Product prices berhasil dibuat'
        });

      case 'PUT':
        const { id, ...updateData } = req.body;
        
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'ID is required'
          });
        }
        
        const price = await ProductPrice.findByPk(id);
        
        if (!price) {
          return res.status(404).json({
            success: false,
            message: 'Product price not found'
          });
        }
        
        await price.update(updateData);
        
        return res.status(200).json({
          success: true,
          data: price,
          message: 'Product price berhasil diupdate'
        });

      case 'DELETE':
        const { id: deleteId } = query;
        
        if (!deleteId) {
          return res.status(400).json({
            success: false,
            message: 'ID is required'
          });
        }
        
        const deletedCount = await ProductPrice.destroy({
          where: { id: parseInt(deleteId) }
        });
        
        if (deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: 'Product price not found'
          });
        }
        
        return res.status(200).json({
          success: true,
          message: 'Product price berhasil dihapus'
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Product Prices API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

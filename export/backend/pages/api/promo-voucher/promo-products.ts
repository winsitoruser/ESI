import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const PromoProduct = require('../../../models/PromoProduct');
const Promo = require('../../../models/Promo');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all promo products
    if (req.method === 'GET') {
      const { promoId, productId } = req.query;

      let whereClause: any = { isActive: true };

      if (promoId) {
        whereClause.promoId = promoId;
      }

      if (productId) {
        whereClause.productId = productId;
      }

      const promoProducts = await PromoProduct.findAll({
        where: whereClause,
        include: [{
          model: Promo,
          as: 'promo',
          attributes: ['id', 'name', 'code', 'status']
        }],
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({ 
        success: true, 
        data: promoProducts
      });
    }

    // POST - Add product to promo
    if (req.method === 'POST') {
      const {
        promoId,
        productId,
        productName,
        productSku,
        discountType,
        discountValue,
        minQuantity,
        maxQuantity,
        overridePrice,
        quantityTiers,
        checkStock
      } = req.body;

      // Validate required fields
      if (!promoId || !productId || !productName || !discountType || discountValue === undefined) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields: promoId, productId, productName, discountType, discountValue' 
        });
      }

      // Validate promo exists
      const promo = await Promo.findByPk(promoId);
      if (!promo) {
        return res.status(404).json({ 
          success: false,
          error: 'Promo not found' 
        });
      }

      // Check if product already in promo
      const existing = await PromoProduct.findOne({
        where: { promoId, productId, isActive: true }
      });

      if (existing) {
        return res.status(400).json({ 
          success: false,
          error: 'Product already added to this promo' 
        });
      }

      // Create promo product
      const promoProduct = await PromoProduct.create({
        promoId,
        productId,
        productName,
        productSku,
        discountType,
        discountValue: parseFloat(discountValue),
        minQuantity: minQuantity || 1,
        maxQuantity: maxQuantity || null,
        overridePrice: overridePrice ? parseFloat(overridePrice) : null,
        quantityTiers: quantityTiers || null,
        checkStock: checkStock !== undefined ? checkStock : true,
        isActive: true
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Product added to promo successfully',
        data: promoProduct 
      });
    }

    // POST - Bulk add products to promo
    if (req.method === 'POST' && req.query.bulk === 'true') {
      const { promoId, products } = req.body;

      if (!promoId || !products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields: promoId, products (array)' 
        });
      }

      // Validate promo exists
      const promo = await Promo.findByPk(promoId);
      if (!promo) {
        return res.status(404).json({ 
          success: false,
          error: 'Promo not found' 
        });
      }

      const createdProducts = [];
      const errors = [];

      for (const product of products) {
        try {
          // Check if already exists
          const existing = await PromoProduct.findOne({
            where: { promoId, productId: product.productId, isActive: true }
          });

          if (!existing) {
            const promoProduct = await PromoProduct.create({
              promoId,
              productId: product.productId,
              productName: product.productName,
              productSku: product.productSku || null,
              discountType: product.discountType || 'percentage',
              discountValue: parseFloat(product.discountValue),
              minQuantity: product.minQuantity || 1,
              maxQuantity: product.maxQuantity || null,
              overridePrice: product.overridePrice ? parseFloat(product.overridePrice) : null,
              quantityTiers: product.quantityTiers || null,
              checkStock: product.checkStock !== undefined ? product.checkStock : true,
              isActive: true
            });
            createdProducts.push(promoProduct);
          }
        } catch (error: any) {
          errors.push({ productId: product.productId, error: error.message });
        }
      }

      return res.status(201).json({ 
        success: true, 
        message: `${createdProducts.length} products added to promo`,
        data: createdProducts,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // PUT - Update promo product
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false,
          error: 'Promo Product ID is required' 
        });
      }

      const promoProduct = await PromoProduct.findByPk(id);

      if (!promoProduct) {
        return res.status(404).json({ 
          success: false,
          error: 'Promo product not found' 
        });
      }

      const {
        discountType,
        discountValue,
        minQuantity,
        maxQuantity,
        overridePrice,
        quantityTiers,
        checkStock
      } = req.body;

      // Update promo product
      await promoProduct.update({
        discountType: discountType || promoProduct.discountType,
        discountValue: discountValue !== undefined ? parseFloat(discountValue) : promoProduct.discountValue,
        minQuantity: minQuantity !== undefined ? minQuantity : promoProduct.minQuantity,
        maxQuantity: maxQuantity !== undefined ? maxQuantity : promoProduct.maxQuantity,
        overridePrice: overridePrice !== undefined ? (overridePrice ? parseFloat(overridePrice) : null) : promoProduct.overridePrice,
        quantityTiers: quantityTiers !== undefined ? quantityTiers : promoProduct.quantityTiers,
        checkStock: checkStock !== undefined ? checkStock : promoProduct.checkStock
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Promo product updated successfully',
        data: promoProduct 
      });
    }

    // DELETE - Remove product from promo
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false,
          error: 'Promo Product ID is required' 
        });
      }

      const promoProduct = await PromoProduct.findByPk(id);

      if (!promoProduct) {
        return res.status(404).json({ 
          success: false,
          error: 'Promo product not found' 
        });
      }

      // Soft delete
      await promoProduct.update({ isActive: false });

      return res.status(200).json({ 
        success: true, 
        message: 'Product removed from promo successfully' 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Promo Product API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}

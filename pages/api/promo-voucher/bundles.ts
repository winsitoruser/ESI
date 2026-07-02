import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const PromoBundle = require('../../../models/PromoBundle');
const Promo = require('../../../models/Promo');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all bundles
    if (req.method === 'GET') {
      const { promoId, bundleType } = req.query;

      let whereClause: any = { isActive: true };

      if (promoId) {
        whereClause.promoId = promoId;
      }

      if (bundleType) {
        whereClause.bundleType = bundleType;
      }

      const bundles = await PromoBundle.findAll({
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
        data: bundles
      });
    }

    // POST - Create new bundle
    if (req.method === 'POST') {
      const {
        promoId,
        name,
        description,
        bundleType,
        bundleProducts,
        minQuantity,
        maxQuantity,
        bundlePrice,
        discountType,
        discountValue,
        requireAllProducts,
        checkStock
      } = req.body;

      // Validate required fields
      if (!promoId || !name || !bundleType || !bundleProducts || bundleProducts.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields: promoId, name, bundleType, bundleProducts' 
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

      // Validate bundleProducts structure
      for (const product of bundleProducts) {
        if (!product.productId || !product.quantity) {
          return res.status(400).json({ 
            success: false,
            error: 'Each bundle product must have productId and quantity' 
          });
        }
      }

      // Check stock if required
      if (checkStock) {
        // TODO: Implement stock checking logic
        // const stockCheck = await checkProductsStock(bundleProducts);
        // if (!stockCheck.available) {
        //   return res.status(400).json({ 
        //     success: false,
        //     error: 'Insufficient stock for bundle products' 
        //   });
        // }
      }

      // Create bundle
      const bundle = await PromoBundle.create({
        promoId,
        name,
        description,
        bundleType,
        bundleProducts,
        minQuantity,
        maxQuantity,
        bundlePrice: bundlePrice ? parseFloat(bundlePrice) : null,
        discountType: discountType || 'percentage',
        discountValue: discountValue ? parseFloat(discountValue) : null,
        requireAllProducts: requireAllProducts !== undefined ? requireAllProducts : true,
        checkStock: checkStock !== undefined ? checkStock : true,
        isActive: true
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Bundle created successfully',
        data: bundle 
      });
    }

    // PUT - Update bundle
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false,
          error: 'Bundle ID is required' 
        });
      }

      const bundle = await PromoBundle.findByPk(id);

      if (!bundle) {
        return res.status(404).json({ 
          success: false,
          error: 'Bundle not found' 
        });
      }

      const {
        name,
        description,
        bundleType,
        bundleProducts,
        minQuantity,
        maxQuantity,
        bundlePrice,
        discountType,
        discountValue,
        requireAllProducts,
        checkStock
      } = req.body;

      // Update bundle
      await bundle.update({
        name: name || bundle.name,
        description: description !== undefined ? description : bundle.description,
        bundleType: bundleType || bundle.bundleType,
        bundleProducts: bundleProducts || bundle.bundleProducts,
        minQuantity: minQuantity !== undefined ? minQuantity : bundle.minQuantity,
        maxQuantity: maxQuantity !== undefined ? maxQuantity : bundle.maxQuantity,
        bundlePrice: bundlePrice !== undefined ? (bundlePrice ? parseFloat(bundlePrice) : null) : bundle.bundlePrice,
        discountType: discountType || bundle.discountType,
        discountValue: discountValue !== undefined ? (discountValue ? parseFloat(discountValue) : null) : bundle.discountValue,
        requireAllProducts: requireAllProducts !== undefined ? requireAllProducts : bundle.requireAllProducts,
        checkStock: checkStock !== undefined ? checkStock : bundle.checkStock
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Bundle updated successfully',
        data: bundle 
      });
    }

    // DELETE - Soft delete bundle
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false,
          error: 'Bundle ID is required' 
        });
      }

      const bundle = await PromoBundle.findByPk(id);

      if (!bundle) {
        return res.status(404).json({ 
          success: false,
          error: 'Bundle not found' 
        });
      }

      // Soft delete
      await bundle.update({ isActive: false });

      return res.status(200).json({ 
        success: true, 
        message: 'Bundle deleted successfully' 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Bundle API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}

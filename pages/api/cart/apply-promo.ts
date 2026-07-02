import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const Promo = require('../../../models/Promo');
const PromoProduct = require('../../../models/PromoProduct');
const PromoBundle = require('../../../models/PromoBundle');
const Product = require('../../../models/Product');

// Import calculation helpers
import { 
  calculateProductPromo, 
  calculateBundlePromo,
  findBestPromo 
} from '../../../lib/helpers/promo-calculator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cart, promoCode } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cart is required and must be a non-empty array'
      });
    }

    // Calculate cart subtotal
    const subtotal = cart.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0
    );

    let appliedPromo = null;
    let discount = 0;
    let finalTotal = subtotal;

    if (promoCode) {
      // Manual promo code entry
      const promo = await Promo.findOne({
        where: {
          code: promoCode.toUpperCase(),
          status: 'active',
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() }
        }
      });

      if (!promo) {
        return res.status(404).json({
          success: false,
          error: 'Promo code not found or expired'
        });
      }

      // Check usage limit
      if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
        return res.status(400).json({
          success: false,
          error: 'Promo code usage limit reached'
        });
      }

      // Check minimum purchase
      if (promo.minPurchase && subtotal < promo.minPurchase) {
        return res.status(400).json({
          success: false,
          error: `Minimum purchase of Rp ${promo.minPurchase.toLocaleString()} required`
        });
      }

      // Apply promo based on scope
      if (promo.promoScope === 'general') {
        // General promo - apply to cart total
        if (promo.type === 'percentage') {
          discount = (subtotal * parseFloat(promo.value)) / 100;
          if (promo.maxDiscount && discount > parseFloat(promo.maxDiscount)) {
            discount = parseFloat(promo.maxDiscount);
          }
        } else {
          discount = parseFloat(promo.value);
        }

        appliedPromo = {
          id: promo.id,
          code: promo.code,
          name: promo.name,
          type: promo.type,
          value: promo.value,
          scope: 'general'
        };
      } else if (promo.promoScope === 'product_specific') {
        // Get product-specific promo details
        const promoProducts = await PromoProduct.findAll({
          where: {
            promoId: promo.id,
            isActive: true
          }
        });

        let totalDiscount = 0;
        const appliedProducts: string[] = [];

        for (const cartItem of cart) {
          const promoProduct = promoProducts.find(
            (pp: any) => pp.productId === cartItem.productId
          );

          if (promoProduct) {
            const result = calculateProductPromo(cartItem, promoProduct);
            if (result.applicable) {
              totalDiscount += result.discountAmount;
              appliedProducts.push(...result.appliedTo);
            }
          }
        }

        discount = totalDiscount;
        appliedPromo = {
          id: promo.id,
          code: promo.code,
          name: promo.name,
          scope: 'product_specific',
          appliedProducts
        };
      } else if (promo.promoScope === 'bundle') {
        // Get bundle promo details
        const bundles = await PromoBundle.findAll({
          where: {
            promoId: promo.id,
            isActive: true
          }
        });

        let bestBundleDiscount = 0;
        let bestBundle = null;

        for (const bundle of bundles) {
          const result = calculateBundlePromo(cart, bundle);
          if (result.applicable && result.discountAmount > bestBundleDiscount) {
            bestBundleDiscount = result.discountAmount;
            bestBundle = {
              bundleId: bundle.id,
              bundleName: bundle.name,
              bundleType: bundle.bundleType,
              appliedTo: result.appliedTo,
              message: result.message
            };
          }
        }

        if (bestBundle) {
          discount = bestBundleDiscount;
          appliedPromo = {
            id: promo.id,
            code: promo.code,
            name: promo.name,
            scope: 'bundle',
            bundle: bestBundle
          };
        } else {
          return res.status(400).json({
            success: false,
            error: 'Bundle requirements not met'
          });
        }
      }

      finalTotal = subtotal - discount;
    } else {
      // Auto-apply best promo
      const productIds = cart.map((item: any) => item.productId);

      // Get all applicable promos
      const promoProducts = await PromoProduct.findAll({
        where: {
          productId: { [Op.in]: productIds },
          isActive: true
        },
        include: [{
          model: Promo,
          as: 'promo',
          where: {
            status: 'active',
            isActive: true,
            autoApply: true,
            startDate: { [Op.lte]: new Date() },
            endDate: { [Op.gte]: new Date() }
          }
        }]
      });

      const bundles = await PromoBundle.findAll({
        where: { isActive: true },
        include: [{
          model: Promo,
          as: 'promo',
          where: {
            status: 'active',
            isActive: true,
            autoApply: true,
            startDate: { [Op.lte]: new Date() },
            endDate: { [Op.gte]: new Date() }
          }
        }]
      });

      // Find best promo
      const bestPromo = findBestPromo(cart, {
        productPromos: promoProducts,
        bundles: bundles
      });

      if (bestPromo.applicable) {
        discount = bestPromo.discountAmount;
        finalTotal = bestPromo.finalPrice;
        appliedPromo = {
          message: bestPromo.message,
          appliedTo: bestPromo.appliedTo,
          autoApplied: true
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        subtotal,
        discount,
        total: finalTotal,
        appliedPromo,
        savings: discount > 0 ? {
          amount: discount,
          percentage: ((discount / subtotal) * 100).toFixed(2)
        } : null
      }
    });

  } catch (error: any) {
    console.error('Apply Promo API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

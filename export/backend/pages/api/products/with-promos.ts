import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const Product = require('../../../models/Product');
const PromoProduct = require('../../../models/PromoProduct');
const Promo = require('../../../models/Promo');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId } = req.query;

    if (productId) {
      // Get single product with active promos
      const product = await Product.findByPk(productId);
      
      if (!product) {
        return res.status(404).json({ 
          success: false,
          error: 'Product not found' 
        });
      }

      // Get active promos for this product
      const promoProducts = await PromoProduct.findAll({
        where: {
          productId: productId,
          isActive: true
        },
        include: [{
          model: Promo,
          as: 'promo',
          where: {
            status: 'active',
            isActive: true,
            startDate: { [Op.lte]: new Date() },
            endDate: { [Op.gte]: new Date() }
          },
          required: false
        }]
      });

      // Calculate best discount
      let bestDiscount: any = null;
      if (promoProducts.length > 0) {
        bestDiscount = promoProducts.reduce((best: any, current: any) => {
          const currentDiscount = current.discountType === 'percentage' 
            ? (product.price * current.discountValue) / 100
            : current.discountValue;
          
          const bestDiscountValue = best ? (
            best.discountType === 'percentage'
              ? (product.price * best.discountValue) / 100
              : best.discountValue
          ) : 0;

          return currentDiscount > bestDiscountValue ? current : best;
        }, null);
      }

      return res.status(200).json({
        success: true,
        data: {
          ...product.toJSON(),
          activePromos: promoProducts.map((pp: any) => ({
            id: pp.id,
            promoId: pp.promoId,
            promoCode: pp.promo?.code,
            promoName: pp.promo?.name,
            discountType: pp.discountType,
            discountValue: pp.discountValue,
            minQuantity: pp.minQuantity,
            maxQuantity: pp.maxQuantity,
            overridePrice: pp.overridePrice,
            quantityTiers: pp.quantityTiers
          })),
          bestDiscount: bestDiscount ? {
            promoCode: bestDiscount.promo?.code,
            discountType: bestDiscount.discountType,
            discountValue: bestDiscount.discountValue,
            calculatedDiscount: bestDiscount.discountType === 'percentage'
              ? (product.price * bestDiscount.discountValue) / 100
              : bestDiscount.discountValue,
            finalPrice: bestDiscount.overridePrice || (
              product.price - (
                bestDiscount.discountType === 'percentage'
                  ? (product.price * bestDiscount.discountValue) / 100
                  : bestDiscount.discountValue
              )
            )
          } : null
        }
      });
    } else {
      // Get all products with their promos
      const products = await Product.findAll({
        where: { isActive: true },
        limit: 100,
        order: [['name', 'ASC']]
      });

      const productsWithPromos = await Promise.all(
        products.map(async (product: any) => {
          const promoProducts = await PromoProduct.findAll({
            where: {
              productId: product.id,
              isActive: true
            },
            include: [{
              model: Promo,
              as: 'promo',
              where: {
                status: 'active',
                isActive: true,
                startDate: { [Op.lte]: new Date() },
                endDate: { [Op.gte]: new Date() }
              },
              required: false
            }]
          });

          const hasPromo = promoProducts.length > 0 && promoProducts.some((pp: any) => pp.promo);

          return {
            ...product.toJSON(),
            hasActivePromo: hasPromo,
            promoCount: promoProducts.filter((pp: any) => pp.promo).length
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: productsWithPromos
      });
    }

  } catch (error: any) {
    console.error('Products with Promos API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

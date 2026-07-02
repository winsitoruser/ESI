import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { Promo, PromoProduct, PromoCategory, Voucher } = db;
    const { code, items, subtotal, customerId } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    // Check if it's a voucher first
    let voucher = await Voucher.findOne({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { [Op.lte]: new Date() },
        validUntil: { [Op.gte]: new Date() }
      }
    });

    if (voucher) {
      // Validate voucher
      if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
        return res.status(400).json({ error: 'Voucher has reached usage limit' });
      }

      if (voucher.minPurchase && subtotal < voucher.minPurchase) {
        return res.status(400).json({ 
          error: `Minimum purchase of ${voucher.minPurchase} required`,
          minPurchase: voucher.minPurchase
        });
      }

      let discount = 0;
      if (voucher.discountType === 'percentage') {
        discount = subtotal * (voucher.discountValue / 100);
        if (voucher.maxDiscount) {
          discount = Math.min(discount, voucher.maxDiscount);
        }
      } else {
        discount = voucher.discountValue;
      }

      return res.status(200).json({
        success: true,
        data: {
          type: 'voucher',
          code: voucher.code,
          name: voucher.name,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
          calculatedDiscount: discount,
          maxDiscount: voucher.maxDiscount
        }
      });
    }

    // Check for promo
    const promo = await Promo.findOne({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      },
      include: [
        { model: PromoProduct, as: 'promoProducts' },
        { model: PromoCategory, as: 'promoCategories' }
      ]
    });

    if (!promo) {
      return res.status(404).json({ error: 'Invalid or expired promo code' });
    }

    // Validate minimum purchase
    if (promo.minPurchase && subtotal < promo.minPurchase) {
      return res.status(400).json({ 
        error: `Minimum purchase of ${promo.minPurchase} required`,
        minPurchase: promo.minPurchase
      });
    }

    // Calculate discount
    let discount = 0;
    let applicableItems = items || [];

    // Filter applicable items if promo is product/category specific
    if (promo.promoProducts?.length > 0) {
      const productIds = promo.promoProducts.map((pp: any) => pp.productId);
      applicableItems = items.filter((item: any) => productIds.includes(item.productId));
    }

    if (promo.promoCategories?.length > 0) {
      const categoryIds = promo.promoCategories.map((pc: any) => pc.categoryId);
      applicableItems = items.filter((item: any) => categoryIds.includes(item.categoryId));
    }

    const applicableSubtotal = applicableItems.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0);

    if (promo.discountType === 'percentage') {
      discount = applicableSubtotal * (promo.discountValue / 100);
      if (promo.maxDiscount) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else {
      discount = promo.discountValue;
    }

    return res.status(200).json({
      success: true,
      data: {
        type: 'promo',
        code: promo.code,
        name: promo.name,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        calculatedDiscount: discount,
        maxDiscount: promo.maxDiscount,
        applicableItemsCount: applicableItems.length
      }
    });
  } catch (error: any) {
    console.error('Promo Validate API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

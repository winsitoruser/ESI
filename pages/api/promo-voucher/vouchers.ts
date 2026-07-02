import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const Voucher = require('../../../models/Voucher');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all vouchers
    if (req.method === 'GET') {
      const { search, status, category, type } = req.query;

      let whereClause: any = { isActive: true };

      if (search) {
        whereClause[Op.or] = [
          { code: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      if (status) {
        whereClause.status = status;
      }

      if (category) {
        whereClause.category = category;
      }

      if (type) {
        whereClause.type = type;
      }

      const vouchers = await Voucher.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']]
      });

      // Calculate stats
      const stats = {
        totalActive: await Voucher.count({ where: { status: 'active', isActive: true } }),
        totalUsage: await Voucher.sum('usageCount', { where: { isActive: true } }) || 0,
        totalVouchers: vouchers.length
      };

      return res.status(200).json({ 
        success: true, 
        data: vouchers,
        stats 
      });
    }

    // POST - Create new voucher
    if (req.method === 'POST') {
      const {
        code,
        description,
        category,
        type,
        value,
        minPurchase,
        maxDiscount,
        validFrom,
        validUntil,
        usageLimit,
        perUserLimit,
        applicableFor,
        specificCustomers,
        applicableProducts,
        applicableCategories
      } = req.body;

      // Validate required fields
      if (!code || !category || !type || !value || !validUntil) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields: code, category, type, value, validUntil' 
        });
      }

      // Check if code already exists
      const existingVoucher = await Voucher.findOne({ where: { code } });
      if (existingVoucher) {
        return res.status(400).json({ 
          success: false,
          error: 'Voucher code already exists' 
        });
      }

      // Validate dates
      const vFrom = validFrom ? new Date(validFrom) : new Date();
      const vUntil = new Date(validUntil);

      if (vFrom >= vUntil) {
        return res.status(400).json({ 
          success: false,
          error: 'Valid until date must be after valid from date' 
        });
      }

      // Create voucher
      const voucher = await Voucher.create({
        code: code.toUpperCase(),
        description,
        category,
        type,
        value: parseFloat(value),
        minPurchase: parseFloat(minPurchase) || 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        validFrom: vFrom,
        validUntil: vUntil,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        usageCount: 0,
        perUserLimit: perUserLimit ? parseInt(perUserLimit) : 1,
        applicableFor: applicableFor || 'all',
        specificCustomers: specificCustomers || null,
        applicableProducts: applicableProducts || null,
        applicableCategories: applicableCategories || null,
        status: 'active',
        isActive: true
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Voucher created successfully',
        data: voucher 
      });
    }

    // PUT - Update voucher
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false,
          error: 'Voucher ID is required' 
        });
      }

      const voucher = await Voucher.findByPk(id);

      if (!voucher) {
        return res.status(404).json({ 
          success: false,
          error: 'Voucher not found' 
        });
      }

      const {
        code,
        description,
        category,
        type,
        value,
        minPurchase,
        maxDiscount,
        validFrom,
        validUntil,
        usageLimit,
        perUserLimit,
        applicableFor,
        specificCustomers,
        applicableProducts,
        applicableCategories,
        status
      } = req.body;

      // If code is being changed, check if new code exists
      if (code && code !== voucher.code) {
        const existingVoucher = await Voucher.findOne({ where: { code, id: { [Op.ne]: id } } });
        if (existingVoucher) {
          return res.status(400).json({ 
            success: false,
            error: 'Voucher code already exists' 
          });
        }
      }

      // Validate dates if provided
      const newValidFrom = validFrom ? new Date(validFrom) : voucher.validFrom;
      const newValidUntil = validUntil ? new Date(validUntil) : voucher.validUntil;

      if (newValidFrom >= newValidUntil) {
        return res.status(400).json({ 
          success: false,
          error: 'Valid until date must be after valid from date' 
        });
      }

      // Update voucher
      await voucher.update({
        code: code ? code.toUpperCase() : voucher.code,
        description: description !== undefined ? description : voucher.description,
        category: category || voucher.category,
        type: type || voucher.type,
        value: value ? parseFloat(value) : voucher.value,
        minPurchase: minPurchase !== undefined ? parseFloat(minPurchase) : voucher.minPurchase,
        maxDiscount: maxDiscount !== undefined ? (maxDiscount ? parseFloat(maxDiscount) : null) : voucher.maxDiscount,
        validFrom: newValidFrom,
        validUntil: newValidUntil,
        usageLimit: usageLimit !== undefined ? (usageLimit ? parseInt(usageLimit) : null) : voucher.usageLimit,
        perUserLimit: perUserLimit !== undefined ? (perUserLimit ? parseInt(perUserLimit) : null) : voucher.perUserLimit,
        applicableFor: applicableFor || voucher.applicableFor,
        specificCustomers: specificCustomers !== undefined ? specificCustomers : voucher.specificCustomers,
        applicableProducts: applicableProducts !== undefined ? applicableProducts : voucher.applicableProducts,
        applicableCategories: applicableCategories !== undefined ? applicableCategories : voucher.applicableCategories,
        status: status || voucher.status
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Voucher updated successfully',
        data: voucher 
      });
    }

    // DELETE - Soft delete voucher
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false,
          error: 'Voucher ID is required' 
        });
      }

      const voucher = await Voucher.findByPk(id);

      if (!voucher) {
        return res.status(404).json({ 
          success: false,
          error: 'Voucher not found' 
        });
      }

      // Soft delete
      await voucher.update({ isActive: false, status: 'inactive' });

      return res.status(200).json({ 
        success: true, 
        message: 'Voucher deleted successfully' 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Voucher API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}

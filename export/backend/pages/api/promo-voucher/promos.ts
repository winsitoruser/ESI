import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const Promo = require('../../../models/Promo');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all promos
    if (req.method === 'GET') {
      const { search, status, type } = req.query;

      let whereClause: any = { isActive: true };

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } }
        ];
      }

      if (status) {
        whereClause.status = status;
      }

      if (type) {
        whereClause.type = type;
      }

      const promos = await Promo.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']]
      });

      // Calculate stats
      const stats = {
        totalActive: await Promo.count({ where: { status: 'active', isActive: true } }),
        totalUsage: await Promo.sum('usageCount', { where: { isActive: true } }) || 0,
        totalPromos: promos.length
      };

      return res.status(200).json({ 
        success: true, 
        data: promos,
        stats 
      });
    }

    // POST - Create new promo
    if (req.method === 'POST') {
      const {
        name,
        code,
        description,
        type,
        value,
        minPurchase,
        maxDiscount,
        startDate,
        endDate,
        usageLimit,
        perUserLimit,
        applicableProducts,
        applicableCategories
      } = req.body;

      // Validate required fields
      if (!name || !code || !type || !value || !startDate || !endDate) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields: name, code, type, value, startDate, endDate' 
        });
      }

      // Check if code already exists
      const existingPromo = await Promo.findOne({ where: { code } });
      if (existingPromo) {
        return res.status(400).json({ 
          success: false,
          error: 'Promo code already exists' 
        });
      }

      // Validate dates
      if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({ 
          success: false,
          error: 'End date must be after start date' 
        });
      }

      // Create promo
      const promo = await Promo.create({
        name,
        code: code.toUpperCase(),
        description,
        type,
        value: parseFloat(value),
        minPurchase: parseFloat(minPurchase) || 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        usageCount: 0,
        perUserLimit: perUserLimit ? parseInt(perUserLimit) : null,
        applicableProducts: applicableProducts || null,
        applicableCategories: applicableCategories || null,
        status: 'active',
        isActive: true
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Promo created successfully',
        data: promo 
      });
    }

    // PUT - Update promo
    if (req.method === 'PUT') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false,
          error: 'Promo ID is required' 
        });
      }

      const promo = await Promo.findByPk(id);

      if (!promo) {
        return res.status(404).json({ 
          success: false,
          error: 'Promo not found' 
        });
      }

      const {
        name,
        code,
        description,
        type,
        value,
        minPurchase,
        maxDiscount,
        startDate,
        endDate,
        usageLimit,
        perUserLimit,
        applicableProducts,
        applicableCategories,
        status
      } = req.body;

      // If code is being changed, check if new code exists
      if (code && code !== promo.code) {
        const existingPromo = await Promo.findOne({ where: { code, id: { [Op.ne]: id } } });
        if (existingPromo) {
          return res.status(400).json({ 
            success: false,
            error: 'Promo code already exists' 
          });
        }
      }

      // Validate dates if provided
      const newStartDate = startDate ? new Date(startDate) : promo.startDate;
      const newEndDate = endDate ? new Date(endDate) : promo.endDate;

      if (newStartDate >= newEndDate) {
        return res.status(400).json({ 
          success: false,
          error: 'End date must be after start date' 
        });
      }

      // Update promo
      await promo.update({
        name: name || promo.name,
        code: code ? code.toUpperCase() : promo.code,
        description: description !== undefined ? description : promo.description,
        type: type || promo.type,
        value: value ? parseFloat(value) : promo.value,
        minPurchase: minPurchase !== undefined ? parseFloat(minPurchase) : promo.minPurchase,
        maxDiscount: maxDiscount !== undefined ? (maxDiscount ? parseFloat(maxDiscount) : null) : promo.maxDiscount,
        startDate: newStartDate,
        endDate: newEndDate,
        usageLimit: usageLimit !== undefined ? (usageLimit ? parseInt(usageLimit) : null) : promo.usageLimit,
        perUserLimit: perUserLimit !== undefined ? (perUserLimit ? parseInt(perUserLimit) : null) : promo.perUserLimit,
        applicableProducts: applicableProducts !== undefined ? applicableProducts : promo.applicableProducts,
        applicableCategories: applicableCategories !== undefined ? applicableCategories : promo.applicableCategories,
        status: status || promo.status
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Promo updated successfully',
        data: promo 
      });
    }

    // DELETE - Soft delete promo
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false,
          error: 'Promo ID is required' 
        });
      }

      const promo = await Promo.findByPk(id);

      if (!promo) {
        return res.status(404).json({ 
          success: false,
          error: 'Promo not found' 
        });
      }

      // Soft delete
      await promo.update({ isActive: false, status: 'inactive' });

      return res.status(200).json({ 
        success: true, 
        message: 'Promo deleted successfully' 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Promo API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
}

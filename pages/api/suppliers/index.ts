import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { Supplier } = db;

    switch (req.method) {
      case 'GET':
        const { search, isActive, page = 1, limit = 20 } = req.query;
        const where: any = {};

        if (search) {
          where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } }
          ];
        }
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        const { count, rows } = await Supplier.findAndCountAll({
          where,
          limit: parseInt(limit as string),
          offset,
          order: [['name', 'ASC']]
        });

        return res.status(200).json({
          success: true,
          data: rows,
          pagination: {
            total: count,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(count / parseInt(limit as string))
          }
        });

      case 'POST':
        const { name, code, email, phone, address, city, contactPerson, bankName, bankAccount, taxId, notes } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Supplier name is required' });
        }

        const supplier = await Supplier.create({
          name,
          code: code || `SUP-${Date.now()}`,
          email,
          phone,
          address,
          city,
          contactPerson,
          bankName,
          bankAccount,
          taxId,
          notes,
          isActive: true,
          createdBy: (session.user as any).id
        });

        return res.status(201).json({
          success: true,
          message: 'Supplier created',
          data: supplier
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Suppliers API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

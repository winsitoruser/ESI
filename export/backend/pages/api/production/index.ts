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

    const { Production, ProductionMaterial, Product, Recipe } = db;

    switch (req.method) {
      case 'GET':
        const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
        const where: any = {};

        if (status) where.status = status;
        if (startDate || endDate) {
          where.productionDate = {};
          if (startDate) where.productionDate[Op.gte] = new Date(startDate as string);
          if (endDate) where.productionDate[Op.lte] = new Date(endDate as string);
        }

        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        const { count, rows } = await Production.findAndCountAll({
          where,
          include: [
            { model: Product, as: 'product' },
            { model: ProductionMaterial, as: 'materials' }
          ],
          limit: parseInt(limit as string),
          offset,
          order: [['productionDate', 'DESC']]
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
        const { productId, recipeId, quantity, productionDate, notes, materials } = req.body;

        if (!productId || !quantity) {
          return res.status(400).json({ error: 'Product ID and quantity are required' });
        }

        // Create production record
        const production = await Production.create({
          productId,
          recipeId,
          quantity,
          productionDate: productionDate || new Date(),
          notes,
          status: 'in_progress',
          createdBy: (session.user as any).id
        });

        // Create material records if provided
        if (materials && materials.length > 0) {
          for (const mat of materials) {
            await ProductionMaterial.create({
              productionId: production.id,
              materialId: mat.materialId,
              quantityUsed: mat.quantityUsed,
              unitCost: mat.unitCost,
              totalCost: mat.quantityUsed * mat.unitCost
            });
          }
        }

        return res.status(201).json({
          success: true,
          message: 'Production created',
          data: production
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Production API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

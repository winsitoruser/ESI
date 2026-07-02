import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { Production, ProductionMaterial, Product, Stock } = db;

    const production = await Production.findByPk(id, {
      include: [
        { model: Product, as: 'product' },
        { model: ProductionMaterial, as: 'materials' }
      ]
    });

    if (!production) {
      return res.status(404).json({ error: 'Production not found' });
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({ success: true, data: production });

      case 'PUT':
        const { status, quantity, notes, completedQuantity } = req.body;
        
        const updateData: any = {
          ...(notes !== undefined && { notes }),
          ...(quantity && { quantity })
        };

        if (status === 'completed') {
          updateData.status = 'completed';
          updateData.completedAt = new Date();
          updateData.completedBy = (session.user as any).id;
          updateData.completedQuantity = completedQuantity || production.quantity;

          // Update stock for produced product
          const existingStock = await Stock.findOne({
            where: { productId: production.productId }
          });

          if (existingStock) {
            await existingStock.update({
              quantity: existingStock.quantity + (completedQuantity || production.quantity)
            });
          }
        } else if (status === 'cancelled') {
          updateData.status = 'cancelled';
          updateData.cancelledAt = new Date();
          updateData.cancelledBy = (session.user as any).id;
        } else if (status) {
          updateData.status = status;
        }

        await production.update(updateData);

        return res.status(200).json({
          success: true,
          message: 'Production updated',
          data: production
        });

      case 'DELETE':
        if (production.status === 'completed') {
          return res.status(400).json({ error: 'Cannot delete completed production' });
        }
        
        await ProductionMaterial.destroy({ where: { productionId: id } });
        await production.destroy();
        
        return res.status(200).json({
          success: true,
          message: 'Production deleted'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Production API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

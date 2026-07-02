import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('@/models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requisitionId } = req.query;

    if (!requisitionId) {
      return res.status(400).json({ error: 'Requisition ID is required' });
    }

    // Get requisition details
    const requisition = await db.InternalRequisition.findByPk(requisitionId, {
      include: [
        { model: db.Branch, as: 'requestingBranch' },
        { model: db.InternalRequisitionItem, as: 'items' }
      ]
    });

    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    // Get all branches that can fulfill (warehouses and branches with stock)
    // Exclude the requesting branch itself
    const branches = await db.Branch.findAll({
      where: {
        tenantId: requisition.requestingBranch.tenantId,
        isActive: true,
        type: ['warehouse', 'main', 'branch'], // Exclude kiosks
        id: {
          [db.Sequelize.Op.ne]: requisition.requesting_branch_id
        }
      },
      attributes: ['id', 'code', 'name', 'type', 'city', 'address'],
      order: [
        ['type', 'ASC'], // Warehouses first
        ['name', 'ASC']
      ]
    });

    // Map branches with additional info
    // TODO: Calculate available stock for each branch from inventory
    // TODO: Calculate distance from coordinates
    // TODO: Calculate estimated delivery days based on distance
    const availableBranches = branches.map(branch => ({
      id: branch.id,
      code: branch.code,
      name: branch.name,
      type: branch.type,
      city: branch.city,
      availableStock: 0, // TODO: Calculate from inventory
      distance: 0, // TODO: Calculate from coordinates
      estimatedDeliveryDays: branch.type === 'warehouse' ? 2 : 3 // Default estimation
    }));

    return res.status(200).json({
      success: true,
      data: availableBranches
    });

  } catch (error: any) {
    console.error('Available branches API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

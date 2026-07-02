import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { Table } = db;
    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return await getTable(req, res, Table, id as string);
      case 'PUT':
        return await updateTable(req, res, Table, id as string);
      case 'DELETE':
        return await deleteTable(req, res, Table, id as string);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Table API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getTable(req: NextApiRequest, res: NextApiResponse, Table: any, id: string) {
  const table = await Table.findByPk(id, {
    include: [
      { association: 'currentSession' },
      { association: 'currentReservation' },
      { association: 'sessions', limit: 10, order: [['startedAt', 'DESC']] }
    ]
  });

  if (!table) {
    return res.status(404).json({ success: false, error: 'Table not found' });
  }

  return res.status(200).json({ success: true, data: table });
}

async function updateTable(req: NextApiRequest, res: NextApiResponse, Table: any, id: string) {
  const table = await Table.findByPk(id);

  if (!table) {
    return res.status(404).json({ success: false, error: 'Table not found' });
  }

  const {
    tableNumber,
    capacity,
    area,
    floor,
    positionX,
    positionY,
    notes,
    isActive
  } = req.body;

  // Check if new table number conflicts
  if (tableNumber && tableNumber !== table.tableNumber) {
    const existing = await Table.findOne({
      where: { 
        tableNumber,
        id: { [db.Sequelize.Op.ne]: id }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Table number already exists'
      });
    }
  }

  await table.update({
    tableNumber: tableNumber || table.tableNumber,
    capacity: capacity || table.capacity,
    area: area !== undefined ? area : table.area,
    floor: floor !== undefined ? floor : table.floor,
    positionX: positionX !== undefined ? positionX : table.positionX,
    positionY: positionY !== undefined ? positionY : table.positionY,
    notes: notes !== undefined ? notes : table.notes,
    isActive: isActive !== undefined ? isActive : table.isActive
  });

  return res.status(200).json({ success: true, data: table });
}

async function deleteTable(req: NextApiRequest, res: NextApiResponse, Table: any, id: string) {
  const table = await Table.findByPk(id);

  if (!table) {
    return res.status(404).json({ success: false, error: 'Table not found' });
  }

  // Soft delete - just mark as inactive
  await table.update({ isActive: false });

  return res.status(200).json({
    success: true,
    message: 'Table deleted successfully'
  });
}

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
    
    if (!Table) {
      return res.status(200).json({ success: true, data: [] });
    }

    switch (req.method) {
      case 'GET':
        return await getTables(req, res, Table);
      case 'POST':
        return await createTable(req, res, Table);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Tables API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getTables(req: NextApiRequest, res: NextApiResponse, Table: any) {
  try {
    const { status, area, floor, isActive, minCapacity } = req.query;

    const where: any = {};
    
    if (status) where.status = status;
    if (area) where.area = area;
    if (floor) where.floor = parseInt(floor as string);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (minCapacity) {
      where.capacity = {
        [db.Sequelize.Op.gte]: parseInt(minCapacity as string)
      };
    }

    // Try to get tables with associations, fallback to simple query
    let tables;
    try {
      tables = await Table.findAll({
        where,
        include: [
          { association: 'currentSession', required: false },
          { association: 'currentReservation', required: false }
        ],
        order: [['floor', 'ASC'], ['tableNumber', 'ASC']]
      });
    } catch (assocError) {
      // Fallback without associations
      tables = await Table.findAll({
        where,
        order: [['floor', 'ASC'], ['tableNumber', 'ASC']]
      });
    }

    // Try to get current orders for each table
    const { KitchenOrder } = db;
    let tablesWithOrders = tables.map((t: any) => ({ ...t.toJSON(), currentOrder: null }));

    if (KitchenOrder) {
      try {
        tablesWithOrders = await Promise.all(
          tables.map(async (table: any) => {
            try {
              const currentOrder = await KitchenOrder.findOne({
                where: {
                  tableNumber: table.tableNumber,
                  status: { [db.Sequelize.Op.in]: ['new', 'preparing', 'ready'] }
                },
                order: [['receivedAt', 'DESC']]
              });

              return {
                ...table.toJSON(),
                currentOrder: currentOrder ? {
                  id: currentOrder.id,
                  orderNumber: currentOrder.orderNumber,
                  customerName: currentOrder.customerName,
                  orderType: currentOrder.orderType,
                  status: currentOrder.status,
                  startTime: currentOrder.receivedAt
                } : null
              };
            } catch {
              return { ...table.toJSON(), currentOrder: null };
            }
          })
        );
      } catch {
        // Keep tables without orders
      }
    }

    return res.status(200).json({
      success: true,
      data: tablesWithOrders
    });
  } catch (error: any) {
    console.error('getTables error:', error);
    return res.status(200).json({ success: true, data: [] });
  }
}

async function createTable(req: NextApiRequest, res: NextApiResponse, Table: any) {
  const {
    tableNumber,
    capacity,
    area,
    floor,
    positionX,
    positionY,
    notes
  } = req.body;

  // Validation
  if (!tableNumber || !capacity) {
    return res.status(400).json({
      success: false,
      error: 'Table number and capacity are required'
    });
  }

  if (capacity < 1 || capacity > 50) {
    return res.status(400).json({
      success: false,
      error: 'Capacity must be between 1 and 50'
    });
  }

  // Check if table number already exists
  const existing = await Table.findOne({
    where: { tableNumber }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      error: 'Table number already exists'
    });
  }

  const table = await Table.create({
    tableNumber,
    capacity,
    area,
    floor: floor || 1,
    positionX,
    positionY,
    notes,
    status: 'available',
    isActive: true
  });

  return res.status(201).json({
    success: true,
    data: table
  });
}

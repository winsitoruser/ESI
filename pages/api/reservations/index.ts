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

    const { Reservation } = db;
    
    if (!Reservation) {
      return res.status(200).json({ success: true, data: [] });
    }

    switch (req.method) {
      case 'GET':
        return await getReservations(req, res, Reservation);
      case 'POST':
        return await createReservation(req, res, Reservation, session);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Reservations API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getReservations(req: NextApiRequest, res: NextApiResponse, Reservation: any) {
  try {
    const { date, status, customerId, tableId, startDate, endDate } = req.query;

    const where: any = {};
    
    if (date) {
      where.reservationDate = date;
    }
    
    if (startDate && endDate) {
      where.reservationDate = {
        [db.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (tableId) where.tableId = tableId;

    let reservations;
    try {
      reservations = await Reservation.findAll({
        where,
        include: [
          { association: 'table', required: false },
          { association: 'customer', required: false }
        ],
        order: [['reservationDate', 'DESC'], ['reservationTime', 'DESC']]
      });
    } catch (assocError) {
      // Fallback without associations
      reservations = await Reservation.findAll({
        where,
        order: [['reservationDate', 'DESC'], ['reservationTime', 'DESC']]
      });
    }

    return res.status(200).json({
      success: true,
      data: reservations
    });
  } catch (error: any) {
    console.error('getReservations error:', error);
    return res.status(200).json({ success: true, data: [] });
  }
}

async function createReservation(req: NextApiRequest, res: NextApiResponse, Reservation: any, session: any) {
  const {
    customerName,
    customerPhone,
    customerEmail,
    customerId,
    reservationDate,
    reservationTime,
    guestCount,
    tableId,
    specialRequests,
    depositAmount,
    durationMinutes
  } = req.body;

  // Validation
  if (!customerName || !customerPhone || !reservationDate || !reservationTime || !guestCount) {
    return res.status(400).json({
      success: false,
      error: 'Customer name, phone, date, time, and guest count are required'
    });
  }

  if (guestCount < 1 || guestCount > 100) {
    return res.status(400).json({
      success: false,
      error: 'Guest count must be between 1 and 100'
    });
  }

  // Check table availability if tableId provided
  if (tableId) {
    const { Table } = db;
    const table = await Table.findByPk(tableId);
    
    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    if (!table.canAccommodate(guestCount)) {
      return res.status(400).json({
        success: false,
        error: `Table capacity (${table.capacity}) is insufficient for ${guestCount} guests`
      });
    }

    // Check if table is already reserved for this date/time
    const existingReservation = await Reservation.findOne({
      where: {
        tableId,
        reservationDate,
        status: {
          [db.Sequelize.Op.in]: ['confirmed', 'seated']
        }
      }
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        error: 'Table is already reserved for this date'
      });
    }
  }

  const reservation = await Reservation.create({
    customerName,
    customerPhone,
    customerEmail,
    customerId,
    reservationDate,
    reservationTime,
    guestCount,
    tableId,
    tableNumber: tableId ? (await db.Table.findByPk(tableId))?.tableNumber : null,
    specialRequests,
    depositAmount: depositAmount || 0,
    depositPaid: false,
    durationMinutes: durationMinutes || 120,
    status: 'pending',
    createdBy: session.user?.id
  });

  return res.status(201).json({
    success: true,
    data: reservation,
    message: `Reservation created: ${reservation.reservationNumber}`
  });
}

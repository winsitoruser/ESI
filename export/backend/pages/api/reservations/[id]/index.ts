import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { Reservation } = db;
    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return await getReservation(req, res, Reservation, id as string);
      case 'PUT':
        return await updateReservation(req, res, Reservation, id as string);
      case 'DELETE':
        return await deleteReservation(req, res, Reservation, id as string);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Reservation API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getReservation(req: NextApiRequest, res: NextApiResponse, Reservation: any, id: string) {
  const reservation = await Reservation.findByPk(id, {
    include: [
      { association: 'table' },
      { association: 'customer' },
      { association: 'session' }
    ]
  });

  if (!reservation) {
    return res.status(404).json({ success: false, error: 'Reservation not found' });
  }

  return res.status(200).json({ success: true, data: reservation });
}

async function updateReservation(req: NextApiRequest, res: NextApiResponse, Reservation: any, id: string) {
  const reservation = await Reservation.findByPk(id);

  if (!reservation) {
    return res.status(404).json({ success: false, error: 'Reservation not found' });
  }

  const {
    customerName,
    customerPhone,
    customerEmail,
    reservationDate,
    reservationTime,
    guestCount,
    tableId,
    specialRequests,
    depositAmount,
    durationMinutes
  } = req.body;

  // Validate table if changing
  if (tableId && tableId !== reservation.tableId) {
    const { Table } = db;
    const table = await Table.findByPk(tableId);
    
    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const newGuestCount = guestCount || reservation.guestCount;
    if (!table.canAccommodate(newGuestCount)) {
      return res.status(400).json({
        success: false,
        error: `Table capacity (${table.capacity}) is insufficient for ${newGuestCount} guests`
      });
    }

    reservation.tableNumber = table.tableNumber;
  }

  await reservation.update({
    customerName: customerName || reservation.customerName,
    customerPhone: customerPhone || reservation.customerPhone,
    customerEmail: customerEmail !== undefined ? customerEmail : reservation.customerEmail,
    reservationDate: reservationDate || reservation.reservationDate,
    reservationTime: reservationTime || reservation.reservationTime,
    guestCount: guestCount || reservation.guestCount,
    tableId: tableId !== undefined ? tableId : reservation.tableId,
    specialRequests: specialRequests !== undefined ? specialRequests : reservation.specialRequests,
    depositAmount: depositAmount !== undefined ? depositAmount : reservation.depositAmount,
    durationMinutes: durationMinutes || reservation.durationMinutes
  });

  return res.status(200).json({
    success: true,
    data: reservation,
    message: 'Reservation updated successfully'
  });
}

async function deleteReservation(req: NextApiRequest, res: NextApiResponse, Reservation: any, id: string) {
  const reservation = await Reservation.findByPk(id);

  if (!reservation) {
    return res.status(404).json({ success: false, error: 'Reservation not found' });
  }

  await reservation.cancel('Cancelled by user');

  return res.status(200).json({
    success: true,
    message: 'Reservation cancelled successfully'
  });
}

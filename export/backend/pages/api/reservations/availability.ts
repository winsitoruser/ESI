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

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { Reservation } = db;
    const { date, time, guestCount, duration } = req.query;

    if (!date || !guestCount) {
      return res.status(400).json({
        success: false,
        error: 'Date and guest count are required'
      });
    }

    const guests = parseInt(guestCount as string);
    const durationMinutes = duration ? parseInt(duration as string) : 120;

    // Get available tables using Reservation model method
    const availableTables = await Reservation.checkAvailability(
      date as string,
      time as string || '00:00',
      guests
    );

    return res.status(200).json({
      success: true,
      data: {
        date,
        time: time || 'any',
        guestCount: guests,
        duration: durationMinutes,
        availableTables: availableTables.map((table: any) => ({
          id: table.id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          area: table.area,
          floor: table.floor,
          status: table.status
        })),
        totalAvailable: availableTables.length,
        hasAvailability: availableTables.length > 0
      }
    });
  } catch (error: any) {
    console.error('Check availability API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

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
    const { days } = req.query;

    const daysAhead = days ? parseInt(days as string) : 7;

    const upcomingReservations = await Reservation.getUpcoming(daysAhead);

    return res.status(200).json({
      success: true,
      data: upcomingReservations,
      summary: {
        totalUpcoming: upcomingReservations.length,
        daysAhead,
        pending: upcomingReservations.filter((r: any) => r.status === 'pending').length,
        confirmed: upcomingReservations.filter((r: any) => r.status === 'confirmed').length
      }
    });
  } catch (error: any) {
    console.error('Upcoming reservations API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

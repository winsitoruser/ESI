import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';

/**
 * Today's Reservations API
 * Returns all reservations for today
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenantId = session.user.tenantId;

    // Get today's reservations
    const reservations = await sequelize.query(`
      SELECT 
        r.id,
        r.reservation_number,
        r.customer_name as name,
        r.customer_phone as phone,
        r.guest_count as guests,
        r.reservation_time as time,
        r.reservation_date as date,
        r.status,
        r.special_requests,
        r.notes,
        t.table_number as table,
        t.id as table_id
      FROM reservations r
      LEFT JOIN tables t ON r.table_id = t.id
      WHERE r.reservation_date = CURRENT_DATE
      ORDER BY r.reservation_time ASC
    `, {
      type: QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      data: reservations
    });

  } catch (error: any) {
    console.error('Error fetching today reservations:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

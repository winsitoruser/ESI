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

    if (req.method !== 'PATCH') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { Reservation } = db;
    const { id } = req.query;
    const { status, cancellationReason, tableId } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const validStatuses = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const reservation = await Reservation.findByPk(id);

    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    const userId = session.user?.id;

    switch (status) {
      case 'confirmed':
        await reservation.confirm(userId);
        break;
      case 'seated':
        await reservation.seat(userId, tableId);
        break;
      case 'completed':
        await reservation.complete();
        break;
      case 'cancelled':
        await reservation.cancel(cancellationReason || 'No reason provided');
        break;
      case 'no-show':
        await reservation.markNoShow();
        break;
      default:
        reservation.status = status;
        await reservation.save();
    }

    return res.status(200).json({
      success: true,
      data: reservation,
      message: `Reservation status updated to ${status}`
    });
  } catch (error: any) {
    console.error('Update reservation status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

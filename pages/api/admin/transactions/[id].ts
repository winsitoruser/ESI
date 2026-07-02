// API endpoint for specific transaction detail
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user?.role as string)?.toLowerCase();
    const allowedRoles = ['admin', 'super_admin', 'superadmin'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied - Admin access required' });
    }

    const { id } = req.query;
    const db = getDb();

    if (req.method === 'GET') {
      // Get specific transaction
      const transaction = await db.Transaction.findByPk(id, {
        include: [
          {
            model: db.Tenant,
            as: 'tenant',
            attributes: ['id', 'businessName', 'businessEmail']
          },
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      return res.status(200).json({
        success: true,
        data: transaction
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Transaction detail API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

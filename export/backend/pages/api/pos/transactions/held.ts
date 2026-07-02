import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('../../../../models');
const { HeldTransaction, Employee, Customer } = db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { cashierId, status } = req.query;

    // Build where clause
    const whereClause: any = {};
    
    if (cashierId) {
      whereClause.cashierId = cashierId;
    }
    
    if (status) {
      whereClause.status = status;
    } else {
      // Default: only show held transactions
      whereClause.status = 'held';
    }

    // Get held transactions
    const heldTransactions = await HeldTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'cashier',
          attributes: ['id', 'name']
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['heldAt', 'DESC']]
    });

    // Format response
    const formattedData = heldTransactions.map((tx: any) => ({
      id: tx.id,
      holdNumber: tx.holdNumber,
      customerName: tx.customerName || (tx.customer ? tx.customer.name : 'Walk-in'),
      customerId: tx.customerId,
      total: parseFloat(tx.total),
      itemCount: tx.cartItems ? tx.cartItems.length : 0,
      heldAt: tx.heldAt,
      holdReason: tx.holdReason,
      status: tx.status,
      cashier: tx.cashier ? {
        id: tx.cashier.id,
        name: tx.cashier.name
      } : null
    }));

    return res.status(200).json({
      success: true,
      data: formattedData
    });

  } catch (error: any) {
    console.error('Error fetching held transactions:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

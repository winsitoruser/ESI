import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]';

const db = require('../../../../../../models');
const { HeldTransaction } = db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction ID is required' 
      });
    }

    // Find held transaction
    const heldTransaction = await HeldTransaction.findByPk(id);

    if (!heldTransaction) {
      return res.status(404).json({ 
        success: false, 
        error: 'Held transaction not found' 
      });
    }

    // Check if already cancelled or completed
    if (heldTransaction.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction is already cancelled' 
      });
    }

    if (heldTransaction.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot cancel completed transaction' 
      });
    }

    // Update status to cancelled
    await heldTransaction.update({
      status: 'cancelled',
      cancelledAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Held transaction cancelled successfully'
    });

  } catch (error: any) {
    console.error('Error cancelling held transaction:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

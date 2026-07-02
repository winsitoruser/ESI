import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]';

const db = require('../../../../../../models');
const { HeldTransaction } = db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    // Check if already resumed, cancelled, or completed
    if (heldTransaction.status !== 'held') {
      return res.status(400).json({ 
        success: false, 
        error: `Transaction is already ${heldTransaction.status}` 
      });
    }

    // Update status to resumed
    await heldTransaction.update({
      status: 'resumed',
      resumedAt: new Date()
    });

    // Return transaction data for cart restoration
    return res.status(200).json({
      success: true,
      message: 'Transaction resumed successfully',
      data: {
        id: heldTransaction.id,
        holdNumber: heldTransaction.holdNumber,
        cartItems: heldTransaction.cartItems,
        subtotal: parseFloat(heldTransaction.subtotal),
        discount: parseFloat(heldTransaction.discount),
        tax: parseFloat(heldTransaction.tax),
        total: parseFloat(heldTransaction.total),
        customerType: heldTransaction.customerType,
        customerName: heldTransaction.customerName,
        customerId: heldTransaction.customerId,
        selectedMember: heldTransaction.selectedMember,
        selectedVoucher: heldTransaction.selectedVoucher,
        notes: heldTransaction.notes
      }
    });

  } catch (error: any) {
    console.error('Error resuming transaction:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

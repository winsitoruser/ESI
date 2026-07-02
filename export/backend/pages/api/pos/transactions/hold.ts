import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('../../../../models');
const { HeldTransaction, Employee } = db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      cartItems,
      subtotal,
      discount,
      tax,
      total,
      customerType,
      customerName,
      customerId,
      selectedMember,
      selectedVoucher,
      holdReason,
      notes
    } = req.body;

    // Validation
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart items are required and must not be empty' 
      });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Total amount must be greater than 0' 
      });
    }

    // Get cashier/employee ID from session
    // Assuming session.user.id is the employee ID
    const cashierId = session.user.id;

    // Check if cashier exists
    const cashier = await Employee.findByPk(cashierId);
    if (!cashier) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cashier not found' 
      });
    }

    // Check max held transactions per cashier (limit: 10)
    const heldCount = await HeldTransaction.count({
      where: {
        cashierId,
        status: 'held'
      }
    });

    if (heldCount >= 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maximum held transactions limit reached (10). Please complete or cancel some held transactions first.' 
      });
    }

    // Generate hold number
    const holdNumber = await HeldTransaction.generateHoldNumber();

    // Create held transaction
    const heldTransaction = await HeldTransaction.create({
      holdNumber,
      cashierId,
      customerName: customerName || null,
      customerId: customerId || null,
      cartItems,
      subtotal: subtotal || 0,
      discount: discount || 0,
      tax: tax || 0,
      total,
      customerType: customerType || 'walk-in',
      selectedMember: selectedMember || null,
      selectedVoucher: selectedVoucher || null,
      holdReason: holdReason || null,
      notes: notes || null,
      status: 'held',
      heldAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction held successfully',
      data: {
        id: heldTransaction.id,
        holdNumber: heldTransaction.holdNumber,
        total: heldTransaction.total,
        itemCount: cartItems.length,
        heldAt: heldTransaction.heldAt
      }
    });

  } catch (error: any) {
    console.error('Error holding transaction:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

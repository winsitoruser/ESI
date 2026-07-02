import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import sequelize from '@/lib/sequelize';

const PosTransaction = require('@/models/PosTransaction');
const PosTransactionItem = require('@/models/PosTransactionItem');
const Product = require('@/models/Product');
const Customer = require('@/models/Customer');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const transaction = await sequelize.transaction();

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      await transaction.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      customerId,
      customerName,
      items,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      paidAmount,
      changeAmount,
      shiftId,
      notes
    } = req.body;

    // Validation
    if (!items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Items are required' });
    }

    if (!paymentMethod) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Payment method is required' });
    }

    if (!total || total <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Total must be greater than 0' });
    }

    if (paidAmount < total) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Paid amount must be greater than or equal to total' });
    }

    // Generate transaction number with branch prefix
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get branch info for prefix
    const branchId = (session.user as any)?.branchId;
    const branchCode = (session.user as any)?.branchCode || 'GEN';
    
    // Count transactions for this branch today
    const whereClause: any = {
      [sequelize.Op.and]: [
        sequelize.where(
          sequelize.fn('DATE', sequelize.col('transactionDate')),
          today.toISOString().split('T')[0]
        )
      ]
    };
    
    if (branchId) {
      whereClause.branchId = branchId;
    }
    
    const count = await PosTransaction.count({ where: whereClause });
    const transactionNumber = `${branchCode}-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Get cashier ID from session
    const cashierId = (session.user as any)?.employeeId || (session.user as any)?.id;

    // Create transaction
    const newTransaction = await PosTransaction.create({
      transactionNumber,
      shiftId: shiftId || null,
      customerId: customerId || null,
      customerName: customerName || 'Walk-in Customer',
      cashierId,
      branchId: branchId || null,
      transactionDate: new Date(),
      subtotal: subtotal || 0,
      discount: discount || 0,
      tax: tax || 0,
      total,
      paymentMethod,
      paidAmount,
      changeAmount: changeAmount || 0,
      status: 'completed',
      notes: notes || null
    }, { transaction });

    // Create transaction items and update stock
    const transactionItems = [];
    for (const item of items) {
      // Validate product exists and has enough stock
      const product = await Product.findByPk(item.productId, { transaction });
      if (!product) {
        await transaction.rollback();
        return res.status(400).json({ error: `Product ${item.productName} not found` });
      }

      if (product.stock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: `Insufficient stock for ${item.productName}. Available: ${product.stock}, Required: ${item.quantity}` 
        });
      }

      // Create transaction item
      const transactionItem = await PosTransactionItem.create({
        transactionId: newTransaction.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku || product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        subtotal: item.subtotal,
        notes: item.notes || null
      }, { transaction });

      transactionItems.push(transactionItem);

      // Update product stock
      await product.update({
        stock: product.stock - item.quantity
      }, { transaction });
    }

    // Update customer points if customer exists
    if (customerId) {
      const customer = await Customer.findByPk(customerId, { transaction });
      if (customer) {
        const pointsEarned = Math.floor(total / 10000); // 1 point per 10,000 IDR
        await customer.update({
          points: (customer.points || 0) + pointsEarned,
          totalSpent: (customer.totalSpent || 0) + total
        }, { transaction });
      }
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        id: newTransaction.id,
        transactionNumber: newTransaction.transactionNumber,
        total: parseFloat(newTransaction.total),
        items: transactionItems.length
      }
    });

  } catch (error: any) {
    await transaction.rollback();
    console.error('Error creating transaction:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create transaction',
      details: error.message
    });
  }
}

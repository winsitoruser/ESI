import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import sequelize from '../../../../lib/sequelize';

// Helper function to get tier multiplier
async function getTierMultiplier(tierName: string): Promise<number> {
  try {
    const { LoyaltyTier } = sequelize.models;
    const tier = await LoyaltyTier.findOne({
      where: { tierName, isActive: true }
    });
    return tier ? parseFloat((tier as any).pointMultiplier) : 1.0;
  } catch (error) {
    console.error('Error getting tier multiplier:', error);
    return 1.0;
  }
}

// Helper function to sync customer tier after purchase
async function syncCustomerTierAfterPurchase(customerId: string) {
  try {
    const { Customer, LoyaltyTier } = sequelize.models;
    const customer = await Customer.findByPk(customerId) as any;
    if (!customer) return;

    const tiers = await LoyaltyTier.findAll({
      where: { isActive: true },
      order: [['minSpending', 'DESC']]
    });

    if (tiers.length === 0) return;

    const totalSpent = parseFloat(customer.totalSpent) || 0;
    let newTier = tiers[tiers.length - 1] as any;

    for (const tier of tiers) {
      if (totalSpent >= parseFloat((tier as any).minSpending)) {
        newTier = tier as any;
        break;
      }
    }

    if (customer.membershipLevel !== newTier.tierName) {
      await customer.update({
        membershipLevel: newTier.tierName,
        discount: parseFloat(newTier.discountPercentage)
      });
      console.log(`Customer ${customer.name} upgraded to ${newTier.tierName}`);
    }
  } catch (error) {
    console.error('Error syncing tier:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const t = await sequelize.transaction();
    const { PosTransaction, PosTransactionItem, Product, Customer } = sequelize.models;

  try {
    const {
      cart,
      paymentMethod,
      cashReceived,
      customerType,
      selectedMember,
      selectedVoucher,
      shiftId,
      cashierId
    } = req.body;

    // Validation
    if (!cart || cart.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (!paymentMethod) {
      await t.rollback();
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Calculate totals
    let subtotal = 0;
    const items = [];

    // Validate stock and calculate subtotal
    for (const item of cart) {
      const product = await Product.findByPk(item.id, { transaction: t }) as any;
      
      if (!product) {
        await t.rollback();
        return res.status(404).json({ error: `Product ${item.name} not found` });
      }

      if (product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ 
          error: `Insufficient stock for ${item.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }

      subtotal += item.price * item.quantity;
      items.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        discount: 0,
        subtotal: item.price * item.quantity
      });
    }

    // Calculate discount
    let discount = 0;
    if (customerType === 'member' && selectedMember) {
      discount += (subtotal * selectedMember.discount) / 100;
    }
    if (selectedVoucher && subtotal >= selectedVoucher.minPurchase) {
      if (selectedVoucher.type === 'percentage') {
        discount += (subtotal * selectedVoucher.value) / 100;
      } else {
        discount += selectedVoucher.value;
      }
    }

    const total = subtotal - discount;
    const paidAmount = paymentMethod === 'cash' ? parseFloat(cashReceived) : total;
    const changeAmount = paidAmount - total;

    if (paymentMethod === 'cash' && changeAmount < 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient payment amount' });
    }

    // Generate transaction number
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await PosTransaction.count({
      where: {
        transactionDate: {
          [require('sequelize').Op.gte]: new Date().setHours(0, 0, 0, 0)
        }
      },
      transaction: t
    });
    const transactionNumber = `TRX${today}${String(count + 1).padStart(4, '0')}`;

    // Create transaction
    const posTransaction = await PosTransaction.create({
      transactionNumber,
      shiftId: shiftId || null,
      customerId: selectedMember?.id || null,
      customerName: selectedMember?.name || 'Walk-in Customer',
      cashierId: cashierId || session.user?.id,
      transactionDate: new Date(),
      subtotal,
      discount,
      tax: 0,
      total,
      paymentMethod,
      paidAmount,
      changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
      status: 'completed',
      notes: selectedVoucher ? `Voucher: ${selectedVoucher.code}` : null
    }, { transaction: t });

    // Create transaction items and update stock
    for (const item of items) {
      await PosTransactionItem.create({
        transactionId: posTransaction.id,
        ...item
      }, { transaction: t });

      // Update product stock
      await Product.decrement('stock', {
        by: item.quantity,
        where: { id: item.productId },
        transaction: t
      });
    }

    // Update member points if applicable
    if (customerType === 'member' && selectedMember) {
      // Calculate points with tier multiplier
      const customer = await Customer.findByPk(selectedMember.id, { transaction: t }) as any;
      if (!customer) {
        await t.rollback();
        return res.status(404).json({ error: 'Customer not found' });
      }
      const tierMultiplier = await getTierMultiplier(customer.membershipLevel);
      const basePoints = Math.floor(total / 10000); // 1 point per 10,000
      const pointsEarned = Math.floor(basePoints * tierMultiplier);
      
      await Customer.increment('points', {
        by: pointsEarned,
        where: { id: selectedMember.id },
        transaction: t
      });
    }

    await t.commit();

    // After commit, sync customer tier based on new total spending
    if (customerType === 'member' && selectedMember) {
      try {
        await syncCustomerTierAfterPurchase(selectedMember.id);
      } catch (error) {
        console.error('Error syncing tier after purchase:', error);
        // Don't fail the transaction if tier sync fails
      }
    }

    // Fetch complete transaction data
    const completeTransaction = await PosTransaction.findByPk(posTransaction.id, {
      include: [
        {
          model: PosTransactionItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku']
          }]
        }
      ]
    }) as any;

    return res.status(201).json({
      success: true,
      message: 'Transaction completed successfully',
      transaction: completeTransaction,
      receipt: {
        transactionNumber,
        date: new Date(),
        items: items.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
          subtotal: item.subtotal
        })),
        subtotal,
        discount,
        total,
        paymentMethod,
        paidAmount,
        changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
        cashier: session.user?.name
      }
    });

  } catch (error: any) {
    await t.rollback();
    console.error('Checkout Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

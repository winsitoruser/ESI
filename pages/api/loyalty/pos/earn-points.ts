import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const CustomerLoyalty = require('@/models/CustomerLoyalty');
const LoyaltyProgram = require('@/models/LoyaltyProgram');
const LoyaltyTier = require('@/models/LoyaltyTier');
const PointTransaction = require('@/models/PointTransaction');
const PosTransaction = require('@/models/PosTransaction');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { customerId, posTransactionId, totalAmount } = req.body;

      if (!customerId || !posTransactionId || !totalAmount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get customer loyalty
      const customerLoyalty = await CustomerLoyalty.findOne({
        where: { customerId, isActive: true },
        include: [
          {
            model: LoyaltyProgram,
            as: 'program',
            where: { isActive: true }
          },
          {
            model: LoyaltyTier,
            as: 'currentTier',
            required: false
          }
        ]
      });

      if (!customerLoyalty) {
        return res.status(404).json({ 
          error: 'Customer not enrolled in active loyalty program',
          enrolled: false 
        });
      }

      const program = customerLoyalty.program;

      // Check minimum purchase requirement
      if (totalAmount < program.minimumPurchase) {
        return res.status(400).json({ 
          error: 'Purchase amount below minimum requirement',
          minimumRequired: program.minimumPurchase,
          currentAmount: totalAmount
        });
      }

      // Calculate points
      let basePoints = Math.floor(totalAmount * program.pointsPerRupiah);
      
      // Apply tier multiplier if available
      if (customerLoyalty.currentTier) {
        basePoints = Math.floor(basePoints * customerLoyalty.currentTier.pointMultiplier);
      }

      // Calculate expiry date
      let expiryDate = null;
      if (program.pointsExpiry) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + program.pointsExpiry);
      }

      const balanceBefore = customerLoyalty.availablePoints;
      const balanceAfter = balanceBefore + basePoints;

      // Create point transaction
      const pointTransaction = await PointTransaction.create({
        customerLoyaltyId: customerLoyalty.id,
        transactionType: 'earn',
        points: basePoints,
        referenceType: 'pos_transaction',
        referenceId: posTransactionId,
        description: `Earned from purchase: ${totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}`,
        balanceBefore,
        balanceAfter,
        expiryDate,
        transactionDate: new Date()
      });

      // Update customer loyalty
      const newTotalSpending = parseFloat(customerLoyalty.totalSpending) + parseFloat(totalAmount);
      
      await customerLoyalty.update({
        availablePoints: balanceAfter,
        totalPoints: balanceAfter,
        lifetimePoints: customerLoyalty.lifetimePoints + basePoints,
        totalSpending: newTotalSpending,
        lastActivityDate: new Date()
      });

      // Check for tier upgrade
      const tierUpgrade = await checkAndUpdateTier(customerLoyalty, newTotalSpending);

      return res.status(201).json({
        message: 'Points earned successfully',
        pointsEarned: basePoints,
        newBalance: balanceAfter,
        tierUpgrade,
        pointTransaction
      });
    } catch (error: any) {
      console.error('Error earning points:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function checkAndUpdateTier(customerLoyalty: any, totalSpending: number) {
  const tiers = await LoyaltyTier.findAll({
    where: { 
      programId: customerLoyalty.programId,
      isActive: true 
    },
    order: [['tierLevel', 'DESC']]
  });

  for (const tier of tiers) {
    if (totalSpending >= parseFloat(tier.minSpending)) {
      if (customerLoyalty.currentTierId !== tier.id) {
        await customerLoyalty.update({
          currentTierId: tier.id
        });
        return {
          upgraded: true,
          newTier: tier.tierName,
          tierLevel: tier.tierLevel
        };
      }
      break;
    }
  }

  return { upgraded: false };
}

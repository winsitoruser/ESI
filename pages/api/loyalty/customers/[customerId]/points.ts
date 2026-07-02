import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const CustomerLoyalty = require('@/models/CustomerLoyalty');
const PointTransaction = require('@/models/PointTransaction');
const LoyaltyProgram = require('@/models/LoyaltyProgram');
const LoyaltyTier = require('@/models/LoyaltyTier');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { customerId } = req.query;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const { limit = 50, offset = 0, transactionType } = req.query;

      const customerLoyalty = await CustomerLoyalty.findOne({
        where: { customerId }
      });

      if (!customerLoyalty) {
        return res.status(404).json({ error: 'Customer loyalty record not found' });
      }

      const where: any = { customerLoyaltyId: customerLoyalty.id };
      if (transactionType) {
        where.transactionType = transactionType;
      }

      const transactions = await PointTransaction.findAll({
        where,
        order: [['transactionDate', 'DESC']],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      const total = await PointTransaction.count({ where });

      return res.status(200).json({
        transactions,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error: any) {
      console.error('Error fetching point transactions:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        points,
        transactionType,
        referenceType,
        referenceId,
        description,
        processedBy
      } = req.body;

      if (!points || !transactionType || !referenceType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const customerLoyalty = await CustomerLoyalty.findOne({
        where: { customerId },
        include: [
          {
            model: LoyaltyProgram,
            as: 'program'
          }
        ]
      });

      if (!customerLoyalty) {
        return res.status(404).json({ error: 'Customer loyalty record not found' });
      }

      const balanceBefore = customerLoyalty.availablePoints;
      const balanceAfter = balanceBefore + points;

      if (balanceAfter < 0) {
        return res.status(400).json({ error: 'Insufficient points' });
      }

      // Calculate expiry date for earned points
      let expiryDate = null;
      if (transactionType === 'earn' && customerLoyalty.program.pointsExpiry) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + customerLoyalty.program.pointsExpiry);
      }

      // Create point transaction
      const pointTransaction = await PointTransaction.create({
        customerLoyaltyId: customerLoyalty.id,
        transactionType,
        points,
        referenceType,
        referenceId,
        description,
        balanceBefore,
        balanceAfter,
        expiryDate,
        processedBy,
        transactionDate: new Date()
      });

      // Update customer loyalty
      await customerLoyalty.update({
        availablePoints: balanceAfter,
        totalPoints: balanceAfter,
        lifetimePoints: transactionType === 'earn' 
          ? customerLoyalty.lifetimePoints + points 
          : customerLoyalty.lifetimePoints,
        lastActivityDate: new Date()
      });

      // Check for tier upgrade
      await checkAndUpdateTier(customerLoyalty);

      return res.status(201).json({
        message: 'Point transaction created successfully',
        pointTransaction,
        newBalance: balanceAfter
      });
    } catch (error: any) {
      console.error('Error creating point transaction:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function checkAndUpdateTier(customerLoyalty: any) {
  const tiers = await LoyaltyTier.findAll({
    where: { 
      programId: customerLoyalty.programId,
      isActive: true 
    },
    order: [['tierLevel', 'DESC']]
  });

  for (const tier of tiers) {
    if (customerLoyalty.totalSpending >= tier.minSpending) {
      if (customerLoyalty.currentTierId !== tier.id) {
        await customerLoyalty.update({
          currentTierId: tier.id
        });
      }
      break;
    }
  }
}

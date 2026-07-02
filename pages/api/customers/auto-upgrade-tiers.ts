import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const Customer = require('../../../models/Customer');
const LoyaltyTier = require('../../../models/LoyaltyTier');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all active tiers sorted by minSpending descending
    const tiers = await LoyaltyTier.findAll({
      where: { isActive: true },
      order: [['minSpending', 'DESC']]
    });

    if (tiers.length === 0) {
      return res.status(400).json({ error: 'No active tiers found' });
    }

    // Get all active members
    const customers = await Customer.findAll({
      where: {
        type: { [Op.in]: ['member', 'vip'] },
        isActive: true
      }
    });

    let upgraded = 0;
    let downgraded = 0;
    let unchanged = 0;
    const changes = [];

    for (const customer of customers) {
      const totalSpent = parseFloat(customer.totalSpent) || 0;
      let correctTier = tiers[tiers.length - 1]; // Default to lowest tier

      // Find correct tier based on spending
      for (const tier of tiers) {
        if (totalSpent >= parseFloat(tier.minSpending)) {
          correctTier = tier;
          break;
        }
      }

      const oldTier = customer.membershipLevel;
      const newTier = correctTier.tierName;

      if (oldTier !== newTier) {
        // Update customer tier and discount
        await customer.update({
          membershipLevel: newTier,
          discount: parseFloat(correctTier.discountPercentage)
        });

        // Determine if upgrade or downgrade
        const oldTierObj = tiers.find((t: any) => t.tierName === oldTier);
        const oldLevel = oldTierObj ? oldTierObj.tierLevel : 0;
        const newLevel = correctTier.tierLevel;

        if (newLevel > oldLevel) {
          upgraded++;
        } else {
          downgraded++;
        }

        changes.push({
          customerId: customer.id,
          customerName: customer.name,
          oldTier,
          newTier,
          totalSpent,
          action: newLevel > oldLevel ? 'upgraded' : 'downgraded'
        });
      } else {
        unchanged++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Auto tier upgrade completed',
      data: {
        totalProcessed: customers.length,
        upgraded,
        downgraded,
        unchanged,
        changes
      }
    });

  } catch (error: any) {
    console.error('Auto Upgrade Tiers Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

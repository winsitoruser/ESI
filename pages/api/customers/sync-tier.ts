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

  try {
    if (req.method === 'POST') {
      return await syncCustomerTier(req, res);
    } else if (req.method === 'GET') {
      return await checkTierUpgrade(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Sync Tier API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// POST - Sync single customer tier based on spending
async function syncCustomerTier(req: NextApiRequest, res: NextApiResponse) {
  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  const customer = await Customer.findByPk(customerId);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Get all active tiers sorted by minSpending descending
  const tiers = await LoyaltyTier.findAll({
    where: { isActive: true },
    order: [['minSpending', 'DESC']]
  });

  if (tiers.length === 0) {
    return res.status(400).json({ error: 'No active tiers found' });
  }

  // Find appropriate tier based on totalSpent
  const totalSpent = parseFloat(customer.totalSpent) || 0;
  let newTier = tiers[tiers.length - 1]; // Default to lowest tier

  for (const tier of tiers) {
    if (totalSpent >= parseFloat(tier.minSpending)) {
      newTier = tier;
      break;
    }
  }

  const oldTier = customer.membershipLevel;
  const tierChanged = oldTier !== newTier.tierName;

  // Update customer tier and discount
  await customer.update({
    membershipLevel: newTier.tierName,
    discount: parseFloat(newTier.discountPercentage),
    type: totalSpent > 0 ? 'member' : 'walk-in' // Auto set to member if has spending
  });

  return res.status(200).json({
    success: true,
    message: tierChanged ? 'Tier upgraded successfully' : 'Tier already up to date',
    data: {
      customerId: customer.id,
      customerName: customer.name,
      oldTier,
      newTier: newTier.tierName,
      totalSpent,
      discount: parseFloat(newTier.discountPercentage),
      tierChanged
    }
  });
}

// GET - Check which customers need tier upgrade
async function checkTierUpgrade(req: NextApiRequest, res: NextApiResponse) {
  // Get all active members
  const customers = await Customer.findAll({
    where: {
      type: { [Op.in]: ['member', 'vip'] },
      isActive: true
    }
  });

  // Get all active tiers
  const tiers = await LoyaltyTier.findAll({
    where: { isActive: true },
    order: [['minSpending', 'DESC']]
  });

  if (tiers.length === 0) {
    return res.status(400).json({ error: 'No active tiers found' });
  }

  const upgradeNeeded = [];

  for (const customer of customers) {
    const totalSpent = parseFloat(customer.totalSpent) || 0;
    let correctTier = tiers[tiers.length - 1]; // Default to lowest tier

    for (const tier of tiers) {
      if (totalSpent >= parseFloat(tier.minSpending)) {
        correctTier = tier;
        break;
      }
    }

    if (customer.membershipLevel !== correctTier.tierName) {
      upgradeNeeded.push({
        customerId: customer.id,
        customerName: customer.name,
        currentTier: customer.membershipLevel,
        correctTier: correctTier.tierName,
        totalSpent
      });
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      totalCustomers: customers.length,
      upgradeNeeded: upgradeNeeded.length,
      customers: upgradeNeeded
    }
  });
}

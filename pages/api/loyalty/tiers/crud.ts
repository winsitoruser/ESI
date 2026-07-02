import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const LoyaltyTier = require('../../../../models/LoyaltyTier');
const Customer = require('../../../../models/Customer');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getTiers(req, res);
      case 'POST':
        return await createTier(req, res);
      case 'PUT':
        return await updateTier(req, res);
      case 'DELETE':
        return await deleteTier(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Loyalty Tiers API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function getTiers(req: NextApiRequest, res: NextApiResponse) {
  const tiers = await LoyaltyTier.findAll({
    where: { isActive: true },
    order: [['tierLevel', 'ASC']]
  });

  // Get member count for each tier
  const tiersWithMembers = await Promise.all(
    tiers.map(async (tier: any) => {
      const memberCount = await Customer.count({
        where: {
          membershipLevel: tier.tierName,
          type: { [Op.in]: ['member', 'vip'] },
          isActive: true
        }
      });

      return {
        id: tier.id,
        name: tier.tierName,
        level: tier.tierLevel,
        minSpending: parseFloat(tier.minSpending),
        pointMultiplier: parseFloat(tier.pointMultiplier),
        discountPercentage: parseFloat(tier.discountPercentage),
        benefits: tier.benefits || [],
        color: tier.color,
        members: memberCount,
        isActive: tier.isActive
      };
    })
  );

  return res.status(200).json({
    success: true,
    data: tiersWithMembers
  });
}

async function createTier(req: NextApiRequest, res: NextApiResponse) {
  const {
    tierName,
    tierLevel,
    minSpending,
    pointMultiplier = 1.0,
    discountPercentage = 0,
    benefits = [],
    color = 'bg-gray-500'
  } = req.body;

  if (!tierName || !tierLevel) {
    return res.status(400).json({ error: 'Tier name and level are required' });
  }

  // Check if tier level already exists
  const existingTier = await LoyaltyTier.findOne({
    where: { tierLevel, isActive: true }
  });

  if (existingTier) {
    return res.status(400).json({ error: 'Tier level already exists' });
  }

  const tier = await LoyaltyTier.create({
    programId: '00000000-0000-0000-0000-000000000001', // Default program ID
    tierName,
    tierLevel,
    minSpending: minSpending || 0,
    pointMultiplier,
    discountPercentage,
    benefits,
    color,
    isActive: true
  });

  return res.status(201).json({
    success: true,
    message: 'Tier created successfully',
    data: tier
  });
}

async function updateTier(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Tier ID is required' });
  }

  const tier = await LoyaltyTier.findByPk(id);

  if (!tier) {
    return res.status(404).json({ error: 'Tier not found' });
  }

  const {
    tierName,
    tierLevel,
    minSpending,
    pointMultiplier,
    discountPercentage,
    benefits,
    color
  } = req.body;

  await tier.update({
    tierName: tierName || tier.tierName,
    tierLevel: tierLevel || tier.tierLevel,
    minSpending: minSpending !== undefined ? minSpending : tier.minSpending,
    pointMultiplier: pointMultiplier !== undefined ? pointMultiplier : tier.pointMultiplier,
    discountPercentage: discountPercentage !== undefined ? discountPercentage : tier.discountPercentage,
    benefits: benefits || tier.benefits,
    color: color || tier.color
  });

  return res.status(200).json({
    success: true,
    message: 'Tier updated successfully',
    data: tier
  });
}

async function deleteTier(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Tier ID is required' });
  }

  const tier = await LoyaltyTier.findByPk(id);

  if (!tier) {
    return res.status(404).json({ error: 'Tier not found' });
  }

  // Check if there are members in this tier
  const memberCount = await Customer.count({
    where: {
      membershipLevel: tier.tierName,
      isActive: true
    }
  });

  if (memberCount > 0) {
    return res.status(400).json({ 
      error: `Cannot delete tier with ${memberCount} active members. Please reassign members first.` 
    });
  }

  // Soft delete
  await tier.update({ isActive: false });

  return res.status(200).json({
    success: true,
    message: 'Tier deleted successfully'
  });
}

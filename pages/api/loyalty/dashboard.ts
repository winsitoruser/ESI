import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const LoyaltyTier = require('../../../models/LoyaltyTier');
const LoyaltyReward = require('../../../models/LoyaltyReward');
const Customer = require('../../../models/Customer');
const PosTransaction = require('../../../models/PosTransaction');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total members
    const totalMembers = await Customer.count({
      where: { 
        type: { [Op.in]: ['member', 'vip'] },
        isActive: true
      }
    });

    // Get points redeemed this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const pointsRedeemedThisMonth = await Customer.sum('points', {
      where: {
        updatedAt: { [Op.gte]: startOfMonth }
      }
    }) || 0;

    // Get rewards claimed this month
    const rewardsClaimed = await LoyaltyReward.sum('claimedCount', {
      where: {
        updatedAt: { [Op.gte]: startOfMonth }
      }
    }) || 0;

    // Calculate engagement rate (members who made transactions this month)
    const activeMembers = await Customer.count({
      where: {
        type: { [Op.in]: ['member', 'vip'] },
        isActive: true,
        lastVisit: { [Op.gte]: startOfMonth }
      }
    });

    const engagementRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

    // Get tier distribution
    const tierDistribution = await Customer.findAll({
      attributes: [
        'membershipLevel',
        [Customer.sequelize.fn('COUNT', Customer.sequelize.col('id')), 'count']
      ],
      where: {
        type: { [Op.in]: ['member', 'vip'] },
        isActive: true
      },
      group: ['membershipLevel'],
      raw: true
    });

    // Get top members
    const topMembers = await Customer.findAll({
      where: {
        type: { [Op.in]: ['member', 'vip'] },
        isActive: true
      },
      order: [['points', 'DESC']],
      limit: 5,
      attributes: ['id', 'name', 'email', 'membershipLevel', 'points', 'totalSpent', 'totalPurchases']
    });

    // Get all tiers
    const tiers = await LoyaltyTier.findAll({
      where: { isActive: true },
      order: [['tierLevel', 'ASC']]
    });

    // Map tier distribution with tier details
    const tiersWithMembers = tiers.map((tier: any) => {
      const distribution = tierDistribution.find((d: any) => d.membershipLevel === tier.tierName);
      return {
        id: tier.id,
        name: tier.tierName,
        minPoints: tier.minSpending,
        maxPoints: null, // Will be calculated
        benefits: tier.benefits || [],
        members: distribution ? parseInt(distribution.count) : 0,
        color: tier.color || 'bg-gray-500',
        pointMultiplier: parseFloat(tier.pointMultiplier),
        discountPercentage: parseFloat(tier.discountPercentage)
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalMembers,
          pointsRedeemedThisMonth: Math.abs(pointsRedeemedThisMonth),
          rewardsClaimed,
          engagementRate
        },
        tiers: tiersWithMembers,
        topMembers: topMembers.map((m: any) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          tier: m.membershipLevel,
          points: m.points,
          totalSpent: parseFloat(m.totalSpent),
          transactions: m.totalPurchases
        }))
      }
    });

  } catch (error: any) {
    console.error('Loyalty Dashboard API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

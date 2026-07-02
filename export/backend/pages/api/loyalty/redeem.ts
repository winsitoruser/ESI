import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { CustomerLoyalty, LoyaltyReward, PointTransaction, RewardRedemption } = db;
    const { customerId, rewardId, pointsToRedeem } = req.body;

    if (!customerId || (!rewardId && !pointsToRedeem)) {
      return res.status(400).json({ error: 'Customer ID and reward/points required' });
    }

    // Get customer loyalty
    const loyalty = await CustomerLoyalty.findOne({ where: { customerId } });
    if (!loyalty) {
      return res.status(404).json({ error: 'Customer loyalty account not found' });
    }

    let pointsRequired = pointsToRedeem;
    let rewardName = 'Points Redemption';

    // If redeeming a specific reward
    if (rewardId) {
      const reward = await LoyaltyReward.findByPk(rewardId);
      if (!reward) {
        return res.status(404).json({ error: 'Reward not found' });
      }
      if (!reward.isActive) {
        return res.status(400).json({ error: 'Reward is not available' });
      }
      pointsRequired = reward.pointsRequired;
      rewardName = reward.name;
    }

    // Check if customer has enough points
    if (loyalty.currentPoints < pointsRequired) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        currentPoints: loyalty.currentPoints,
        required: pointsRequired
      });
    }

    // Deduct points
    const previousPoints = loyalty.currentPoints;
    await loyalty.update({
      currentPoints: loyalty.currentPoints - pointsRequired,
      totalRedeemed: (loyalty.totalRedeemed || 0) + pointsRequired
    });

    // Create point transaction
    await PointTransaction.create({
      customerId,
      type: 'redeem',
      points: -pointsRequired,
      balanceBefore: previousPoints,
      balanceAfter: loyalty.currentPoints,
      description: `Redeemed: ${rewardName}`,
      referenceType: rewardId ? 'reward' : 'manual',
      referenceId: rewardId,
      createdBy: (session.user as any).id
    });

    // Create redemption record if it's a reward
    if (rewardId) {
      await RewardRedemption.create({
        customerId,
        rewardId,
        pointsUsed: pointsRequired,
        status: 'pending',
        redeemedBy: (session.user as any).id
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully redeemed ${pointsRequired} points`,
      data: {
        pointsRedeemed: pointsRequired,
        remainingPoints: loyalty.currentPoints,
        reward: rewardName
      }
    });
  } catch (error: any) {
    console.error('Loyalty Redeem API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

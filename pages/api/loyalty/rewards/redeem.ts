import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const CustomerLoyalty = require('@/models/CustomerLoyalty');
const LoyaltyReward = require('@/models/LoyaltyReward');
const RewardRedemption = require('@/models/RewardRedemption');
const PointTransaction = require('@/models/PointTransaction');

function generateRedemptionCode(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `RWD-${timestamp}-${random}`.toUpperCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { customerId, rewardId, processedBy } = req.body;

      if (!customerId || !rewardId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get customer loyalty
      const customerLoyalty = await CustomerLoyalty.findOne({
        where: { customerId }
      });

      if (!customerLoyalty) {
        return res.status(404).json({ error: 'Customer not enrolled in loyalty program' });
      }

      // Get reward
      const reward = await LoyaltyReward.findByPk(rewardId);

      if (!reward) {
        return res.status(404).json({ error: 'Reward not found' });
      }

      if (!reward.isActive) {
        return res.status(400).json({ error: 'Reward is not active' });
      }

      // Check if reward is still valid
      if (reward.startDate && new Date() < new Date(reward.startDate)) {
        return res.status(400).json({ error: 'Reward is not yet available' });
      }

      if (reward.endDate && new Date() > new Date(reward.endDate)) {
        return res.status(400).json({ error: 'Reward has expired' });
      }

      // Check max redemptions
      if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
        return res.status(400).json({ error: 'Reward redemption limit reached' });
      }

      // Check if customer has enough points
      if (customerLoyalty.availablePoints < reward.pointsRequired) {
        return res.status(400).json({ 
          error: 'Insufficient points',
          required: reward.pointsRequired,
          available: customerLoyalty.availablePoints
        });
      }

      // Generate redemption code
      const redemptionCode = generateRedemptionCode();

      // Calculate expiry date
      let expiryDate = null;
      if (reward.validityDays) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + reward.validityDays);
      }

      // Create redemption record
      const redemption = await RewardRedemption.create({
        customerLoyaltyId: customerLoyalty.id,
        rewardId: reward.id,
        pointsUsed: reward.pointsRequired,
        redemptionCode,
        status: 'approved',
        redemptionDate: new Date(),
        expiryDate,
        processedBy
      });

      // Create point transaction for redemption
      const balanceBefore = customerLoyalty.availablePoints;
      const balanceAfter = balanceBefore - reward.pointsRequired;

      await PointTransaction.create({
        customerLoyaltyId: customerLoyalty.id,
        transactionType: 'redeem',
        points: -reward.pointsRequired,
        referenceType: 'reward_redemption',
        referenceId: redemption.id,
        description: `Redeemed: ${reward.rewardName}`,
        balanceBefore,
        balanceAfter,
        processedBy,
        transactionDate: new Date()
      });

      // Update customer loyalty points
      await customerLoyalty.update({
        availablePoints: balanceAfter,
        totalPoints: balanceAfter,
        lastActivityDate: new Date()
      });

      // Update reward redemption count
      await reward.update({
        currentRedemptions: reward.currentRedemptions + 1
      });

      return res.status(201).json({
        message: 'Reward redeemed successfully',
        redemption: {
          ...redemption.toJSON(),
          reward: {
            rewardName: reward.rewardName,
            rewardType: reward.rewardType,
            rewardValue: reward.rewardValue
          }
        },
        newBalance: balanceAfter
      });
    } catch (error: any) {
      console.error('Error redeeming reward:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { customerId, status } = req.query;

      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }

      const customerLoyalty = await CustomerLoyalty.findOne({
        where: { customerId }
      });

      if (!customerLoyalty) {
        return res.status(404).json({ error: 'Customer not enrolled in loyalty program' });
      }

      const where: any = { customerLoyaltyId: customerLoyalty.id };
      if (status) {
        where.status = status;
      }

      const redemptions = await RewardRedemption.findAll({
        where,
        include: [
          {
            model: LoyaltyReward,
            as: 'reward',
            attributes: ['id', 'rewardName', 'rewardType', 'rewardValue', 'description']
          }
        ],
        order: [['redemptionDate', 'DESC']]
      });

      return res.status(200).json({ redemptions });
    } catch (error: any) {
      console.error('Error fetching redemptions:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

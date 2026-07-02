import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const LoyaltyReward = require('@/models/LoyaltyReward');
const Product = require('@/models/Product');
const RewardRedemption = require('@/models/RewardRedemption');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { programId, isActive, rewardType } = req.query;

      const where: any = {};
      if (programId) where.programId = programId;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (rewardType) where.rewardType = rewardType;

      const rewards = await LoyaltyReward.findAll({
        where,
        include: [
          {
            model: Product,
            as: 'product',
            required: false,
            attributes: ['id', 'name', 'sku', 'price']
          }
        ],
        order: [['pointsRequired', 'ASC']]
      });

      return res.status(200).json({ rewards });
    } catch (error: any) {
      console.error('Error fetching loyalty rewards:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        programId,
        rewardName,
        description,
        pointsRequired,
        rewardType,
        rewardValue,
        productId,
        quantity,
        validityDays,
        maxRedemptions,
        isActive,
        startDate,
        endDate
      } = req.body;

      if (!programId || !rewardName || !pointsRequired || !rewardType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const reward = await LoyaltyReward.create({
        programId,
        rewardName,
        description,
        pointsRequired,
        rewardType,
        rewardValue,
        productId,
        quantity,
        validityDays,
        maxRedemptions,
        currentRedemptions: 0,
        isActive: isActive !== undefined ? isActive : true,
        startDate,
        endDate
      });

      return res.status(201).json({
        message: 'Loyalty reward created successfully',
        reward
      });
    } catch (error: any) {
      console.error('Error creating loyalty reward:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Reward ID is required' });
      }

      const reward = await LoyaltyReward.findByPk(id);

      if (!reward) {
        return res.status(404).json({ error: 'Loyalty reward not found' });
      }

      await reward.update(updateData);

      return res.status(200).json({
        message: 'Loyalty reward updated successfully',
        reward
      });
    } catch (error: any) {
      console.error('Error updating loyalty reward:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Reward ID is required' });
      }

      const reward = await LoyaltyReward.findByPk(id);

      if (!reward) {
        return res.status(404).json({ error: 'Loyalty reward not found' });
      }

      // Check if there are pending redemptions
      const pendingRedemptions = await RewardRedemption.count({
        where: { 
          rewardId: id,
          status: ['pending', 'approved']
        }
      });

      if (pendingRedemptions > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete reward with pending redemptions',
          pendingRedemptions 
        });
      }

      await reward.destroy();

      return res.status(200).json({
        message: 'Loyalty reward deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting loyalty reward:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

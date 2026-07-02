import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const LoyaltyReward = require('../../../../models/LoyaltyReward');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getRewards(req, res);
      case 'POST':
        return await createReward(req, res);
      case 'PUT':
        return await updateReward(req, res);
      case 'DELETE':
        return await deleteReward(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Loyalty Rewards API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function getRewards(req: NextApiRequest, res: NextApiResponse) {
  const { type, isActive = 'true' } = req.query;

  const whereClause: any = {};

  if (type) {
    whereClause.rewardType = type;
  }

  if (isActive !== 'all') {
    whereClause.isActive = isActive === 'true';
  }

  const rewards = await LoyaltyReward.findAll({
    where: whereClause,
    order: [['pointsCost', 'ASC']]
  });

  return res.status(200).json({
    success: true,
    data: rewards.map((r: any) => ({
      id: r.id,
      name: r.rewardName,
      description: r.description,
      points: r.pointsCost,
      stock: r.stockQuantity,
      claimed: r.claimedCount,
      type: r.rewardType,
      value: parseFloat(r.rewardValue || 0),
      isActive: r.isActive,
      expiryDate: r.expiryDate
    }))
  });
}

async function createReward(req: NextApiRequest, res: NextApiResponse) {
  const {
    name,
    description,
    points,
    stock,
    type = 'voucher',
    value = 0,
    expiryDate
  } = req.body;

  if (!name || !points) {
    return res.status(400).json({ error: 'Reward name and points are required' });
  }

  const reward = await LoyaltyReward.create({
    programId: '00000000-0000-0000-0000-000000000001',
    rewardName: name,
    description: description || '',
    pointsCost: points,
    rewardType: type,
    rewardValue: value,
    stockQuantity: stock || 0,
    claimedCount: 0,
    expiryDate: expiryDate || null,
    isActive: true
  });

  return res.status(201).json({
    success: true,
    message: 'Reward created successfully',
    data: reward
  });
}

async function updateReward(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Reward ID is required' });
  }

  const reward = await LoyaltyReward.findByPk(id);

  if (!reward) {
    return res.status(404).json({ error: 'Reward not found' });
  }

  const {
    name,
    description,
    points,
    stock,
    type,
    value,
    expiryDate,
    isActive
  } = req.body;

  await reward.update({
    rewardName: name || reward.rewardName,
    description: description !== undefined ? description : reward.description,
    pointsCost: points !== undefined ? points : reward.pointsCost,
    stockQuantity: stock !== undefined ? stock : reward.stockQuantity,
    rewardType: type || reward.rewardType,
    rewardValue: value !== undefined ? value : reward.rewardValue,
    expiryDate: expiryDate !== undefined ? expiryDate : reward.expiryDate,
    isActive: isActive !== undefined ? isActive : reward.isActive
  });

  return res.status(200).json({
    success: true,
    message: 'Reward updated successfully',
    data: reward
  });
}

async function deleteReward(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Reward ID is required' });
  }

  const reward = await LoyaltyReward.findByPk(id);

  if (!reward) {
    return res.status(404).json({ error: 'Reward not found' });
  }

  // Soft delete
  await reward.update({ isActive: false });

  return res.status(200).json({
    success: true,
    message: 'Reward deleted successfully'
  });
}

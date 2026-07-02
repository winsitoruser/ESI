import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const LoyaltyTier = require('@/models/LoyaltyTier');
const CustomerLoyalty = require('@/models/CustomerLoyalty');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { programId, includeCount } = req.query;

      const where: any = {};
      if (programId) {
        where.programId = programId;
      }

      const tiers = await LoyaltyTier.findAll({
        where,
        order: [['tierLevel', 'ASC']]
      });

      // Include member count per tier if requested
      if (includeCount === 'true') {
        const tiersWithCount = await Promise.all(
          tiers.map(async (tier: any) => {
            const memberCount = await CustomerLoyalty.count({
              where: { currentTierId: tier.id, isActive: true }
            });
            return {
              ...tier.toJSON(),
              memberCount
            };
          })
        );
        return res.status(200).json({ tiers: tiersWithCount });
      }

      return res.status(200).json({ tiers });
    } catch (error: any) {
      console.error('Error fetching loyalty tiers:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        programId,
        tierName,
        tierLevel,
        minSpending,
        pointMultiplier,
        discountPercentage,
        benefits,
        color,
        isActive
      } = req.body;

      if (!programId || !tierName || tierLevel === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const tier = await LoyaltyTier.create({
        programId,
        tierName,
        tierLevel,
        minSpending: minSpending || 0,
        pointMultiplier: pointMultiplier || 1.0,
        discountPercentage: discountPercentage || 0,
        benefits: benefits || [],
        color,
        isActive: isActive !== undefined ? isActive : true
      });

      return res.status(201).json({
        message: 'Loyalty tier created successfully',
        tier
      });
    } catch (error: any) {
      console.error('Error creating loyalty tier:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Tier ID is required' });
      }

      const tier = await LoyaltyTier.findByPk(id);

      if (!tier) {
        return res.status(404).json({ error: 'Loyalty tier not found' });
      }

      await tier.update(updateData);

      return res.status(200).json({
        message: 'Loyalty tier updated successfully',
        tier
      });
    } catch (error: any) {
      console.error('Error updating loyalty tier:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Tier ID is required' });
      }

      const tier = await LoyaltyTier.findByPk(id);

      if (!tier) {
        return res.status(404).json({ error: 'Loyalty tier not found' });
      }

      // Check if any customers are using this tier
      const customerCount = await CustomerLoyalty.count({
        where: { currentTierId: id }
      });

      if (customerCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete tier with active members',
          customerCount 
        });
      }

      await tier.destroy();

      return res.status(200).json({
        message: 'Loyalty tier deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting loyalty tier:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

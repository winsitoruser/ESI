import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const LoyaltyProgram = require('@/models/LoyaltyProgram');
const LoyaltyTier = require('@/models/LoyaltyTier');
const LoyaltyReward = require('@/models/LoyaltyReward');
const CustomerLoyalty = require('@/models/CustomerLoyalty');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { includeStats } = req.query;

      const programs = await LoyaltyProgram.findAll({
        include: [
          {
            model: LoyaltyTier,
            as: 'tiers',
            where: { isActive: true },
            required: false
          },
          {
            model: LoyaltyReward,
            as: 'rewards',
            where: { isActive: true },
            required: false
          }
        ],
        order: [
          ['createdAt', 'DESC'],
          [{ model: LoyaltyTier, as: 'tiers' }, 'tierLevel', 'ASC']
        ]
      });

      // Calculate statistics if requested
      if (includeStats === 'true' && programs.length > 0) {
        const programId = programs[0].id;
        
        const stats = await CustomerLoyalty.findOne({
          attributes: [
            [CustomerLoyalty.sequelize.fn('COUNT', CustomerLoyalty.sequelize.col('id')), 'totalMembers'],
            [CustomerLoyalty.sequelize.fn('COUNT', CustomerLoyalty.sequelize.literal('CASE WHEN isActive = true THEN 1 END')), 'activeMembers'],
            [CustomerLoyalty.sequelize.fn('SUM', CustomerLoyalty.sequelize.col('lifetimePoints')), 'totalPointsIssued'],
            [CustomerLoyalty.sequelize.fn('SUM', CustomerLoyalty.sequelize.literal('lifetimePoints - availablePoints')), 'totalPointsRedeemed'],
            [CustomerLoyalty.sequelize.fn('AVG', CustomerLoyalty.sequelize.col('availablePoints')), 'averagePointsPerMember']
          ],
          where: { programId },
          raw: true
        });

        return res.status(200).json({
          programs,
          statistics: {
            totalMembers: parseInt(stats?.totalMembers || '0'),
            activeMembers: parseInt(stats?.activeMembers || '0'),
            totalPointsIssued: parseInt(stats?.totalPointsIssued || '0'),
            totalPointsRedeemed: parseInt(stats?.totalPointsRedeemed || '0'),
            averagePointsPerMember: Math.round(parseFloat(stats?.averagePointsPerMember || '0'))
          }
        });
      }

      return res.status(200).json({ programs });
    } catch (error: any) {
      console.error('Error fetching loyalty programs:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        programName,
        description,
        isActive,
        pointsPerRupiah,
        minimumPurchase,
        pointsExpiry,
        autoEnroll,
        startDate,
        endDate
      } = req.body;

      if (!programName) {
        return res.status(400).json({ error: 'Program name is required' });
      }

      const program = await LoyaltyProgram.create({
        programName,
        description,
        isActive: isActive !== undefined ? isActive : true,
        pointsPerRupiah: pointsPerRupiah || 1,
        minimumPurchase: minimumPurchase || 0,
        pointsExpiry: pointsExpiry || 365,
        autoEnroll: autoEnroll !== undefined ? autoEnroll : true,
        startDate,
        endDate
      });

      return res.status(201).json({
        message: 'Loyalty program created successfully',
        program
      });
    } catch (error: any) {
      console.error('Error creating loyalty program:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Program ID is required' });
      }

      const program = await LoyaltyProgram.findByPk(id);

      if (!program) {
        return res.status(404).json({ error: 'Loyalty program not found' });
      }

      await program.update(updateData);

      return res.status(200).json({
        message: 'Loyalty program updated successfully',
        program
      });
    } catch (error: any) {
      console.error('Error updating loyalty program:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const CustomerLoyalty = require('@/models/CustomerLoyalty');
const LoyaltyProgram = require('@/models/LoyaltyProgram');
const LoyaltyTier = require('@/models/LoyaltyTier');
const Customer = require('@/models/Customer');
const PointTransaction = require('@/models/PointTransaction');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { customerId } = req.query;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  if (req.method === 'GET') {
    try {
      // Build where clause for multi-tenant support
      const whereClause: any = { customerId };
      
      // Add tenant filtering for non-super admin
      if (session.user.role !== 'super_admin') {
        whereClause.tenantId = session.user.tenantId;
      }

      const customerLoyalty = await CustomerLoyalty.findOne({
        where: whereClause,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: LoyaltyProgram,
            as: 'program',
            attributes: ['id', 'programName', 'pointsPerRupiah', 'pointsExpiry']
          },
          {
            model: LoyaltyTier,
            as: 'currentTier',
            required: false,
            attributes: ['id', 'tierName', 'tierLevel', 'pointMultiplier', 'discountPercentage', 'benefits', 'color']
          }
        ]
      });

      if (!customerLoyalty) {
        return res.status(404).json({ error: 'Customer loyalty record not found' });
      }

      // Get recent point transactions
      const recentTransactions = await PointTransaction.findAll({
        where: { customerLoyaltyId: customerLoyalty.id },
        order: [['transactionDate', 'DESC']],
        limit: 10
      });

      return res.status(200).json({
        customerLoyalty,
        recentTransactions
      });
    } catch (error: any) {
      console.error('Error fetching customer loyalty:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      // Enroll customer in loyalty program
      const { programId } = req.body;

      if (!programId) {
        return res.status(400).json({ error: 'Program ID is required' });
      }

      // Check if customer already enrolled
      const existing = await CustomerLoyalty.findOne({
        where: { customerId }
      });

      if (existing) {
        return res.status(400).json({ error: 'Customer already enrolled in loyalty program' });
      }

      // Get the lowest tier for initial enrollment
      const lowestTier = await LoyaltyTier.findOne({
        where: { programId, isActive: true },
        order: [['tierLevel', 'ASC']]
      });

      const customerLoyalty = await CustomerLoyalty.create({
        customerId,
        programId,
        currentTierId: lowestTier?.id || null,
        totalPoints: 0,
        availablePoints: 0,
        lifetimePoints: 0,
        totalSpending: 0,
        enrollmentDate: new Date(),
        isActive: true
      });

      return res.status(201).json({
        message: 'Customer enrolled in loyalty program successfully',
        customerLoyalty
      });
    } catch (error: any) {
      console.error('Error enrolling customer:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
